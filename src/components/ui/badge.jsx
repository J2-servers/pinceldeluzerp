import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:     "bg-blue-100 text-blue-700 border border-blue-200",
        secondary:   "bg-gray-100 text-gray-600 border border-gray-200",
        destructive: "bg-red-100 text-red-700 border border-red-200",
        outline:     "bg-white text-gray-600 border border-gray-200 shadow-sm",
        success:     "bg-green-100 text-green-700 border border-green-200",
        warning:     "bg-yellow-100 text-yellow-700 border border-yellow-200",
        purple:      "bg-purple-100 text-purple-700 border border-purple-200",
        orange:      "bg-orange-100 text-orange-700 border border-orange-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }