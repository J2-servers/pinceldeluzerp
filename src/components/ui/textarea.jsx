import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-xl px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      ref={ref}
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'inset 2px 2px 6px rgba(163,177,198,0.35)' }}
      onFocus={e => { e.currentTarget.style.borderColor = '#4f79f5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,121,245,0.12)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#c8d5eb'; e.currentTarget.style.boxShadow = 'inset 2px 2px 6px rgba(163,177,198,0.35)'; }}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }