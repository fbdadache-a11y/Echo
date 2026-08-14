import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/landing", request.url));
  }

  // يجب إنشاء response هنا حتى نتمكن من تحديث الكوكيز عليه
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // هذا الاستدعاء يُجدّد الـ access token إن كان منتهيًا وينسخ الكوكي الجديدة
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/",
    "/main/:path*",
    "/auth/:path*",
  ],
};
