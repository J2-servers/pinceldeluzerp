import moment from 'moment';
import { erp } from '@/api/erpClient';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { calcAreaM2 } from '@/lib/pricingEngine';

const DEFAULT_WASTE_PCT = 12;

/**
 * Persistencia comercial compartilhada entre Vendas e Orcamentos.
 * Centraliza: payload de item (com snapshot de preco), baixa/estorno de
 * estoque ATOMICO via a funcao de servidor adjustStockBulk (com expansao de
 * kit), e geracao de parcelas de contas a receber.
 */

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};

const asObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' ? parsed : null; } catch { return null; }
  }
  return null;
};

// Produtos vendaveis unitarios com controle de estoque entram na baixa por peca.
function unitStockEligible(product) {
  return !!product
    && product.track_stock !== false
    && product.auto_deduct_on_sale !== false
    && product.pricing_mode === 'unitario';
}

// Itens de area (acrilico) com controle por m2: o estoque (quantity) esta em m2
// e cada venda baixa a area consumida da peca. So conta quando track_area_stock
// esta ligado — assim os itens de area antigos (sem esse controle) seguem iguais.
function areaStockEligible(product) {
  return !!product
    && product.pricing_mode === 'area_m2'
    && product.track_area_stock === true
    && product.track_stock !== false
    && product.auto_deduct_on_sale !== false;
}

// Area consumida (m2) por uma linha de venda de item de area: area da peca x
// quantidade x (1 + perda%). A perda cobre o desperdicio real de corte.
function lineAreaConsumed(item) {
  const qty = parseDecimal(item.quantity) || 0;
  const pieceArea = calcAreaM2(item.width_mm, item.height_mm);
  if (pieceArea <= 0 || qty <= 0) return 0;
  const wastePct = parseDecimal(item.material_waste_pct);
  const factor = 1 + (wastePct > 0 ? wastePct : DEFAULT_WASTE_PCT) / 100;
  return Math.round(pieceArea * qty * factor * 10000) / 10000;
}

/**
 * Mapa produto_id -> quantidade (positiva) a baixar do estoque para os itens
 * vendidos. Unidades em pecas (unitario) e area em m2 (acrilico) convivem no
 * mesmo mapa porque cada produto e de um tipo so. Expande kits nos componentes.
 */
export function buildSaleStockDeltas(items = [], products = []) {
  const map = new Map();
  const add = (productId, qty) => {
    if (!productId || qty <= 0) return;
    map.set(productId, (map.get(productId) || 0) + qty);
  };
  const findProduct = (id) => products.find((entry) => entry.id === id);
  (items || []).forEach((item) => {
    const qty = parseDecimal(item.quantity) || 0;
    if (qty <= 0) return;
    const product = findProduct(item.product_id);
    if (!product) return;
    if (product.is_kit) {
      asArray(product.kit_components).forEach((component) => {
        const comp = findProduct(component.product_id);
        const compQty = parseDecimal(component.quantity) || 0;
        if (comp && unitStockEligible(comp)) add(comp.id, qty * compQty);
      });
    } else if (areaStockEligible(product)) {
      add(product.id, lineAreaConsumed(item));
    } else if (unitStockEligible(product)) {
      add(product.id, qty);
    }
  });
  return map;
}

/** Verifica disponibilidade antes de criar o documento (mensagem amigavel). */
export function assertStockAvailable(items, products) {
  const deltas = buildSaleStockDeltas(items, products);
  for (const [productId, qty] of deltas) {
    const product = products.find((entry) => entry.id === productId);
    const available = parseDecimal(product?.quantity);
    if (qty > available) {
      const unit = product?.pricing_mode === 'area_m2' ? ' m2' : '';
      throw new Error(`Estoque insuficiente para ${product?.name || 'produto'}. Disponivel: ${available}${unit}, necessario: ${qty}${unit}.`);
    }
  }
}

/** Baixa de estoque atomica (uma transacao no servidor) para uma venda. */
export async function applySaleStock(items, products, { referenceId, reason, userName } = {}) {
  const deltas = buildSaleStockDeltas(items, products);
  if (!deltas.size) return { movements: [] };
  const payload = {
    items: Array.from(deltas, ([product_id, qty]) => ({ product_id, delta: -qty })),
    movement_type: 'saida',
    reason: reason || 'Baixa por venda',
    reference_id: referenceId || '',
    user_name: userName || '',
  };
  const response = await erp.functions.invoke('adjustStockBulk', payload);
  return response?.data || {};
}

