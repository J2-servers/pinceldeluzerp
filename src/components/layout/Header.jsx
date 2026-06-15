import React from 'react';
import { motion } from 'framer-motion';

/**
 * Page header — apenas título e subtítulo.
 * Search / bell / user ficam no Topbar global (Layout.jsx).
 */
export default function Header({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-6"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </motion.div>
  );
}
