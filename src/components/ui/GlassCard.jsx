import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Card neumórfico — superficie raised por padrão.
 * Variantes: raised (padrão), pressed, flat
 */
export default function GlassCard({
  children,
  className,
  delay = 0,
  hover = true,
  noPadding = false,
  variant = 'raised', // 'raised' | 'pressed' | 'flat'
  as: Tag,
  ...props
}) {
  const Wrapper = Tag ? motion[Tag] || motion.div : motion.div;

  const variantClass = {
    raised:  'card',
    pressed: 'card-pressed',
    flat:    'card-flat',
  }[variant] || 'card';

  return (
    <Wrapper
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.30, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover && variant === 'raised' ? { y: -2 } : undefined}
      className={cn(
        variantClass,
        'relative w-full transition-all duration-220',
        noPadding ? '' : 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </Wrapper>
  );
}
