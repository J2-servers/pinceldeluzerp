import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorStyles = {
  pink:   { text: 'var(--red)',    iconColor: 'var(--red)' },
  orange: { text: 'var(--orange)', iconColor: 'var(--orange)' },
  green:  { text: 'var(--green)',  iconColor: 'var(--green)' },
  blue:   { text: 'var(--accent)', iconColor: 'var(--accent)' },
  purple: { text: 'var(--purple)', iconColor: 'var(--purple)' },
  red:    { text: 'var(--red)',    iconColor: 'var(--red)' },
  cyan:   { text: 'var(--teal)',   iconColor: 'var(--teal)' },
  yellow: { text: 'var(--yellow)', iconColor: 'var(--yellow)' },
};

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue', delay = 0 }) {
  const s = colorStyles[color] || colorStyles.blue;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-3xl p-5 overflow-hidden cursor-default transition-all duration-300"
      style={{
        background: 'var(--bg)',
        boxShadow: hovered ? 'var(--shadow-card-hover)' : 'var(--shadow-md)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest truncate" style={{ color:'var(--text-tertiary)' }}>{title}</p>
          <h3 className="text-2xl font-black leading-tight" style={{ color: s.text }}>{value}</h3>
          {subtitle && <p className="text-xs truncate" style={{ color:'var(--text-tertiary)' }}>{subtitle}</p>}
          {trendValue && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' && <TrendingUp className="w-3 h-3" style={{ color:'var(--green)' }} />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" style={{ color:'var(--red)' }} />}
              <span className="text-xs font-bold" style={{ color: trend === 'up' ? 'var(--green)' : trend === 'down' ? 'var(--red)' : 'var(--text-tertiary)' }}>{trendValue}</span>
            </div>
          )}
        </div>

        {/* Neumorphic icon container */}
        <div
          className="p-3 rounded-2xl flex-shrink-0 ml-3 transition-all duration-300"
          style={{
            background: 'var(--accent-muted)',
            boxShadow: hovered ? 'var(--shadow-pressed)' : 'var(--shadow-flat)',
          }}
        >
          {Icon && <Icon className="w-6 h-6" style={{ color: s.iconColor }} />}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '3px',
        background: s.iconColor, borderRadius: '2px 2px 0 0', opacity: 0.6,
      }} />
    </motion.div>
  );
}