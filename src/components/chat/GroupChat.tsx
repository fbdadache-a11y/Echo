"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { formatTime, getAvatarUrl, cn, isUserOnline } from "@/lib/utils";
import {
  Send, Users, ArrowRight, Lock, Globe, UserPlus, X,
  Reply, Trash2, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { Message, GroupMember, Attachment, PendingUpload } from "@/types";
import { createPendingUpload, uploadAttachment, getPublicUrl, MAX_FILE_SIZE } from "@/lib/attachments";
import { SPRING_SNAPPY, SPRING_PANEL } from "@/lib/motion";
import { AttachButton } from "@/components/chat/AttachButton";
import { AttachmentStaging } from "@/components/chat/AttachmentStaging";
import { AttachmentBubble } from "@/components/chat/AttachmentBubble";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { ReplyPreviewBar, ReplyQuote } from "@/components/chat/ReplyPreview";

interface Group {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string;
}

interface Props {
  group: Group;
  initialMessages: Message[];
  members: GroupMember[];
  currentUserId: string;
  isMember: boolean;
  userRole: "owner" | "admin" | "member" | null;
}

export function GroupChat({
  group,
  initialMessages,
  members,
  currentUserId,
  isMember,
  userRole,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
        .from("messages")
        .select(
          "*, sender:users!sender_id(id,username,display_name,avatar_url)," +
            "attachments(*), reactions:message_reactions(*, user:users(id,username,display_name,avatar_url))," +
            "reply_to:messages!reply_to_id(id,content,deleted_at,sender:users!sender_id(display_name), attachments(id))"
        )
        .eq("id", id)
        .single();
      if (!data) return;
      const hydrated = { ...(data as any), attachments: resolveAttachmentUrls((data as any).attachments ?? []) };
      setMessages((prev) => prev.map((m) => (m.id === id ? hydrated : m)));
    },
    [supabase, resolveAttachmentUrls]
  );

  // Realtime — رسائل، مرفقات، تفاعلات
  useEffect(() => {
    if (!isMember) return;

    const channel = supabase
      .channel(`group-messages-${group.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${group.id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, sender: null } as any];
          });
          hydrateMessage(payload.new.id as string);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `group_id=eq.${group.id}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)));
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attachments" }, (payload) => {
        if (!payload.new.message_id) return;
        hydrateMessage(payload.new.message_id as string);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload: any) => {
        const msgId = payload.new?.message_id ?? payload.old?.message_id;
        if (!msgId) return;
        hydrateMessage(msgId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, isMember, supabase, hydrateMessage]);

  function handleFiles(files: File[]) {
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(`الملف "${oversized.name}" أكبر من الحد المسموح (100MB)`);
      files = files.filter((f) => f.size <= MAX_FILE_SIZE);
    }
    if (files.length === 0) return;

    Promise.all(files.map(createPendingUpload)).then((items) => {
      setPending((prev) => [...prev, ...items]);
    });
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function sendMessage() {
    if ((!input.trim() && pending.length === 0) || sending || !isMember) return;
    const content = input.trim();
    const filesToUpload = pending;
    const replySnapshot = replyTo;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: any = {
      id: tempId,
      group_id: group.id,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      edited_at: null,
      reply_to_id: replySnapshot?.id ?? null,
      reply_to: replySnapshot,
      sender: members.find((m: any) => m.user?.id === currentUserId)?.user ?? null,
      attachments: [],
      reactions: [],
      _pendingAttachments: filesToUpload,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    setPending([]);
    setReplyTo(null);
    setSending(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const { data, error } = await supabase
      .from("messages")
      .insert({
        group_id: group.id,
        sender_id: currentUserId,
        content: content || null,
        reply_to_id: replySnapshot?.id ?? null,
      })
      .select("*, sender:users!sender_id(id,username,display_name,avatar_url)")
      .single();

    if (error || !data) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("تعذّر إرسال الرسالة");
      setSending(false);
      return;
    }

    const realId = (data as any).id;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? { ...(data as any), attachments: [], reactions: [], reply_to: replySnapshot, _pendingAttachments: filesToUpload }
          : m
      )
    );

    if (filesToUpload.length > 0) {
      for (const item of filesToUpload) {
        try {
          const meta = await uploadAttachment(supabase, currentUserId, item);
          await supabase.from("attachments").insert({ ...meta, message_id: realId });
        } catch {
          toast.error(`تعذّر رفع "${item.file.name}"`);
        }
      }
      await hydrateMessage(realId);
      setMessages((prev) => prev.map((m) => (m.id === realId ? { ...m, _pendingAttachments: undefined } : m)));
    }

    setSending(false);
  }

  async function toggleReaction(message: Message, emoji: string) {
    const existing = message.reactions?.find((r) => r.user_id === currentUserId && r.emoji === emoji);
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: message.id, user_id: currentUserId, emoji });
    }
    hydrateMessage(message.id);
  }

  async function deleteMessage(message: Message) {
    if (message.sender_id !== currentUserId) return;
    setOpenMenuId(null);
    await supabase.from("messages").update({ content: null, deleted_at: new Date().toISOString() }).eq("id", message.id);
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

  async function joinGroup() {
    setJoining(true);
    const { error } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: currentUserId,
      role: "member",
    });
    if (error) {
      toast.error("تعذّر الانضمام");
      setJoining(false);
      return;
    }
    toast.success("انضممت إلى المجموعة!");
    router.refresh();
  }

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("ar-SA", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (date !== currentDate) {
      groupedMessages.push({ date, msgs: [msg] });
      currentDate = date;
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  return (
    <div
      className="flex h-[calc(100%-4rem-env(safe-area-inset-bottom))] min-h-0 md:h-full"
      dir="rtl"
      onDragOver={(e) => {
        e.preventDefault();
        if (isMember) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!isMember) return;
        handleFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 relative">
        {/* Header */}
        <div className="h-14 border-b border-border px-4 flex items-center gap-3 echo-glass flex-shrink-0 z-10">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-xl hover:bg-muted/40"
          >
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <div className="w-8 h-8 rounded-xl bg-primary/12 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {group.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-foreground text-sm truncate">{group.name}</h2>
              {group.is_private ? (
                <Lock className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Globe className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            {group.description && (
              <p className="text-[11px] text-muted-foreground truncate">{group.description}</p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowMembers(!showMembers)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-colors",
              showMembers ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            {members.length}
          </motion.button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          {messages.length === 0 && isMember && (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <p className="font-serif italic text-2xl text-primary/30 mb-2">كن أول من يتحدث</p>
              <p>ابدأ المحادثة في {group.name}</p>
            </div>
          )}

          {groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground bg-background px-2 rounded-full border border-border">
                  {date}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-1.5">
                {msgs.map((msg, i) => {
                  const isMe = msg.sender_id === currentUserId;
                  const sender = (msg as any).sender;
                  const prevMsg = msgs[i - 1];
                  const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                  const isTemp = msg.id.startsWith("temp-");
                  const isDeleted = !!msg.deleted_at;
                  const hasAttachments =
                    (msg.attachments?.length ?? 0) > 0 || (msg._pendingAttachments?.length ?? 0) > 0;

                  return (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={SPRING_PANEL}
                      ref={(el) => {
                        if (el) messageRefs.current.set(msg.id, el);
                      }}
                      className={cn(
                        "flex items-end gap-2 group/msg rounded-xl transition-colors",
                        isMe ? "flex-row-reverse" : "flex-row",
                        !showAvatar && (isMe ? "pr-9" : "pl-9")
                      )}
                    >
                      {!isMe && showAvatar && (
                        <Image
                          src={getAvatarUrl(sender?.avatar_url, sender?.display_name)}
                          alt={sender?.display_name ?? ""}
                          width={28}
                          height={28}
                          className="rounded-full flex-shrink-0 mb-0.5"
                        />
                      )}
                      <div className="max-w-[76%] space-y-0.5 relative">
                        {!isMe && showAvatar && sender && (
                          <p className="text-[10px] text-muted-foreground px-1">{sender.display_name}</p>
                        )}

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
                            isTemp && "opacity-60",
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
                                          {p.kind === "image" && (
                                            <img src={p.previewUrl} className="w-full h-full object-cover opacity-70" />
                                          )}
                                          {p.kind === "video" && (
                                            <video src={p.previewUrl} className="w-full h-full object-cover opacity-70" muted />
                                          )}
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

                              {msg.content && <p className={cn(hasAttachments && "px-2.5")}>{msg.content}</p>}
                              <p
                                className={cn(
                                  "text-[10px] mt-1",
                                  hasAttachments && "px-2.5",
                                  isMe ? "text-primary-foreground/55 text-left" : "text-muted-foreground text-right"
                                )}
                              >
                                {isTemp ? "جارٍ الإرسال…" : formatTime(msg.created_at)}
                                {msg.edited_at && " · تم التعديل"}
                              </p>
                            </>
                          )}
                        </div>

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
              </div>
            </div>
          ))}
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

        {/* Input */}
        <div
          className="border-t border-border echo-glass flex-shrink-0 px-0 pt-0"
          style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
        >
          {isMember ? (
            <>
              <AnimatePresence>
                {replyTo && (
                  <ReplyPreviewBar
                    senderName={replyTo.sender_id === currentUserId ? "نفسك" : (replyTo as any).sender?.display_name ?? "مستخدم"}
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
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`رسالة في ${group.name}…`}
                  rows={1}
                  dir="rtl"
                  className="flex-1 resize-none px-4 py-2.5 rounded-2xl bg-input border border-border
                             text-foreground placeholder:text-muted-foreground/60 text-sm outline-none
                             focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all
                             max-h-32 overflow-y-auto"
                  onInput={(e) => {
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
                  className="w-11 h-11 flex-shrink-0 bg-primary text-primary-foreground rounded-2xl
                             flex items-center justify-center disabled:pointer-events-none shadow-sm"
                >
                  <Send className="w-[18px] h-[18px] rotate-180" />
                </motion.button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-2 py-1">
              <p className="text-sm text-muted-foreground">انضم للمجموعة للمشاركة</p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={joinGroup}
                disabled={joining}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                           hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {joining ? "جارٍ الانضمام…" : "انضم إلى المجموعة"}
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Members panel — Desktop */}
      {showMembers && (
        <div className="hidden md:flex w-52 border-r border-border bg-sidebar/40 flex-col flex-shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">الأعضاء ({members.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="relative flex-shrink-0">
                  <Image
                    src={getAvatarUrl(m.user?.avatar_url, m.user?.display_name)}
                    alt={m.user?.display_name ?? ""}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                  {isUserOnline(m.user) && <span className="online-dot" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{m.user?.display_name}</p>
                  {m.role !== "member" && (
                    <p className="text-[10px] text-primary">{m.role === "owner" ? "المالك" : "مشرف"}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members panel — Mobile */}
      <AnimatePresence>
        {showMembers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembers(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={SPRING_PANEL}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl border-t border-border
                         max-h-[70vh] flex flex-col"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex items-center justify-center pt-2.5 pb-1 flex-shrink-0">
                <div className="w-9 h-1 rounded-full bg-border" />
              </div>
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-semibold text-foreground">الأعضاء ({members.length})</h3>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowMembers(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted/40"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-0.5">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="relative flex-shrink-0">
                      <Image
                        src={getAvatarUrl(m.user?.avatar_url, m.user?.display_name)}
                        alt={m.user?.display_name ?? ""}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      {isUserOnline(m.user) && <span className="online-dot" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.user?.display_name}</p>
                      {m.role !== "member" && (
                        <p className="text-[11px] text-primary">{m.role === "owner" ? "المالك" : "مشرف"}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
