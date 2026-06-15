export function parseDecimal(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const commaIndex = cleaned.lastIndexOf(',');
    const dotIndex = cleaned.lastIndexOf('.');
    const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(cleaned.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.')) || 0;
  }

  if (hasComma) return Number(cleaned.replace(',', '.')) || 0;
  return Number(cleaned) || 0;
}

export function roundCurrency(value) {
  return Math.round((parseDecimal(value) + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value) {
  return `R$ ${roundCurrency(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function normalizePhoneBR(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}
