import { describe, it, expect } from 'vitest';
import { buildQuoteSnapshot, snapshotToRestore, nextRevisionNumber, parseRevisionSnapshot } from './quoteVersioning';

const sampleQuote = {
  id: 'Q1',
  created_date: '2026-01-01',
  updated_date: '2026-01-02',
  quote_number: 'ORC-1',
  client_name: 'Cliente X',
  final_price: 200,
  total_cost: 90,
  total_price: 200,
  discount_pct: 0,
  status: 'enviado',
  revision: 2,
  // campos que NÃO devem entrar no snapshot de conteúdo:
  approved_by_name: 'Fulano',
  option_label: 'Opção A',
};

const sampleItems = [
  { id: 'I1', quotation_id: 'Q1', created_date: 'x', product_name: 'Placa', quantity: 2, unit_price: 100, total: 200 },
];

describe('buildQuoteSnapshot', () => {
  it('captures commercial quote fields and strips lifecycle/system fields', () => {
    const snap = buildQuoteSnapshot(sampleQuote, sampleItems);
    expect(snap.quote.client_name).toBe('Cliente X');
    expect(snap.quote.final_price).toBe(200);
    // não captura id, status, aprovação nem rótulo de opção
    expect(snap.quote.id).toBeUndefined();
    expect(snap.quote.status).toBeUndefined();
    expect(snap.quote.approved_by_name).toBeUndefined();
    expect(snap.quote.option_label).toBeUndefined();
  });

  it('cleans system fields from items but keeps content', () => {
    const snap = buildQuoteSnapshot(sampleQuote, sampleItems);
    expect(snap.items).toHaveLength(1);
    expect(snap.items[0].product_name).toBe('Placa');
    expect(snap.items[0].total).toBe(200);
    expect(snap.items[0].id).toBeUndefined();
    expect(snap.items[0].quotation_id).toBeUndefined();
    expect(snap.items[0].created_date).toBeUndefined();
  });

  it('records status_at_snapshot and totals', () => {
    const snap = buildQuoteSnapshot(sampleQuote, sampleItems);
    expect(snap.status_at_snapshot).toBe('enviado');
    expect(snap.totals.final_price).toBe(200);
    expect(snap.totals.line_items_count).toBe(1);
  });
});

describe('snapshotToRestore', () => {
  it('produces a quote patch (content only) and items rebound to the quote id', () => {
    const snap = buildQuoteSnapshot(sampleQuote, sampleItems);
    const { quotePatch, items } = snapshotToRestore(snap, 'Q1');
    expect(quotePatch.client_name).toBe('Cliente X');
    expect(quotePatch.final_price).toBe(200);
    // não restaura status nem aprovação — quem chama decide (volta a rascunho)
    expect(quotePatch.status).toBeUndefined();
    expect(quotePatch.approved_by_name).toBeUndefined();
    expect(items).toHaveLength(1);
    expect(items[0].quotation_id).toBe('Q1');
    expect(items[0].id).toBeUndefined();
  });

  it('is a stable round-trip: snapshot then restore preserves item content', () => {
    const snap = buildQuoteSnapshot(sampleQuote, sampleItems);
    const { items } = snapshotToRestore(snap, 'Q2');
    expect(items[0].product_name).toBe('Placa');
    expect(items[0].quantity).toBe(2);
    expect(items[0].total).toBe(200);
    expect(items[0].quotation_id).toBe('Q2');
  });
});

describe('nextRevisionNumber', () => {
  it('is one above the max of quote.revision and history', () => {
    expect(nextRevisionNumber({ revision: 2 }, [])).toBe(3);
    expect(nextRevisionNumber({ revision: 1 }, [{ revision_number: 4 }, { revision_number: 2 }])).toBe(5);
    expect(nextRevisionNumber({}, [])).toBe(2); // default revision 1 -> next 2
  });
});

describe('parseRevisionSnapshot', () => {
  it('parses a JSON string snapshot', () => {
    const parsed = parseRevisionSnapshot({ snapshot_json: JSON.stringify({ quote: { final_price: 5 }, items: [] }) });
    expect(parsed.quote.final_price).toBe(5);
  });

  it('returns null on invalid JSON instead of throwing', () => {
    expect(parseRevisionSnapshot({ snapshot_json: '{bad json' })).toBeNull();
    expect(parseRevisionSnapshot(null)).toBeNull();
  });
});
