// Utilidades de CPF/CNPJ do cadastro de clientes.
// O banco guarda somente digitos; a mascara e apenas formatacao visual.

export function onlyCpfCnpjDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 14);
}

// Mascara leve enquanto digita: 000.000.000-00 (ate 11 digitos) ou 00.000.000/0000-00 (12 a 14 digitos).
export function formatCpfCnpj(value) {
  const digits = onlyCpfCnpjDigits(value);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Validacao leve: campo vazio e valido; preenchido precisa ter 11 (CPF) ou 14 (CNPJ) digitos.
export function isCpfCnpjLengthValid(value) {
  const digits = onlyCpfCnpjDigits(value);
  return !digits || digits.length === 11 || digits.length === 14;
}
