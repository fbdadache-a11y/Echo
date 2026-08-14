"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Download, ChevronRight, ChevronLeft } from "lucide-react";
import { extractDominantColor } from "@/lib/attachments";
import { SPRING_VIEW_SWAP } from "@/lib/motion";
import type { Attachment } from "@/types";

interface Props {
  /** كل الوسائط القابلة للتنقل بينها ضمن نفس الرسالة (صور + فيديو) */
  items: Attachment[];
  /** فهرس العنصر المفتوح حالياً، أو null للإغلاق */
  openIndex: number | null;
  onOpenChange: (index: number | null) => void;
}

/**
 * معرض ملء الشاشة بتنقل بين الصور/الفيديوهات (أسهم، لوحة مفاتيح،
 * سحب باللمس)، مع خلفية زجاجية يتغيّر توهّجها ليطابق اللون السائد
 * في الوسائط المعروضة حالياً.
 */
export function Lightbox({ items, openIndex, onOpenChange }: Props) {
  const [index, setIndex] = useState(openIndex ?? 0);
  const [tint, setTint] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const tintCache = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (openIndex !== null) setIndex(openIndex);
  }, [openIndex]);

  const current = items[index];

  const goTo = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const wrapped = (next + items.length) % items.length;
      setDirection(next > index ? 1 : -1);
      setIndex(wrapped);
    },
    [index, items.length]
  );

  // استخراج اللون السائد عند تغيّر الصورة المعروضة (بذاكرة تخزين مؤقت بسيطة)
  useEffect(() => {
    if (!current || current.kind !== "image" || !current.url) {
      setTint(null);
      return;
    }
    const cached = tintCache.current.get(current.url);
    if (cached !== undefined) {
      setTint(cached);
      return;
    }
    let cancelled = false;
    extractDominantColor(current.url).then((color) => {
      tintCache.current.set(current.url!, color);
      if (!cancelled) setTint(color);
    });
    return () => {
      cancelled = true;
    };
  }, [current]);

  // التنقل بلوحة المفاتيح
  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(null);
      // الأسهم تراعي أن الواجهة RTL: يمين = التالي بصرياً هنا يعني السابق منطقياً
      if (e.key === "ArrowLeft") goTo(index + 1);
      if (e.key === "ArrowRight") goTo(index - 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex, index, goTo, onOpenChange]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 60;
    if (info.offset.x < -threshold) goTo(index + 1);
    else if (info.offset.x > threshold) goTo(index - 1);
  }

  const tintVar = tint ? tint.replace("rgb(", "rgba(").replace(")", ", 0.35)") : "transparent";

  return (
    <Dialog.Root open={openIndex !== null} onOpenChange={(open) => !open && onOpenChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 echo-glass-overlay z-[100]"
          style={{ "--lightbox-tint": tintVar } as React.CSSProperties}
        />
        <Dialog.Content
          className="fixed inset-0 z-[101] flex items-center justify-center p-4 outline-none overflow-hidden"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">معاينة المرفق</Dialog.Title>

          <Dialog.Close className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </Dialog.Close>

          {current && (
            <a
              href={current.url}
              download={current.file_name}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {items.length > 1 && (
            <>
              <button
                onClick={() => goTo(index - 1)}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full
                           bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="السابق"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => goTo(index + 1)}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full
                           bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="التالي"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={
                      i === index
                        ? "w-5 h-1.5 rounded-full bg-white transition-all"
                        : "w-1.5 h-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-all"
                    }
                    aria-label={`الانتقال إلى العنصر ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          <AnimatePresence initial={false} custom={direction} mode="wait">
            {current && (
              <motion.div
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction * -60, scale: 0.97 }}
                transition={SPRING_VIEW_SWAP}
                drag={items.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
                className="max-w-full max-h-full flex items-center justify-center"
              >
                {current.kind === "image" ? (
                  <img
                    src={current.url}
                    alt={current.file_name}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
                    draggable={false}
                  />
                ) : (
                  <video
                    src={current.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[85vh] rounded-lg"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
