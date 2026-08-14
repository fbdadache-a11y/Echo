"use client";

import { motion } from "framer-motion";
import { X, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  senderName: string;
  content?: string | null;
  hasAttachment?: boolean;
  onCancel: () => void;
}

/** شريط معاينة "الرد على" يظهر فوق حقل الكتابة عند اختيار رسالة للرد عليها */
export function ReplyPreviewBar({ senderName, content, hasAttachment, onCancel }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 px-3 pt-2.5 overflow-hidden"
      dir="rtl"
    >
      <div className="flex-1 flex items-center gap-2 bg-muted/40 border-r-2 border-primary rounded-lg px-3 py-1.5 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-primary">الرد على {senderName}</p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            {hasAttachment && <Paperclip className="w-3 h-3 flex-shrink-0" />}
            {content || (hasAttachment ? "مرفق" : "")}
          </p>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/40 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

/** الشريط المرجعي الصغير المعروض داخل فقاعة الرسالة، يشير للرسالة المردود عليها */
export function ReplyQuote({
  senderName,
  content,
  hasAttachment,
  isMe,
  onClick,
}: {
  senderName: string;
  content?: string | null;
  hasAttachment?: boolean;
  isMe: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0 w-full text-right rounded-lg px-2.5 py-1.5 mb-1.5 border-r-2 transition-colors",
        isMe
          ? "bg-black/10 border-primary-foreground/50 hover:bg-black/15"
          : "bg-muted/50 border-primary hover:bg-muted/70"
      )}
    >
      <span className={cn("text-[11px] font-semibold", isMe ? "text-primary-foreground/85" : "text-primary")}>
        {senderName}
      </span>
      <span className={cn("text-[11px] truncate flex items-center gap-1", isMe ? "text-primary-foreground/65" : "text-muted-foreground")}>
        {hasAttachment && <Paperclip className="w-2.5 h-2.5 flex-shrink-0" />}
        {content || (hasAttachment ? "مرفق" : "")}
      </span>
    </button>
  );
}
