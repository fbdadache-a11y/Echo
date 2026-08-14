"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Image as ImageIcon, FileText, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING_PANEL } from "@/lib/motion";

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

/** زر المرفقات: يفتح قائمة صغيرة لاختيار صور/فيديو أو أي ملف آخر */
export function AttachButton({ onFiles, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
    setOpen(false);
  }

  return (
    <div className="relative flex-shrink-0">
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />

      <motion.button
        whileTap={{ scale: 0.85 }}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-11 h-11 flex items-center justify-center rounded-2xl transition-colors flex-shrink-0",
          open ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        aria-label="إرفاق ملف"
      >
        <Paperclip className="w-[18px] h-[18px]" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={SPRING_PANEL}
              className="absolute bottom-full mb-2 right-0 z-40 bg-card border border-border rounded-2xl shadow-lg p-1.5 min-w-[180px]"
              dir="rtl"
            >
              <button
                onClick={() => mediaInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/12 text-primary flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                صورة أو فيديو
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/50 transition-colors md:hidden"
              >
                <div className="w-7 h-7 rounded-lg bg-echo-online/15 text-echo-online flex items-center justify-center flex-shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                الكاميرا
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                ملف
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