/** Estorno de estoque (devolve o saldo) ao cancelar/excluir/devolver uma venda. */
export async function restoreSaleStock(items, products, { referenceId, reason, userName, movementType = 'estorno' } = {}) {
  const deltas = buildSaleStockDeltas(items, products);
  if (!deltas.size) return { movements: [] };
  const payload = {
    items: Array.from(deltas, ([product_id, qty]) => ({ product_id, delta: qty })),
    movement_type: movementType,
    reason: reason || 'Estorno por cancelamento',
    reference_id: referenceId || '',
    user_name: userName || '',
  };
  const response = await erp.functions.invoke('adjustStockBulk', payload);
  return response?.data || {};
}

/**
 * Campos extras de item que preservam o calculo original (snapshot congela o
 * preco combinado; os demais dao rastreabilidade do desconto e da margem).
 */
export function commercialItemExtras(item) {
  const snapshot = item.pricing_snapshot ? JSON.stringify(item.pricing_snapshot) : '';
  const additionals = asArray(item.additionals);
  const materials = asArray(item.materials);
  const laborSteps = asArray(item.labor_steps);
  const machineOps = asArray(item.machine_ops);
  const qtyTiers = asArray(item.qty_tiers);
  return {
    pricing_snapshot: snapshot,
    price_locked: !!item.price_locked,
    price_source: item.price_source || 'formula',
    additionals_json: additionals.length ? JSON.stringify(additionals) : '',
    materials_json: materials.length ? JSON.stringify(materials) : '',
    materials_list_cost: roundCurrency(parseDecimal(item.materials_list_cost)),
    materials_list_sale: roundCurrency(parseDecimal(item.materials_list_sale)),
    labor_steps_json: laborSteps.length ? JSON.stringify(laborSteps) : '',
    machine_ops_json: machineOps.length ? JSON.stringify(machineOps) : '',
    labor_steps_cost: roundCurrency(parseDecimal(item.labor_steps_cost)),
    machine_ops_cost: roundCurrency(parseDecimal(item.machine_ops_cost)),
    qty_tiers_json: qtyTiers.length ? JSON.stringify(qtyTiers) : '',
    tax_pct: roundCurrency(parseDecimal(item.tax_pct)),
    tax_value: roundCurrency(parseDecimal(item.tax_value)),
    total_pretax: roundCurrency(parseDecimal(item.total_pretax)),
    closed_unit_price: roundCurrency(parseDecimal(item.closed_unit_price)),
    target_margin_override_pct: roundCurrency(parseDecimal(item.target_margin_override_pct)),
    round_to: parseDecimal(item.round_to),
    round_mode: item.round_mode || 'nearest',
    additionals_total: roundCurrency(parseDecimal(item.additionals_total)),
    discount_value: roundCurrency(parseDecimal(item.discount_value)),
    discount_applied: roundCurrency(parseDecimal(item.discount_applied)),
    margin_pct: roundCurrency(parseDecimal(item.margin_pct)),
    min_margin_pct: roundCurrency(parseDecimal(item.min_margin_pct)),
  };
}

/** Reconstroi os campos de calculo ao reabrir um item salvo (respeita snapshot). */
export function hydrateStoredItem(stored) {
  const snapshot = asObject(stored.pricing_snapshot);
  return {
    ...stored,
    pricing_snapshot: snapshot || undefined,
    additionals: asArray(stored.additionals_json),
    materials: asArray(stored.materials_json),
    labor_steps: asArray(stored.labor_steps_json),
    machine_ops: asArray(stored.machine_ops_json),
    qty_tiers: asArray(stored.qty_tiers_json),
    price_locked: !!stored.price_locked,
  };
}

/**
 * Gera parcelas de contas a receber para uma venda parcelada. Cria uma linha
 * de AccountReceivable por parcela, com vencimento mensal a partir de hoje.
 * So roda quando ha mais de 1 parcela e o pagamento nao foi quitado.
 */
export async function generateInstallments({ order, installments, clientId, clientName, startDate }) {
  const count = Math.max(1, Math.round(parseDecimal(installments)));
  if (count <= 1) return [];
  const total = parseDecimal(order.total);
  if (total <= 0) return [];
  const base = Math.floor((total / count) * 100) / 100;
  const created = [];
  const start = startDate ? moment(startDate) : moment();
  for (let index = 0; index < count; index += 1) {
    // A ultima parcela absorve o arredondamento para fechar o total exato.
    const amount = index === count - 1 ? roundCurrency(total - base * (count - 1)) : base;
    const due = moment(start).add(index, 'months').format('YYYY-MM-DD');
    const row = await erp.entities.AccountReceivable.create({
      client_id: clientId || order.client_id || '',
      client_name: clientName || order.client_name || '',
      description: `Venda ${order.order_number} - parcela ${index + 1}/${count}`,
      amount,
      due_date: due,
      received: false,
      order_id: order.id,
      installment_number: index + 1,
      installments: count,
      category: 'vendas',
    });
    created.push(row);
  }
  return created;
}
