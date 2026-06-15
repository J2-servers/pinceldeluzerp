import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-xl p-1",
      className
    )}
    style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid var(--border)', boxShadow: '4px 4px 14px rgba(174,190,220,0.3), -2px -2px 8px rgba(255,255,255,0.9)' }}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:shadow-sm",
      className
    )}
    style={{ color: 'var(--text-tertiary)' }}
    onMouseEnter={e => { if (e.currentTarget.dataset.state !== 'active') e.currentTarget.style.color = '#3b5bdb'; }}
    onMouseLeave={e => { if (e.currentTarget.dataset.state !== 'active') e.currentTarget.style.color = '#7a8a9e'; }}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }