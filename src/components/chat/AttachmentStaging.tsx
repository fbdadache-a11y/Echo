"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Music, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, getFileExt } from "@/lib/attachments";
import { SPRING_PANEL } from "@/lib/motion";
import type { PendingUpload } from "@/types";

interface Props {
  items: PendingUpload[];
  onRemove: (id: string) => void;
}

/** شريط معاينة الملفات المختارة، يظهر فوق حقل الكتابة قبل الإرسال */
export function AttachmentStaging({ items, onRemove }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 px-3 pt-2.5 overflow-x-auto overscroll-contain" dir="rtl">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={SPRING_PANEL}
            className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-border bg-muted/40"
          >
            {item.kind === "image" && (
              <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
            )}
            {item.kind === "video" && (
              <video src={item.previewUrl} className="w-full h-full object-cover" muted />
            )}
            {item.kind === "audio" && (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-0.5">
                <Music className="w-5 h-5" />
              </div>
            )}
            {item.kind === "file" && (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-0.5 px-1">
                <FileText className="w-5 h-5" />
                <span className="text-[8px] font-semibold">{getFileExt(item.file.name)}</span>
              </div>
            )}

            {/* شريط التقدّم */}
            {item.status === "uploading" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                />
              </div>
            )}
            {item.status === "error" && (
              <div className="absolute inset-0 bg-destructive/70 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            )}

            <button
              onClick={() => onRemove(item.id)}
              className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-black/60 text-white
                         flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="إزالة"
            >
              <X className="w-2.5 h-2.5" />
            </button>

            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[7px] text-center py-0.5 truncate px-1">
              {formatFileSize(item.file.size)}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
