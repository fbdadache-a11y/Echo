export function ChatLayoutSkeleton() {
  return (
    <div className="flex h-full overflow-hidden animate-pulse" dir="rtl">
      {/* Desktop list skeleton */}
      <div className="hidden md:flex w-72 flex-shrink-0 border-l border-border h-full flex-col bg-sidebar/30">
        <div className="p-4 border-b border-border space-y-3">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-9 w-full bg-muted rounded-xl" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-2.5 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / mobile empty pane skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-muted" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    </div>
  );
}
