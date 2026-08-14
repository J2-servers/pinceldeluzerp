import { describe, it, expect } from 'vitest';
import { buildSaleStockDeltas, commercialItemExtras, hydrateStoredItem } from './commercialPersistence';

const unitProduct = (id, over = {}) => ({ id, name: id, pricing_mode: 'unitario', track_stock: true, auto_deduct_on_sale: true, quantity: 100, ...over });
const areaProduct = (id, over = {}) => ({ id, name: id, pricing_mode: 'area_m2', track_area_stock: true, track_stock: true, auto_deduct_on_sale: true, quantity: 10, ...over });

describe('buildSaleStockDeltas', () => {
  it('deducts one unit per sold quantity for unit products', () => {
    const products = [unitProduct('P1')];
    const deltas = buildSaleStockDeltas([{ product_id: 'P1', quantity: 3 }], products);
    expect(deltas.get('P1')).toBe(3);
  });

  it('skips unit products that do not track stock', () => {
    const products = [unitProduct('P1', { track_stock: false })];
    const deltas = buildSaleStockDeltas([{ product_id: 'P1', quantity: 3 }], products);
    expect(deltas.has('P1')).toBe(false);
  });

  it('expands a kit into its components', () => {
    const products = [
      { id: 'K', name: 'Kit', is_kit: true, kit_components: [{ product_id: 'A', quantity: 1 }, { product_id: 'B', quantity: 2 }] },
      unitProduct('A'),
      unitProduct('B'),
    ];
    const deltas = buildSaleStockDeltas([{ product_id: 'K', quantity: 2 }], products);
    expect(deltas.get('A')).toBe(2); // 2 kits x 1
    expect(deltas.get('B')).toBe(4); // 2 kits x 2
  });

  it('deducts consumed area (m2) for acrylic products with track_area_stock', () => {
    const products = [areaProduct('ACR')];
    // peca 300x400mm = 0.12 m2, qtd 2, perda 10% -> 0.264 m2
    const deltas = buildSaleStockDeltas([{ product_id: 'ACR', quantity: 2, width_mm: 300, height_mm: 400, material_waste_pct: 10 }], products);
    expect(deltas.get('ACR')).toBe(0.264);
  });

  it('uses the default waste when the line has none', () => {
    const products = [areaProduct('ACR')];
    // 0.12 m2 x 1 x 1.12 (default 12%) = 0.1344
    const deltas = buildSaleStockDeltas([{ product_id: 'ACR', quantity: 1, width_mm: 300, height_mm: 400 }], products);
    expect(deltas.get('ACR')).toBe(0.1344);
  });

  it('does not deduct area for area products without track_area_stock (legacy behavior preserved)', () => {
    const products = [areaProduct('ACR', { track_area_stock: false })];
    const deltas = buildSaleStockDeltas([{ product_id: 'ACR', quantity: 1, width_mm: 300, height_mm: 400 }], products);
    expect(deltas.has('ACR')).toBe(false);
  });

  it('sums repeated lines of the same product', () => {
    const products = [unitProduct('P1')];
    const deltas = buildSaleStockDeltas([
      { product_id: 'P1', quantity: 2 },
      { product_id: 'P1', quantity: 3 },
    ], products);
    expect(deltas.get('P1')).toBe(5);
  });
});

describe('granular item persistence round-trip', () => {
  it('serializes and restores materials, labor steps and machine ops', () => {
    const item = {
      product_id: 'P1',
      quantity: 2,
      materials: [{ product_id: 'M1', name: 'Chapa MDF', quantity: 1, waste_pct: 10, unit_cost: 20, sale_price: 0 }],
      materials_list_cost: 44,
      materials_list_sale: 88,
      labor_steps: [{ name: 'Montagem', minutes: 5, cost_per_hour: 60, is_setup: false }],
      machine_ops: [{ name: 'Corte', minutes: 4, cost_per_min: 2, length_m: 0, rate_per_m: 0, is_setup: false }],
      labor_steps_cost: 10,
      machine_ops_cost: 16,
      additionals: [],
    };
    const extras = commercialItemExtras(item);
    // Persisted as JSON strings (what the SQLite row stores).
    expect(typeof extras.labor_steps_json).toBe('string');
    expect(typeof extras.machine_ops_json).toBe('string');
    expect(extras.labor_steps_cost).toBe(10);
    expect(extras.machine_ops_cost).toBe(16);
    expect(extras.materials_list_cost).toBe(44);

    // Reopening the stored row rebuilds the arrays the editor needs.
    const stored = { product_id: 'P1', quantity: 2, ...extras };
    const restored = hydrateStoredItem(stored);
    expect(restored.labor_steps).toEqual(item.labor_steps);
    expect(restored.machine_ops).toEqual(item.machine_ops);
    expect(restored.materials).toEqual(item.materials);
  });

  it('keeps empty granular lists as empty (no phantom rows on reopen)', () => {
    const extras = commercialItemExtras({ product_id: 'P1', quantity: 1 });
    expect(extras.labor_steps_json).toBe('');
    expect(extras.machine_ops_json).toBe('');
    const restored = hydrateStoredItem({ product_id: 'P1', ...extras });
    expect(restored.labor_steps).toEqual([]);
    expect(restored.machine_ops).toEqual([]);
  });
});
