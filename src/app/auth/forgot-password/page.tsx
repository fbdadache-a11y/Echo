"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/actions/auth.actions";
import { motion } from "framer-motion";
import { ArrowRight, MailCheck } from "lucide-react";

const initialState = { error: undefined, success: undefined };

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/landing">
            <h1 className="font-serif italic text-5xl text-primary cursor-pointer hover:opacity-80 transition-opacity">
              Echo
            </h1>
          </Link>
          <p className="text-muted-foreground text-sm mt-2" dir="rtl">
            استرجاع كلمة المرور
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7 shadow-sm">
          {state?.success ? (
            <div className="text-center space-y-3 py-2" dir="rtl">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">تحقق من بريدك</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                إذا كان هذا البريد مسجلاً لدينا، فقد أرسلنا رابطاً لإعادة تعيين كلمة المرور.
              </p>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center" dir="rtl">
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.
              </p>

              {state?.error && (
                <div
                  className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
                  dir="rtl"
                >
                  {state.error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" dir="rtl">
                  البريد الإلكتروني
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground
                             placeholder:text-muted-foreground/60 text-sm outline-none
                             focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm
                           hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                           hover:-translate-y-0.5 active:translate-y-0"
              >
                {pending ? "جارٍ الإرسال…" : "إرسال رابط الاسترجاع"}
              </button>
            </form>
          )}
        </div>

        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary mt-5 transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span dir="rtl">العودة لتسجيل الدخول</span>
        </Link>
      </motion.div>
    </div>
  );
}
