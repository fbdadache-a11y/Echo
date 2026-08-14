"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور قصيرة جداً"),
});

const signupSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  username: z
    .string()
    .min(3, "اسم المستخدم قصير جداً")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "أحرف إنجليزية وأرقام و _ فقط"),
  display_name: z.string().min(2, "الاسم قصير جداً").max(50),
});

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function login(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
    }
    return { error: error.message };
  }

  redirect("/main/dashboard");
}

export async function signup(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    username: formData.get("username") as string,
    display_name: formData.get("display_name") as string,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Check username availability
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (existing) {
    return { error: "اسم المستخدم محجوز، جرّب اسماً آخر" };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.display_name,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "هذا البريد الإلكتروني مسجّل بالفعل" };
    }
    return { error: error.message };
  }

  redirect("/main/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

const resetSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
});

export async function requestPasswordReset(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = { email: formData.get("email") as string };
  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/reset-password`,
  });

  // لا نكشف إن كان البريد مسجلاً أم لا — لأسباب أمنية، نعرض نفس رسالة النجاح دائماً
  if (error) {
    console.error("resetPasswordForEmail error:", error);
  }

  return { success: true };
}

const updatePasswordSchema = z.object({
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export async function updatePassword(
  _: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = { password: formData.get("password") as string };
  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "تعذّر تحديث كلمة المرور، حاول مجدداً" };
  }

  redirect("/main/dashboard");
}
