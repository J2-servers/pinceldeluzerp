import { parseDecimal, roundCurrency } from '@/lib/numberFormat';
import {
  calcAreaM2,
  computeCommercialLine,
  money,
  summarizePricingDocument,
} from '@/lib/pricingEngine';

export { calcAreaM2, money, roundCurrency };

export function createLineDraft(product) {
  const dimensionsRequired = product.dimensions_required || product.pricing_mode === 'area_m2';
  return {
    product_id: product.id,
    product_variant_id: product.id,
    product_name: product.name,
    product_group: product.product_group || product.category || 'outros',
    pricing_mode: dimensionsRequired ? 'area_m2' : (product.pricing_mode || 'unitario'),
    quantity: 1,
    unit: product.unit || 'un',
    width_mm: '',
    height_mm: '',
    base_price: roundCurrency(dimensionsRequired ? product.price_per_m2 || 0 : product.sale_price || 0),
    base_subtotal: 0,
    services_total: 0,
    material_cost: 0,
    material_cost_direct: 0,
    material_waste_cost: 0,
    labor_minutes: roundCurrency(parseDecimal(product.default_labor_minutes) || parseDecimal(product.default_labor_hours) * 60),
    labor_hours: roundCurrency(parseDecimal(product.default_labor_hours)),
    labor_cost_hour: 0,
    labor_cost_total: 0,
    labor_sale_hour: 0,
    labor_sale_total: 0,
    machine_time_min: roundCurrency(product.default_machine_minutes || 0),
    machine_cost_per_min: 0,
    machine_cost_total: 0,
    machine_sale_minute: 0,
    machine_sale_total: 0,
    overhead_cost_total: 0,
    setup_sale_total: 0,
    service_profile_id: product.default_service_profile_id || '',
    machine_profile_id: product.default_machine_profile_id || '',
    labor_profile_id: product.default_labor_profile_id || '',
    art_type: 'logo',
    art_price: roundCurrency(product.default_art_price || product.default_art_cost || 0),
    art_cost: roundCurrency(product.default_art_price || product.default_art_cost || 0),
    art_description: product.art_template_notes || '',
    item_notes: '',
    discount_pct: 0,
    total_cost: 0,
    total: 0,
    unit_price: 0,
    profit: 0,
    margin_pct: 0,
    min_price: 0,
    recommended_price: 0,
    minimum_margin_price: 0,
  };
}

export function computeLine(product, line, pricingConfig = {}) {
  return computeCommercialLine(product, line, pricingConfig);
}

export function summarizeDocument(lines, config = {}) {
  return summarizePricingDocument(lines, config);
}
