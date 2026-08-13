import { erp } from '@/api/erpClient';
import { buildSaleStockDeltas } from '@/lib/commercialPersistence';

/**
 * Reserva de estoque para orçamentos aprovados que ainda não viraram venda.
 * O estoque só é baixado de fato na conversão; até lá, a reserva marca o
 * saldo como "comprometido" para não prometer o mesmo item a dois clientes.
 * Chaveada pelo product_id legado (que é o que a tela de estoque mostra) e
 * reaproveita a explosão de kit/área já testada de buildSaleStockDeltas.
 */

/** Libera (status=released) todas as reservas ativas de um orçamento. */
export async function releaseQuoteReservations(quoteId) {
  if (!quoteId) return 0;
  const active = await erp.entities.StockReservation.filter({ reference_id: quoteId, status: 'active' });
  await Promise.all((active || []).map((row) => erp.entities.StockReservation.update(row.id, { status: 'released' })));
  return (active || []).length;
}

/**
 * Reserva o estoque necessário para os itens do orçamento (com expansão de kit
 * e área). Idempotente: libera reservas anteriores do mesmo orçamento antes.
 */
export async function reserveQuoteStock(quote, items, products) {
  await releaseQuoteReservations(quote.id);
  const deltas = buildSaleStockDeltas(items, products);
  const creates = [];
  deltas.forEach((quantity, productId) => {
    if (quantity > 0) {
      creates.push(erp.entities.StockReservation.create({
        product_variant_id: productId,
        reference_type: 'quote',
        reference_id: quote.id,
        quantity: Number(quantity),
        status: 'active',
      }));
    }
  });
  await Promise.all(creates);
  return creates.length;
}

/** Map(product_id -> quantidade reservada ativa) a partir das reservas. */
export function reservedByProduct(reservations = []) {
  const map = new Map();
  (reservations || [])
    .filter((row) => row.status === 'active')
    .forEach((row) => {
      const id = row.product_variant_id;
      if (!id) return;
      map.set(id, (map.get(id) || 0) + Number(row.quantity || 0));
    });
  return map;
}
