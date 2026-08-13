import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}


export const isIframe = window.self !== window.top;

// Faixa Unicode "Combining Diacritical Marks" (U+0300-U+036F), construida via
// codigos numericos para nao depender de escapes \uXXXX na fonte.
const DIACRITICS_RE = new RegExp(`[${String.fromCharCode(768)}-${String.fromCharCode(879)}]`, 'g');

/** Minusculo, sem acento — para busca/comparacao tolerante a acentuacao. */
export function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');
}
