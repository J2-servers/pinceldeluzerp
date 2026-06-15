export function inferProductBehavior(product = {}) {
  const explicitPricingMode = product.pricing_mode;
  const explicitDimensions = typeof product.dimensions_required === 'boolean' ? product.dimensions_required : null;

  const hasDimensions = Number(product.sheet_width_mm || 0) > 0 && Number(product.sheet_height_mm || 0) > 0;
  const likelyAreaItem = hasDimensions && (product.unit === 'folha' || product.unit === 'm2' || Number(product.price_per_m2 || 0) > 0);

  const pricingMode = explicitPricingMode || (likelyAreaItem ? 'area_m2' : 'unitario');
  const dimensionsRequired = explicitDimensions ?? (pricingMode === 'area_m2');

  return {
    pricingMode,
    dimensionsRequired,
    canQuote: typeof product.can_quote === 'boolean' ? product.can_quote : true,
    canSell: typeof product.can_sell === 'boolean' ? product.can_sell : true,
    trackStock: typeof product.track_stock === 'boolean' ? product.track_stock : true,
    productGroup: product.product_group || product.category || 'outros',
  };
}

export function getPricingModeLabel(mode) {
  return {
    unitario: 'Preco por unidade',
    area_m2: 'Preco por area',
    comprimento: 'Preco por comprimento',
    peso: 'Preco por peso',
    hora: 'Preco por hora',
    manual: 'Preco manual',
  }[mode] || 'Preco personalizado';
}

export function getBaseSaleValue(product = {}, behavior = inferProductBehavior(product)) {
  if (behavior.pricingMode === 'area_m2') {
    return Number(product.price_per_m2 || 0);
  }
  return Number(product.sale_price || 0);
}
