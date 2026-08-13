import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import Header from '@/components/layout/Header';
import ProductFormDialog from '@/components/estoque/ProductFormDialog';
import MultiQuoteDialog from '@/components/commercial/MultiQuoteDialog';
import QuoteDetailsDialog from '@/components/orcamentos/QuoteDetailsDialog';
import QuoteApprovalModal from '@/components/orcamentos/QuoteApprovalModal';
import CommercialHero from '@/components/commercial/CommercialHero';
import CommercialAdvancedToolbar from '@/components/commercial/CommercialAdvancedToolbar';
import QuotePipelineBoard from '@/components/orcamentos/QuotePipelineBoard';
import QuoteSmartTable from '@/components/orcamentos/QuoteSmartTable';
import QuoteDailyPanel from '@/components/orcamentos/QuoteDailyPanel';
import CommercialCardsGrid from '@/components/commercial/CommercialCardsGrid';
import { emailQuotePdf, downloadQuotePdf } from '@/components/orcamentos/quotePdfUtils';
import { syncLegacyProductToCore, syncLegacyQuoteToCore, createAuditLog, syncLegacySalesOrderToCore } from '@/lib/erpCoreSync';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { downloadCsv } from '@/lib/downloadUtils';
import { sendWhatsAppMessage, whatsappResultMessage } from '@/lib/whatsappSender';
import { syncProductMaterialParameter } from '@/lib/productMaterialSync';
import { assertStockAvailable, applySaleStock, commercialItemExtras, hydrateStoredItem } from '@/lib/commercialPersistence';
import { createQuoteRevision, listQuoteRevisions, parseRevisionSnapshot, snapshotToRestore, nowIso, CAPTURED_QUOTE_FIELDS } from '@/lib/quoteVersioning';
import { reserveQuoteStock, releaseQuoteReservations } from '@/lib/stockReservations';
import { createSaleCommission } from '@/lib/salesCommission';
import moment from 'moment';
import { normalizeText } from '@/lib/utils';
import { Archive, CheckCircle, Download, Filter, Mail, MessageCircle, Send, ShoppingCart, TrendingUp, XCircle } from 'lucide-react';

const money = formatCurrency;
const runAfterSave = async (operation) => {
  try {
    await operation();
  } catch (error) {
    console.warn('Etapa auxiliar não bloqueou o salvamento principal:', error);
  }
};

const defaultFilters = { search: '', status: 'all', period: 'all', partner: 'all', sort: 'recent', minValue: '', onlyWithPhone: false, onlyHighMargin: false };

const heroConfig = {
  badge: { icon: TrendingUp, label: 'Central inteligente de orçamentos', bg: 'var(--accent-muted)', color: 'var(--accent)' },
  heading: 'Orçamento rápido, bonito e pronto para virar venda.',
  subheading: 'Criar, precificar, enviar, aprovar, converter, auditar, exportar e controlar margem.',
  createLabel: 'Criar orçamento',
  bulkAction: { icon: Send, label: 'Enviar', activeColor: 'var(--accent)' },
  kpis: (stats) => [
    { label: 'Total', value: stats.total, color: 'var(--accent)', icon: '📋' },
    { label: 'Em aberto', value: stats.open, color: 'var(--orange)', icon: '⏳' },
    { label: 'Aprovados', value: stats.approved, color: 'var(--green)', icon: '✅' },
    { label: 'Conversão', value: `${stats.conversion}%`, color: 'var(--purple)', icon: '🎯' },
    { label: 'Ticket médio', value: money(stats.averageTicket), color: 'var(--teal)', icon: '💰' },
    { label: 'Valor em aberto', value: money(stats.openValue), color: 'var(--text-primary)', icon: '📈' },
  ],
};

