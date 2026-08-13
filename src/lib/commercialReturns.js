import moment from 'moment';
import { erp } from '@/api/erpClient';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { restoreSaleStock } from '@/lib/commercialPersistence';

/**
 * Processa uma devolucao/troca de itens de uma venda entregue.
 * - grava SaleReturn (cabecalho) + SaleReturnItem (linhas devolvidas);
 * - devolve ao estoque a quantidade/area retornada (movimento 'devolucao');
 * - lanca o reembolso no financeiro (saida) quando ha valor a devolver;
 * - marca a venda como 'devolvido' (total) ou anota devolucao parcial.
 *
 * returnedLines: [{ product_id, product_name, quantity, width_mm, height_mm,
 *   material_waste_pct, pricing_mode, unit_price, refund }]
 */
export async function processReturn({ order, returnedLines, products = [], reason, refundAmount, refundMethod, userName }) {
  const lines = (returnedLines || []).filter((line) => parseDecimal(line.quantity) > 0);
  if (!lines.length) throw new Error('Selecione ao menos um item e a quantidade devolvida.');

  const refund = roundCurrency(refundAmount);
  const header = await erp.entities.SaleReturn.create({
    sales_order_id: order.id,
    order_number: order.order_number || '',
    client_id: order.client_id || '',
    client_name: order.client_name || '',
    reason: reason || 'devolucao',
    refund_amount: refund,
    refund_method: refundMethod || order.payment_method || 'pix',
    date: moment().format('YYYY-MM-DD'),
    created_by: userName || '',
    items_count: lines.length,
  });

  await erp.entities.SaleReturnItem.bulkCreate(lines.map((line) => ({
    sale_return_id: header.id,
    sales_order_id: order.id,
    product_id: line.product_id || null,
    product_name: line.product_name || '',
    pricing_mode: line.pricing_mode || 'unitario',
    quantity: parseDecimal(line.quantity),
    width_mm: line.width_mm ? Number(line.width_mm) : null,
    height_mm: line.height_mm ? Number(line.height_mm) : null,
    material_waste_pct: parseDecimal(line.material_waste_pct),
    unit_price: parseDecimal(line.unit_price),
    refund: roundCurrency(line.refund),
  })));

  // Devolve ao estoque exatamente a quantidade/area retornada (kit e area cientes).
  await restoreSaleStock(lines, products, {
    referenceId: header.id,
    reason: `Devolucao ${order.order_number || ''}`.trim(),
    userName,
    movementType: 'devolucao',
  });

  // Reembolso: saida no financeiro pelo valor efetivamente devolvido.
  if (refund > 0) {
    await erp.entities.Transaction.create({
      type: 'saida',
      amount: refund,
      description: `Devolucao venda ${order.order_number} - ${order.client_name}`,
      category: 'devolucoes',
      payment_method: refundMethod || order.payment_method || 'pix',
      date: moment().format('YYYY-MM-DD'),
      client_id: order.client_id || '',
      order_id: order.id,
      confirmed: true,
    });
  }

  return header;
}
