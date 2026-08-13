import { describe, it, expect } from 'vitest';
import { materialLineCost, operationLineCost, summarizeBom, bomMaterialDeltas, bomLinePayload } from './bomEngine';

const acrylic = { id: 'A', name: 'Acrílico', cost_price: 10, unit: 'm2' };
const mdf = { id: 'M', name: 'MDF', cost_price: 5, unit: 'un' };
const products = [acrylic, mdf];

describe('materialLineCost', () => {
  it('is componentCost * quantity * (1 + waste%)', () => {
    // 10 * 2 * 1.1 = 22
    expect(materialLineCost({ line_type: 'material', component_product_id: 'A', quantity: 2, waste_pct: 10 }, acrylic)).toBe(22);
  });
  it('no waste means plain cost * qty', () => {
    expect(materialLineCost({ component_product_id: 'M', quantity: 3, waste_pct: 0 }, mdf)).toBe(15);
  });
});

describe('operationLineCost', () => {
  it('sums machine time and prorated labor', () => {
    // machine 10min * 0.5 = 5 ; labor 30min/60 * 40 = 20 ; total 25
    expect(operationLineCost({ line_type: 'operation', machine_minutes: 10, machine_cost_per_min: 0.5, labor_minutes: 30, labor_cost_per_hour: 40 })).toBe(25);
  });
});

describe('summarizeBom', () => {
  it('separates material and operation costs and totals them', () => {
    const lines = [
      { line_type: 'material', component_product_id: 'A', quantity: 2, waste_pct: 10 }, // 22
      { line_type: 'material', component_product_id: 'M', quantity: 1, waste_pct: 0 },   // 5
      { line_type: 'operation', machine_minutes: 10, machine_cost_per_min: 0.5, labor_minutes: 0, labor_cost_per_hour: 0 }, // 5
    ];
    const s = summarizeBom(lines, products);
    expect(s.materialCost).toBe(27);
    expect(s.operationCost).toBe(5);
    expect(s.totalCost).toBe(32);
    expect(s.materialLines).toBe(2);
    expect(s.operationLines).toBe(1);
  });
});

describe('bomMaterialDeltas', () => {
  it('explodes materials with waste times produced quantity, ignoring operations', () => {
    const lines = [
      { line_type: 'material', component_product_id: 'A', quantity: 2, waste_pct: 10 },
      { line_type: 'operation', machine_minutes: 5, machine_cost_per_min: 1 },
    ];
    const deltas = bomMaterialDeltas(lines, 3); // A: 2 * 1.1 * 3 = 6.6
    expect(deltas.get('A')).toBe(6.6);
    expect(deltas.size).toBe(1); // operation ignored
  });
  it('sums repeated components', () => {
    const lines = [
      { line_type: 'material', component_product_id: 'A', quantity: 1, waste_pct: 0 },
      { line_type: 'material', component_product_id: 'A', quantity: 2, waste_pct: 0 },
    ];
    expect(bomMaterialDeltas(lines, 1).get('A')).toBe(3);
  });
});

describe('bomLinePayload', () => {
  it('snapshots component unit cost and rolls line_cost for a material', () => {
    const p = bomLinePayload('PROD', { line_type: 'material', component_product_id: 'A', quantity: 2, waste_pct: 10 }, products);
    expect(p.unit_cost).toBe(10);
    expect(p.line_cost).toBe(22);
    expect(p.component_name).toBe('Acrílico');
    expect(p.unit).toBe('m2');
  });
  it('builds an operation payload with zeroed material fields', () => {
    const p = bomLinePayload('PROD', { line_type: 'operation', operation_name: 'Corte', machine_minutes: 10, machine_cost_per_min: 0.5 }, products);
    expect(p.line_type).toBe('operation');
    expect(p.operation_name).toBe('Corte');
    expect(p.line_cost).toBe(5);
    expect(p.component_product_id).toBe('');
  });
});
