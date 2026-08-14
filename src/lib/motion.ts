/**
 * رموز حركة موحّدة (Motion Tokens) — تُستخدم عبر كل مكونات Echo
 * لضمان إحساس متّسق بدل قيم متفرقة لكل مكوّن. ثلاث فئات فقط، بغرض
 * واضح لكل واحدة:
 *
 * - SPRING_SNAPPY  → استجابة فورية صغيرة (نقرة زر، تبديل تبويب،
 *   ظهور badge/عداد). يجب أن تُحسّ "فورية" لا "قادمة من بعيد".
 * - SPRING_PANEL   → دخول عناصر واجهة متوسطة (لوحة، قائمة منسدلة،
 *   ورقة سفلية، فقاعة رسالة). توازن بين السرعة والنعومة.
 * - SPRING_GENTLE  → عناصر كبيرة أو حركات تمهيدية (بطاقات صفحة
 *   الهبوط، دخول صفحة كاملة). أبطأ وأكثر "استرخاءً" عمداً.
 *
 * EASE_ENTRANCE يُستخدم مع transition ذات duration ثابتة (لا spring)
 * لعناصر تحتاج توقيتاً دقيقاً كالنصوص المتتالية (stagger).
 */
export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 22 };
export const SPRING_PANEL = { type: "spring" as const, stiffness: 380, damping: 32 };
export const SPRING_GENTLE = { type: "spring" as const, stiffness: 200, damping: 26 };

/** انتقال شاشة كاملة (تبديل بين لوحتين ملء الشاشة على الموبايل، كقائمة
 *  المحادثات مقابل محادثة مفتوحة) — أثقل وأهدأ عمداً من SPRING_PANEL
 *  لأنها تحرّك محتوى الشاشة كاملاً لا عنصر واجهة صغيراً. */
export const SPRING_VIEW_SWAP = { type: "spring" as const, stiffness: 340, damping: 34 };

export const EASE_ENTRANCE = [0.16, 1, 0.3, 1] as const;

/** تأخير موحّد بين عناصر متتالية عند استخدام stagger يدوي (بالثواني) */
export const STAGGER_STEP = 0.09;
