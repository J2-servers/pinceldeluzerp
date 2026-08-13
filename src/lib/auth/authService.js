/**
 * authService.js — Autenticacao local real sobre a API SQLite.
 *
 * Hash de senha e validacao de sessao acontecem no servidor
 * (server/local_api.py + server/auth.py). Este modulo so guarda o
 * usuario logado em cache (a partir da sessao em localStorage,
 * gerida por src/api/localSqliteClient.js) e expoe as acoes de auth.
 */

import { erp } from '@/api/erpClient';

/** Retorna o usuario logado (a partir da sessao em cache) ou null. Sincrono. */
export function getCurrentUser() {
  return erp.auth.getCachedUser ? erp.auth.getCachedUser() : null;
}

/** Ha ao menos um usuario cadastrado? (define se mostramos o bootstrap) */
export async function hasAnyUser() {
  const status = await erp.auth.status();
  return !!status?.hasUsers;
}

/** Cria o primeiro administrador (bootstrap). So funciona se nao houver usuarios. */
export async function bootstrapAdmin({ name, email, password }) {
  const { user } = await erp.auth.bootstrap({ name, email, password });
  return user;
}

/** Faz login. Retorna o usuario ou lanca erro com mensagem amigavel. */
export async function login(email, password) {
  const { user } = await erp.auth.login(email, password);
  return user;
}

/** Encerra a sessao. */
export function logout() {
  erp.auth.logout();
}

/** Mantido por compatibilidade com callers antigos: a expiracao agora e controlada pelo servidor. */
export function touchSession() {}

/** Troca a senha do usuario logado (exige a senha atual). */
export async function changePassword(currentPassword, newPassword) {
  await erp.auth.changePassword(currentPassword, newPassword);
  return true;
}

// ── Gestao de usuarios (admin) ────────────────────────────────

export async function listUsers() {
  const users = await erp.entities.User.list('-created_date', 500);
  return users || [];
}

export async function createUser({ name, email, password, role }) {
  return erp.entities.User.create({ name, email, password, role: role || 'leitura' });
}

export async function updateUser(id, patch) {
  return erp.entities.User.update(id, patch);
}

export async function setUserActive(id, active) {
  return updateUser(id, { active });
}

export async function deleteUser(id) {
  await erp.entities.User.delete(id);
  return true;
}
