"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus, Heart, ThumbsUp, Laugh, Frown, HandHeart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING_PANEL } from "@/lib/motion";
import type { Reaction } from "@/types";

/**
 * مجموعة التفاعلات — بأيقونات outline من lucide-react للحفاظ على أسلوب
 * بصري موحّد مع بقية الواجهة، بدل إيموجي يونيكود (تختلف رسمتها بين
 * نظام وآخر). "key" هو ما يُخزَّن فعلياً في عمود emoji بقاعدة البيانات.
 */
const REACTION_TYPES: { key: string; icon: LucideIcon; label: string }[] = [
  { key: "heart", icon: Heart, label: "أحببته" },
  { key: "laugh", icon: Laugh, label: "أضحكني" },
  { key: "like", icon: ThumbsUp, label: "إعجاب" },
  { key: "sad", icon: Frown, label: "حزين" },
  { key: "thanks", icon: HandHeart, label: "شكراً" },
];

const REACTION_MAP = new Map(REACTION_TYPES.map((r) => [r.key, r]));

/** يدعم بيانات قديمة خُزّنت بإيموجي يونيكود قبل هذا التحديث */
const LEGACY_EMOJI_MAP: Record<string, string> = {
  "❤️": "heart", "😂": "laugh", "👍": "like", "😮": "like", "😢": "sad", "🙏": "thanks",
};

function resolveReaction(key: string) {
  const normalized = LEGACY_EMOJI_MAP[key] ?? key;
  return REACTION_MAP.get(normalized) ?? REACTION_TYPES[0];
}

interface Props {
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
  isMe: boolean;
}

/** يعرض التفاعلات الحالية على رسالة، وزر إضافة تفاعل جديد */
export function MessageReactions({ reactions, currentUserId, onToggle, isMe }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  // تجميع التفاعلات حسب المفتاح (مع دعم الإيموجي القديمة إن وُجدت)
  const grouped = new Map<string, Reaction[]>();
  for (const r of reactions) {
    const normalized = LEGACY_EMOJI_MAP[r.emoji] ?? r.emoji;
    grouped.set(normalized, [...(grouped.get(normalized) ?? []), r]);
  }

  return (
    <div className={cn("relative flex items-center gap-1 flex-wrap", isMe ? "justify-end" : "justify-start")} ref={ref}>
      {[...grouped.entries()].map(([key, list]) => {
        const mine = list.some((r) => r.user_id === currentUserId);
        const reaction = resolveReaction(key);
        const Icon = reaction.icon;
        return (
          <motion.button
            key={key}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggle(key)}
            title={reaction.label}
            className={cn(
              "flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors",
              mine
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            <Icon className={cn("w-3 h-3", mine && "fill-primary/20")} strokeWidth={2.25} />
            <span className="font-medium">{list.length}</span>
          </motion.button>
        );
      })}

      <button
        onClick={() => setPickerOpen((v) => !v)}
        className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-muted-foreground/60
                   hover:text-primary hover:bg-muted/50 transition-colors"
        aria-label="إضافة تفاعل"
      >
        <SmilePlus className="w-3.5 h-3.5" strokeWidth={2} />
      </button>

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={SPRING_PANEL}
            className={cn(
              "absolute bottom-full mb-1.5 z-20 flex items-center gap-0.5 bg-card border border-border rounded-2xl shadow-lg px-1.5 py-1",
              isMe ? "right-0" : "left-0"
            )}
          >
            {REACTION_TYPES.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => {
                  onToggle(key);
                  setPickerOpen(false);
                }}
                title={label}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground
                           hover:bg-muted/60 hover:text-primary hover:scale-110 transition-all"
              >
                <Icon className="w-4 h-4" strokeWidth={2.25} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
