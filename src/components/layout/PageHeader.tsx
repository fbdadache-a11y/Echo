import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * عنوان موحّد لكل الصفحات الداخلية (Dashboard, Groups, Settings…)
 * يضمن أن كل الصفحات تبدأ بالمقاس والمسافات نفسها بدل أن تعيد كل صفحة
 * كتابة تنسيقها الخاص.
 */
export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6" dir="rtl">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
