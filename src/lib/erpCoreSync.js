import { erp } from '@/api/erpClient';

const normalizeCode = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60);

const statusMap = {
  rascunho: 'draft',
  enviado: 'sent',
  aprovado: 'approved',
  reprovado: 'rejected',
  expirado: 'expired',
};

async function firstOrNull(promise) {
  const items = await promise;
  return items?.[0] || null;
}

export async function ensureWarehouse() {
  const existing = await firstOrNull(erp.entities.Warehouse.filter({ code: 'principal' }, '-created_date', 1));
  if (existing) return existing;
  return erp.entities.Warehouse.create({ name: 'Estoque Principal', code: 'principal', type: 'principal', active: true });
}

export async function ensureCategory(categoryName) {
  const code = normalizeCode(categoryName || 'outros') || 'outros';
  const existing = await firstOrNull(erp.entities.ProductCategory.filter({ code }, '-created_date', 1));
  if (existing) return existing;
  return erp.entities.ProductCategory.create({ name: categoryName || 'Outros', code, active: true });
}

export async function ensureUnit(unitSymbol) {
  const symbol = unitSymbol || 'un';
  const existing = await firstOrNull(erp.entities.ProductUnit.filter({ symbol }, '-created_date', 1));
  if (existing) return existing;
  return erp.entities.ProductUnit.create({ name: symbol.toUpperCase(), symbol, precision: 2, active: true });
}

export async function ensureCustomer(client) {
  if (!client?.name && !client?.client_name) return null;
  const name = client.name || client.client_name;
  const existing = await firstOrNull(erp.entities.Customer.filter({ name }, '-created_date', 1));
  if (existing) return existing;
  return erp.entities.Customer.create({
    legacy_client_id: client.id || null,
    name,
    phone: client.phone || client.client_phone || '',
    whatsapp: client.whatsapp || '',
    email: client.email || '',
    address: client.address || '',
    status: 'active',
    notes: client.notes || '',
  });
}

export async function createAuditLog(payload) {
  const currentUser = await erp.auth.me().catch(() => null);

  return erp.entities.AuditLog.create({
    module: payload.module,
    entity_name: payload.entity_name,
    entity_id: payload.entity_id,
    action: payload.action,
    field_name: payload.field_name || '',
    old_value: payload.old_value || '',
    new_value: payload.new_value || '',
    user_email: payload.user_email || currentUser?.email || '',
    user_name: payload.user_name || currentUser?.name || currentUser?.full_name || '',
    document_number: payload.document_number || '',
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : '',
  });
}

export async function syncLegacyProductToCore(product) {
  const sku = product.sku || normalizeCode(product.name || `produto-${Date.now()}`);
  const category = await ensureCategory(product.category || 'outros');
  const unit = await ensureUnit(product.unit || 'un');
  const warehouse = await ensureWarehouse();

  const itemType = product.track_stock === false
    ? 'service'
    : product.can_sell === false
      ? 'raw_material'
      : 'stockable';

  const masterPayload = {
    sku_base: sku,
    name: product.name,
    short_name: product.name,
    item_type: itemType,
    category_id: category.id,
    category_name: category.name,
    unit_id: unit.id,
    unit_name: unit.symbol,
    brand: product.brand || '',
    description: product.description || product.notes || '',
    sellable: product.can_sell !== false,
    purchasable: true,
    track_stock: product.track_stock !== false,
    has_variants: false,
    active: product.is_active !== false,
  };

  const existingMaster = await firstOrNull(erp.entities.ProductMaster.filter({ sku_base: sku }, '-created_date', 1));
  const master = existingMaster
    ? await erp.entities.ProductMaster.update(existingMaster.id, masterPayload)
    : await erp.entities.ProductMaster.create(masterPayload);

  const variantPayload = {
    product_master_id: master.id,
    sku,
    barcode: product.barcode || '',
    name: product.name,
    variant_label: [product.color, product.thickness_mm ? `${product.thickness_mm}mm` : ''].filter(Boolean).join(' • '),
    attribute_summary: [product.color, product.category, product.thickness_mm ? `${product.thickness_mm}mm` : ''].filter(Boolean).join(' • '),
    sale_price: Number(product.sale_price || product.price_per_m2 || 0),
    cost_price: Number(product.cost_price || 0),
    track_stock: product.track_stock !== false,
    sellable: product.can_sell !== false,
    purchasable: true,
    lot_controlled: false,
    serial_controlled: false,
    active: product.is_active !== false,
  };

  const existingVariant = await firstOrNull(erp.entities.ProductVariant.filter({ sku }, '-created_date', 1));
  const variant = existingVariant
    ? await erp.entities.ProductVariant.update(existingVariant.id, variantPayload)
    : await erp.entities.ProductVariant.create(variantPayload);

  const snapshotPayload = {
    product_variant_id: variant.id,
    warehouse_id: warehouse.id,
    on_hand: Number(product.quantity || 0),
    reserved: 0,
    available: Number(product.quantity || 0),
    average_cost: Number(product.cost_price || 0),
    snapshot_date: new Date().toISOString(),
  };

  const existingSnapshot = await firstOrNull(erp.entities.StockBalanceSnapshot.filter({ product_variant_id: variant.id, warehouse_id: warehouse.id }, '-created_date', 1));
  if (existingSnapshot) {
    await erp.entities.StockBalanceSnapshot.update(existingSnapshot.id, snapshotPayload);
  } else {
    await erp.entities.StockBalanceSnapshot.create(snapshotPayload);
  }

  return { master, variant, warehouse };
}

