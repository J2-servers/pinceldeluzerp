/**
 * useAuth.jsx — Estado de sessão reativo + helpers de permissão para a UI.
 *
 * <SessionProvider> envolve o app. `useSession()` dá o usuário logado e `can()`.
 * <Can perm="vendas:create"> renderiza children só se permitido.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { can as canCheck, resolvePermissions } from './permissions';
import { getCurrentUser, login as svcLogin, logout as svcLogout, touchSession } from './authService';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await svcLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    svcLogout();
    setUser(null);
  }, []);

  // Sessão invalidada/expirada no backend (401) → volta pro login na hora.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('pincel:session-expired', onExpired);
    return () => window.removeEventListener('pincel:session-expired', onExpired);
  }, []);

  // renova sessão em atividade do usuário
  useEffect(() => {
    if (!user) return;
    const onActivity = () => touchSession();
    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [user]);

  const permSet = useMemo(() => resolvePermissions(user), [user]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    can: (perm) => canCheck(user, perm),
    permissions: permSet,
    login,
    logout,
    refresh,
  }), [user, permSet, login, logout, refresh]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>');
  return ctx;
}

/** Hook curto de permissão. */
export function useCan(permission) {
  const { can } = useSession();
  return can(permission);
}

/**
 * Gate de UI. Renderiza children só se o usuário tiver a permissão.
 * Props: perm (string), fallback (ReactNode opcional).
 */
export function Can({ perm, children, fallback = null }) {
  const allowed = useCan(perm);
  return allowed ? <>{children}</> : fallback;
}
