import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LABOR_PROFILE,
  DEFAULT_MACHINE_PROFILE,
  DEFAULT_PRICING_SETTINGS,
  calcAreaM2,
  calcSheetAreaM2,
  buildPricingContext,
  getLaborRate,
  getMachineRate,
  findBestMarkup,
  findMaterialParameter,
  findClientPriceRule,
  findVolumePrice,
  materialCostForProduct,
  computeCommercialLine,
  summarizePricingDocument,
} from './pricingEngine';

describe('calcAreaM2', () => {
  it('converts millimeters to square meters', () => {
    expect(calcAreaM2(1000, 1000)).toBe(1);
  });

  it('returns 0 when either dimension is missing or zero', () => {
    expect(calcAreaM2(0, 100)).toBe(0);
    expect(calcAreaM2(100, 0)).toBe(0);
  });
});

describe('calcSheetAreaM2', () => {
  it('treats dimensions >= 100 as already in millimeters', () => {
    expect(calcSheetAreaM2(100, 100)).toBe(0.01);
  });

  it('treats dimensions under 100 as centimeters and converts to millimeters', () => {
    expect(calcSheetAreaM2(50, 50)).toBe(0.25);
  });
});

describe('buildPricingContext', () => {
  it('falls back to default settings, labor, and machine profiles when given no config', () => {
    const context = buildPricingContext({});
    expect(context.settings).toEqual(DEFAULT_PRICING_SETTINGS);
    expect(context.laborProfiles).toEqual([DEFAULT_LABOR_PROFILE]);
    expect(context.machineProfiles).toEqual([DEFAULT_MACHINE_PROFILE]);
    expect(context.monthlyFixedCost).toBe(0);
  });

  it('sums only active fixed expenses into monthlyFixedCost', () => {
    const context = buildPricingContext({
      fixedExpenses: [
        { amount: 3600, active: true },
        { amount: 1200, active: true },
        { amount: 999, active: false },
      ],
    });
    expect(context.monthlyFixedCost).toBe(4800);
  });

  it('merges custom settings on top of the defaults', () => {
    const context = buildPricingContext({ settings: { target_margin_pct: 50 } });
    expect(context.settings.target_margin_pct).toBe(50);
    expect(context.settings.tax_pct).toBe(DEFAULT_PRICING_SETTINGS.tax_pct);
  });
});

describe('getLaborRate', () => {
  it('uses the default labor profile when none is given', () => {
    const rate = getLaborRate();
    expect(rate.internal_hour_cost).toBe(DEFAULT_LABOR_PROFILE.internal_hour_cost);
    expect(rate.sale_hour_price).toBe(DEFAULT_LABOR_PROFILE.sale_hour_price);
  });

  it('derives internal cost from salary and monthly hours when no direct cost is set', () => {
    const rate = getLaborRate({ salary_with_charges: 3300, monthly_hours: 220 });
    expect(rate.internal_hour_cost).toBe(15);
  });

  it('derives a sale price from internal cost when no sale price is set', () => {
    const rate = getLaborRate({ internal_hour_cost: 10 });
    expect(rate.sale_hour_price).toBe(22);
  });
});

describe('getMachineRate', () => {
  it('uses the default machine profile when none is given', () => {
    const rate = getMachineRate();
    expect(rate.internal_minute_cost).toBe(DEFAULT_MACHINE_PROFILE.internal_minute_cost);
    expect(rate.sale_minute_price).toBe(DEFAULT_MACHINE_PROFILE.sale_minute_price);
  });

  it('derives internal minute cost from monthly cost and productive minutes', () => {
    const rate = getMachineRate({ monthly_cost: 3600, productive_minutes_month: 3600 });
    expect(rate.internal_minute_cost).toBe(1);
  });
});

