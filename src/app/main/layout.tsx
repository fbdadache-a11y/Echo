import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  let profile = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (!user) {
      redirect("/auth/login");
    }

    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    profile = profileData;
  } catch (error) {
    // If redirect throws it's expected — rethrow
    throw error;
  }

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden">
      <Sidebar user={profile} />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
