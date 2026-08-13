import moment from 'moment';
import { erp } from '@/api/erpClient';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';

/**
 * Reposição → compra. Fecha o lado de entrada do estoque: itens abaixo do
 * mínimo viram sugestão de compra, agrupada por fornecedor; a sugestão vira
 * um Pedido de Compra; ao receber, dá entrada atômica no estoque (custo médio).
 */

const nowIso = () => moment().toISOString();

/** Sugestão de compra de um item (alvo = máximo, ou 2× o mínimo). */
export function reorderSuggestion(product) {
  const quantity = parseDecimal(product.quantity);
  const minQuantity = parseDecimal(product.min_quantity) || 1;
  const maxQuantity = parseDecimal(product.max_quantity);
  const target = maxQuantity > 0 ? maxQuantity : minQuantity * 2;
  const suggestion = Math.max(0, target - quantity);
  const unitCost = parseDecimal(product.cost_price);
  return { quantity, minQuantity, maxQuantity, target, suggestion, unitCost, estimated: roundCurrency(suggestion * unitCost) };
}

/** Itens abaixo do mínimo agrupados por fornecedor, com sugestão e total. */
export function buildReorderGroups(products = []) {
  const low = (products || []).filter((p) => p.track_stock !== false && parseDecimal(p.quantity) <= (parseDecimal(p.min_quantity) || 1));
  const map = new Map();
  low.forEach((product) => {
    const supplier = String(product.supplier_name || '').trim() || 'Sem fornecedor';
    if (!map.has(supplier)) map.set(supplier, []);
    map.get(supplier).push({ product, ...reorderSuggestion(product) });
  });
  return [...map.entries()]
    .map(([supplier, rows]) => ({
      supplier,
      rows: rows.sort((a, b) => String(a.product.name || '').localeCompare(String(b.product.name || ''))),
      total: roundCurrency(rows.reduce((sum, row) => sum + row.estimated, 0)),
      buyableCount: rows.filter((row) => row.suggestion > 0).length,
    }))
    .sort((a, b) => {
      if (a.supplier === 'Sem fornecedor') return 1;
      if (b.supplier === 'Sem fornecedor') return -1;
      return a.supplier.localeCompare(b.supplier);
    });
}

/** Parse seguro dos itens (JSON) de um pedido de compra. */
export function parsePurchaseItems(po) {
  try {
    const parsed = JSON.parse(po?.items || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Cria um Pedido de Compra (rascunho) a partir de um grupo de fornecedor. */
export async function createPurchaseOrderForGroup(group, { userName } = {}) {
  const items = group.rows
    .filter((row) => row.suggestion > 0)
    .map((row) => ({
      product_id: row.product.id,
      product_name: row.product.name,
      sku: row.product.sku || '',
      quantity: row.suggestion,
      unit: row.product.unit || 'un',
      unit_cost: row.unitCost,
      total: roundCurrency(row.suggestion * row.unitCost),
    }));
  if (!items.length) throw new Error('Nada a comprar neste fornecedor.');
  const total = roundCurrency(items.reduce((sum, item) => sum + item.total, 0));
  return erp.entities.PurchaseOrder.create({
    supplier_name: group.supplier === 'Sem fornecedor' ? '' : group.supplier,
    items: JSON.stringify(items),
    total,
    status: 'rascunho',
    order_date: nowIso(),
    notes: `Gerado pela reposição${userName ? ` por ${userName}` : ''}.`,
  });
}

/**
 * Recebe um pedido de compra: dá entrada atômica de cada item no estoque
 * (custo médio ponderado via a função de servidor adjustStock) e marca o
 * pedido como recebido. Idempotência: não recebe pedido já recebido.
 */
export async function receivePurchaseOrder(po, { userName } = {}) {
  if (po?.status === 'recebido') throw new Error('Este pedido já foi recebido.');
  const items = parsePurchaseItems(po);
  let received = 0;
  for (const item of items) {
    const qty = Math.abs(parseDecimal(item.quantity));
    if (!item.product_id || !(qty > 0)) continue;
    const payload = {
      product_id: item.product_id,
      delta: qty,
      movement_type: 'entrada',
      reason: `Recebimento do pedido de compra ${po.supplier_name || ''}`.trim(),
      user_name: userName || '',
    };
    const unitCost = parseDecimal(item.unit_cost);
    if (unitCost > 0) payload.unit_cost = unitCost;
    await erp.functions.invoke('adjustStock', payload);
    received += 1;
  }
  const updated = await erp.entities.PurchaseOrder.update(po.id, { status: 'recebido', delivery_date: nowIso() });
  return { updated, received };
}