describe('findBestMarkup', () => {
  it('falls back to context settings when there are no markup rules', () => {
    const context = buildPricingContext({});
    const markup = findBestMarkup({ product_group: 'acrilico' }, context);
    expect(markup.target_margin_pct).toBe(DEFAULT_PRICING_SETTINGS.target_margin_pct);
    expect(markup.minimum_margin_pct).toBe(DEFAULT_PRICING_SETTINGS.minimum_margin_pct);
  });

  it('matches a rule by product group over the first available rule', () => {
    const context = buildPricingContext({
      markupRules: [
        { product_group: 'mdf', target_margin_pct: 20 },
        { product_group: 'acrilico', target_margin_pct: 60 },
      ],
    });
    const markup = findBestMarkup({ product_group: 'acrilico' }, context);
    expect(markup.target_margin_pct).toBe(60);
  });
});

describe('findMaterialParameter', () => {
  it('returns null when there are no material parameters configured', () => {
    const context = buildPricingContext({});
    expect(findMaterialParameter({ id: 'p1', name: 'Produto' }, context)).toBeNull();
  });

  it('prefers a match by product_id over a match by name', () => {
    const context = buildPricingContext({
      materialParameters: [
        { id: 'm1', name: 'Acrilico preto', product_name: 'Produto' },
        { id: 'm2', product_id: 'p1', name: 'Match direto' },
      ],
    });
    const match = findMaterialParameter({ id: 'p1', name: 'Produto' }, context);
    expect(match.id).toBe('m2');
  });

  it('falls back to a case/accent-insensitive name match', () => {
    const context = buildPricingContext({
      materialParameters: [{ id: 'm1', name: 'Acrílico Preto' }],
    });
    const match = findMaterialParameter({ id: 'p1', name: 'acrilico preto' }, context);
    expect(match.id).toBe('m1');
  });
});

describe('materialCostForProduct', () => {
  it('computes unit-based cost and waste for pricingMode "unitario"', () => {
    const context = buildPricingContext({});
    const result = materialCostForProduct({ cost_price: 40 }, { quantity: 2 }, 'unitario', context);
    expect(result.direct).toBe(80);
    expect(result.waste).toBe(9.6);
    expect(result.waste_pct).toBe(12);
    expect(result.source).toBe('product');
  });

  it('computes area-based cost for pricingMode "area_m2"', () => {
    const context = buildPricingContext({
      materialParameters: [{ product_id: 'p1', cost_per_m2: 50 }],
    });
    const result = materialCostForProduct(
      { id: 'p1' },
      { quantity: 1, width_mm: 1000, height_mm: 1000 },
      'area_m2',
      context,
    );
    expect(result.area_m2).toBe(1);
    expect(result.cost_per_m2).toBe(50);
    expect(result.direct).toBe(50);
    expect(result.source).toBe('material_parameter');
  });
});