const toolbarConfig = {
  searchPlaceholder: 'Buscar cliente, número, produto, telefone...',
  selects: [
    { field: 'status', options: [['all', 'Todos status'], ['rascunho', 'Rascunho'], ['enviado', 'Enviado'], ['aprovado', 'Aprovado'], ['reprovado', 'Reprovado'], ['expirado', 'Expirado']] },
    { field: 'period', options: [['all', 'Qualquer data'], ['today', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['expired', 'Vencidos']] },
    { field: 'partner', options: [['all', 'Todos responsáveis'], ['Maeli', 'Maeli'], ['Wesley', 'Wesley'], ['Juliano', 'Juliano']] },
    { field: 'sort', options: [['recent', 'Mais recentes'], ['value_desc', 'Maior valor'], ['value_asc', 'Menor valor'], ['client', 'Cliente A-Z'], ['deadline', 'Prazo']] },
  ],
  checkboxes: [
    { field: 'onlyWithPhone', label: 'Com telefone' },
    { field: 'onlyHighMargin', label: 'Alta margem' },
  ],
  helperText: 'Filtros, ordenação, busca ampla, seleção em lote e mudança rápida de status.',
  bulkActions: [
    { label: 'Enviado', status: 'enviado', icon: Filter },
    { label: 'Aprovar', status: 'aprovado', icon: CheckCircle },
    { label: 'Reprovar', status: 'reprovado', icon: XCircle },
    { label: 'Expirar', status: 'expirado', icon: Archive },
  ],
  defaultFilters,
};

const normalizeItem = (item) => ({
  ...item,
  product_id: item.product_id || item.product_variant_id || null,
  product_variant_id: item.product_variant_id || item.product_id || null,
  product_name: item.product_name || item.description || 'Item',
  quantity: parseDecimal(item.quantity || 1),
  width_mm: item.width_mm || '',
  height_mm: item.height_mm || '',
  base_price: parseDecimal(item.base_price),
  base_subtotal: parseDecimal(item.base_subtotal),
  services_total: parseDecimal(item.services_total),
  material_cost: parseDecimal(item.material_cost),
  labor_hours: parseDecimal(item.labor_hours),
  labor_cost_hour: parseDecimal(item.labor_cost_hour),
  labor_cost_total: parseDecimal(item.labor_cost_total),
  machine_time_min: parseDecimal(item.machine_time_min),
  machine_cost_per_min: parseDecimal(item.machine_cost_per_min),
  machine_cost_total: parseDecimal(item.machine_cost_total),
  art_cost: parseDecimal(item.art_cost),
  discount_pct: parseDecimal(item.discount_pct),
  total_cost: parseDecimal(item.total_cost),
  total: parseDecimal(item.total),
  unit_price: parseDecimal(item.unit_price),
});


const ensureQuoteMarginIsSafe = ({ finalPrice, totalCost, context = 'orcamento' }) => {
  const price = parseDecimal(finalPrice);
  const cost = parseDecimal(totalCost);
  if (cost > 0 && price < cost) {
    throw new Error(`Este ${context} esta abaixo do custo. Preco: ${money(price)} | Custo: ${money(cost)}. Ajuste o preco, reduza desconto ou revise o custo antes de continuar.`);
  }
};

export default function Orcamentos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [composerData, setComposerData] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [approvalQuote, setApprovalQuote] = useState(null);
  const [restoringRevisionId, setRestoringRevisionId] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState('table');

  const { data: rawQuotes = [] } = useQuery({ queryKey: ['productQuotes'], queryFn: () => erp.entities.ProductQuote.list('-created_date') });
  const { data: products = [] } = useQuery({ queryKey: ['products', 'list', 'name'], queryFn: () => erp.entities.Product.list('name') });
  const { data: categoriesData = [] } = useQuery({ queryKey: ['productCategories'], queryFn: () => erp.entities.ProductCategory.list('name') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients', 'list', 'name'], queryFn: () => erp.entities.Client.list('name') });
  const { data: companyConfigs = [] } = useQuery({ queryKey: ['companyConfig'], queryFn: () => erp.entities.CompanyConfig.list('-created_date', 1) });
  const companyConfig = companyConfigs[0] || null;
  const quotes = useMemo(() => {
    const map = new Map();
    rawQuotes.forEach((quote) => {
      const key = quote.quote_number || quote.id;
      const current = map.get(key);
      if (!current || String(quote.updated_date || quote.created_date || '') > String(current.updated_date || current.created_date || '')) {
        map.set(key, quote);
      }
    });
    return Array.from(map.values());
  }, [rawQuotes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('novo') === '1') {
      setEditItem(null);
      setComposerData(null);
      setShowForm(true);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const search = params.get('search') || params.get('busca');
    const nextView = params.get('view');
    if (search) setFilters((prev) => ({ ...prev, search, status: 'all', period: 'all' }));
    if (['table', 'pipeline', 'cards'].includes(nextView)) setView(nextView);
  }, []);

  const getQuoteClient = useCallback((quote) => clients.find((client) =>
    (quote.client_id && client.id === quote.client_id) ||
    normalizeText(client.name) === normalizeText(quote.client_name)
  ) || { name: quote.client_name, phone: quote.client_phone, whatsapp: quote.client_phone, email: '' }, [clients]);

  const mapQuoteHeader = (quote) => ({
    client_name: quote.client_name || '',
    client_id: quote.client_id || '',
    client_phone: quote.client_phone || '',
    discount_pct: Number(quote.discount_pct || 0),
    discount_value: Number(quote.discount_value || 0),
    additionals: (() => { try { return JSON.parse(quote.additionals_json || '[]'); } catch { return []; } })(),
    general_art_cost: Number(quote.general_art_cost || 0),
    additional_charge: Number(quote.additional_charge || 0),
    valid_days: Number(quote.valid_days || 7),
    deadline_days: Number(quote.deadline_days || 0),
    payment_conditions: quote.payment_conditions || '50% entrada, 50% na entrega',
    notes: quote.notes || '',
    internal_notes: quote.internal_notes || '',
    created_by_partner: quote.created_by_partner || 'Maeli',
    margin_override_reason: quote.margin_override_reason || '',
    status: quote.status || 'rascunho',
  });

  const buildLegacyQuoteItems = (quote) => {
    const product = products.find((item) => item.id === quote.product_id || item.name === quote.product_name) || null;
    return [normalizeItem({
      product_id: product?.id || quote.product_id || null,
      product_variant_id: product?.id || quote.product_id || null,
      product_name: quote.product_name || product?.name || 'Item legado',
      product_group: quote.product_group || product?.product_group || '',
      pricing_mode: quote.pricing_mode || product?.pricing_mode || 'unitario',
      quantity: Number(quote.quantity || 1),
      unit: product?.unit || 'un',
      width_mm: quote.width_mm || '',
      height_mm: quote.height_mm || '',
      base_price: Number(quote.unit_price || product?.sale_price || quote.total_price || 0),
      base_subtotal: Number(quote.total_price || 0),
      services_total: Number(quote.labor_cost_total || 0) + Number(quote.machine_cost_total || 0) + Number(quote.general_art_cost || 0),
      material_cost: Number(quote.material_cost || 0),
      labor_hours: Number(quote.labor_hours || 0),
      labor_cost_hour: Number(quote.labor_cost_hour || 0),
      labor_cost_total: Number(quote.labor_cost_total || 0),
      machine_time_min: Number(quote.cut_time_min || 0),
      machine_cost_per_min: Number(quote.machine_cost_per_min || 0),
      machine_cost_total: Number(quote.machine_cost_total || 0),
      art_type: 'outro',
      art_cost: Number(quote.general_art_cost || 0),
      discount_pct: 0,
      total_cost: Number(quote.total_cost || 0),
      total: Number(quote.total_price || quote.final_price || 0),
      unit_price: Number(quote.unit_price || quote.total_price || 0),
      description: quote.description || quote.product_name || 'Item legado',
    })];
  };

  const mapQuoteItemPayload = (quoteId, item) => ({
    quotation_id: quoteId,
    product_id: item.product_id || null,
    product_variant_id: item.product_variant_id || item.product_id || null,
    product_name: item.product_name || '',
    pricing_mode: item.pricing_mode || 'unitario',
    description: item.description || item.product_name || '',
    item_notes: item.item_notes || '',
    quantity: Number(item.quantity || 1),
    unit: item.unit || 'un',
    width_mm: item.width_mm ? Number(item.width_mm) : null,
    height_mm: item.height_mm ? Number(item.height_mm) : null,
    base_price: Number(item.base_price || 0),
    unit_price: Number(item.unit_price || 0),
    base_subtotal: Number(item.base_subtotal || 0),
    services_total: Number(item.services_total || 0),
    material_cost: Number(item.material_cost || 0),
    labor_hours: Number(item.labor_hours || 0),
    labor_cost_hour: Number(item.labor_cost_hour || 0),
    labor_cost_total: Number(item.labor_cost_total || 0),
    machine_time_min: Number(item.machine_time_min || 0),
    machine_cost_per_min: Number(item.machine_cost_per_min || 0),
    machine_cost_total: Number(item.machine_cost_total || 0),
    art_type: item.art_type || 'logo',
    art_cost: Number(item.art_cost || 0),
    art_description: item.art_description || '',
    discount_pct: Number(item.discount_pct || 0),
    total_cost: Number(item.total_cost || 0),
    total: Number(item.total || 0),
    ...commercialItemExtras(item),
  });

  const buildQuotePayload = ({ header, items, totals }) => ({
    client_name: header.client_name,
    client_phone: header.client_phone,
    product_id: items[0]?.product_id || null,
    product_group: items[0]?.product_group || '',
    pricing_mode: items[0]?.pricing_mode || 'unitario',
    product_name: totals.title,
    description: totals.itemsText,
    items_summary: totals.itemsText,
    line_items_count: items.length,
    quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    material_cost: totals.subtotalProducts,
    cut_time_min: items.reduce((sum, item) => sum + Number(item.machine_time_min || 0), 0),
    machine_cost_total: items.reduce((sum, item) => sum + Number(item.machine_cost_total || 0), 0),
    labor_hours: items.reduce((sum, item) => sum + Number(item.labor_hours || 0), 0),
    labor_cost_total: items.reduce((sum, item) => sum + Number(item.labor_cost_total || 0), 0),
    general_art_cost: Number(header.general_art_cost || 0),
    additional_charge: Number(header.additional_charge || 0),
    subtotal_products: totals.subtotalProducts,
    subtotal_services: totals.subtotalServices + Number(header.general_art_cost || 0),
    total_cost: totals.totalCost,
    total_price: totals.subtotalBeforeDiscount,
    discount_pct: Number(header.discount_pct || 0),
    discount_value: Number(header.discount_value || 0),
    additionals_json: JSON.stringify(Array.isArray(header.additionals) ? header.additionals : []),
    final_price: totals.totalFinal,
    margin_pct: parseDecimal(totals.margin_pct),
    margin_override_reason: header.margin_override_reason || '',
    status: header.status || 'rascunho',
    valid_days: Number(header.valid_days || 7),
    deadline_days: Number(header.deadline_days || 0),
    notes: header.notes || '',
    internal_notes: header.internal_notes || '',
    payment_conditions: header.payment_conditions || '',
    created_by_partner: header.created_by_partner || 'Maeli',
    client_id: header.client_id || '',
    unit_price: totals.totalFinal,
  });

  const saveQuote = useMutation({
    mutationFn: async (data) => {
      if (!data?.header || !Array.isArray(data?.items) || !data?.totals) {
        throw new Error('Dados do orcamento incompletos. Reabra o assistente e tente novamente.');
      }
      if (!data.items.length) {
        throw new Error('Adicione pelo menos um item antes de salvar o orcamento.');
      }
      ensureQuoteMarginIsSafe({ finalPrice: data.totals.totalFinal, totalCost: data.totals.totalCost, context: 'orcamento' });
      const payload = buildQuotePayload(data);
      const client = clients.find((item) => normalizeText(item.name) === normalizeText(payload.client_name));
      if (editItem) {
        const existingItems = await erp.entities.QuotationItem.filter({ quotation_id: editItem.id });
        // Guarda a versão anterior como revisão quando o orçamento já saiu do
        // rascunho — assim nunca se perde o que o cliente já viu.
        const priorRevision = Number(editItem.revision || 1);
        const shouldSnapshot = ['enviado', 'aprovado', 'reprovado', 'expirado'].includes(editItem.status);
        if (shouldSnapshot) {
          await runAfterSave(() => createQuoteRevision({
            quote: editItem,
            items: existingItems,
            revisionNumber: priorRevision,
            kind: 'revision',
            note: `Versão anterior guardada antes de editar (status ${editItem.status}).`,
            createdBy: payload.created_by_partner,
          }));
        }
        const nextRevision = shouldSnapshot ? priorRevision + 1 : priorRevision;
        const updated = await erp.entities.ProductQuote.update(editItem.id, { ...payload, revision: nextRevision });
        await Promise.all(existingItems.map((item) => erp.entities.QuotationItem.delete(item.id)));
        await erp.entities.QuotationItem.bulkCreate(data.items.map((item) => mapQuoteItemPayload(editItem.id, item)));
        await runAfterSave(() => syncLegacyQuoteToCore(updated, client || getQuoteClient(updated)));
        await runAfterSave(() => createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: editItem.id, action: 'update', document_number: updated.quote_number, metadata: { total: updated.final_price || 0, line_items_count: data.items.length, revision: nextRevision } }));
        return updated;
      }
      const created = await erp.entities.ProductQuote.create({ ...payload, quote_number: `ORC-${Date.now().toString().slice(-6)}` });
      await erp.entities.QuotationItem.bulkCreate(data.items.map((item) => mapQuoteItemPayload(created.id, item)));
      await runAfterSave(() => syncLegacyQuoteToCore(created, client || getQuoteClient(created)));
      await runAfterSave(() => createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: created.id, action: 'create', document_number: created.quote_number, metadata: { total: created.final_price || 0, line_items_count: data.items.length } }));
      return created;
    },
    onSuccess: async (savedQuote, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      setShowForm(false);
      setEditItem(null);
      setComposerData(null);
      if (variables?.action === 'save_and_send') {
        await runAfterSave(() => handleGeneratePdf(savedQuote));
        await runAfterSave(() => handleWhatsApp(savedQuote));
      }
      toast.success(editItem ? 'Orçamento atualizado' : 'Orçamento criado');
    },
    onError: (error) => toast.error(error.message || 'Não foi possível salvar o orçamento')
  });

  const updateStatus = useMutation({
    mutationFn: async ({ quote, status }) => {
      if (['enviado', 'aprovado'].includes(status)) {
        ensureQuoteMarginIsSafe({ finalPrice: quote.final_price, totalCost: quote.total_cost, context: 'orcamento' });
      }
      const updated = await erp.entities.ProductQuote.update(quote.id, { status });
      await createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'status_change', old_value: quote.status, new_value: status, document_number: quote.quote_number });
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      toast.success('Status atualizado');
    }
  });

  const bulkStatus = useMutation({
    mutationFn: async (status) => {
      const selected = quotes.filter((quote) => selectedIds.includes(quote.id));
      if (['enviado', 'aprovado'].includes(status)) {
        selected.forEach((quote) => ensureQuoteMarginIsSafe({ finalPrice: quote.final_price, totalCost: quote.total_cost, context: `orcamento ${quote.quote_number || ''}` }));
      }
      await Promise.all(selected.map((quote) => erp.entities.ProductQuote.update(quote.id, { status })));
      await Promise.all(selected.map((quote) => createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'bulk_status_change', old_value: quote.status, new_value: status, document_number: quote.quote_number })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      setSelectedIds([]);
      toast.success('Orçamentos atualizados em lote');
    }
  });

  const deleteQuote = useMutation({
    mutationFn: async (quote) => {
      const existingItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
      await Promise.all(existingItems.map((item) => erp.entities.QuotationItem.delete(item.id)));
      await createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'delete', document_number: quote.quote_number });
      return erp.entities.ProductQuote.delete(quote.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      toast.success('Orçamento excluído');
    }
  });

  const convertQuote = useMutation({
    mutationFn: async (quote) => {
      // Se existe uma versão aprovada congelada, a venda usa exatamente o que
      // foi aprovado — mesmo que o orçamento tenha sido editado depois.
      const revisions = await listQuoteRevisions(quote.id);
      const approvedRev = revisions.find((rev) => rev.is_approved);
      const approvedSnap = approvedRev ? parseRevisionSnapshot(approvedRev) : null;
      const source = approvedSnap?.quote ? { ...quote, ...approvedSnap.quote } : quote;
      ensureQuoteMarginIsSafe({ finalPrice: source.final_price, totalCost: source.total_cost, context: `orcamento ${quote.quote_number || ''}` });
      const storedItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
      const items = (approvedSnap?.items?.length
        ? approvedSnap.items.map(hydrateStoredItem)
        : (storedItems.length ? storedItems.map(hydrateStoredItem) : buildLegacyQuoteItems(quote))
      ).map(normalizeItem);
      // Verifica disponibilidade (com expansao de kit) antes de criar a venda.
      assertStockAvailable(items, products);
      const quoteClient = getQuoteClient(quote);
      const itemsJson = JSON.stringify(items.map((item) => ({ product_name: item.product_name || '', quantity: Number(item.quantity || 1), unit: item.unit || 'un', unit_price: Number(item.unit_price || 0), total: Number(item.total || 0), description: item.art_description || item.description || '', width_mm: item.width_mm || '', height_mm: item.height_mm || '' })));
      const order = await erp.entities.SalesOrder.create({
        order_number: `PV-${Date.now().toString().slice(-6)}`,
        client_id: quoteClient?.id || source.client_id || '',
        client_name: source.client_name,
        created_by_partner: source.created_by_partner || 'Maeli',
        product_id: items[0]?.product_id || null,
        product_group: items[0]?.product_group || '',
        pricing_mode: items[0]?.pricing_mode || 'unitario',
        quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        unit_price: source.final_price || source.total_price || 0,
        items: source.description || source.items_summary || '',
        items_json: itemsJson,
        line_items_count: items.length,
        subtotal: source.total_price || 0,
        discount_percent: source.discount_pct || 0,
        discount_value: source.discount_value || 0,
        additionals_json: source.additionals_json || '[]',
        labor_hours: source.labor_hours || 0,
        labor_cost_total: source.labor_cost_total || 0,
        machine_time_min: source.cut_time_min || 0,
        machine_cost_total: source.machine_cost_total || 0,
        general_art_cost: source.general_art_cost || 0,
        additional_charge: source.additional_charge || 0,
        total_cost: source.total_cost || 0,
        total: source.final_price || source.total_price || 0,
        source_quote_id: quote.id,
        payment_method: 'pix',
        notes: source.notes || '',
        status: 'novo',
        payment_status: 'pendente',
      });
      await erp.entities.SalesOrderItem.bulkCreate(items.map((item) => ({ sales_order_id: order.id, product_id: item.product_id || null, product_variant_id: item.product_variant_id || item.product_id || null, product_name: item.product_name || '', pricing_mode: item.pricing_mode || 'unitario', description: item.description || item.product_name || '', item_notes: item.item_notes || '', quantity: Number(item.quantity || 1), unit: item.unit || 'un', width_mm: item.width_mm ? Number(item.width_mm) : null, height_mm: item.height_mm ? Number(item.height_mm) : null, base_price: Number(item.base_price || 0), unit_price: Number(item.unit_price || 0), base_subtotal: Number(item.base_subtotal || 0), services_total: Number(item.services_total || 0), material_cost: Number(item.material_cost || 0), labor_hours: Number(item.labor_hours || 0), labor_cost_hour: Number(item.labor_cost_hour || 0), labor_cost_total: Number(item.labor_cost_total || 0), machine_time_min: Number(item.machine_time_min || 0), machine_cost_per_min: Number(item.machine_cost_per_min || 0), machine_cost_total: Number(item.machine_cost_total || 0), art_type: item.art_type || 'logo', art_cost: Number(item.art_cost || 0), art_description: item.art_description || '', discount_pct: Number(item.discount_pct || 0), total_cost: Number(item.total_cost || 0), total: Number(item.total || 0), ...commercialItemExtras(item) })));
      // Baixa de estoque atomica na conversao (uma transacao no servidor).
      await applySaleStock(items, products, { referenceId: order.id, reason: `Conversao do orcamento ${quote.quote_number}`, userName: quote.created_by_partner });
      // Baixa real efetuada: libera a reserva que segurava esse estoque.
      await runAfterSave(() => releaseQuoteReservations(quote.id));
      // Comissão do sócio pela venda convertida.
      await runAfterSave(() => createSaleCommission(order, companyConfig));
      const firstProduct = products.find((item) => item.id === items[0]?.product_id) || null;
      await runAfterSave(() => syncLegacySalesOrderToCore(order, firstProduct));
      await erp.entities.ProductQuote.update(quote.id, { status: 'aprovado' });
      await runAfterSave(() => createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'convert_to_sale', document_number: quote.quote_number, metadata: { sales_order_id: order.id, line_items_count: items.length } }));
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-dashboard'] });
      toast.success('Orçamento convertido em venda');
    },
    onError: (error) => toast.error(error.message || 'Não foi possível converter o orçamento')
  });

  // Decisão formal do cliente: aprovar (congela a versão) ou reprovar (com motivo).
  const decideApproval = useMutation({
    mutationFn: async ({ quote, decision, approvedByName, note, rejectionReason, revision }) => {
      if (decision === 'aprovar') {
        ensureQuoteMarginIsSafe({ finalPrice: quote.final_price, totalCost: quote.total_cost, context: `orcamento ${quote.quote_number || ''}` });
        const currentItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
        const revisionNumber = Number(revision || quote.revision || 1);
        await runAfterSave(() => createQuoteRevision({ quote, items: currentItems, revisionNumber, kind: 'approved', note: note || 'Versão aprovada pelo cliente.', createdBy: quote.created_by_partner, isApproved: true }));
        const updated = await erp.entities.ProductQuote.update(quote.id, { status: 'aprovado', approved_by_name: approvedByName || quote.client_name || '', approved_at: nowIso(), approved_revision: revisionNumber, approval_note: note || '', rejection_reason: '' });
        // Reserva o estoque comprometido (kit/área) enquanto não vira venda.
        await runAfterSave(() => reserveQuoteStock(quote, currentItems.map(hydrateStoredItem), products));
        await createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'approve', old_value: quote.status, new_value: 'aprovado', document_number: quote.quote_number, metadata: { approved_by: approvedByName, revision: revisionNumber, total: quote.final_price || 0 } });
        return updated;
      }
      const updated = await erp.entities.ProductQuote.update(quote.id, { status: 'reprovado', rejection_reason: rejectionReason || '' });
      // Reprovado deixa de comprometer estoque.
      await runAfterSave(() => releaseQuoteReservations(quote.id));
      await createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'reject', old_value: quote.status, new_value: 'reprovado', document_number: quote.quote_number, metadata: { reason: rejectionReason } });
      return updated;
    },
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['quoteRevisions', variables?.quote?.id] });
      setApprovalQuote(null);
      setViewItem((prev) => (prev && prev.id === variables.quote.id ? { ...prev, ...updated } : prev));
      toast.success(variables?.decision === 'aprovar' ? 'Orçamento aprovado — versão congelada' : 'Orçamento reprovado');
    },
    onError: (error) => toast.error(error.message || 'Não foi possível registrar a decisão'),
  });

  // Restaura uma revisão como versão atual (guardando antes o estado corrente).
  const restoreRevision = useMutation({
    mutationFn: async ({ quote, revision }) => {
      const snapshot = parseRevisionSnapshot(revision);
      if (!snapshot) throw new Error('Revisão inválida ou sem dados.');
      const currentItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
      const currentRevision = Number(quote.revision || 1);
      await runAfterSave(() => createQuoteRevision({ quote, items: currentItems, revisionNumber: currentRevision, kind: 'restore_point', note: `Estado antes de restaurar a revisão ${revision.revision_number}.`, createdBy: quote.created_by_partner }));
      const { quotePatch, items } = snapshotToRestore(snapshot, quote.id);
      const nextRevision = currentRevision + 1;
      const updated = await erp.entities.ProductQuote.update(quote.id, { ...quotePatch, status: 'rascunho', revision: nextRevision, approved_by_name: '', approved_at: '', approved_revision: null, approval_note: '', rejection_reason: '' });
      await Promise.all(currentItems.map((item) => erp.entities.QuotationItem.delete(item.id)));
      if (items.length) await erp.entities.QuotationItem.bulkCreate(items);
      await createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: quote.id, action: 'restore_revision', document_number: quote.quote_number, metadata: { restored_revision: revision.revision_number, new_revision: nextRevision } });
      return updated;
    },
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['quoteRevisions', variables?.quote?.id] });
      setViewItem((prev) => (prev && prev.id === variables.quote.id ? { ...prev, ...updated } : prev));
      setRestoringRevisionId(null);
      toast.success(`Revisão ${variables.revision.revision_number} restaurada como versão atual`);
    },
    onError: (error) => { setRestoringRevisionId(null); toast.error(error.message || 'Não foi possível restaurar a revisão'); },
  });

  // Duplica o orçamento como uma opção alternativa (mesma proposta, versão B/C...).
  const createOption = useMutation({
    mutationFn: async (quote) => {
      const currentItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
      const groupId = quote.option_group_id || quote.id;
      const siblings = quotes.filter((item) => (item.option_group_id || item.id) === groupId);
      const letter = String.fromCharCode(65 + Math.max(1, siblings.length));
      const copy = {};
      CAPTURED_QUOTE_FIELDS.forEach((field) => { if (quote[field] !== undefined && quote[field] !== null) copy[field] = quote[field]; });
      const created = await erp.entities.ProductQuote.create({
        ...copy,
        quote_number: `ORC-${Date.now().toString().slice(-6)}`,
        status: 'rascunho',
        revision: 1,
        option_group_id: groupId,
        option_label: `Opção ${letter}`,
      });
      if (!quote.option_group_id) {
        await erp.entities.ProductQuote.update(quote.id, { option_group_id: groupId, option_label: quote.option_label || 'Opção A' });
      }
      const composerItems = currentItems.map(hydrateStoredItem).map(normalizeItem);
      if (composerItems.length) await erp.entities.QuotationItem.bulkCreate(composerItems.map((item) => mapQuoteItemPayload(created.id, item)));
      await createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: created.id, action: 'create_option', document_number: created.quote_number, metadata: { option_group_id: groupId, option_label: created.option_label, from_quote: quote.quote_number } });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productQuotes'] });
      toast.success('Opção criada como rascunho — edite para diferenciá-la e apresentar ao cliente');
    },
    onError: (error) => toast.error(error.message || 'Não foi possível criar a opção'),
  });

  // Aprovar/Reprovar passam pelo modal de decisão (captura quem aprovou / motivo).
  const handleStatusChange = (quote, status) => {
    if (status === 'aprovado' || status === 'reprovado') { setApprovalQuote(quote); return; }
    updateStatus.mutate({ quote, status });
  };

  const handleRestoreRevision = (quote, revision) => {
    setRestoringRevisionId(revision.id);
    restoreRevision.mutate({ quote, revision });
  };

  const handleRevisionPdf = async (quote, revision) => {
    const snapshot = parseRevisionSnapshot(revision);
    if (!snapshot) { toast.error('Revisão sem dados para gerar PDF'); return; }
    const revQuote = { ...snapshot.quote, items: snapshot.items, quote_number: `${quote.quote_number || 'ORC'} (Rev ${revision.revision_number})` };
    try {
      await downloadQuotePdf({ quote: revQuote, client: getQuoteClient(quote), company: companyConfig });
      toast.success('PDF da revisão gerado');
    } catch (error) {
      toast.error(error.message || 'Não foi possível gerar o PDF da revisão');
    }
  };

  const filteredQuotes = useMemo(() => {
    const now = moment();
    return quotes.filter((quote) => {
      const client = getQuoteClient(quote);
      const haystack = normalizeText([quote.client_name, quote.client_phone, quote.product_name, quote.quote_number, quote.description, quote.items_summary, quote.notes].join(' '));
      const matchesSearch = !filters.search || haystack.includes(normalizeText(filters.search));
      const matchesStatus = filters.status === 'all' || quote.status === filters.status;
      const matchesPartner = filters.partner === 'all' || quote.created_by_partner === filters.partner;
      const value = parseDecimal(quote.final_price);
      const margin = value > 0 ? ((value - parseDecimal(quote.total_cost)) / value) * 100 : 0;
      const created = quote.created_date ? moment(quote.created_date) : null;
      const age = created ? now.diff(created, 'days') : 0;
      const periodOk = filters.period === 'all' || (filters.period === 'today' && created?.isSame(now, 'day')) || (['7', '30'].includes(filters.period) && age <= Number(filters.period)) || (filters.period === 'expired' && quote.status !== 'aprovado' && age > Number(quote.valid_days || 7));
      return matchesSearch && matchesStatus && matchesPartner && periodOk && (!filters.minValue || value >= parseDecimal(filters.minValue)) && (!filters.onlyWithPhone || !!(client.phone || client.whatsapp || quote.client_phone)) && (!filters.onlyHighMargin || margin >= 45);
    }).sort((a, b) => {
      if (filters.sort === 'value_desc') return parseDecimal(b.final_price) - parseDecimal(a.final_price);
      if (filters.sort === 'value_asc') return parseDecimal(a.final_price) - parseDecimal(b.final_price);
      if (filters.sort === 'client') return String(a.client_name || '').localeCompare(String(b.client_name || ''));
      if (filters.sort === 'deadline') return Number(a.valid_days || 7) - Number(b.valid_days || 7);
      return String(b.created_date || '').localeCompare(String(a.created_date || ''));
    });
  }, [quotes, filters, getQuoteClient]);

  const stats = useMemo(() => {
    const approved = quotes.filter((quote) => quote.status === 'aprovado').length;
    const openQuotes = quotes.filter((quote) => ['rascunho', 'enviado'].includes(quote.status));
    const totalValue = quotes.reduce((sum, quote) => sum + parseDecimal(quote.final_price), 0);
    return { total: quotes.length, open: openQuotes.length, approved, conversion: quotes.length ? Math.round((approved / quotes.length) * 100) : 0, averageTicket: quotes.length ? totalValue / quotes.length : 0, openValue: openQuotes.reduce((sum, quote) => sum + parseDecimal(quote.final_price), 0) };
  }, [quotes]);

  // Painel diario de acompanhamento (vencendo, alto valor, follow-up, sem contato).
  const quoteDaily = useMemo(() => {
    const now = moment();
    const openQuotes = quotes.filter((quote) => ['rascunho', 'enviado'].includes(quote.status));
    const daysLeft = (quote) => {
      if (!quote.created_date) return Number(quote.valid_days || 7);
      return Number(quote.valid_days || 7) - now.diff(moment(quote.created_date), 'days');
    };
    return {
      expiring: openQuotes.filter((quote) => { const left = daysLeft(quote); return left <= 3 && left >= 0; }).sort((a, b) => daysLeft(a) - daysLeft(b)),
      highValue: [...openQuotes].sort((a, b) => parseDecimal(b.final_price) - parseDecimal(a.final_price)).filter((quote) => parseDecimal(quote.final_price) > 0).slice(0, 5),
      followUps: quotes.filter((quote) => quote.status === 'enviado').sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || ''))),
      withoutPhone: openQuotes.filter((quote) => { const client = getQuoteClient(quote); return !(client.phone || client.whatsapp || quote.client_phone); }),
    };
  }, [quotes, getQuoteClient]);

  const openNew = () => { setEditItem(null); setComposerData(null); setShowForm(true); };
  const openEdit = async (quote) => {
    const storedItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
    setEditItem(quote);
    const baseItems = storedItems.length ? storedItems.map(hydrateStoredItem) : buildLegacyQuoteItems(quote);
    setComposerData({ header: mapQuoteHeader(quote), items: baseItems.map(normalizeItem) });
    setShowForm(true);
  };
  const createCategory = async (name) => {
    const code = normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    const existing = categoriesData.find((item) => item.code === code || item.name === name);
    if (existing) return existing;
    const created = await erp.entities.ProductCategory.create({ name, code, active: true });
    queryClient.invalidateQueries({ queryKey: ['productCategories'] });
    return created;
  };

  const createProduct = async (data) => {
    const created = await erp.entities.Product.create(data);
    await syncLegacyProductToCore(created);
    await runAfterSave(() => syncProductMaterialParameter(created));
    await createAuditLog({ module: 'inventory', entity_name: 'Product', entity_id: created.id, action: 'create', document_number: created.sku || created.name });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['pricing-material-parameters'] });
    queryClient.invalidateQueries({ queryKey: ['MaterialParameter'] });
    setShowProductForm(false);
    return created;
  };

  const handleGeneratePdf = async (quote) => {
    try {
      await downloadQuotePdf({ quote, client: getQuoteClient(quote), company: companyConfig });
      toast.success('PDF gerado');
    } catch (error) {
      toast.error(error.message || 'Nao foi possivel gerar o PDF');
    }
  };
  const handleEmailPdf = async (quote) => {
    const client = getQuoteClient(quote);
    try {
      const response = await emailQuotePdf({ quote, client, company: companyConfig });
      if (!client?.email) toast.success('Cliente sem e-mail; PDF baixado e e-mail manual aberto');
      else if (response?.fallback) toast.success('PDF baixado e e-mail aberto para envio manual');
      else if (response?.success) toast.success('PDF enviado por e-mail');
      else toast.success('Acao de e-mail concluida');
    } catch (error) {
      toast.error(error.message || 'Nao foi possivel preparar o e-mail');
    }
  };
  const handleWhatsApp = async (quote) => {
    const client = getQuoteClient(quote);
    const phone = client.whatsapp || client.phone || quote.client_phone || '';
    const message = `Ola ${quote.client_name}!\n\nSegue seu orcamento ${quote.quote_number || ''}:\n${quote.product_name || quote.items_summary || ''}\nValor: ${money(quote.final_price)}\nValidade: ${quote.valid_days || 7} dias.\n\nPosso confirmar para producao?`;
    const result = await sendWhatsAppMessage({ phone, message });
    if (result.sent || result.copied) toast.success(whatsappResultMessage(result));
    else toast.error(whatsappResultMessage(result));
  };

  const exportCsv = () => {
    const header = ['numero', 'cliente', 'telefone', 'produto', 'status', 'valor', 'custo', 'margem', 'responsavel'];
    const rows = filteredQuotes.map((quote) => {
      const finalPrice = parseDecimal(quote.final_price);
      const margin = finalPrice > 0 ? ((finalPrice - parseDecimal(quote.total_cost)) / finalPrice) * 100 : 0;
      return [quote.quote_number, quote.client_name, quote.client_phone, quote.product_name, quote.status, quote.final_price || 0, quote.total_cost || 0, margin.toFixed(2), quote.created_by_partner || ''];
    });
    downloadCsv([header, ...rows], `orcamentos-${moment().format('YYYY-MM-DD')}.csv`);
  };

  const toggleSelection = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds((prev) => filteredQuotes.every((quote) => prev.includes(quote.id)) ? [] : filteredQuotes.map((quote) => quote.id));
  const bulkSend = () => {
    quotes.filter((quote) => selectedIds.includes(quote.id)).forEach(handleWhatsApp);
    if (selectedIds.length) bulkStatus.mutate('enviado');
  };

  const cardsConfig = {
    emptyMessage: 'Nenhum orçamento encontrado.',
    getCode: (quote) => quote.quote_number || 'ORÇAMENTO',
    getSubtitle: (quote) => quote.product_name,
    metrics: (quote) => [
      { label: 'Valor', value: money(quote.final_price) },
      { label: 'Itens', value: quote.line_items_count || 1 },
    ],
    extraActions: (quote) => [
      { key: 'pdf', icon: Download, onClick: () => handleGeneratePdf(quote) },
      { key: 'email', icon: Mail, onClick: () => handleEmailPdf(quote) },
      { key: 'whatsapp', icon: MessageCircle, onClick: () => handleWhatsApp(quote) },
      { key: 'convert', icon: ShoppingCart, onClick: () => convertQuote.mutate(quote) },
    ],
  };

  return (
    <div className="space-y-6 page-neu">
      <Header title="Orçamentos" subtitle="Central comercial completa, elegante e realmente utilizável" />

      <CommercialHero stats={stats} onCreate={openNew} onExport={exportCsv} selectedCount={selectedIds.length} onBulkAction={bulkSend} config={heroConfig} />
      <CommercialAdvancedToolbar filters={filters} setFilters={setFilters} selectedCount={selectedIds.length} onBulkStatus={(status) => bulkStatus.mutate(status)} onClearSelection={() => setSelectedIds([])} view={view} setView={setView} config={toolbarConfig} />
      <QuoteDailyPanel expiring={quoteDaily.expiring} highValue={quoteDaily.highValue} followUps={quoteDaily.followUps} withoutPhone={quoteDaily.withoutPhone} onWhatsApp={handleWhatsApp} onView={setViewItem} />
      {view === 'pipeline' && <QuotePipelineBoard quotes={filteredQuotes} onView={setViewItem} onEdit={openEdit} onStatusChange={handleStatusChange} onConvert={(quote) => convertQuote.mutate(quote)} />}
      {view === 'cards' && <CommercialCardsGrid items={filteredQuotes} onView={setViewItem} onEdit={openEdit} config={cardsConfig} />}
      {view === 'table' && <QuoteSmartTable quotes={filteredQuotes} selectedIds={selectedIds} onToggle={toggleSelection} onToggleAll={toggleAll} onView={setViewItem} onEdit={openEdit} onDelete={(quote) => deleteQuote.mutate(quote)} onConvert={(quote) => convertQuote.mutate(quote)} onPdf={handleGeneratePdf} onEmail={handleEmailPdf} onWhatsApp={handleWhatsApp} />}

      <MultiQuoteDialog open={showForm} onClose={() => { setShowForm(false); setEditItem(null); setComposerData(null); }} initialData={composerData} clients={clients} products={products} onCreateProduct={() => setShowProductForm(true)} onSubmit={(data) => saveQuote.mutateAsync(data)} saving={saveQuote.isPending} />
      <ProductFormDialog open={showProductForm} onClose={() => setShowProductForm(false)} categories={categoriesData} onCreateCategory={createCategory} onSubmit={createProduct} saving={false} />
      <QuoteDetailsDialog
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        quote={viewItem}
        client={viewItem ? getQuoteClient(viewItem) : null}
        optionSiblings={viewItem?.option_group_id ? quotes.filter((item) => item.option_group_id === viewItem.option_group_id) : []}
        onGeneratePdf={handleGeneratePdf}
        onEmailPdf={handleEmailPdf}
        onWhatsApp={handleWhatsApp}
        onConvert={(quote) => { setViewItem(null); convertQuote.mutate(quote); }}
        onEdit={(quote) => { setViewItem(null); openEdit(quote); }}
        onDecision={(quote) => setApprovalQuote(quote)}
        onCreateOption={(quote) => createOption.mutate(quote)}
        onRestoreRevision={handleRestoreRevision}
        onRevisionPdf={handleRevisionPdf}
        restoringRevisionId={restoringRevisionId}
        onOpenSibling={(sibling) => setViewItem(sibling)}
      />
      <QuoteApprovalModal quote={approvalQuote} open={!!approvalQuote} onClose={() => setApprovalQuote(null)} onConfirm={(payload) => decideApproval.mutateAsync({ quote: approvalQuote, ...payload })} />
    </div>
  );
}
