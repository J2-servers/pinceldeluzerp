/**
 * crypto.js — Hashing de senha real usando Web Crypto (PBKDF2-SHA256).
 * Nada de senha em texto puro. Cada senha tem salt único.
 *
 * Formato do hash armazenado: `pbkdf2$<iter>$<saltB64>$<hashB64>`
 */

const ITERATIONS = 150000;
const KEY_LEN = 32; // bytes
const HASH = 'SHA-256';

function toB64(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

function fromB64(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function derive(password, salt, iterations = ITERATIONS) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: HASH },
    baseKey,
    KEY_LEN * 8,
  );
  return new Uint8Array(bits);
}

/** Gera o hash de uma senha nova. Retorna string serializada. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

/** Verifica uma senha contra um hash armazenado. Comparação em tempo constante. */
export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10) || ITERATIONS;
  const salt = fromB64(parts[2]);
  const expected = fromB64(parts[3]);
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

/** Gera um token de sessão opaco. */
export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return toB64(bytes).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}