export async function syncLegacyQuoteToCore(quote, clientRecord) {
  const customer = await ensureCustomer({ ...clientRecord, client_name: quote.client_name, client_phone: quote.client_phone });
  const quotationPayload = {
    quotation_number: quote.quote_number,
    customer_id: customer?.id || null,
    customer_name: customer?.name || quote.client_name || 'Cliente não identificado',
    status: statusMap[quote.status] || 'draft',
    valid_until: quote.valid_days ? new Date(Date.now() + Number(quote.valid_days) * 86400000).toISOString().slice(0, 10) : null,
    subtotal: Number(quote.total_price || quote.unit_price || 0),
    discount_amount: Number(quote.discount_pct || 0),
    total: Number(quote.final_price || quote.total_price || quote.unit_price || 0),
    origin: 'legacy_product_quote',
    notes: quote.notes || '',
  };

  const existingQuotation = await firstOrNull(erp.entities.Quotation.filter({ quotation_number: quote.quote_number }, '-created_date', 1));
  const quotation = existingQuotation
    ? await erp.entities.Quotation.update(existingQuotation.id, quotationPayload)
    : await erp.entities.Quotation.create(quotationPayload);

  const itemPayload = {
    quotation_id: quotation.id,
    description: quote.product_name || quote.description || 'Item legado',
    quantity: Number(quote.quantity || 1),
    unit: 'un',
    unit_price: Number(quote.unit_price || 0),
    discount_pct: Number(quote.discount_pct || 0),
    total: Number(quote.final_price || quote.total_price || 0),
    projected_available: null,
  };

  const existingItem = await firstOrNull(erp.entities.QuotationItem.filter({ quotation_id: quotation.id }, '-created_date', 1));
  if (existingItem) {
    await erp.entities.QuotationItem.update(existingItem.id, itemPayload);
  } else {
    await erp.entities.QuotationItem.create(itemPayload);
  }

  return quotation;
}

export async function syncLegacySalesOrderToCore(order, product, reservationId = null) {
  const customer = await ensureCustomer({ name: order.client_name });
  const coreProduct = product ? await syncLegacyProductToCore(product) : null;
  const warehouse = coreProduct?.warehouse || await ensureWarehouse();

  return { customer, warehouse, variant: coreProduct?.variant || null, reservationId };
}

export async function syncStockMovementItem(movement, product) {
  const coreProduct = await syncLegacyProductToCore(product);
  const movementNumber = `MOV-${Date.now().toString().slice(-8)}`;

  await erp.entities.StockMovementItem.create({
    movement_number: movementNumber,
    movement_type: movement.type,
    product_variant_id: coreProduct.variant.id,
    warehouse_to_id: movement.type === 'entrada' ? coreProduct.warehouse.id : null,
    warehouse_from_id: movement.type === 'saida' ? coreProduct.warehouse.id : null,
    quantity: Number(movement.quantity || 0),
    unit_cost: Number(product.cost_price || 0),
    reason: movement.reason || '',
    reference_type: 'legacy_stock_movement',
    reference_id: movement.id,
    status: 'posted',
    movement_date: movement.date ? new Date(movement.date).toISOString() : new Date().toISOString(),
  });

  return coreProduct;
}

export async function ensureReservation({ salesOrder, product, quantity }) {
  if (!product || product.track_stock === false || quantity <= 0) return null;
  const coreProduct = await syncLegacyProductToCore(product);
  const warehouse = coreProduct.warehouse;
  const existing = await firstOrNull(erp.entities.StockReservation.filter({ reference_type: 'sales_order', reference_id: salesOrder.id, status: 'active' }, '-created_date', 1));
  const payload = {
    product_variant_id: coreProduct.variant.id,
    warehouse_id: warehouse.id,
    reference_type: 'sales_order',
    reference_id: salesOrder.id,
    quantity: Number(quantity),
    status: 'active',
  };
  if (existing) return erp.entities.StockReservation.update(existing.id, payload);
  return erp.entities.StockReservation.create(payload);
}

export async function consumeReservation(reservationId) {
  if (!reservationId) return null;
  return erp.entities.StockReservation.update(reservationId, { status: 'consumed' });
}

export async function releaseReservation(reservationId) {
  if (!reservationId) return null;
  return erp.entities.StockReservation.update(reservationId, { status: 'released' });
}

export async function convertQuoteToSalesOrder(quote, clientRecord) {
  const customer = await ensureCustomer({ ...clientRecord, client_name: quote.client_name, client_phone: quote.client_phone });
  const order = await erp.entities.SalesOrder.create({
    order_number: `PV-${Date.now().toString().slice(-6)}`,
    client_id: customer?.id || null,
    client_name: customer?.name || quote.client_name || 'Cliente',
    items: quote.product_name || quote.description || 'Item convertido do orçamento',
    subtotal: Number(quote.total_price || quote.unit_price || 0),
    discount_percent: Number(quote.discount_pct || 0),
    total: Number(quote.final_price || quote.total_price || quote.unit_price || 0),
    payment_method: 'pix',
    delivery_date: '',
    notes: quote.notes || '',
    status: 'novo',
    payment_status: 'pendente',
  });

  return order;
}