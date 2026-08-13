import React, { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, FileText, Wrench, DollarSign, Users, Package,
  CalendarDays, MessageCircle, Settings, BarChart3, Calculator,
  ChevronDown, X, Zap, Target, Landmark, BookOpen, ShieldCheck,
  FileBarChart, History,
} from 'lucide-react';
import { useSession } from '@/lib/auth/useAuth';
import { PAGE_PERMISSION, can } from '@/lib/auth/permissions';

const GROUPS = [
  {
    id: 'comercial', label: 'Comercial',
    accent: 'var(--comercial)', accentMuted: 'var(--accent-muted)',
    items: [
      { name: 'Dashboard',   icon: LayoutDashboard, path: 'Dashboard' },
      { name: 'Orcamentos',  icon: FileText,         path: 'Orcamentos' },
      { name: 'Vendas',      icon: ShoppingCart,     path: 'Vendas' },
      { name: 'Clientes',    icon: Users,            path: 'Clientes' },
    ],
  },
  {
    id: 'operacao', label: 'Operacao',
    accent: 'var(--operacao)', accentMuted: 'rgba(240,160,80,0.12)',
    items: [
      { name: 'Producao',          icon: CalendarDays, path: 'Producao' },
      { name: 'Ordens de Servico', icon: Wrench,       path: 'OrdensServico' },
      { name: 'Estoque',           icon: Package,      path: 'Estoque' },
    ],
  },
  {
    id: 'gestao', label: 'Gestao',
    accent: 'var(--gestao)', accentMuted: 'rgba(62,207,142,0.12)',
    items: [
      { name: 'Financeiro',   icon: DollarSign,  path: 'Financeiro' },
      { name: 'DRE',          icon: FileBarChart, path: 'DRE' },
      { name: 'Relatorios',   icon: BarChart3,   path: 'Relatorios' },
      { name: 'Precificacao', icon: Calculator,  path: 'Precificacao' },
      { name: 'Metas',        icon: Target,      path: 'Metas' },
      { name: 'Patrimonio',   icon: Landmark,    path: 'Patrimonio' },
    ],
  },
  {
    id: 'sistema', label: 'Sistema',
    accent: 'var(--sistema)', accentMuted: 'rgba(154,122,245,0.12)',
    items: [
      { name: 'WhatsApp',      icon: MessageCircle, path: 'WhatsApp' },
      { name: 'Notas Fiscais', icon: BookOpen,      path: 'NotasFiscais' },
      { name: 'Usuarios',      icon: ShieldCheck,   path: 'Usuarios' },
      { name: 'Auditoria',     icon: History,       path: 'Auditoria' },
      { name: 'Configuracoes', icon: Settings,      path: 'Configuracoes' },
    ],
  },
];

