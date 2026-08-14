import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttachmentKind, PendingUpload } from "@/types";

/** الحد الأقصى لحجم الملف الواحد (يطابق الحد في Supabase Storage) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/** يحدد نوع المرفق ومسار البكت المناسب من نوع MIME */
export function classifyFile(file: File): { kind: AttachmentKind; bucket: string } {
  if (file.type.startsWith("image/")) return { kind: "image", bucket: "chat-media" };
  if (file.type.startsWith("video/")) return { kind: "video", bucket: "chat-media" };
  if (file.type.startsWith("audio/")) return { kind: "audio", bucket: "chat-media" };
  return { kind: "file", bucket: "chat-files" };
}

/** يهيّئ اسم ملف آمن للمسار (بدون مسافات أو رموز خاصة) */
function sanitizeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const safeBase = base
    .normalize("NFKD")
    .replace(/[^\w\u0600-\u06FF-]+/g, "_")
    .slice(0, 60);
  return `${safeBase || "file"}${ext.slice(0, 12)}`;
}

/** يبني مسار تخزين فريد لكل مستخدم */
export function buildStoragePath(userId: string, file: File) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}_${rand}_${sanitizeFileName(file.name)}`;
}

/** يقرأ أبعاد صورة من ملف محلي */
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** يقرأ أبعاد ومدة فيديو من ملف محلي */
function readVideoMeta(
  file: File
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({ width: 0, height: 0, duration: 0 });
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

/** يقرأ مدة ملف صوتي */
function readAudioMeta(file: File): Promise<{ duration: number }> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve({ duration: audio.duration });
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve({ duration: 0 });
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

/** يهيّئ ملفاً محلياً لعرض معاينة فورية قبل الرفع، مع قراءة أبعاده/مدته */
export async function createPendingUpload(file: File): Promise<PendingUpload> {
  const { kind } = classifyFile(file);
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const previewUrl = URL.createObjectURL(file);

  let width: number | undefined;
  let height: number | undefined;
  let duration_seconds: number | undefined;

  try {
    if (kind === "image") {
      const dims = await readImageDimensions(file);
      width = dims.width || undefined;
      height = dims.height || undefined;
    } else if (kind === "video") {
      const meta = await readVideoMeta(file);
      width = meta.width || undefined;
      height = meta.height || undefined;
      duration_seconds = meta.duration || undefined;
    } else if (kind === "audio") {
      const meta = await readAudioMeta(file);
      duration_seconds = meta.duration || undefined;
    }
  } catch {
    // تجاهل أخطاء قراءة الميتاداتا — الرفع يستمر بدونها
  }

  return {
    id,
    file,
    kind,
    previewUrl,
    progress: 0,
    status: "uploading",
    width,
    height,
    duration_seconds,
  };
}

/** يرفع ملفاً واحداً إلى Supabase Storage ويعيد بيانات المرفق الجاهزة للإدراج */
export async function uploadAttachment(
  supabase: SupabaseClient,
  userId: string,
  pending: PendingUpload
) {
  const { kind, bucket } = classifyFile(pending.file);
  const path = buildStoragePath(userId, pending.file);

  const { error } = await supabase.storage.from(bucket).upload(path, pending.file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  return {
    uploader_id: userId,
    kind,
    bucket,
    path,
    file_name: pending.file.name,
    mime_type: pending.file.type || "application/octet-stream",
    size_bytes: pending.file.size,
    width: pending.width ?? null,
    height: pending.height ?? null,
    duration_seconds: pending.duration_seconds ?? null,
  };
}

/** يبني رابطاً عاماً لعرض مرفق من اسم البكت ومساره */
export function getPublicUrl(supabase: SupabaseClient, bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** يهيّئ حجم الملف بصيغة قابلة للقراءة (KB / MB) */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** يهيّئ مدة بالثواني بصيغة mm:ss */
export function formatDuration(seconds?: number | null) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** امتداد الملف بحروف كبيرة، لعرضه في بطاقة الملف */
export function getFileExt(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toUpperCase().slice(0, 5) : "FILE";
}

/**
 * يستخرج اللون السائد من صورة عبر تصغيرها إلى شبكة صغيرة جداً على
 * Canvas ثم حساب متوسط لوني مرجّح (يتجاهل البكسلات شبه الشفافة/البيضاء
 * والسوداء الصرفة التي غالباً تكون خلفية لا لوناً فعلياً في الصورة).
 * سريع جداً (يعمل على 24×24 بكسل بغض النظر عن حجم الصورة الأصلي)
 * ولا يحتاج أي مكتبة خارجية.
 */
export function extractDominantColor(imgUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const SIZE = 24;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [pr, pg, pb, pa] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (pa < 200) continue; // شفاف — تجاهله
          const brightness = (pr + pg + pb) / 3;
          if (brightness > 245 || brightness < 12) continue; // شبه أبيض/أسود صرف
          r += pr; g += pg; b += pb; count++;
        }
        if (count === 0) return resolve(null);
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch {
        // فشل قراءة بيانات Canvas (مثلاً CORS) — تجاهل بهدوء
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
}
