# Echo 🎙️

> مساحة التواصل الداخلية لمجتمع **Econovo Club**

Echo هو تطبيق دردشة ومجموعات مبني خصيصاً لأعضاء Econovo. يتيح التواصل المباشر بين الأعضاء، وإنشاء مجموعات نقاش، ومتابعة نشاط المجتمع عبر لوحة تحكم موحدة.

---

## ما الذي يميّز Echo؟

- **رسائل مباشرة** — تواصل خاص بين الأعضاء بدون ضوضاء
- **مجموعات** — مساحات مخصصة لفرق العمل أو الاهتمامات المشتركة، عامة أو خاصة
- **لوحة تحكم** — نظرة شاملة على نشاطك ومجتمعك في مكان واحد
- **Realtime** — الرسائل تصل فوراً دون الحاجة لتحديث الصفحة
- **ثنائي اللغة** — واجهة تدعم العربية والإنجليزية

---

## البنية التقنية

| التقنية | الدور |
|---|---|
| **Next.js 15** | إطار العمل الأساسي (App Router) |
| **Tailwind CSS v4** | التصميم والمظهر |
| **Supabase** | قاعدة البيانات، المصادقة، Realtime |
| **Framer Motion** | الحركات والانتقالات |
| **TypeScript** | أمان الأنواع في كامل المشروع |

---

## الإعداد

### 1. تثبيت الحزم
```bash
npm install
```

### 2. متغيرات البيئة
الملف `.env.local` مهيأ مسبقاً. إذا احتجت تغيير البيانات:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. قاعدة البيانات
في **Supabase Dashboard → SQL Editor** شغّل الملف:
```
supabase/migrations/0001_echo_schema.sql
```
سيُنشئ تلقائياً:
- جدول `users` مع trigger لإنشاء الملف الشخصي عند التسجيل
- جداول `groups` و `group_members`
- جدول `messages` لرسائل المجموعات
- جدول `direct_messages` للرسائل المباشرة
- كامل سياسات RLS لحماية البيانات

### 4. Storage
في **Supabase → Storage**: أنشئ bucket اسمه `avatars` واجعله Public.

### 5. Realtime
في **Supabase → Database → Replication**: فعّل جدولَي `messages` و `direct_messages`.

### 6. التشغيل
```bash
npm run dev
```
ثم افتح [http://localhost:3000](http://localhost:3000)

---

## هيكل الصفحات

```
/landing          → الصفحة الترحيبية
/auth/login       → تسجيل الدخول
/auth/signup      → إنشاء حساب جديد
/main/dashboard   → لوحة التحكم
/main/chats       → الرسائل المباشرة
/main/groups      → قائمة المجموعات
/main/groups/[id] → غرفة مجموعة
/main/settings    → الإعدادات والملف 
---

*Echo — Econovo Club · 2026*
