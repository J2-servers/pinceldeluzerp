export function buildAssetPayloadFromProduct(product) {
  return {
    name: product.name,
    category: product.asset_category || 'equipamentos',
    description: product.description || product.notes || '',
    purchase_value: Number(product.cost_price || 0),
    current_value: Number(product.sale_price || product.cost_price || 0),
    serial_number: product.barcode || product.sku || '',
    location: product.location || '',
    condition: product.asset_condition || 'bom',
    responsible_partner: product.responsible_partner || 'Maeli',
  };
}