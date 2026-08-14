"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { formatTime, getAvatarUrl, cn, isUserOnline } from "@/lib/utils";
import {
  Send, Search, Plus, MessageCircle, ArrowRight, Check, CheckCheck, AlertCircle,
  Reply, Trash2, MoreVertical,
} from "lucide-react";
import type { User, Conversation, DirectMessage, Attachment, PendingUpload } from "@/types";
import { toast } from "sonner";
import { createPendingUpload, uploadAttachment, getPublicUrl, MAX_FILE_SIZE } from "@/lib/attachments";
import { AttachButton } from "@/components/chat/AttachButton";
import { AttachmentStaging } from "@/components/chat/AttachmentStaging";
import { AttachmentBubble } from "@/components/chat/AttachmentBubble";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { ReplyPreviewBar, ReplyQuote } from "@/components/chat/ReplyPreview";
import { SPRING_SNAPPY, SPRING_PANEL, SPRING_GENTLE, SPRING_VIEW_SWAP } from "@/lib/motion";

interface Props {
  currentUserId: string;
  conversations: Conversation[];
  allUsers: User[];
}

export function ChatLayout({ currentUserId, conversations: initConvs, allUsers }: Props) {
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Heartbeat لحالة "متصل الآن" — يُحدَّث كل 45 ثانية طالما التبويب مفتوح
  useEffect(() => {
    supabase.rpc("touch_presence");
    const interval = setInterval(() => supabase.rpc("touch_presence"), 45000);
    return () => clearInterval(interval);
  }, [supabase]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(initConvs);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const withUsername = searchParams.get("with");
    if (!withUsername) return;

    const fromConv = conversations.find(c => c.other_user.username === withUsername)?.other_user;
    const fromAllUsers = allUsers.find(u => u.username === withUsername);
    const target = fromConv ?? fromAllUsers;

    if (target) {
      setActiveUser(target);
      setView("chat");
    } else {
      toast.error("تعذّر العثور على هذا المستخدم");
    }
    router.replace("/main/chats");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveAttachmentUrls = useCallback(
    (atts: Attachment[]): Attachment[] =>
      atts.map((a) => ({
        ...a,
        url: getPublicUrl(supabase, a.bucket, a.path),
        thumbnail_url: a.thumbnail_path ? getPublicUrl(supabase, a.bucket, a.thumbnail_path) : undefined,
      })),
    [supabase]
  );

  const hydrateMessage = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("direct_messages")
        .select(
          "*, sender:users!sender_id(id,username,display_name,avatar_url)," +
            "attachments(*), reactions:message_reactions(*, user:users(id,username,display_name,avatar_url))," +
            "reply_to:direct_messages!reply_to_id(id,content,deleted_at,sender:users!sender_id(display_name), attachments(id))"
        )
        .eq("id", id)
        .single();
      if (!data) return;
      const hydrated = { ...(data as any), attachments: resolveAttachmentUrls((data as any).attachments ?? []) };
      setMessages((prev) => prev.map((m) => (m.id === id ? hydrated : m)));
    },
    [supabase, resolveAttachmentUrls]
  );

  // Realtime: تحديث قائمة المحادثات عند وصول رسالة جديدة
  useEffect(() => {
    const channel = supabase
      .channel(`conversations-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `receiver_id=eq.${currentUserId}` },
        (payload) => {
          const message = payload.new as DirectMessage;
          setConversations((prev) => {
            const existing = prev.find((c) => c.other_user.id === message.sender_id);
            if (existing) {
              return [
                {
                  ...existing,
                  last_message: message,
                  unread_count: activeUser?.id === message.sender_id ? existing.unread_count : existing.unread_count + 1,
                },
                ...prev.filter((c) => c.other_user.id !== message.sender_id),
              ];
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setTimeout(() => channel.subscribe(), 2000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, activeUser?.id]);

  // Realtime: حالة الاتصال لكل جهات الاتصال المعروضة
  useEffect(() => {
    const ids = conversations.map((c) => c.other_user.id);
    if (activeUser) ids.push(activeUser.id);
    if (ids.length === 0) return;

    const channel = supabase
      .channel(`presence-watch`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        (payload) => {
          const updated = payload.new as any;
          setConversations((prev) =>
            prev.map((c) => (c.other_user.id === updated.id ? { ...c, other_user: { ...c.other_user, ...updated } } : c))
          );
          setActiveUser((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, conversations.length, activeUser?.id]);

  useEffect(() => {
    if (!activeUser) return;
    loadMessages(activeUser.id);

    const channel = supabase
      .channel(`dm-${currentUserId}-${activeUser.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages", filter: `sender_id=eq.${activeUser.id}`,
      }, (payload) => {
        if (payload.new.receiver_id !== currentUserId) return;
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, { ...payload.new, sender: activeUser } as DirectMessage];
        });
        hydrateMessage(payload.new.id as string);
        supabase.from("direct_messages").update({ read: true }).eq("id", payload.new.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attachments" }, (payload) => {
        if (!payload.new.direct_message_id) return;
        hydrateMessage(payload.new.direct_message_id as string);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload: any) => {
        const msgId = payload.new?.direct_message_id ?? payload.old?.direct_message_id;
        if (!msgId) return;
        hydrateMessage(msgId);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setTimeout(() => channel.subscribe(), 2000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function loadMessages(otherId: string) {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from("direct_messages")
      .select(
        "*, sender:users!sender_id(id,username,display_name,avatar_url)," +
          "attachments(*), reactions:message_reactions(*, user:users(id,username,display_name,avatar_url))," +
          "reply_to:direct_messages!reply_to_id(id,content,deleted_at,sender:users!sender_id(display_name), attachments(id))"
      )
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true })
      .limit(100);

    setLoadingMsgs(false);

    if (error) {
      toast.error(`تعذّر تحميل الرسائل: ${error.message}`);
      return;
    }
    const hydrated = ((data as any) ?? []).map((m: any) => ({ ...m, attachments: resolveAttachmentUrls(m.attachments ?? []) }));
    setMessages(hydrated);

    await supabase.from("direct_messages").update({ read: true }).eq("sender_id", otherId).eq("receiver_id", currentUserId);
  }

  function openChat(user: User) {
    setActiveUser(user);
    setShowNewChat(false);
    setView("chat");
    setReplyTo(null);
  }

  function backToList() {
    setView("list");
  }

  function handleFiles(files: File[]) {
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(`الملف "${oversized.name}" أكبر من الحد المسموح (100MB)`);
      files = files.filter((f) => f.size <= MAX_FILE_SIZE);
    }
    if (files.length === 0) return;
    Promise.all(files.map(createPendingUpload)).then((items) => setPending((prev) => [...prev, ...items]));
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function sendMessage() {
    if ((!input.trim() && pending.length === 0) || !activeUser || sending) return;
    const content = input.trim();
    const filesToUpload = pending;
    const replySnapshot = replyTo;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, sender_id: currentUserId, receiver_id: activeUser.id,
      content, read: false, created_at: new Date().toISOString(), sender: null,
      reply_to_id: replySnapshot?.id ?? null, reply_to: replySnapshot,
      attachments: [], reactions: [], _pendingAttachments: filesToUpload,
      _status: "sending",
    } as any]);
    setInput("");
    setPending([]);
    setReplyTo(null);
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        sender_id: currentUserId,
        receiver_id: activeUser.id,
        content: content || null,
        reply_to_id: replySnapshot?.id ?? null,
      })
      .select("*, sender:users!sender_id(id,username,display_name,avatar_url)")
      .single();

    if (error || !data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: "failed" } as any : m));
      toast.error("تعذّر إرسال الرسالة");
      setSending(false);
      return;
    }

    const realId = (data as any).id;
    setMessages(prev => prev.map(m => m.id === tempId
      ? { ...(data as any), attachments: [], reactions: [], reply_to: replySnapshot, _pendingAttachments: filesToUpload, _status: "sent" }
      : m
    ));

    if (filesToUpload.length > 0) {
      for (const item of filesToUpload) {
        try {
          const meta = await uploadAttachment(supabase, currentUserId, item);
          await supabase.from("attachments").insert({ ...meta, direct_message_id: realId });
        } catch {
          toast.error(`تعذّر رفع "${item.file.name}"`);
        }
      }
      await hydrateMessage(realId);
      setMessages((prev) => prev.map((m) => (m.id === realId ? { ...m, _pendingAttachments: undefined } : m)));
    }

    setSending(false);
  }

  function retrySend(failedMsg: any) {
    setMessages(prev => prev.filter(m => m.id !== failedMsg.id));
    setInput(failedMsg.content ?? "");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function toggleReaction(message: DirectMessage, emoji: string) {
    const existing = message.reactions?.find((r) => r.user_id === currentUserId && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ direct_message_id: message.id, user_id: currentUserId, emoji });
    }
    hydrateMessage(message.id);
  }

  async function deleteMessage(message: DirectMessage) {
    if (message.sender_id !== currentUserId) return;
    setOpenMenuId(null);
    await supabase.from("direct_messages").update({ content: null, deleted_at: new Date().toISOString() }).eq("id", message.id);
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, content: "", deleted_at: new Date().toISOString(), attachments: [] } : m))
    );
  }

  function scrollToMessage(id: string) {
    const el = messageRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("echo-highlight-flash");
    setTimeout(() => el.classList.remove("echo-highlight-flash"), 1200);
  }

  const filteredConvs = conversations.filter(c =>
    c.other_user.display_name.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.other_user.username.toLowerCase().includes(searchQ.toLowerCase())
  );

  // ── Conversation List ──────────────────────────────────
  const ConvList = (
    <div className="flex flex-col h-full min-h-0 bg-sidebar/30">
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-base" dir="rtl">المحادثات</h2>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowNewChat(!showNewChat)}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              showNewChat ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <motion.span animate={{ rotate: showNewChat ? 45 : 0 }} transition={SPRING_SNAPPY}>
              <Plus className="w-4 h-4" />
            </motion.span>
          </motion.button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="بحث…"
            dir="rtl"
            className="w-full pr-9 pl-3 py-2.5 text-sm rounded-2xl bg-background border border-border
                       text-foreground placeholder:text-muted-foreground/60 outline-none
                       focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showNewChat && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="border-b border-border bg-background/60 flex-shrink-0 overflow-hidden"
          >
            <div className="px-3 py-2">
              <p className="text-[11px] text-muted-foreground mb-2 px-1" dir="rtl">بدء محادثة مع…</p>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {allUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3" dir="rtl">لا يوجد أعضاء آخرون</p>
                ) : allUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => openChat(u)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-primary/8 active:bg-primary/12 transition-colors text-right"
                  >
                    <div className="relative flex-shrink-0">
                      <Image src={getAvatarUrl(u.avatar_url, u.display_name)} alt={u.display_name} width={30} height={30} className="rounded-full" />
                      {isUserOnline(u) && <span className="online-dot" />}
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs font-medium text-foreground truncate">{u.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {filteredConvs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={SPRING_GENTLE}
              className="w-14 h-14 mx-auto rounded-2xl bg-primary/8 flex items-center justify-center"
            >
              <MessageCircle className="w-6 h-6 text-primary/50" />
            </motion.div>
            <p dir="rtl">لا توجد محادثات بعد</p>
            <button onClick={() => setShowNewChat(true)} className="text-primary text-sm font-medium hover:underline" dir="rtl">
              ابدأ محادثة جديدة
            </button>
          </div>
        ) : filteredConvs.map((conv, i) => (
          <motion.button
            key={conv.other_user.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
            whileTap={{ scale: 0.98, backgroundColor: "var(--accent)" }}
            onClick={() => openChat(conv.other_user)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors",
              activeUser?.id === conv.other_user.id && "bg-primary/8"
            )}
          >
            <div className="relative flex-shrink-0">
              <Image
                src={getAvatarUrl(conv.other_user.avatar_url, conv.other_user.display_name)}
                alt={conv.other_user.display_name}
                width={44} height={44} className="rounded-full"
              />
              {isUserOnline(conv.other_user) && <span className="online-dot" />}
              {conv.unread_count > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_SNAPPY}
                  className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {conv.unread_count}
                </motion.span>
              )}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-semibold text-foreground truncate">{conv.other_user.display_name}</span>
                {conv.last_message && (
                  <span className="text-[10.5px] text-muted-foreground flex-shrink-0">{formatTime(conv.last_message.created_at)}</span>
                )}
              </div>
              {conv.last_message && (
                <p className={cn("text-xs truncate mt-0.5", conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {conv.last_message.deleted_at
                    ? "تم حذف الرسالة"
                    : conv.last_message.content || "📎 مرفق"}
                </p>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  // ── Chat Window ────────────────────────────────────────
  const ChatWindow = activeUser ? (
    <div
      className="flex flex-col h-full min-h-0 relative"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {/* Header */}
      <div className="h-14 border-b border-border px-3 flex items-center gap-2.5 echo-glass flex-shrink-0 z-10">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={backToList}
          className="md:hidden text-muted-foreground hover:text-foreground p-2 -mr-1 rounded-xl hover:bg-muted/40 transition-colors"
        >
          <ArrowRight className="w-4.5 h-4.5" />
        </motion.button>
        <div className="relative flex-shrink-0">
          <Image src={getAvatarUrl(activeUser.avatar_url, activeUser.display_name)} alt={activeUser.display_name} width={34} height={34} className="rounded-full" />
          {isUserOnline(activeUser) && <span className="online-dot" />}
        </div>
        <div className="text-right min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{activeUser.display_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {isUserOnline(activeUser) ? (
              <span className="text-echo-online">متصل الآن</span>
            ) : (
              `@${activeUser.username}`
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-4 space-y-1.5">
        {loadingMsgs && (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-5 h-5 rounded-full border-2 border-primary/25 border-t-primary"
            />
          </div>
        )}
        {!loadingMsgs && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-14 text-sm text-muted-foreground"
            dir="rtl"
          >
            <p className="font-serif italic text-2xl text-primary/30 mb-1.5">ابدأ المحادثة</p>
            <p>أرسل رسالة إلى {activeUser.display_name}</p>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const status = (msg as any)._status as ("sending" | "sent" | "failed" | undefined);
            const isTemp = msg.id.startsWith("temp-");
            const isDeleted = !!msg.deleted_at;
            const hasAttachments = (msg.attachments?.length ?? 0) > 0 || (msg._pendingAttachments?.length ?? 0) > 0;

            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={SPRING_PANEL}
                ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                className={cn("flex items-end gap-2 group/msg rounded-xl transition-colors", isMe ? "flex-row-reverse" : "flex-row")}
              >
                {!isMe && (
                  <Image
                    src={getAvatarUrl((msg.sender as any)?.avatar_url, (msg.sender as any)?.display_name)}
                    alt="" width={26} height={26} className="rounded-full flex-shrink-0 mb-0.5"
                  />
                )}
                <div className="flex flex-col gap-0.5 max-w-[76%] relative">
                  {!isTemp && !isDeleted && (
                    <div
                      className={cn(
                        "absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-0.5 z-10",
                        isMe ? "-left-16" : "-right-16"
                      )}
                    >
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        aria-label="رد"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {isMe && (
                        <button
                          onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                          className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="خيارات"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {openMenuId === msg.id && (
                    <div
                      className={cn(
                        "absolute top-8 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[130px]",
                        isMe ? "-left-16" : "-right-16"
                      )}
                    >
                      <button
                        onClick={() => deleteMessage(msg)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف الرسالة
                      </button>
                    </div>
                  )}

                  <div
                    className={cn(
                      "px-4 py-2.5 text-sm leading-relaxed",
                      isMe ? "echo-bubble-out" : "echo-bubble-in",
                      status === "sending" && "opacity-60",
                      status === "failed" && "opacity-70 ring-1 ring-destructive/50",
                      isDeleted && "opacity-60 italic",
                      hasAttachments && !isDeleted && "px-1.5 py-1.5"
                    )}
                  >
                    {isDeleted ? (
                      <p className="text-xs">تم حذف هذه الرسالة</p>
                    ) : (
                      <>
                        {msg.reply_to && (
                          <ReplyQuote
                            senderName={(msg.reply_to as any).sender?.display_name ?? "مستخدم"}
                            content={msg.reply_to.deleted_at ? null : msg.reply_to.content}
                            hasAttachment={((msg.reply_to as any).attachments?.length ?? 0) > 0}
                            isMe={isMe}
                            onClick={() => scrollToMessage(msg.reply_to!.id)}
                          />
                        )}

                        {hasAttachments && (
                          <div className={cn(msg.content && "mb-1.5")}>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <AttachmentBubble attachments={msg.attachments} isMe={isMe} />
                            )}
                            {msg._pendingAttachments && msg._pendingAttachments.length > 0 && (
                              <div className="grid grid-cols-2 gap-1">
                                {msg._pendingAttachments.map((p) => (
                                  <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-black/10">
                                    {p.kind === "image" && <img src={p.previewUrl} className="w-full h-full object-cover opacity-70" />}
                                    {p.kind === "video" && <video src={p.previewUrl} className="w-full h-full object-cover opacity-70" muted />}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                        className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {msg.content && <p className={cn("whitespace-pre-wrap break-words", hasAttachments && "px-2.5")}>{msg.content}</p>}
                      </>
                    )}
                  </div>
                  {!isDeleted && (
                    <div className={cn("flex items-center gap-1 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                      <span className="text-[10px] text-muted-foreground">
                        {isTemp && status === "sending" ? "…" : formatTime(msg.created_at)}
                      </span>
                      {isMe && status === "sending" && <Check className="w-3 h-3 text-muted-foreground/60" />}
                      {isMe && (status === "sent" || (!status && !isTemp)) && <CheckCheck className="w-3 h-3 text-primary/70" />}
                      {isMe && status === "failed" && (
                        <button onClick={() => retrySend(msg)} className="flex items-center gap-1 text-destructive text-[10px] hover:underline">
                          <AlertCircle className="w-3 h-3" />
                          إعادة المحاولة
                        </button>
                      )}
                    </div>
                  )}

                  {!isTemp && !isDeleted && (
                    <div className={cn(!msg.reactions?.length && "opacity-0 group-hover/msg:opacity-100 transition-opacity")}>
                      <MessageReactions
                        reactions={msg.reactions ?? []}
                        currentUserId={currentUserId}
                        onToggle={(emoji) => toggleReaction(msg, emoji)}
                        isMe={isMe}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-primary/10 border-2 border-dashed border-primary rounded-2xl m-2
                       flex items-center justify-center pointer-events-none"
          >
            <p className="text-primary font-semibold">أفلت الملفات هنا للإرسال</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div
        className="border-t border-border echo-glass flex-shrink-0 px-0 pt-0"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {replyTo && (
            <ReplyPreviewBar
              senderName={replyTo.sender_id === currentUserId ? "نفسك" : activeUser.display_name}
              content={replyTo.content}
              hasAttachment={(replyTo.attachments?.length ?? 0) > 0}
              onCancel={() => setReplyTo(null)}
            />
          )}
        </AnimatePresence>
        <AttachmentStaging items={pending} onRemove={removePending} />
        <div className="flex items-end gap-2 px-3 pt-2.5">
          <AttachButton onFiles={handleFiles} disabled={sending} />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="اكتب رسالة…"
            rows={1}
            dir="rtl"
            className="flex-1 resize-none px-4 py-2.5 rounded-2xl bg-input border border-border text-foreground
                       placeholder:text-muted-foreground/60 text-sm outline-none max-h-32
                       focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            animate={{
              scale: input.trim() || pending.length > 0 ? 1 : 0.94,
              opacity: input.trim() || pending.length > 0 ? 1 : 0.5,
            }}
            transition={SPRING_SNAPPY}
            onClick={sendMessage}
            disabled={(!input.trim() && pending.length === 0) || sending}
            className="w-11 h-11 flex-shrink-0 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center disabled:pointer-events-none shadow-sm"
          >
            <Send className="w-[18px] h-[18px] rotate-180" />
          </motion.button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING_GENTLE}
        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
      >
        <MessageCircle className="w-7 h-7 text-primary" />
      </motion.div>
      <div dir="rtl">
        <p className="font-semibold text-foreground">اختر محادثة للبدء</p>
        <p className="text-sm text-muted-foreground mt-1">أو أنشئ محادثة جديدة</p>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-[calc(100%-4rem-env(safe-area-inset-bottom))] min-h-0 overflow-hidden md:h-full"
      dir="rtl"
    >
      <div className="hidden md:flex w-72 flex-shrink-0 border-l border-border h-full">
        {ConvList}
      </div>
      <div className="hidden md:flex flex-1 min-w-0 h-full">
        {ChatWindow}
      </div>

      <div className="flex md:hidden flex-1 h-full min-h-0 relative overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {view === "list" ? (
            <motion.div
              key="list"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={SPRING_VIEW_SWAP}
              className="absolute inset-0 flex flex-col min-h-0"
            >
              {ConvList}
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={SPRING_VIEW_SWAP}
              className="absolute inset-0 flex flex-col min-h-0"
            >
              {ChatWindow}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
