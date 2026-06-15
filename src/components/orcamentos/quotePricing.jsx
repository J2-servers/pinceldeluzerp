import { inferProductBehavior } from '@/lib/productBehavior';
import { formatCurrency, parseDecimal, roundCurrency } from '@/lib/numberFormat';

export const MATERIAL_CATEGORY_MAP = {
  acrilico: 'acrilico',
  mdf: 'mdf',
  compensado: 'mdf',
  tecido: 'tecido',
  couro: 'couro',
  metal: 'metal',
  vidro: 'vidro',
  borracha: 'borracha',
  eva: 'eva',
};

export function formatMoney(value) {
  return formatCurrency(value);
}

export function calcAreaM2(width, height) {
  const w = parseDecimal(width);
  const h = parseDecimal(height);
  if (!w || !h) return 0;
  return (w * h) / 1000000;
}

function normalizeSheetDimension(value) {
  const dimension = parseDecimal(value);
  return dimension > 0 && dimension < 100 ? dimension * 10 : dimension;
}

function calcSheetAreaM2(width, height) {
  return calcAreaM2(normalizeSheetDimension(width), normalizeSheetDimension(height));
}

export function buildQuoteFromProduct(form, product) {
  const behavior = inferProductBehavior(product || {});
  return {
    ...form,
    product_id: product?.id || '',
    product_name: product?.name || '',
    product_group: behavior.productGroup || '',
    pricing_mode: behavior.pricingMode,
    material: MATERIAL_CATEGORY_MAP[product?.category] || 'outro',
    material_color: product?.color || '',
    material_thickness_mm: product?.thickness_mm || '',
    manual_unit_price: behavior.dimensionsRequired ? 0 : parseDecimal(product?.sale_price),
    price_per_m2_override: behavior.dimensionsRequired ? parseDecimal(product?.price_per_m2) : 0,
    labor_hours: parseDecimal(product?.default_labor_hours),
    labor_cost_hour: parseDecimal(product?.labor_cost_hour),
    cut_time_min: parseDecimal(product?.default_machine_minutes),
    machine_cost_per_min: parseDecimal(product?.machine_cost_per_min),
    width_mm: behavior.dimensionsRequired ? form.width_mm : '',
    height_mm: behavior.dimensionsRequired ? form.height_mm : '',
    depth_mm: behavior.dimensionsRequired ? form.depth_mm : '',
  };
}

export function calculateQuoteTotals(form, product) {
  const behavior = inferProductBehavior(product || {});
  const quantity = parseDecimal(form.quantity) || 1;
  const discountPct = parseDecimal(form.discount_pct);

  if (!product) {
    return { areaM2: 0, unitCost: 0, unitPrice: 0, subtotal: 0, finalPrice: 0, totalCost: 0 };
  }

  if (!behavior.dimensionsRequired) {
    const unitCost = parseDecimal(product.cost_price);
    const unitPrice = parseDecimal(form.manual_unit_price) || parseDecimal(product.sale_price);
    const subtotal = unitPrice * quantity;
    const finalPrice = subtotal * (1 - discountPct / 100);
    const totalCost = unitCost * quantity;
    return { areaM2: 0, unitCost: roundCurrency(unitCost), unitPrice: roundCurrency(unitPrice), subtotal: roundCurrency(subtotal), finalPrice: roundCurrency(finalPrice), totalCost: roundCurrency(totalCost) };
  }

  const areaM2 = calcAreaM2(form.width_mm, form.height_mm);
  const sheetArea = calcSheetAreaM2(product.sheet_width_mm, product.sheet_height_mm);
  const sheetCost = parseDecimal(product.cost_price);
  const pricePerM2 = parseDecimal(form.price_per_m2_override) || parseDecimal(product.price_per_m2);
  const costPerM2 = sheetArea > 0 ? sheetCost / sheetArea : 0;
  const unitCost = areaM2 * costPerM2;
  const unitPrice = areaM2 * pricePerM2;
  const subtotal = unitPrice * quantity;
  const finalPrice = subtotal * (1 - discountPct / 100);
  const totalCost = unitCost * quantity;
  return { areaM2, unitCost: roundCurrency(unitCost), unitPrice: roundCurrency(unitPrice), subtotal: roundCurrency(subtotal), finalPrice: roundCurrency(finalPrice), totalCost: roundCurrency(totalCost) };
}
