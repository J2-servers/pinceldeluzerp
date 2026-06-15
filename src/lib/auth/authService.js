/**
 * authService.js — Autenticação local real sobre o store de entidades (SQLite).
 *
 * Usuários ficam na entidade `User`. Sessão persiste em localStorage com expiração.
 * Senhas são hash PBKDF2 (ver crypto.js) — nunca em texto puro.
 */

import { erp } from '@/api/erpClient';
import { hashPassword, verifyPassword, generateToken } from './crypto';

const SESSION_KEY = 'pincel-session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

let cachedUser = null; // snapshot do usuário logado (sem hash)

// ── Sessão ────────────────────────────────────────────────────
function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.user || !s?.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function writeSession(user) {
  const safe = sanitize(user);
  const session = { token: generateToken(), user: safe, expiresAt: Date.now() + SESSION_TTL_MS };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  cachedUser = safe;
  return session;
}

/** Remove campos sensíveis antes de guardar/expor. */
function sanitize(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

// ── API pública ───────────────────────────────────────────────

/** Retorna o usuário logado (snapshot) ou null. Síncrono. */
export function getCurrentUser() {
  if (cachedUser) return cachedUser;
  const s = readSession();
  cachedUser = s?.user || null;
  return cachedUser;
}

/** Há ao menos um usuário cadastrado? (define se mostramos o bootstrap) */
export async function hasAnyUser() {
  const users = await erp.entities.User.list('-created_date', 1);
  return Array.isArray(users) && users.length > 0;
}

/** Cria o primeiro administrador (bootstrap). Só funciona se não houver usuários. */
export async function bootstrapAdmin({ name, email, password }) {
  if (await hasAnyUser()) throw new Error('Já existe um usuário cadastrado.');
  validateNewUser({ name, email, password });
  const password_hash = await hashPassword(password);
  const user = await erp.entities.User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash,
    role: 'admin',
    active: true,
    must_change_password: false,
    last_login: new Date().toISOString(),
  });
  writeSession(user);
  return sanitize(user);
}

/** Faz login. Retorna o usuário ou lança erro com mensagem amigável. */
export async function login(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !password) throw new Error('Informe e-mail e senha.');
  const matches = await erp.entities.User.filter({ email: normalized });
  const user = Array.isArray(matches) ? matches[0] : null;
  if (!user) throw new Error('E-mail ou senha incorretos.');
  if (user.active === false) throw new Error('Usuário desativado. Procure um administrador.');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new Error('E-mail ou senha incorretos.');
  // atualiza último acesso (não bloqueia o login se falhar)
  try { await erp.entities.User.update(user.id, { last_login: new Date().toISOString() }); } catch {}
  return sanitize(writeSession({ ...user, last_login: new Date().toISOString() }).user);
}

/** Encerra a sessão. */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
  cachedUser = null;
}

/** Renova a expiração da sessão atual (chamado em atividade). */
export function touchSession() {
  const s = readSession();
  if (s) {
    s.expiresAt = Date.now() + SESSION_TTL_MS;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }
}

/** Troca a senha do usuário logado (exige a senha atual). */
export async function changePassword(currentPassword, newPassword) {
  const current = getCurrentUser();
  if (!current) throw new Error('Sessão expirada.');
  const fresh = await erp.entities.User.filter({ email: current.email });
  const user = Array.isArray(fresh) ? fresh[0] : null;
  if (!user) throw new Error('Usuário não encontrado.');
  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (!ok) throw new Error('Senha atual incorreta.');
  if (!newPassword || newPassword.length < 6) throw new Error('A nova senha precisa ter ao menos 6 caracteres.');
  const password_hash = await hashPassword(newPassword);
  await erp.entities.User.update(user.id, { password_hash, must_change_password: false });
  return true;
}

// ── Gestão de usuários (admin) ────────────────────────────────

export async function listUsers() {
  const users = await erp.entities.User.list('-created_date', 500);
  return (users || []).map(sanitize);
}

export async function createUser({ name, email, password, role }) {
  validateNewUser({ name, email, password });
  const normalized = email.trim().toLowerCase();
  const existing = await erp.entities.User.filter({ email: normalized });
  if (Array.isArray(existing) && existing.length) throw new Error('Já existe um usuário com este e-mail.');
  const password_hash = await hashPassword(password);
  const user = await erp.entities.User.create({
    name: name.trim(),
    email: normalized,
    password_hash,
    role: role || 'leitura',
    active: true,
    must_change_password: true,
    created_by: getCurrentUser()?.email || 'sistema',
  });
  return sanitize(user);
}

export async function updateUser(id, patch) {
  const clean = { ...patch };
  delete clean.password_hash; // nunca via patch direto
  if (clean.password) {
    clean.password_hash = await hashPassword(clean.password);
    delete clean.password;
  }
  if (clean.email) clean.email = String(clean.email).trim().toLowerCase();
  const updated = await erp.entities.User.update(id, clean);
  // se for o próprio usuário, atualiza o cache
  const current = getCurrentUser();
  if (current && updated && current.id === updated.id) writeSession(updated);
  return sanitize(updated);
}

export async function setUserActive(id, active) {
  return updateUser(id, { active });
}

export async function deleteUser(id) {
  const current = getCurrentUser();
  if (current && current.id === id) throw new Error('Você não pode excluir o próprio usuário.');
  // não permite remover o último admin
  const users = await erp.entities.User.list('-created_date', 500);
  const admins = (users || []).filter((u) => u.role === 'admin' && u.active !== false);
  const target = (users || []).find((u) => u.id === id);
  if (target?.role === 'admin' && admins.length <= 1) {
    throw new Error('Não é possível excluir o último administrador ativo.');
  }
  await erp.entities.User.delete(id);
  return true;
}

// ── Validação ─────────────────────────────────────────────────
function validateNewUser({ name, email, password }) {
  if (!name || !name.trim()) throw new Error('Informe o nome.');
  const e = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('E-mail inválido.');
  if (!password || password.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres.');
}
