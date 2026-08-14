"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle, Users, LayoutDashboard, Zap, Lock, Globe } from "lucide-react";
import { EchoWordmark } from "@/components/landing/EchoWordmark";
import { EASE_ENTRANCE, STAGGER_STEP } from "@/lib/motion";

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_STEP, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_ENTRANCE } },
};

const FEATURES = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "محادثات مباشرة",
    titleEn: "Direct Messages",
    desc: "تواصل مع أعضاء المجتمع بشكل خاص، بدون ضوضاء.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "مجموعات",
    titleEn: "Groups",
    desc: "أنشئ مساحات مخصصة لفرق العمل أو الاهتمامات المشتركة.",
  },
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "لوحة تحكم",
    titleEn: "Dashboard",
    desc: "نظرة شاملة على نشاطك ومجتمعك في مكان واحد.",
  },
];

const PRINCIPLES = [
  { icon: <Zap className="w-4 h-4" />, label: "سريع وخفيف", labelEn: "Fast & lightweight" },
  { icon: <Lock className="w-4 h-4" />, label: "خاص وآمن", labelEn: "Private & secure" },
  { icon: <Globe className="w-4 h-4" />, label: "عربي وإنجليزي", labelEn: "Arabic & English" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif italic text-xl text-primary">Echo</span>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-primary/70 hover:text-primary transition-colors rounded-xl hover:bg-primary/5"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroContainer}
          className="space-y-6 max-w-2xl"
        >
          {/* Badge */}
          <motion.div
            variants={heroItem}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/12 text-primary text-xs font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Econovo Club — المساحة الداخلية
          </motion.div>

          {/* Wordmark — يُكتب بخط Rouge Script (copperplate)، مع حركة كشف تدريجية
              خاصة به (بدل fade عام) لأن الكشف نفسه هو الحركة المقصودة هنا */}
          <div className="flex justify-center py-2">
            <EchoWordmark delay={0.1 + STAGGER_STEP} />
          </div>

          <motion.p variants={heroItem} className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto" dir="rtl">
            مساحة الدردشة والمجموعات لمجتمع Econovo.
            <br />
            <span className="text-sm opacity-70">Where every message finds its echo.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div variants={heroItem} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/auth/signup"
              className="px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl font-medium text-base
                         hover:opacity-90 transition-all hover:-translate-y-0.5 active:translate-y-0
                         shadow-lg shadow-primary/20"
            >
              انضم إلى Echo
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3.5 rounded-2xl font-medium text-base border border-border
                         text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all"
            >
              تسجيل الدخول
            </Link>
          </motion.div>

          {/* Principles strip */}
          <motion.div variants={heroItem} className="flex flex-wrap justify-center gap-0 border border-border rounded-2xl overflow-hidden divide-x divide-x-reverse divide-border">
            {PRINCIPLES.map((p) => (
              <div key={p.label} className="flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="text-primary">{p.icon}</span>
                <span dir="rtl">{p.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 border-t border-border bg-card/40">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-serif italic text-primary mb-3">كل ما تحتاجه</h2>
            <p className="text-muted-foreground text-sm">Everything you need, nothing you don't.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/25
                           hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1" dir="rtl">{f.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{f.titleEn}</p>
                <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-primary relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-3xl rounded-full" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl font-serif italic text-primary-foreground">
                صوتك يستحق أن يُسمع.
              </h2>
              <p className="text-primary-foreground/70 text-sm">Your voice deserves to be heard.</p>
              <Link
                href="/auth/signup"
                className="inline-block px-8 py-3.5 bg-primary-foreground text-primary rounded-2xl
                           font-medium hover:opacity-90 transition-all hover:-translate-y-0.5"
              >
                ابدأ مجاناً
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 border-t border-border text-center space-y-2">
        <div className="font-serif italic text-primary/40 text-xl">Echo</div>
        <p className="text-[11px] text-muted-foreground tracking-widest uppercase">
          Econovo Club · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
