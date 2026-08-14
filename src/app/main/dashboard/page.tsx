import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatTime, getAvatarUrl } from "@/lib/utils";
import { MessageCircle, Users, TrendingUp, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const [groupsRes, messagesRes, dmsRes, usersRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("group:groups(id,name,description,avatar_url,created_at)")
      .eq("user_id", userId)
      .limit(4),
    supabase
      .from("messages")
      .select("id, content, created_at, sender:users(display_name, avatar_url), group:groups(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("direct_messages")
      .select("id, content, created_at, read, sender:users!sender_id(display_name, avatar_url, username)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("read", false)
      .neq("sender_id", userId)
      .limit(5),
    supabase.from("users").select("id", { count: "exact", head: true }),
  ]);

  return {
    groups: groupsRes.data ?? [],
    recentMessages: messagesRes.data ?? [],
    unreadDMs: dmsRes.data ?? [],
    totalUsers: usersRes.count ?? 0,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { groups, recentMessages, unreadDMs, totalUsers } = await getDashboardData(user.id);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح النور" : hour < 17 ? "مرحباً" : "مساء الخير";

  const STATS = [
    { icon: <Users className="w-4 h-4" />,         label: "أعضاء المجتمع", value: totalUsers },
    { icon: <MessageCircle className="w-4 h-4" />,  label: "محادثات غير مقروءة", value: unreadDMs.length },
    { icon: <Users className="w-4 h-4" />,          label: "مجموعاتك", value: groups.length },
    { icon: <TrendingUp className="w-4 h-4" />,     label: "رسائل اليوم", value: recentMessages.length },
  ];

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {greeting}، {profile?.display_name?.split(" ")[0] ?? "مرحباً"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Image
            src={getAvatarUrl(profile?.avatar_url, profile?.display_name)}
            alt={profile?.display_name ?? ""}
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-2xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{s.icon}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Recent group messages */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              آخر الرسائل
            </h2>
            <Link href="/main/chats" className="text-xs text-primary hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentMessages.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                لا توجد رسائل بعد
              </div>
            ) : (
              recentMessages.map((msg: any) => (
                <div key={msg.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <Image
                    src={getAvatarUrl(msg.sender?.avatar_url, msg.sender?.display_name)}
                    alt={msg.sender?.display_name ?? ""}
                    width={32}
                    height={32}
                    className="rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {msg.sender?.display_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.content || "📎 مرفق"}</p>
                    {msg.group?.name && (
                      <span className="text-[10px] text-primary/60 mt-0.5 block">
                        #{msg.group.name}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My groups */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              مجموعاتي
            </h2>
            <Link href="/main/groups" className="text-xs text-primary hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="divide-y divide-border">
            {groups.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">لم تنضم إلى أي مجموعة بعد</p>
                <Link
                  href="/main/groups"
                  className="inline-block text-xs px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                >
                  اكتشف المجموعات
                </Link>
              </div>
            ) : (
              groups.map((gm: any) => {
                const g = gm.group;
                if (!g) return null;
                return (
                  <Link
                    key={g.id}
                    href={`/main/groups/${g.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{g.description ?? "مجموعة Echo"}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Unread DMs */}
      {unreadDMs.length > 0 && (
        <div className="bg-primary/6 border border-primary/15 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            رسائل غير مقروءة ({unreadDMs.length})
          </h3>
          <div className="space-y-2">
            {unreadDMs.map((dm: any) => (
              <Link
                key={dm.id}
                href={`/main/chats?with=${dm.sender?.username}`}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
              >
                <Image
                  src={getAvatarUrl(dm.sender?.avatar_url, dm.sender?.display_name)}
                  alt={dm.sender?.display_name ?? ""}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{dm.sender?.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{dm.content || "📎 مرفق"}</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
