import { erp } from '@/api/erpClient';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';

function normalizeSheetDimension(value) {
  const dimension = parseDecimal(value);
  return dimension > 0 && dimension < 100 ? dimension * 10 : dimension;
}

function sheetAreaM2(product) {
  const width = normalizeSheetDimension(product.sheet_width_mm);
  const height = normalizeSheetDimension(product.sheet_height_mm);
  if (!width || !height) return 0;
  return (width * height) / 1000000;
}

export function productToMaterialParameter(product = {}) {
  const isArea = product.dimensions_required || product.pricing_mode === 'area_m2' || product.price_per_m2;
  const area = sheetAreaM2(product);
  const cost = parseDecimal(product.cost_price);
  const sale = parseDecimal(product.sale_price);
  const costPerM2 = isArea ? roundCurrency(product.material_cost_m2 || product.cost_per_m2 || (area > 0 ? cost / area : 0)) : 0;
  const salePerM2 = isArea ? roundCurrency(product.price_per_m2 || (area > 0 ? sale / area : 0) || (costPerM2 > 0 ? costPerM2 / 0.65 : 0)) : 0;
  const unitCost = isArea ? 0 : cost;
  const unitSale = isArea ? 0 : roundCurrency(sale || (unitCost > 0 ? unitCost / 0.65 : 0));

  return {
    name: product.name,
    product_id: product.id,
    product_name: product.name,
    sku: product.sku || product.code || '',
    material_type: product.product_group || product.category || (isArea ? 'material' : 'unitario'),
    category: product.category || product.product_group || '',
    pricing_mode: isArea ? 'area_m2' : 'unitario',
    unit: product.unit || (isArea ? 'm2' : 'un'),
    sheet_width_mm: isArea ? normalizeSheetDimension(product.sheet_width_mm) : 0,
    sheet_height_mm: isArea ? normalizeSheetDimension(product.sheet_height_mm) : 0,
    sheet_cost: isArea ? cost : 0,
    cost_per_m2: costPerM2,
    sale_price_per_m2: salePerM2,
    unit_cost: unitCost,
    sale_price: unitSale,
    waste_pct: parseDecimal(product.material_waste_pct || product.waste_pct || product.loss_pct || 12),
    active: product.active !== false && product.is_active !== false,
    notes: 'Sincronizado automaticamente pelo cadastro de produto.',
  };
}

export async function syncProductMaterialParameter(product) {
  if (!product?.id || !product?.name) return null;
  const payload = productToMaterialParameter(product);
  const existingByProduct = await erp.entities.MaterialParameter.filter({ product_id: product.id });
  const existing = existingByProduct[0]
    || (await erp.entities.MaterialParameter.filter({ name: product.name }))[0]
    || null;
  if (existing?.id) {
    return erp.entities.MaterialParameter.update(existing.id, payload);
  }
  return erp.entities.MaterialParameter.create(payload);
}
