export interface User {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  is_online?: boolean;
  last_seen_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  is_private: boolean;
  member_count?: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  user?: User;
}

export type AttachmentKind = "image" | "video" | "audio" | "file";

export interface Attachment {
  id: string;
  message_id?: string | null;
  direct_message_id?: string | null;
  uploader_id: string;
  kind: AttachmentKind;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  thumbnail_path?: string | null;
  created_at: string;
  /** رابط عام مُحسوب على العميل، غير مخزَّن في القاعدة */
  url?: string;
  thumbnail_url?: string;
}

export interface Reaction {
  id: string;
  message_id?: string | null;
  direct_message_id?: string | null;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: User;
}

export interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  edited_at?: string;
  deleted_at?: string | null;
  reply_to_id?: string | null;
  sender?: User;
  attachments?: Attachment[];
  reactions?: Reaction[];
  reply_to?: Message | null;
  /** حالة محلية مؤقتة لرسالة يتم إرسالها (لا تُخزَّن في قاعدة البيانات) */
  _status?: "sending" | "sent" | "failed";
  /** مرفقات محلية قيد الرفع، قبل توفر السجل النهائي في القاعدة */
  _pendingAttachments?: PendingUpload[];
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  read: boolean;
  created_at: string;
  deleted_at?: string | null;
  reply_to_id?: string | null;
  sender?: User;
  receiver?: User;
  attachments?: Attachment[];
  reactions?: Reaction[];
  reply_to?: DirectMessage | null;
  /** حالة محلية مؤقتة لرسالة يتم إرسالها (لا تُخزَّن في قاعدة البيانات) */
  _status?: "sending" | "sent" | "failed";
  _pendingAttachments?: PendingUpload[];
}

/** ملف قيد الرفع على العميل، قبل اكتمال الرفع لـ storage */
export interface PendingUpload {
  id: string;
  file: File;
  kind: AttachmentKind;
  previewUrl: string;
  progress: number;
  status: "uploading" | "done" | "error";
  width?: number;
  height?: number;
  duration_seconds?: number;
}

export interface Conversation {
  other_user: User;
  last_message?: DirectMessage;
  unread_count: number;
}
