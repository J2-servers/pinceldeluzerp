"use client";
import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast rounded-2xl font-medium",
          description: "text-gray-500 text-sm",
          actionButton: "rounded-lg font-semibold",
          cancelButton: "rounded-lg",
        },
        style: {
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '8px 8px 28px rgba(174,190,220,0.45), -3px -3px 10px rgba(255,255,255,0.95)',
          color: 'var(--text-primary)',
          borderRadius: '16px',
        },
      }}
      {...props} />
  );
}

export { Toaster }