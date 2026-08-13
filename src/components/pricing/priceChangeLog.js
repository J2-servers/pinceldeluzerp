import { erp } from '@/api/erpClient';

// Rotulos das tabelas de precificacao usados no historico e nos filtros.
export const PRICE_LOG_ENTITY_LABELS = {
  FixedExpense: 'Despesa fixa',
  MachineCost: 'Maquina',
  LaborRateProfile: 'Mao de obra',
  ServicePricingProfile: 'Perfil de servico',
  OperationalPreset: 'Preset operacional',
  MarkupRule: 'Regra de margem',
  MaterialParameter: 'Material',
  PricingSettings: 'Parametros globais',
  ProductPriceRule: 'Preco por cliente',
  VolumePricing: 'Desconto por volume',
};

// Rotulos legiveis para os campos mais comuns das tabelas de precificacao.
export const PRICE_FIELD_LABELS = {
  name: 'Nome',
  category: 'Categoria',
  amount: 'Valor mensal',
  active: 'Ativo',
  machine_type: 'Tipo de maquina',
  internal_minute_cost: 'Custo/min',
  sale_minute_price: 'Venda/min',
  setup_fee: 'Setup',
  monthly_total_cost: 'Custo mensal total',
  productive_minutes_month: 'Minutos produtivos/mes',
  role: 'Funcao',
  internal_hour_cost: 'Custo/h',
  sale_hour_price: 'Venda/h',
  product_group: 'Grupo de produto',
  minimum_margin_pct: 'Margem minima %',
  target_margin_pct: 'Margem alvo %',
  material_type: 'Tipo de material',
  pricing_mode: 'Modo de preco',
  unit: 'Unidade',
  sheet_width_mm: 'Chapa largura (mm)',
  sheet_height_mm: 'Chapa altura (mm)',
  sheet_cost: 'Custo da chapa',
  cost_per_m2: 'Custo por m2',
  sale_price_per_m2: 'Venda por m2',
  unit_cost: 'Custo unitario',
  sale_price: 'Venda unitaria',
  waste_pct: 'Perda %',
  notes: 'Observacao',
  product_id: 'Produto vinculado',
  product_name: 'Produto',
  sku: 'SKU',
  service_type: 'Tipo de servico',
  default_machine_minutes: 'Min maquina',
  default_labor_minutes: 'Min MO',
  tax_pct: 'Imposto %',
  card_fee_pct: 'Taxa de cartao %',
  commission_pct: 'Comissao %',
  material_waste_pct: 'Perda padrao de material %',
  monthly_productive_machine_minutes: 'Min produtivos maquina/mes',
  monthly_productive_labor_hours: 'Horas produtivas MO/mes',
  customer_id: 'Cliente',
  product_master_id: 'Produto',
  product_variant_id: 'Variante',
  price_list_id: 'Tabela de preco',
  minimum_quantity: 'Qtd minima',
  price: 'Preco fixo',
  discount_pct: 'Desconto %',
  starts_at: 'Inicio da vigencia',
  ends_at: 'Fim da vigencia',
  min_quantity: 'Qtd minima',
  max_quantity: 'Qtd maxima',
  unit_price: 'Preco unitario',
  discount_percent: 'Desconto %',
  preset_type: 'Tipo de preset',
  label: 'Rotulo',
  value: 'Valor',
  sort_order: 'Ordem',
};

const IGNORED_DIFF_FIELDS = new Set(['id', 'created_date', 'updated_date', 'created_by', 'created_by_id']);

function normalizeLogValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (text === '') return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : text;
}

// Diff campo a campo: considera apenas as chaves presentes em `after`
// (o payload enviado) e devolve somente o que realmente mudou.
export function diffChangedFields(before = {}, after = {}) {
  const source = after || {};
  return Object.keys(source)
    .filter((field) => !IGNORED_DIFF_FIELDS.has(field))
    .map((field) => ({ field, old: normalizeLogValue(before?.[field]), new: normalizeLogValue(source[field]) }))
    .filter((item) => JSON.stringify(item.old) !== JSON.stringify(item.new));
}

// Fotografia do registro no momento da exclusao (old preenchido, new nulo).
export function snapshotFields(record = {}) {
  return Object.keys(record || {})
    .filter((field) => !IGNORED_DIFF_FIELDS.has(field))
    .map((field) => ({ field, old: normalizeLogValue(record[field]), new: null }))
    .filter((item) => item.old !== null);
}

export function parseChangedFields(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatLogValue(value) {
  if (value === null || value === undefined || value === '') return 'vazio';
  if (value === true) return 'sim';
  if (value === false) return 'nao';
  return String(value);
}

// Grava uma linha no historico. Nunca lanca erro: o historico nao pode
// travar a operacao principal de criacao/edicao/exclusao.
export async function logPriceChange({ entityName, recordId, recordLabel, action, changedFields, userName }) {
  try {
    await erp.entities.PriceChangeLog.create({
      entity_name: entityName,
      record_id: recordId ? String(recordId) : '',
      record_label: recordLabel || '',
      action,
      changed_fields: JSON.stringify(changedFields || []),
      user_name: userName || 'Sistema',
    });
  } catch (error) {
    console.warn('Falha ao registrar PriceChangeLog:', error?.message || error);
  }
}
