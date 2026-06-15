import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl px-3 py-1 text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'inset 2px 2px 6px rgba(163,177,198,0.35)' }}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }