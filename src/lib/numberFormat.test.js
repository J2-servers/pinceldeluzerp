import { describe, it, expect } from 'vitest';
import { parseDecimal, roundCurrency, formatCurrency, normalizePhoneBR } from './numberFormat';

describe('parseDecimal', () => {
  it('parses a plain number', () => {
    expect(parseDecimal(42)).toBe(42);
  });

  it('treats non-finite numbers as zero', () => {
    expect(parseDecimal(NaN)).toBe(0);
    expect(parseDecimal(Infinity)).toBe(0);
  });

  it('parses a comma-decimal string (pt-BR)', () => {
    expect(parseDecimal('42,50')).toBe(42.5);
  });

  it('parses a dot-decimal string', () => {
    expect(parseDecimal('42.50')).toBe(42.5);
  });

  it('parses pt-BR thousands + decimal (dot thousands, comma decimal)', () => {
    expect(parseDecimal('1.234,56')).toBe(1234.56);
  });

  it('parses en-US thousands + decimal (comma thousands, dot decimal)', () => {
    expect(parseDecimal('1,234.56')).toBe(1234.56);
  });

  it('preserves a leading minus sign', () => {
    expect(parseDecimal('-42,50')).toBe(-42.5);
  });

  it('strips currency symbols and other non-numeric characters', () => {
    expect(parseDecimal('R$ 42,50')).toBe(42.5);
  });

  it('returns 0 for empty, null, undefined, or non-numeric input', () => {
    expect(parseDecimal('')).toBe(0);
    expect(parseDecimal('   ')).toBe(0);
    expect(parseDecimal(null)).toBe(0);
    expect(parseDecimal(undefined)).toBe(0);
    expect(parseDecimal('abc')).toBe(0);
  });
});

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.555)).toBe(10.56);
  });

  it('parses a string input before rounding', () => {
    expect(roundCurrency('10,556')).toBe(10.56);
  });

  it('leaves whole numbers unchanged', () => {
    expect(roundCurrency(10)).toBe(10);
  });
});

describe('formatCurrency', () => {
  it('formats a positive value with pt-BR thousands and decimal separators', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50');
  });

  it('formats zero with two decimal places', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('formats a negative value', () => {
    expect(formatCurrency(-50)).toBe('R$ -50,00');
  });
});

describe('normalizePhoneBR', () => {
  it('adds the 55 country code when missing', () => {
    expect(normalizePhoneBR('11987654321')).toBe('5511987654321');
  });

  it('leaves a number that already has the 55 prefix unchanged', () => {
    expect(normalizePhoneBR('5511987654321')).toBe('5511987654321');
  });

  it('strips formatting characters before normalizing', () => {
    expect(normalizePhoneBR('(11) 98765-4321')).toBe('5511987654321');
  });

  it('returns an empty string for empty or nullish input', () => {
    expect(normalizePhoneBR('')).toBe('');
    expect(normalizePhoneBR(null)).toBe('');
    expect(normalizePhoneBR(undefined)).toBe('');
  });
});
