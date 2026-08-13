import { describe, it, expect } from 'vitest';
import { reservedByProduct } from './stockReservations';

describe('reservedByProduct', () => {
  it('sums active reservations per product', () => {
    const map = reservedByProduct([
      { product_variant_id: 'A', quantity: 2, status: 'active' },
      { product_variant_id: 'A', quantity: 3, status: 'active' },
      { product_variant_id: 'B', quantity: 5, status: 'active' },
    ]);
    expect(map.get('A')).toBe(5);
    expect(map.get('B')).toBe(5);
  });
  it('ignores non-active reservations', () => {
    const map = reservedByProduct([
      { product_variant_id: 'A', quantity: 2, status: 'active' },
      { product_variant_id: 'A', quantity: 9, status: 'released' },
      { product_variant_id: 'A', quantity: 4, status: 'consumed' },
    ]);
    expect(map.get('A')).toBe(2);
  });
  it('handles empty input', () => {
    expect(reservedByProduct([]).size).toBe(0);
    expect(reservedByProduct().size).toBe(0);
  });
});
