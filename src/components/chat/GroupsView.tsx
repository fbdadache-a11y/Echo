"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Lock, Globe, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { SPRING_SNAPPY, SPRING_PANEL, SPRING_GENTLE } from "@/lib/motion";

interface GroupCreateFormProps {
  form: { name: string; description: string; is_private: boolean };
  setForm: Dispatch<SetStateAction<{ name: string; description: string; is_private: boolean }>>;
  creating: boolean;
  onCreate: () => void;
  onCancel: () => void;
}

function GroupCreateForm({ form, setForm, creating, onCreate, onCancel }: GroupCreateFormProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-foreground">مجموعة جديدة</h2>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">اسم المجموعة *</label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="مثال: فريق التسويق"
            className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground
                       placeholder:text-muted-foreground/60 text-sm outline-none
                       focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">الوصف</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="ما هي المجموعة؟"
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground
                       placeholder:text-muted-foreground/60 text-sm outline-none resize-none
                       focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => setForm(p => ({ ...p, is_private: !p.is_private }))}
            className={cn(
              "w-10 h-5.5 rounded-full transition-colors relative",
              form.is_private ? "bg-primary" : "bg-border"
            )}
          >
            <motion.span
              layout
              transition={SPRING_SNAPPY}
              className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow",
                form.is_private ? "left-5" : "left-0.5"
              )}
            />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">مجموعة خاصة</span>
            <p className="text-xs text-muted-foreground">بالدعوة فقط</p>
          </div>
        </label>
        <div className="flex gap-2 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCreate}
            disabled={!form.name.trim() || creating}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:opacity-90 transition-all disabled:opacity-50"
          >
            {creating ? "جارٍ الإنشاء…" : "إنشاء المجموعة"}
          </motion.button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground
                       hover:text-foreground hover:bg-muted/40 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </>
  );
}

interface GroupWithMeta {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  member_count: number;
  isMember: boolean;
  created_at: string;
}

interface Props {
  groups: GroupWithMeta[];
  currentUserId: string;
}

export function GroupsView({ groups: initGroups, currentUserId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [groups, setGroups] = useState(initGroups);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_private: false });
  const [tab, setTab] = useState<"all" | "mine">("all");

  const filtered = groups.filter(g => tab === "mine" ? g.isMember : true);

  async function createGroup() {
    if (!form.name.trim()) return;
    setCreating(true);

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_private: form.is_private,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (error) { toast.error("تعذّر إنشاء المجموعة"); setCreating(false); return; }

    // Auto-join as owner
    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: currentUserId,
      role: "owner",
    });

    toast.success("تم إنشاء المجموعة!");
    setGroups(prev => [{ ...group, member_count: 1, isMember: true }, ...prev]);
    setForm({ name: "", description: "", is_private: false });
    setShowCreate(false);
    setCreating(false);
    router.push(`/main/groups/${group.id}`);
  }

  async function joinGroup(groupId: string) {
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: currentUserId,
      role: "member",
    });
    if (error) { toast.error("تعذّر الانضمام"); return; }
    toast.success("انضممت إلى المجموعة!");
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, isMember: true, member_count: g.member_count + 1 } : g
    ));
    router.push(`/main/groups/${groupId}`);
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground">المجموعات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Groups</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground
                     rounded-xl text-sm font-medium hover:opacity-90 transition-all
                     hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          مجموعة جديدة
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-5 w-fit relative">
        {(["all", "mine"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === t && (
              <motion.div
                layoutId="group-tab-pill"
                transition={SPRING_PANEL}
                className="absolute inset-0 bg-background rounded-lg shadow-sm"
              />
            )}
            <span className="relative z-10">{t === "all" ? "الكل" : "مجموعاتي"}</span>
          </button>
        ))}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={SPRING_PANEL}
              className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-card border-t border-border
                         rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-center pb-3 -mt-2">
                <div className="w-9 h-1 rounded-full bg-border" />
              </div>
              <GroupCreateForm
                form={form} setForm={setForm}
                creating={creating} onCreate={createGroup}
                onCancel={() => setShowCreate(false)}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={SPRING_PANEL}
              className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4"
            >
              <div
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl"
              >
                <GroupCreateForm
                  form={form} setForm={setForm}
                  creating={creating} onCreate={createGroup}
                  onCancel={() => setShowCreate(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Groups grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 space-y-3"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING_GENTLE}
          >
            <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
          </motion.div>
          <p className="text-muted-foreground text-sm">
            {tab === "mine" ? "لم تنضم لأي مجموعة بعد" : "لا توجد مجموعات"}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-primary hover:underline"
          >
            أنشئ أول مجموعة
          </button>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.32), duration: 0.3 }}
              whileHover={{ y: -2 }}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4
                         hover:border-primary/25 hover:shadow-md hover:shadow-primary/5 transition-colors"
            >
              {/* Group header */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/12 flex items-center justify-center
                               text-primary font-bold text-lg flex-shrink-0">
                  {group.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-foreground text-sm truncate">{group.name}</h3>
                    {group.is_private ? (
                      <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {group.member_count} عضو
                </span>
              </div>

              {/* Action */}
              {group.isMember ? (
                <Link
                  href={`/main/groups/${group.id}`}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10
                             text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  فتح المجموعة
                </Link>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => joinGroup(group.id)}
                  className="py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium
                             hover:opacity-90 transition-all"
                >
                  الانضمام
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
