import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import MobileQuickAdd from './MobileQuickAdd.jsx';
import {
  LayoutDashboard, FileText, CalendarDays, CreditCard, Plus
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: 'MobileDashboard', side: 'left' },
  { name: 'Orçamentos', icon: FileText, path: 'Orcamentos', side: 'left' },
  { name: 'Projetos', icon: CalendarDays, path: 'Producao', side: 'right' },
  { name: 'Despesas', icon: CreditCard, path: 'MobileDespesasDoDia', side: 'right' },
];

export default function MobileNav() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'Dashboard';

  const leftItems = NAV_ITEMS.filter(i => i.side === 'left');
  const rightItems = NAV_ITEMS.filter(i => i.side === 'right');

  return (
    <>
      <MobileQuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: 'var(--bg)',
          borderTop: '1.5px solid rgba(200,215,235,0.9)',
          boxShadow: '0 -6px 24px rgba(174,190,220,0.45), 0 -2px 8px rgba(255,255,255,0.9)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2" style={{ height: 64 }}>

          {leftItems.map(item => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={createPageUrl(item.path)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 relative min-w-[56px]"
                style={isActive ? {
                  background: 'var(--bg)',
                  boxShadow: '4px 4px 10px rgba(163,177,198,0.6), -3px -3px 8px rgba(255,255,255,1)',
                } : {}}
              >
                <item.icon className="w-5 h-5 relative z-10" style={{ color: isActive ? '#4f79f5' : '#9aabbd' }} />
                <span className="text-[9px] font-bold relative z-10 tracking-wide" style={{ color: isActive ? '#4f79f5' : '#9aabbd' }}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute -bottom-0.5 w-5 h-1 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #4f79f5, #7c3aed)' }}
                  />
                )}
              </Link>
            );
          })}

          {/* Center FAB */}
          <div className="flex flex-col items-center relative -mt-6">
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setQuickAddOpen(true)}
              className="w-14 h-14 rounded-full flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, #4f79f5, #7c3aed)',
                boxShadow: '6px 6px 18px rgba(79,121,245,0.5), -3px -3px 10px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,0.3)',
                border: '2.5px solid rgba(255,255,255,0.8)',
              }}
            >
              <Plus className="w-6 h-6 text-white" />
            </motion.button>
            <span className="text-[9px] font-bold mt-1 tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Lançar</span>
          </div>

          {rightItems.map(item => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={createPageUrl(item.path)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 relative min-w-[56px]"
                style={isActive ? {
                  background: 'var(--bg)',
                  boxShadow: '4px 4px 10px rgba(163,177,198,0.6), -3px -3px 8px rgba(255,255,255,1)',
                } : {}}
              >
                <item.icon className="w-5 h-5 relative z-10" style={{ color: isActive ? '#4f79f5' : '#9aabbd' }} />
                <span className="text-[9px] font-bold relative z-10 tracking-wide" style={{ color: isActive ? '#4f79f5' : '#9aabbd' }}>
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute -bottom-0.5 w-5 h-1 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #4f79f5, #7c3aed)' }}
                  />
                )}
              </Link>
            );
          })}

        </div>
      </div>
    </>
  );
}