"use client";

import { motion } from "framer-motion";

/**
 * شعار "Echo" — يُكتب بخط Rouge Script، خط مرسوم أصلاً بقلم النقش
 * النحاسي (copperplate nib)، وهي التقنية الفعلية التي شكّلت خط اليد
 * الفرنسي الرسمي (المعروف بـRonde أو Anglaise) في القرن التاسع عشر.
 * هذا نص حقيقي بخط حقيقي — وليس مساراً مرسوماً يدوياً — لضمان صحة
 * الشكل الحرفي 100%.
 *
 * حركة الدخول: الكلمة تُكشف تدريجياً من اليسار لليمين عبر clip-path،
 * بمحاكاة إحساس "الكتابة أثناء الحركة" بدل ظهور فوري، مع توهّج خفيف
 * يتلاشى بعد اكتمال الكشف كلمسة ختامية. الكشف نفسه هو حركة الدخول —
 * لا يُغلَّف بأي fade إضافي كي لا تتراكب حركتان مختلفتان معاً.
 */
export function EchoWordmark({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="font-script text-primary inline-block leading-none select-none"
      style={{ fontSize: "clamp(4.5rem, 16vw, 9rem)" }}
      initial={{ clipPath: "inset(0 100% 0 0)", filter: "drop-shadow(0 0 0 transparent)" }}
      animate={{
        clipPath: "inset(0 0% 0 0)",
        filter: [
          "drop-shadow(0 0 0 transparent)",
          "drop-shadow(0 0 18px var(--primary))",
          "drop-shadow(0 0 0 transparent)",
        ],
      }}
      transition={{
        clipPath: { delay, duration: 1.4, ease: [0.65, 0, 0.35, 1] },
        filter: { delay, duration: 1.8, times: [0, 0.75, 1], ease: "easeOut" },
      }}
    >
      Echo
    </motion.span>
  );
}
