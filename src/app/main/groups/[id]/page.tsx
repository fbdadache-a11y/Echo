import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { GroupChat } from "@/components/chat/GroupChat";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership && group.is_private) {
    redirect("/main/groups");
  }

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "*, sender:users!sender_id(id,username,display_name,avatar_url)," +
        "attachments(*), reactions:message_reactions(*, user:users(id,username,display_name,avatar_url))," +
        "reply_to:messages!reply_to_id(id,content,deleted_at,sender:users!sender_id(display_name), attachments(id))"
    )
    .eq("group_id", id)
    .order("created_at", { ascending: true })
    .limit(80);

  const { data: members } = await supabase
    .from("group_members")
    .select("*, user:users(id,username,display_name,avatar_url,is_online,last_seen_at)")
    .eq("group_id", id);

  // حلّ الروابط العامة للمرفقات (البكتات عامة، فلا حاجة لتوقيع الروابط)
  const messagesWithUrls = ((messages as any) ?? []).map((m: any) => ({
    ...m,
    attachments: (m.attachments ?? []).map((a: any) => ({
      ...a,
      url: supabase.storage.from(a.bucket).getPublicUrl(a.path).data.publicUrl,
      thumbnail_url: a.thumbnail_path
        ? supabase.storage.from(a.bucket).getPublicUrl(a.thumbnail_path).data.publicUrl
        : undefined,
    })),
  }));

  return (
    <GroupChat
      group={group}
      initialMessages={messagesWithUrls}
      members={(members as any) ?? []}
      currentUserId={user.id}
      isMember={!!membership}
      userRole={(membership?.role as any) ?? null}
    />
  );
}
