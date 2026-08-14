import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(avatarUrl?: string | null, displayName?: string) {
  if (avatarUrl) return avatarUrl;
  const seed = displayName?.replace(/\s+/g, "+") ?? "user";
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=B4637A&textColor=FAF4ED`;
}

export function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

/**
 * يحدد إن كان المستخدم متصلاً الآن فعلياً، بالاعتماد على last_seen_at
 * وليس فقط عمود is_online الخام — لأن الأخير قد "يتجمّد" على true إذا
 * أُغلق التبويب بلا استئذان (بلا استدعاء beforeunload). أي heartbeat
 * أقدم من 90 ثانية يُعتبر غير متصل، بصرف النظر عن قيمة is_online.
 */
export function isUserOnline(user?: { is_online?: boolean; last_seen_at?: string } | null) {
  if (!user?.is_online || !user.last_seen_at) return false;
  const secondsSinceSeen = (Date.now() - new Date(user.last_seen_at).getTime()) / 1000;
  return secondsSinceSeen < 90;
}