// Nav Item
function NavItem({ item, group, isActive, isMobile, onClose }) {
  const handleClick = useCallback(() => {
    if (isMobile && onClose) onClose();
  }, [isMobile, onClose]);

  return (
    <Link
      to={createPageUrl(item.path)}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[13px] font-medium transition-all duration-200 select-none group',
        isActive ? 'font-bold' : ''
      )}
      style={isActive ? {
        background: 'var(--bg)',
        boxShadow: 'var(--shadow-raised-sm)',
        color: group.accent,
      } : {
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--surface-2)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = '';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {/* Icone */}
      <span
        className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-200"
        style={isActive ? {
          background: group.accent,
          boxShadow: `3px 3px 8px rgba(0,0,0,0.25), -2px -2px 6px var(--nm-light)`,
        } : {
          background: 'var(--bg)',
          boxShadow: 'var(--shadow-flat)',
          color: 'var(--text-tertiary)',
        }}
        aria-hidden="true"
      >
        <item.icon
          className="w-3.5 h-3.5"
          style={{ color: isActive ? '#fff' : undefined }}
        />
      </span>

      <span className="truncate flex-1">{item.name}</span>

      {isActive && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: group.accent, boxShadow: `0 0 6px ${group.accent}` }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

// Group Header
function GroupHeader({ group, isOpen, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 rounded-xl group transition-all duration-150"
      style={{
        background: 'transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      aria-expanded={isOpen}
    >
      <span
        className="text-[10px] font-black uppercase tracking-[0.12em] transition-colors"
        style={{ color: isActive ? group.accent : 'var(--text-tertiary)' }}
      >
        {group.label}
      </span>
      <ChevronDown
        className={cn(
          'w-3 h-3 transition-transform duration-200',
          isOpen ? 'rotate-0' : '-rotate-90'
        )}
        style={{ color: 'var(--text-tertiary)' }}
      />
    </button>
  );
}

// Sidebar Content
function SidebarContent({ onClose, companyLogo, companyName, isMobile = false }) {
  const location = useLocation();
  const { user } = useSession();
  const currentPath = location.pathname.split('/').pop() || 'Dashboard';

  // Mostra apenas itens que o usuario tem permissao de ler.
  const visibleGroups = React.useMemo(() => GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        const perm = PAGE_PERMISSION[item.path];
        return !perm || can(user, perm);
      }),
    }))
    .filter((g) => g.items.length > 0), [user]);

  const activeGroupId = visibleGroups.find(g => g.items.some(i => i.path === currentPath))?.id;

  const [collapsed, setCollapsed] = useState(() => {
    const init = {};
    GROUPS.forEach(g => { init[g.id] = g.id !== activeGroupId && g.id !== 'comercial'; });
    return init;
  });

  const toggleGroup = useCallback((id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 2px 8px var(--nm-dark-xs)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName || 'Logo'}
              className="w-10 h-10 rounded-[14px] object-cover shrink-0"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                boxShadow: '4px 4px 10px rgba(0,0,0,0.22), -2px -2px 6px var(--nm-light)',
              }}
              aria-hidden="true"
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
              {companyName || 'Pincel de Luz'}
            </p>
            <p className="text-[9px] uppercase tracking-[0.15em] font-semibold mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              ERP Sistema
            </p>
          </div>
        </div>

        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
            aria-label="Fechar menu"
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}
          >
            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5"
        aria-label="Navegacao principal"
      >
        {visibleGroups.map((group) => {
          const isActive = group.id === activeGroupId;
          const isOpen = !collapsed[group.id];

          return (
            <div key={group.id}>
              <GroupHeader
                group={group}
                isOpen={isOpen}
                isActive={isActive}
                onClick={() => toggleGroup(group.id)}
              />

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 space-y-0.5">
                      {group.items.map((item) => (
                        <NavItem
                          key={item.path}
                          item={item}
                          group={group}
                          isActive={currentPath === item.path || (currentPath === '' && item.path === 'Dashboard')}
                          isMobile={isMobile}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="section-divider my-2" />
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -2px 8px var(--nm-dark-xs)',
        }}
      >
        <p className="text-[10px] text-center font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          Pincel de Luz ERP - v2.0
        </p>
      </div>
    </div>
  );
}

// Sidebar
export default function Sidebar({ open, onClose, companyLogo, companyName }) {
  return (
    <>
      {/* Desktop flutuante */}
      <aside
        className="hidden md:flex flex-col fixed left-4 top-4 bottom-4 z-20 w-[236px] sidebar-floating"
        aria-label="Barra lateral de navegacao"
      >
        <SidebarContent companyLogo={companyLogo} companyName={companyName} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.20 }}
              className="fixed inset-0 z-40 md:hidden overlay-blur"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -270, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -270, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[262px] flex flex-col md:hidden sidebar-glass"
              aria-label="Menu de navegacao mobile"
            >
              <SidebarContent
                onClose={onClose}
                companyLogo={companyLogo}
                companyName={companyName}
                isMobile
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

