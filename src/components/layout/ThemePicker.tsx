"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Paintbrush, Check, Sun, Moon, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/themes";
import { SPRING_VIEW_SWAP } from "@/lib/motion";

interface Props {
  /** فئات إضافية لزر الفتح (لتطويعه بين الشكل الجانبي وشكل الموبايل) */
  triggerClassName?: string;
  iconOnly?: boolean;
  /** يعرض سهماً زخرفياً في نهاية الزر (لاستخدامه كصف داخل الإعدادات) */
  showChevron?: boolean;
}

/**
 * زر بأيقونة فرشاة يفتح لوحة جانبية (من اليسار) فيها كل الثيمات
 * كبطاقات معاينة قابلة للنقر. الاختيار يُطبَّق فوراً ويُحفَظ محلياً
 * عبر next-themes (localStorage) — بلا أي طلب شبكة.
 */
export function ThemePicker({ triggerClassName, iconOnly, showChevron }: Props) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2.5 text-sm transition-colors",
          triggerClassName
        )}
        aria-label="اختيار الثيم"
      >
        <Paintbrush className="w-4 h-4" strokeWidth={2} />
        {!iconOnly && <span className="flex-1 text-right">الثيم</span>}
        {showChevron && <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50" />}
      </motion.button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 echo-glass-overlay z-[200]"
                />
                <motion.div
                  ref={panelRef}
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={SPRING_VIEW_SWAP}
                  dir="rtl"
                  className="fixed inset-y-0 left-0 z-[201] w-full max-w-xs
                             bg-card border-r border-border
                             flex flex-col shadow-2xl"
                  style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
                >
                  <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Paintbrush className="w-4 h-4 text-primary" strokeWidth={2} />
                      <h3 className="text-sm font-semibold text-foreground">اختر الثيم</h3>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain p-3 grid grid-cols-2 gap-2.5">
                    {THEMES.map((t) => {
                      const active = theme === t.id;
                      return (
                        <motion.button
                          key={t.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setTheme(t.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "relative rounded-2xl overflow-hidden border-2 transition-all text-right",
                            active ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                          )}
                        >
                          {/* بطاقة المعاينة — تعرض الألوان الفعلية للثيم بلا حاجة لتطبيقه */}
                          <div
                            className="h-16 relative flex items-end p-1.5 gap-1"
                            style={{ background: t.preview.bg }}
                          >
                            <div
                              className="w-6 h-6 rounded-lg flex-shrink-0"
                              style={{ background: t.preview.surface, border: `1px solid ${t.preview.text}22` }}
                            />
                            <div className="flex-1 space-y-1 pb-0.5">
                              <div className="h-1.5 rounded-full w-3/4" style={{ background: t.preview.accent }} />
                              <div className="h-1.5 rounded-full w-1/2" style={{ background: t.preview.accent2 }} />
                            </div>
                            <div className="absolute top-1.5 left-1.5">
                              {t.mode === "dark" ? (
                                <Moon className="w-3 h-3" style={{ color: t.preview.text, opacity: 0.55 }} strokeWidth={2} />
                              ) : (
                                <Sun className="w-3 h-3" style={{ color: t.preview.text, opacity: 0.55 }} strokeWidth={2} />
                              )}
                            </div>
                            {active && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-primary flex items-center justify-center"
                              >
                                <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                              </motion.div>
                            )}
                          </div>
                          <div className="px-2 py-1.5 bg-card">
                            <p className="text-[11px] font-medium text-foreground truncate">{t.label}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{t.labelEn}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
