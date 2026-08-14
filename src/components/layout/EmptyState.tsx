import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * حالة فاضية موحّدة لكل التطبيق — تتبع المعيار المتفق عليه في مصادر UX
 * (Mobbin, SAP Fiori, Pencil & Paper): عنوان واضح + وصف يشرح "ليه فاضي"
 * + إجراء واحد فقط (لا قائمة اختيارات). لا نعرض أبداً شاشة فاضية بلا نص.
 */
export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 space-y-3",
        className
      )}
      dir="rtl"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
