"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updatePassword } from "@/actions/auth.actions";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const initialState = { error: undefined, success: undefined };

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="font-serif italic text-5xl text-primary">Echo</h1>
          <p className="text-muted-foreground text-sm mt-2" dir="rtl">
            عيّن كلمة مرور جديدة
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7 shadow-sm">
          <form action={action} className="space-y-4">
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
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="8 أحرف على الأقل"
                  required
                  dir="rtl"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-input border border-border text-foreground
                             placeholder:text-muted-foreground/60 text-sm outline-none
                             focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm
                         hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         hover:-translate-y-0.5 active:translate-y-0"
            >
              {pending ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5" dir="rtl">
          تذكّرت كلمة المرور؟{" "}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            سجّل دخولك
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
