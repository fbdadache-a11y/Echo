import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GroupsView } from "@/components/chat/GroupsView";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: allGroups } = await supabase
    .from("groups")
    .select("*, member_count:group_members(count)")
    .order("created_at", { ascending: false });

  const { data: myMemberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const myGroupIds = new Set((myMemberships ?? []).map((m: any) => m.group_id));

  const groups = (allGroups ?? []).map((g: any) => ({
    ...g,
    member_count: g.member_count?.[0]?.count ?? 0,
    isMember: myGroupIds.has(g.id),
  }));

  return <GroupsView groups={groups} currentUserId={user.id} />;
}
