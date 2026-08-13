import { describe, it, expect } from 'vitest';
import { buildSaleStockDeltas } from './commercialPersistence';

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
