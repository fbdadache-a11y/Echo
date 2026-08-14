"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, LayoutGroup } from "framer-motion";
import {
  LayoutDashboard, MessageCircle, Users,
  LogOut, Settings,
} from "lucide-react";
import { logout } from "@/actions/auth.actions";
import { getAvatarUrl } from "@/lib/utils";
import type { User } from "@/types";
import { cn } from "@/lib/utils";
import { ThemePicker } from "@/components/layout/ThemePicker";
import { SPRING_SNAPPY, SPRING_PANEL } from "@/lib/motion";

const NAV_ITEMS = [
  { href: "/main/dashboard", icon: LayoutDashboard, label: "الرئيسية",  labelEn: "Dashboard" },
  { href: "/main/chats",     icon: MessageCircle,   label: "المحادثات", labelEn: "Chats"      },
  { href: "/main/groups",    icon: Users,           label: "المجموعات", labelEn: "Groups"     },
  { href: "/main/settings",  icon: Settings,        label: "الإعدادات", labelEn: "Settings"   },
];

export function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop Sidebar (md+) ───────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 border-l border-sidebar-border bg-sidebar flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <h1 className="font-serif italic text-2xl text-primary select-none">Echo</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">
            Econovo Club
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.slice(0, 3).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("echo-sidebar-item", active && "active")}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0" dir="rtl">
                  <div className="text-sm font-medium leading-none">{item.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-60">{item.labelEn}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <ThemePicker triggerClassName="echo-sidebar-item w-full" />

          <Link href="/main/settings" className="echo-sidebar-item">
            <Settings className="w-4 h-4" />
            <span className="text-sm" dir="rtl">الإعدادات</span>
          </Link>

          {user && (
            <div className="mt-2 pt-2 border-t border-sidebar-border flex items-center gap-3 px-2">
              <div className="relative flex-shrink-0">
                <Image
                  src={getAvatarUrl(user.avatar_url, user.display_name)}
                  alt={user.display_name}
                  width={34}
                  height={34}
                  className="rounded-full object-cover"
                />
                <span className="online-dot" />
              </div>
              <div className="flex-1 min-w-0" dir="rtl">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {user.display_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 echo-glass border-t border-sidebar-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <LayoutGroup id="mobile-nav">
          <div className="relative flex items-stretch justify-around h-16 px-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-x-2 top-1.5 bottom-1.5 rounded-2xl bg-primary/10"
                      transition={SPRING_PANEL}
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.82 }}
                    transition={SPRING_SNAPPY}
                    className="relative z-10"
                  >
                    <item.icon
                      className={cn(
                        "w-[19px] h-[19px] transition-colors duration-200",
                        active ? "text-primary stroke-[2.4]" : "text-muted-foreground"
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "relative z-10 text-[9.5px] font-medium transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </LayoutGroup>
      </nav>
    </>
  );
}
