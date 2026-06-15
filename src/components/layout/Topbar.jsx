import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/lib/auth/useAuth';
import { Menu, Bell, LogOut, Settings, Zap, Search, ShieldCheck } from 'lucide-react';
import { ROLES } from '@/lib/auth/permissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { toast } from '@/components/ui/app-toast';

export default function Topbar({ onMenuClick, companyLogo, companyName, onLogoClick }) {
  const { user, logout } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const getInitials = (name) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const displayName = user?.name || user?.full_name || 'Usuário';
  const roleLabel = user?.role ? (ROLES[user.role]?.label || user.role) : '';

  const handleLogout = () => {
    logout();
    toast.success('Até logo!');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 mb-6 topbar-vibrancy"
      role="banner"
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 rounded-[12px] flex items-center justify-center transition-all shrink-0"
        style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
        aria-label="Abrir menu de navegação"
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}
        onMouseDown={e => { e.currentTarget.style.boxShadow = 'var(--shadow-pressed)'; }}
        onMouseUp={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      >
        <Menu className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      </button>

      {/* Logo / Brand */}
      <button
        onClick={onLogoClick}
        className="hidden md:flex items-center gap-2.5 transition-all shrink-0 rounded-[14px] px-3 py-2"
        style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
        aria-label={`Configurar empresa: ${companyName || 'Pincel de Luz'}`}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}
        onMouseDown={e => { e.currentTarget.style.boxShadow = 'var(--shadow-pressed)'; }}
        onMouseUp={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
      >
        {companyLogo ? (
          <img
            src={companyLogo}
            alt={companyName || 'Logo'}
            className="w-7 h-7 rounded-[10px] object-cover"
            style={{ boxShadow: 'var(--shadow-flat)' }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-[10px] flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              boxShadow: '3px 3px 8px rgba(0,0,0,0.20), -2px -2px 5px var(--nm-light)',
            }}
            aria-hidden="true"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div className="leading-none">
          <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {companyName || 'Pincel de Luz'}
          </p>
          <p className="text-[9px] uppercase tracking-[0.15em] font-semibold mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            ERP
          </p>
        </div>
      </button>

      {/* Search */}
      <div className="flex-1 flex justify-center max-w-xs mx-auto">
        <div
          className="flex items-center gap-2 rounded-[14px] px-3 py-2 transition-all duration-250 w-full"
          style={{
            background: 'var(--bg)',
            boxShadow: 'var(--shadow-pressed)',
            border: '1px solid var(--border-inner)',
            maxWidth: searchOpen ? '100%' : '200px',
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <input
            ref={searchRef}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            placeholder="Buscar…"
            className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
            style={{ color: 'var(--text-primary)', boxShadow: 'none', border: 'none' }}
            aria-label="Buscar no sistema"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0" role="toolbar" aria-label="Ações do cabeçalho">
        <ThemeToggle />

        {/* Bell */}
        <button
          className="w-9 h-9 rounded-[12px] flex items-center justify-center transition-all relative"
          style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
          aria-label="Notificações"
          onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}
          onMouseDown={e => { e.currentTarget.style.boxShadow = 'var(--shadow-pressed)'; }}
          onMouseUp={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <Bell className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <span
            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full status-dot-pulse"
            style={{ background: 'var(--red)', boxShadow: '0 0 4px var(--red)' }}
            aria-label="Novas notificações"
          />
        </button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] transition-all"
              style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}
              aria-label={`Menu do usuário: ${displayName}`}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-flat)'; }}
              onMouseDown={e => { e.currentTarget.style.boxShadow = 'var(--shadow-pressed)'; }}
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback
                  className="text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-muted), var(--accent-border))',
                    color: 'var(--accent)',
                    boxShadow: 'var(--shadow-flat)',
                  }}
                >
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span
                className="hidden sm:block text-[13px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {displayName.split(' ')[0]}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            {user?.email && (
              <>
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
                  {roleLabel && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                      <ShieldCheck className="w-3 h-3" />{roleLabel}
                    </span>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to={createPageUrl('Configuracoes')} className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" aria-hidden="true" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer"
              style={{ color: 'var(--red)' }}
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
