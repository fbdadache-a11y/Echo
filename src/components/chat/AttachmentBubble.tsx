"use client";

import { useState } from "react";
import { Download, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, formatDuration, getFileExt } from "@/lib/attachments";
import { Lightbox } from "@/components/chat/Lightbox";
import type { Attachment } from "@/types";

interface Props {
  attachments: Attachment[];
  isMe: boolean;
}

/** يعرض شبكة مرفقات (صور/فيديو/صوت/ملفات) ضمن فقاعة رسالة */
export function AttachmentBubble({ attachments, isMe }: Props) {
  const media = attachments.filter((a) => a.kind === "image" || a.kind === "video");
  const files = attachments.filter((a) => a.kind === "file" || a.kind === "audio");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="space-y-1.5">
      {media.length > 0 && (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-2xl",
            media.length === 1 && "grid-cols-1",
            media.length === 2 && "grid-cols-2",
            media.length === 3 && "grid-cols-2 grid-rows-2",
            media.length >= 4 && "grid-cols-2"
          )}
        >
          {media.slice(0, 4).map((att, i) => (
            <button
              key={att.id}
              onClick={() => setLightboxIndex(i)}
              className={cn(
                "relative bg-muted/40 overflow-hidden group",
                media.length === 1 ? "aspect-[4/3] max-h-72" : "aspect-square",
                media.length === 3 && i === 0 && "row-span-2 aspect-auto"
              )}
            >
              {att.kind === "image" ? (
                <img
                  src={att.url}
                  alt={att.file_name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <>
                  <video src={att.url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                  {att.duration_seconds != null && (
                    <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                      {formatDuration(att.duration_seconds)}
                    </span>
                  )}
                </>
              )}
              {media.length > 4 && i === 3 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-semibold text-sm">
                  +{media.length - 4}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {files.map((att) =>
        att.kind === "audio" ? (
          <AudioAttachment key={att.id} att={att} isMe={isMe} />
        ) : (
          <a
            key={att.id}
            href={att.url}
            download={att.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors min-w-[200px]",
              isMe ? "bg-black/10 hover:bg-black/15" : "bg-muted/50 hover:bg-muted/70"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] font-bold",
                isMe ? "bg-black/15 text-primary-foreground" : "bg-primary/12 text-primary"
              )}
            >
              {getFileExt(att.file_name)}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs font-medium truncate">{att.file_name}</p>
              <p className={cn("text-[10px]", isMe ? "opacity-70" : "text-muted-foreground")}>
                {formatFileSize(att.size_bytes)}
              </p>
            </div>
            <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
          </a>
        )
      )}

      <Lightbox items={media} openIndex={lightboxIndex} onOpenChange={setLightboxIndex} />
    </div>
  );
}

function AudioAttachment({ att, isMe }: { att: Attachment; isMe: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-w-[200px]",
        isMe ? "bg-black/10" : "bg-muted/50"
      )}
    >
      <button
        onClick={() => {
          if (!audioEl) return;
          if (playing) audioEl.pause();
          else audioEl.play();
        }}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
          isMe ? "bg-black/15" : "bg-primary/12 text-primary"
        )}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
      </button>
      <div className="flex-1 min-w-0 text-right">
        <p className="text-xs font-medium truncate">{att.file_name}</p>
        <p className={cn("text-[10px]", isMe ? "opacity-70" : "text-muted-foreground")}>
          {formatDuration(att.duration_seconds)}
        </p>
      </div>
      <audio
        ref={setAudioEl}
        src={att.url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
