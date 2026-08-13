import moment from 'moment';
import { erp } from '@/api/erpClient';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { PARTNERS } from '@/lib/financeConstants';

/**
 * Comissão por sócio. Toda venda gera automaticamente uma comissão para quem a
 * criou (created_by_partner), usando a taxa do sócio (configurável) sobre o
 * total. A liquidação (paid) continua no painel de comissões do financeiro.
 */

export const DEFAULT_COMMISSION_PCT = 5;

/** Taxas por sócio a partir da configuração da empresa (JSON), com padrão. */
export function commissionRates(companyConfig) {
  let rates = {};
  try {
    rates = JSON.parse(companyConfig?.commission_rates_json || '{}') || {};
  } catch {
    rates = {};
  }
  const fallback = parseDecimal(companyConfig?.commission_percent_default) || DEFAULT_COMMISSION_PCT;
  const resolved = {};
  PARTNERS.forEach((partner) => {
    const value = parseDecimal(rates[partner]);
    resolved[partner] = value > 0 ? value : fallback;
  });
  return resolved;
}

export function resolveCommissionRate(partner, companyConfig) {
  return commissionRates(companyConfig)[partner] ?? (parseDecimal(companyConfig?.commission_percent_default) || DEFAULT_COMMISSION_PCT);
}

/**
 * Cria a comissão da venda (idempotente: não duplica para o mesmo pedido).
 * Só gera se houver sócio responsável e total positivo.
 */
export async function createSaleCommission(order, companyConfig) {
  const seller = order?.created_by_partner;
  const total = roundCurrency(parseDecimal(order?.total));
  if (!seller || !(total > 0)) return null;
  const existing = await erp.entities.SellerCommission.filter({ order_id: order.id });
  if (existing && existing.length) return existing[0];
  const percent = resolveCommissionRate(seller, companyConfig);
  return erp.entities.SellerCommission.create({
    seller_name: seller,
    order_id: order.id,
    order_number: order.order_number || '',
    order_total: total,
    commission_percent: percent,
    commission_value: roundCurrency((total * percent) / 100),
    paid: false,
  });
}

/** Remove as comissões de um pedido (cancelamento/exclusão). Não mexe nas já pagas. */
export async function voidSaleCommission(orderId) {
  if (!orderId) return 0;
  const rows = await erp.entities.SellerCommission.filter({ order_id: orderId });
  const removable = (rows || []).filter((row) => !row.paid);
  await Promise.all(removable.map((row) => erp.entities.SellerCommission.delete(row.id)));
  return removable.length;
}

const inPeriod = (dateStr, start, end) => {
  if (!start && !end) return true;
  const d = dateStr ? moment(dateStr) : null;
  if (!d || !d.isValid()) return false;
  if (start && d.isBefore(start, 'day')) return false;
  if (end && d.isAfter(end, 'day')) return false;
  return true;
};

/**
 * Desempenho por sócio no período: nº de vendas, faturamento, margem e
 * comissão. Usado no painel de metas/comissões de Vendas.
 */
export function salesPerformanceByPartner(orders = [], commissions = [], { start = null, end = null } = {}) {
  const base = {};
  PARTNERS.forEach((partner) => { base[partner] = { partner, salesCount: 0, salesTotal: 0, cost: 0, commission: 0 }; });
  (orders || []).forEach((order) => {
    if (order.status === 'cancelado') return;
    if (!inPeriod(order.created_date, start, end)) return;
    const partner = order.created_by_partner || 'Maeli';
    if (!base[partner]) base[partner] = { partner, salesCount: 0, salesTotal: 0, cost: 0, commission: 0 };
    base[partner].salesCount += 1;
    base[partner].salesTotal += parseDecimal(order.total);
    base[partner].cost += parseDecimal(order.total_cost);
  });
  (commissions || []).forEach((commission) => {
    if (!inPeriod(commission.created_date, start, end)) return;
    const partner = commission.seller_name;
    if (!base[partner]) base[partner] = { partner, salesCount: 0, salesTotal: 0, cost: 0, commission: 0 };
    base[partner].commission += parseDecimal(commission.commission_value);
  });
  return Object.values(base).map((row) => ({
    ...row,
    salesTotal: roundCurrency(row.salesTotal),
    cost: roundCurrency(row.cost),
    commission: roundCurrency(row.commission),
    margin: roundCurrency(row.salesTotal - row.cost),
    marginPct: row.salesTotal > 0 ? Math.round(((row.salesTotal - row.cost) / row.salesTotal) * 100) : 0,
  }));
}
