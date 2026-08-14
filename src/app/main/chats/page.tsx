import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatLayoutSkeleton } from "@/components/chat/ChatLayoutSkeleton";

export default async function ChatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get all conversations (last message per user)
  const { data: sentDMs } = await supabase
    .from("direct_messages")
    .select("*, receiver:users!receiver_id(id,username,display_name,avatar_url,is_online,last_seen_at)")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });

  const { data: receivedDMs } = await supabase
    .from("direct_messages")
    .select("*, sender:users!sender_id(id,username,display_name,avatar_url,is_online,last_seen_at)")
    .eq("receiver_id", user.id)
    .order("created_at", { ascending: false });

  // Build conversation list
  const convMap = new Map<string, any>();

  for (const dm of sentDMs ?? []) {
    const other = dm.receiver;
    if (!other || convMap.has(other.id)) continue;
    convMap.set(other.id, { other_user: other, last_message: dm, unread_count: 0 });
  }
  for (const dm of receivedDMs ?? []) {
    const other = dm.sender;
    if (!other) continue;
    if (convMap.has(other.id)) {
      const c = convMap.get(other.id)!;
      if (!dm.read) c.unread_count++;
      if (!c.last_message || new Date(dm.created_at) > new Date(c.last_message.created_at)) {
        c.last_message = dm;
      }
    } else {
      convMap.set(other.id, {
        other_user: other,
        last_message: dm,
        unread_count: dm.read ? 0 : 1,
      });
    }
  }

  const conversations = [...convMap.values()].sort((a, b) =>
    new Date(b.last_message?.created_at ?? 0).getTime() -
    new Date(a.last_message?.created_at ?? 0).getTime()
  );

  const { data: allUsers } = await supabase
    .from("users")
    .select("id,username,display_name,avatar_url,is_online,last_seen_at")
    .neq("id", user.id)
    .limit(20);

  return (
    <Suspense fallback={<ChatLayoutSkeleton />}>
      <ChatLayout
        currentUserId={user.id}
        conversations={conversations}
        allUsers={allUsers ?? []}
      />
    </Suspense>
  );
}