describe('computeCommercialLine', () => {
  it('computes a fully consistent price breakdown for a simple unit-priced product', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const line = computeCommercialLine(product, { quantity: 2 }, {});

    expect(line.total).toBe(224.58);
    expect(line.total_cost).toBe(98.18);
    expect(line.profit).toBe(126.4);
    expect(line.margin_pct).toBe(56.28);
    expect(line.unit_price).toBe(112.29);

    // Invariant that must hold regardless of the exact pricing inputs above.
    expect(roundedDiff(line.total - line.total_cost, line.profit)).toBe(true);
  });

  it('applies a discount percentage to the final total', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const withoutDiscount = computeCommercialLine(product, { quantity: 1 }, {});
    const withDiscount = computeCommercialLine(product, { quantity: 1, discount_pct: 10 }, {});
    expect(withDiscount.total).toBeLessThan(withoutDiscount.total);
  });

  it('applies a fixed R$ discount and never drives the total below zero', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const base = computeCommercialLine(product, { quantity: 1 }, {});
    const discounted = computeCommercialLine(product, { quantity: 1, discount_value: 30 }, {});
    expect(discounted.total).toBe(Math.round((base.total - 30) * 100) / 100);
    const overDiscounted = computeCommercialLine(product, { quantity: 1, discount_value: 999999 }, {});
    expect(overDiscounted.total).toBe(0);
  });

  it('adds named additionals to the line total', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const base = computeCommercialLine(product, { quantity: 1 }, {});
    const withExtra = computeCommercialLine(product, { quantity: 1, additionals: [{ label: 'Taxa de urgencia', value: 25 }] }, {});
    expect(withExtra.total).toBe(Math.round((base.total + 25) * 100) / 100);
    expect(withExtra.additionals_total).toBe(25);
  });

  it('adds itemized extra materials to the line cost and price', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const base = computeCommercialLine(product, { quantity: 2 }, {});
    const withMaterials = computeCommercialLine(product, {
      quantity: 2,
      materials: [
        { name: 'Acrilico', quantity: 1, waste_pct: 10, unit_cost: 10, sale_price: 25 },
        { name: 'Ferragem', quantity: 2, waste_pct: 0, unit_cost: 5 },
      ],
    }, {});
    // custo por unidade: 10*1*1.1 + 5*2 = 21 ; x qtd 2 = 42
    expect(withMaterials.materials_list_cost).toBe(42);
    expect(withMaterials.total_cost).toBe(Math.round((base.total_cost + 42) * 100) / 100);
    expect(withMaterials.materials_list_sale).toBeGreaterThan(0);
    expect(withMaterials.total).toBeGreaterThan(base.total);
    expect(withMaterials.base_subtotal).toBeGreaterThan(base.base_subtotal);
  });

  it('adds itemized labor steps and machine operations, honoring setup (fixed) vs per-unit', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const base = computeCommercialLine(product, { quantity: 3 }, {});
    const withOps = computeCommercialLine(product, {
      quantity: 3,
      labor_steps: [
        { name: 'Preparo', minutes: 10, cost_per_hour: 60, is_setup: true }, // fixo: 10/60*60 = 10
        { name: 'Montagem', minutes: 5, cost_per_hour: 60 },                  // x qtd: 5/60*60 * 3 = 15
      ],
      machine_ops: [
        { name: 'Corte', minutes: 4, cost_per_min: 2 },                       // x qtd: 4*2*3 = 24
        { name: 'Gravacao', length_m: 1.5, rate_per_m: 10, is_setup: true },  // fixo: 1.5*10 = 15
      ],
    }, {});
    expect(withOps.labor_steps_cost).toBe(25);
    expect(withOps.machine_ops_cost).toBe(39);
    expect(withOps.total_cost).toBe(Math.round((base.total_cost + 25 + 39) * 100) / 100);
    expect(withOps.total).toBeGreaterThan(base.total);
  });

  it('surfaces the real target and minimum margin from the matched markup rule', () => {
    const product = { id: 'p1', name: 'Acrilico', product_group: 'acrilico', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const config = { markupRules: [{ product_group: 'acrilico', target_margin_pct: 45, minimum_margin_pct: 30 }] };
    const line = computeCommercialLine(product, { quantity: 1 }, config);
    expect(line.target_margin_pct).toBe(45);
    expect(line.min_margin_pct).toBe(30);
  });

  it('honors a locked base price instead of recomputing from current rates', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    // Preco combinado foi R$ 80/un; mesmo que a tabela mude, o travado manda.
    const line = computeCommercialLine(product, { quantity: 2, price_locked: true, base_price: 80 }, {});
    expect(line.base_price).toBe(80);
    expect(line.price_source).toBe('locked');
    expect(line.base_subtotal).toBe(160);
  });

  it('applies a client-specific fixed price over the formula price', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const config = { priceRules: [{ customer_id: 'c1', product_id: 'p1', price: 70, active: true }] };
    const line = computeCommercialLine(product, { quantity: 1, client_id: 'c1' }, config);
    expect(line.base_price).toBe(70);
    expect(line.price_source).toBe('client_price_rule');
  });

  it('applies a volume unit price when the quantity reaches the tier', () => {
    const product = { id: 'p1', name: 'Produto Teste', sale_price: 100, cost_price: 40, pricing_mode: 'unitario' };
    const config = { volumePricing: [{ product_id: 'p1', min_quantity: 10, unit_price: 85, active: true }] };
    const belowTier = computeCommercialLine(product, { quantity: 5 }, config);
    const atTier = computeCommercialLine(product, { quantity: 10 }, config);
    expect(belowTier.base_price).toBe(100);
    expect(atTier.base_price).toBe(85);
    expect(atTier.price_source).toBe('volume_pricing');
  });
});

