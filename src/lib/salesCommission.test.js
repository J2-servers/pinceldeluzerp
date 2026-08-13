import { describe, it, expect } from 'vitest';
import { commissionRates, resolveCommissionRate, salesPerformanceByPartner, DEFAULT_COMMISSION_PCT } from './salesCommission';

describe('commissionRates', () => {
  it('uses per-partner overrides from config JSON', () => {
    const rates = commissionRates({ commission_rates_json: JSON.stringify({ Maeli: 8, Wesley: 3 }) });
    expect(rates.Maeli).toBe(8);
    expect(rates.Wesley).toBe(3);
    expect(rates.Juliano).toBe(DEFAULT_COMMISSION_PCT); // falls back
  });
  it('uses the configured default when no override', () => {
    const rates = commissionRates({ commission_percent_default: 7 });
    expect(rates.Maeli).toBe(7);
    expect(rates.Juliano).toBe(7);
  });
  it('defaults to 5 with no config', () => {
    expect(resolveCommissionRate('Maeli', null)).toBe(DEFAULT_COMMISSION_PCT);
  });
});

describe('salesPerformanceByPartner', () => {
  const orders = [
    { created_by_partner: 'Maeli', total: 1000, total_cost: 600, status: 'entregue', created_date: '2026-08-10' },
    { created_by_partner: 'Maeli', total: 500, total_cost: 200, status: 'novo', created_date: '2026-08-11' },
    { created_by_partner: 'Wesley', total: 2000, total_cost: 1000, status: 'entregue', created_date: '2026-08-05' },
    { created_by_partner: 'Maeli', total: 999, total_cost: 100, status: 'cancelado', created_date: '2026-08-12' }, // ignored
  ];
  const commissions = [
    { seller_name: 'Maeli', commission_value: 75, created_date: '2026-08-10' },
    { seller_name: 'Wesley', commission_value: 100, created_date: '2026-08-05' },
  ];

  it('aggregates sales and commission per partner, ignoring cancelled', () => {
    const rows = salesPerformanceByPartner(orders, commissions);
    const maeli = rows.find((r) => r.partner === 'Maeli');
    const wesley = rows.find((r) => r.partner === 'Wesley');
    expect(maeli.salesCount).toBe(2); // cancelled excluded
    expect(maeli.salesTotal).toBe(1500);
    expect(maeli.commission).toBe(75);
    expect(wesley.salesTotal).toBe(2000);
  });

  it('computes margin and margin percent', () => {
    const rows = salesPerformanceByPartner(orders, commissions);
    const maeli = rows.find((r) => r.partner === 'Maeli');
    // total 1500, cost 800 => margin 700, 47%
    expect(maeli.margin).toBe(700);
    expect(maeli.marginPct).toBe(47);
  });

  it('filters by period', () => {
    const rows = salesPerformanceByPartner(orders, commissions, { start: '2026-08-08', end: '2026-08-31' });
    const wesley = rows.find((r) => r.partner === 'Wesley');
    expect(wesley.salesCount).toBe(0); // Wesley's sale was 08-05, out of range
  });

  it('always returns all three partners', () => {
    const rows = salesPerformanceByPartner([], []);
    expect(rows.map((r) => r.partner).sort()).toEqual(['Juliano', 'Maeli', 'Wesley']);
  });
});
