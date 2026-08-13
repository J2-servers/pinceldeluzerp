import moment from 'moment';
import { erp } from '@/api/erpClient';
import { parseDecimal } from '@/lib/numberFormat';

/**
 * Versionamento de orçamentos: revisões, versão aprovada congelada e
 * restauração. Um snapshot guarda o conteúdo comercial (cabeçalho + itens +
 * totais) de forma auto-contida, para poder ser exibido, restaurado ou
 * exportado em PDF sem depender do estado atual do orçamento.
 */

// Campos comerciais do orçamento capturados no snapshot (exclui id, status,
// metadados de aprovação e campos de opção — esses pertencem ao ciclo de vida,
// não ao conteúdo).
export const CAPTURED_QUOTE_FIELDS = [
  'client_name', 'client_phone', 'client_id', 'product_id', 'product_group',
  'pricing_mode', 'product_name', 'description', 'items_summary', 'line_items_count',
  'quantity', 'material_cost', 'cut_time_min', 'machine_cost_total', 'labor_hours',
  'labor_cost_total', 'general_art_cost', 'additional_charge', 'subtotal_products',
  'subtotal_services', 'total_cost', 'total_price', 'discount_pct', 'discount_value',
  'additionals_json', 'final_price', 'margin_pct', 'margin_override_reason',
  'valid_days', 'deadline_days', 'notes', 'internal_notes', 'payment_conditions',
  'created_by_partner', 'unit_price',
];

const ITEM_SYSTEM_FIELDS = new Set([
  'id', 'quotation_id', 'created_date', 'updated_date', 'created_by', 'created_by_id',
  'updated_by', 'is_sample',
]);

const pickQuoteFields = (quote) => {
  const out = {};
  CAPTURED_QUOTE_FIELDS.forEach((field) => {
    if (quote?.[field] !== undefined && quote?.[field] !== null) out[field] = quote[field];
  });
  return out;
};

const cleanItem = (item) => {
  const out = {};
  Object.keys(item || {}).forEach((key) => {
    if (!ITEM_SYSTEM_FIELDS.has(key)) out[key] = item[key];
  });
  return out;
};

/**
 * Monta um snapshot auto-contido a partir do orçamento salvo + seus itens.
 */
export function buildQuoteSnapshot(quote, items = []) {
  const cleanItems = (Array.isArray(items) ? items : []).map(cleanItem);
  return {
    quote: pickQuoteFields(quote),
    items: cleanItems,
    totals: {
      final_price: parseDecimal(quote?.final_price),
      total_cost: parseDecimal(quote?.total_cost),
      total_price: parseDecimal(quote?.total_price),
      discount_pct: parseDecimal(quote?.discount_pct),
      discount_value: parseDecimal(quote?.discount_value),
      line_items_count: cleanItems.length,
    },
    status_at_snapshot: quote?.status || 'rascunho',
    quote_number: quote?.quote_number || '',
  };
}

/** Faz o parse seguro do snapshot_json de uma revisão. */
export function parseRevisionSnapshot(revision) {
  if (!revision) return null;
  try {
    return typeof revision.snapshot_json === 'string'
      ? JSON.parse(revision.snapshot_json)
      : (revision.snapshot_json || null);
  } catch {
    return null;
  }
}

/** Próximo número de revisão dado o histórico existente e a revisão atual. */
export function nextRevisionNumber(quote, revisions = []) {
  const fromHistory = (Array.isArray(revisions) ? revisions : [])
    .reduce((max, rev) => Math.max(max, Number(rev.revision_number || 0)), 0);
  const fromQuote = Number(quote?.revision || 1);
  return Math.max(fromHistory, fromQuote) + 1;
}

/**
 * Persiste uma revisão (snapshot) do estado atual do orçamento.
 * kind: 'revision' (histórico automático), 'approved' (versão congelada
 * aprovada) ou 'restore_point' (antes de restaurar).
 */
export async function createQuoteRevision({ quote, items, revisionNumber, kind = 'revision', note = '', createdBy = '', isApproved = false }) {
  const snapshot = buildQuoteSnapshot(quote, items);
  const record = await erp.entities.QuoteRevision.create({
    quote_id: quote.id,
    quote_number: quote.quote_number || '',
    revision_number: Number(revisionNumber || quote.revision || 1),
    kind,
    snapshot_json: JSON.stringify(snapshot),
    final_price: parseDecimal(quote.final_price),
    total_cost: parseDecimal(quote.total_cost),
    line_items_count: Array.isArray(items) ? items.length : 0,
    status_at_snapshot: quote.status || 'rascunho',
    is_approved: !!isApproved,
    created_by: createdBy || quote.created_by_partner || '',
    note: note || '',
  });
  return record;
}

/**
 * Converte um snapshot nos dados para restaurá-lo como estado atual:
 * os campos comerciais a gravar no ProductQuote e os payloads de QuotationItem.
 * Não mexe em status/aprovação — quem chama decide (restaurar volta a rascunho).
 */
export function snapshotToRestore(snapshot, quoteId) {
  if (!snapshot) return { quotePatch: {}, items: [] };
  const quotePatch = {};
  CAPTURED_QUOTE_FIELDS.forEach((field) => {
    if (snapshot.quote?.[field] !== undefined) quotePatch[field] = snapshot.quote[field];
  });
  const items = (Array.isArray(snapshot.items) ? snapshot.items : []).map((item) => ({
    ...cleanItem(item),
    quotation_id: quoteId,
  }));
  return { quotePatch, items };
}

/** Lista as revisões de um orçamento, mais recentes primeiro. */
export async function listQuoteRevisions(quoteId) {
  if (!quoteId) return [];
  const revisions = await erp.entities.QuoteRevision.filter({ quote_id: quoteId });
  return (revisions || []).sort((a, b) => Number(b.revision_number || 0) - Number(a.revision_number || 0));
}

/** Marca a hora atual em ISO (usado na aprovação). */
export const nowIso = () => moment().toISOString();
