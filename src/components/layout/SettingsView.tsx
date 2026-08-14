"use client";

import { useState, useRef } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getAvatarUrl } from "@/lib/utils";
import { Camera, Save, User } from "lucide-react";
import { toast } from "sonner";
import type { User as EchoUser } from "@/types";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { THEMES } from "@/lib/themes";

interface Props {
  profile: EchoUser | null;
  userId: string;
}

export function SettingsView({ profile, userId }: Props) {
  const supabase = createClient();
  const { theme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadAvatar(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (upErr) { toast.error("تعذّر رفع الصورة"); setUploading(false); return; }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from("users").update({ avatar_url: url }).eq("id", userId);
    toast.success("تم تحديث الصورة!");
    setUploading(false);
  }

  async function saveProfile() {
    if (!form.display_name.trim() || !form.username.trim()) return;
    setSaving(true);

    // Check username uniqueness (skip if unchanged)
    if (form.username !== profile?.username) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("username", form.username.trim())
        .neq("id", userId)
        .single();
      if (existing) {
        toast.error("اسم المستخدم محجوز");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("users")
      .update({
        display_name: form.display_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim() || null,
      })
      .eq("id", userId);

    if (error) toast.error("تعذّر حفظ التغييرات");
    else toast.success("تم حفظ الملف الشخصي!");
    setSaving(false);
  }

  const activeTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6" dir="rtl">
      <div className="max-w-lg mx-auto space-y-5 pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold text-foreground">الإعدادات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Settings</p>
        </motion.div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            الملف الشخصي
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <motion.div whileTap={{ scale: 0.95 }} className="relative group">
              <div className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden">
                <Image
                  src={getAvatarUrl(avatarUrl, form.display_name)}
                  alt={form.display_name}
                  width={72}
                  height={72}
                  className="rounded-2xl object-cover w-full h-full"
                />
                <AnimatePresence>
                  {uploading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                        className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100
                           transition-opacity flex items-center justify-center text-white"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); }}
              />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-foreground">{form.display_name || "اسمك"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{form.username || "username"}</p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-primary hover:underline mt-1 disabled:opacity-50"
              >
                {uploading ? "جارٍ الرفع…" : "تغيير الصورة"}
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">الاسم الظاهر *</label>
                <input
                  value={form.display_name}
                  onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="اسمك"
                  className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground
                             placeholder:text-muted-foreground/60 text-sm outline-none
                             focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Username *</label>
                <input
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                  placeholder="your_handle"
                  dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground
                             placeholder:text-muted-foreground/60 text-sm outline-none
                             focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">النبذة التعريفية</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="أخبرنا عن نفسك…"
                rows={3}
                maxLength={160}
                className="w-full px-3 py-2.5 rounded-xl bg-input border border-border text-foreground
                           placeholder:text-muted-foreground/60 text-sm outline-none resize-none
                           focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
              />
              <p className="text-[10px] text-muted-foreground text-left">{form.bio.length}/160</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={saveProfile}
              disabled={saving || !form.display_name.trim() || !form.username.trim()}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                         hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {saving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
            </motion.button>
          </div>
        </motion.div>

        {/* Theme card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground">
            المظهر · Appearance
          </h2>

          <ThemePicker
            showChevron
            triggerClassName="w-full flex-row-reverse px-4 py-3.5 rounded-xl
                               border border-border hover:border-primary/40 transition-colors bg-input/40"
          />

          {/* معاينة مصغّرة للثيم النشط حالياً */}
          <div className="flex items-center gap-3 px-1">
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0 relative overflow-hidden border border-border"
              style={{ background: activeTheme.preview.bg }}
            >
              <div className="absolute bottom-0 inset-x-0 h-2.5" style={{ background: activeTheme.preview.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{activeTheme.label}</p>
              <p className="text-[10px] text-muted-foreground">{activeTheme.labelEn}</p>
            </div>
          </div>
        </motion.div>

        {/* About card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3"
        >
          <h2 className="text-sm font-semibold text-foreground">حول Echo</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>الإصدار</span>
              <span dir="ltr">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>المشروع</span>
              <span>Econovo Club</span>
            </div>
            <div className="flex justify-between">
              <span>قاعدة البيانات</span>
              <span>Supabase</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