describe('findClientPriceRule', () => {
  it('returns null when no rule matches the client', () => {
    const context = buildPricingContext({ priceRules: [{ customer_id: 'c1', product_id: 'p1', price: 70, active: true }] });
    expect(findClientPriceRule({ id: 'p1' }, 'c2', 1, context)).toBeNull();
  });

  it('prefers the rule with the highest applicable minimum quantity', () => {
    const context = buildPricingContext({
      priceRules: [
        { id: 'r1', customer_id: 'c1', product_id: 'p1', minimum_quantity: 1, price: 90, active: true },
        { id: 'r2', customer_id: 'c1', product_id: 'p1', minimum_quantity: 10, price: 75, active: true },
      ],
    });
    expect(findClientPriceRule({ id: 'p1' }, 'c1', 12, context).price).toBe(75);
    expect(findClientPriceRule({ id: 'p1' }, 'c1', 3, context).price).toBe(90);
  });

  it('ignores inactive or out-of-window rules', () => {
    const context = buildPricingContext({
      nowIso: '2026-08-12',
      priceRules: [{ customer_id: 'c1', product_id: 'p1', price: 70, active: false }],
    });
    expect(findClientPriceRule({ id: 'p1' }, 'c1', 1, context)).toBeNull();
    const expired = buildPricingContext({
      nowIso: '2026-08-12',
      priceRules: [{ customer_id: 'c1', product_id: 'p1', price: 70, active: true, ends_at: '2026-01-01' }],
    });
    expect(findClientPriceRule({ id: 'p1' }, 'c1', 1, expired)).toBeNull();
  });
});

describe('findVolumePrice', () => {
  it('returns the tier whose range covers the quantity', () => {
    const context = buildPricingContext({
      volumePricing: [
        { product_id: 'p1', min_quantity: 1, max_quantity: 9, discount_percent: 5, active: true },
        { product_id: 'p1', min_quantity: 10, discount_percent: 12, active: true },
      ],
    });
    expect(findVolumePrice({ id: 'p1' }, 5, context).discount_percent).toBe(5);
    expect(findVolumePrice({ id: 'p1' }, 50, context).discount_percent).toBe(12);
  });

  it('returns null when the quantity is below every tier minimum', () => {
    const context = buildPricingContext({ volumePricing: [{ product_id: 'p1', min_quantity: 10, discount_percent: 12, active: true }] });
    expect(findVolumePrice({ id: 'p1' }, 3, context)).toBeNull();
  });
});

describe('summarizePricingDocument', () => {
  it('sums subtotal, cost, and profit across multiple lines', () => {
    const lines = [
      { product_name: 'Item A', quantity: 1, unit: 'un', base_subtotal: 100, services_total: 20, total: 120, total_cost: 60 },
      { product_name: 'Item B', quantity: 2, unit: 'un', base_subtotal: 50, services_total: 0, total: 50, total_cost: 20 },
    ];
    const summary = summarizePricingDocument(lines, {});
    expect(summary.subtotalBeforeDiscount).toBe(170);
    expect(summary.totalCost).toBe(80);
    expect(summary.totalFinal).toBe(170);
    expect(summary.profit).toBe(90);
  });

  it('applies discount, general art cost, and additional charge', () => {
    const lines = [{ product_name: 'Item A', quantity: 1, unit: 'un', base_subtotal: 100, services_total: 0, total: 100, total_cost: 50 }];
    const summary = summarizePricingDocument(lines, { discountPct: 10, generalArtCost: 20, additionalCharge: 5 });
    // (100 + 20 + 5) * 0.9
    expect(summary.totalFinal).toBe(112.5);
  });
});

function roundedDiff(a, b) {
  return Math.abs(a - b) < 0.01;
}
