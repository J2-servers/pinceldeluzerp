import { describe, it, expect } from 'vitest';
import { reorderSuggestion, buildReorderGroups, parsePurchaseItems } from './purchasing';

describe('reorderSuggestion', () => {
  it('targets max_quantity when set', () => {
    const s = reorderSuggestion({ quantity: 2, min_quantity: 1, max_quantity: 10, cost_price: 5 });
    expect(s.suggestion).toBe(8);
    expect(s.estimated).toBe(40);
  });
  it('targets 2x minimum when no max', () => {
    const s = reorderSuggestion({ quantity: 1, min_quantity: 3, cost_price: 2 });
    expect(s.suggestion).toBe(5); // target 6 - 1
    expect(s.estimated).toBe(10);
  });
  it('never suggests negative', () => {
    expect(reorderSuggestion({ quantity: 100, min_quantity: 1, cost_price: 5 }).suggestion).toBe(0);
  });
});

describe('buildReorderGroups', () => {
  const products = [
    { id: 'A', name: 'Acrílico', quantity: 0, min_quantity: 2, cost_price: 10, supplier_name: 'Fornecedor X', track_stock: true },
    { id: 'B', name: 'MDF', quantity: 1, min_quantity: 1, cost_price: 5, supplier_name: 'Fornecedor X', track_stock: true },
    { id: 'C', name: 'Cola', quantity: 50, min_quantity: 1, cost_price: 3, supplier_name: 'Fornecedor Y', track_stock: true },
    { id: 'D', name: 'Sem forn', quantity: 0, min_quantity: 1, cost_price: 1, track_stock: true },
  ];
  it('groups only items at or below minimum, by supplier', () => {
    const groups = buildReorderGroups(products);
    const suppliers = groups.map((g) => g.supplier);
    expect(suppliers).toContain('Fornecedor X');
    expect(suppliers).toContain('Sem fornecedor');
    expect(suppliers).not.toContain('Fornecedor Y'); // C is well above min
  });
  it('puts Sem fornecedor last', () => {
    const groups = buildReorderGroups(products);
    expect(groups[groups.length - 1].supplier).toBe('Sem fornecedor');
  });
  it('computes group total from suggestions', () => {
    const groups = buildReorderGroups(products);
    const x = groups.find((g) => g.supplier === 'Fornecedor X');
    // A: target 4 - 0 = 4 * 10 = 40 ; B: target 2 - 1 = 1 * 5 = 5 => 45
    expect(x.total).toBe(45);
    expect(x.buyableCount).toBe(2);
  });
  it('ignores items with track_stock false', () => {
    const groups = buildReorderGroups([{ id: 'Z', name: 'Z', quantity: 0, min_quantity: 5, cost_price: 1, track_stock: false }]);
    expect(groups).toHaveLength(0);
  });
});

describe('parsePurchaseItems', () => {
  it('parses a JSON items string', () => {
    expect(parsePurchaseItems({ items: JSON.stringify([{ product_id: 'A', quantity: 2 }]) })).toHaveLength(1);
  });
  it('returns [] on bad JSON', () => {
    expect(parsePurchaseItems({ items: 'not json' })).toEqual([]);
    expect(parsePurchaseItems({})).toEqual([]);
  });
});
