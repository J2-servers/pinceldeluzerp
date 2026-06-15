import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import Header from '@/components/layout/Header';
import ProductFormDialog from '@/components/estoque/ProductFormDialog';
import MultiQuoteDialog from '@/components/commercial/MultiQuoteDialog';
import QuoteDetailsDialog from '@/components/orcamentos/QuoteDetailsDialog';
import QuoteHero from '@/components/orcamentos/QuoteHero';
import QuoteAdvancedToolbar from '@/components/orcamentos/QuoteAdvancedToolbar';
import QuotePipelineBoard from '@/components/orcamentos/QuotePipelineBoard';
import QuoteSmartTable from '@/components/orcamentos/QuoteSmartTable';
import QuoteCardsGrid from '@/components/orcamentos/QuoteCardsGrid';
import { emailQuotePdf, downloadQuotePdf } from '@/components/orcamentos/quotePdfUtils';
import { syncLegacyProductToCore, syncLegacyQuoteToCore, createAuditLog, syncLegacySalesOrderToCore, syncStockMovementItem } from '@/lib/erpCoreSync';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { downloadCsv } from '@/lib/downloadUtils';
import { sendWhatsAppMessage, whatsappResultMessage } from '@/lib/whatsappSender';
import { syncProductMaterialParameter } from '@/lib/productMaterialSync';
import moment from 'moment';

const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const money = formatCurrency;
const runAfterSave = async (operation) => {
  try {
    await operation();
  } catch (error) {
    console.warn('Etapa auxiliar não bloqueou o salvamento principal:', error);
  }
};

const defaultFilters = { search: '', status: 'all', period: 'all', partner: 'all', sort: 'recent', minValue: '', onlyWithPhone: false, onlyHighMargin: false };

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

const aggregateStockItems = (items) => {
  const stockItems = new Map();
  items.forEach((item) => {
    if (!item.product_id) return;
    stockItems.set(item.product_id, (stockItems.get(item.product_id) || 0) + parseDecimal(item.quantity));
  });
  return stockItems;
};

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
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState('table');

  const { data: rawQuotes = [] } = useQuery({ queryKey: ['productQuotes'], queryFn: () => erp.entities.ProductQuote.list('-created_date') });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name') });
  const { data: categoriesData = [] } = useQuery({ queryKey: ['productCategories'], queryFn: () => erp.entities.ProductCategory.list('name') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => erp.entities.Client.list('name') });
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

  const getQuoteClient = (quote) => clients.find((client) =>
    (quote.client_id && client.id === quote.client_id) ||
    normalizeText(client.name) === normalizeText(quote.client_name)
  ) || { name: quote.client_name, phone: quote.client_phone, whatsapp: quote.client_phone, email: '' };

  const mapQuoteHeader = (quote) => ({
    client_name: quote.client_name || '',
    client_phone: quote.client_phone || '',
    discount_pct: Number(quote.discount_pct || 0),
    general_art_cost: Number(quote.general_art_cost || 0),
    additional_charge: Number(quote.additional_charge || 0),
    valid_days: Number(quote.valid_days || 7),
    deadline_days: Number(quote.deadline_days || 0),
    payment_conditions: quote.payment_conditions || '50% entrada, 50% na entrega',
    notes: quote.notes || '',
    internal_notes: quote.internal_notes || '',
    created_by_partner: quote.created_by_partner || 'Maeli',
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
    final_price: totals.totalFinal,
    status: header.status || 'rascunho',
    valid_days: Number(header.valid_days || 7),
    deadline_days: Number(header.deadline_days || 0),
    notes: header.notes || '',
    internal_notes: header.internal_notes || '',
    payment_conditions: header.payment_conditions || '',
    created_by_partner: header.created_by_partner || 'Maeli',
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
        const updated = await erp.entities.ProductQuote.update(editItem.id, payload);
        const existingItems = await erp.entities.QuotationItem.filter({ quotation_id: editItem.id });
        await Promise.all(existingItems.map((item) => erp.entities.QuotationItem.delete(item.id)));
        await erp.entities.QuotationItem.bulkCreate(data.items.map((item) => mapQuoteItemPayload(editItem.id, item)));
        await runAfterSave(() => syncLegacyQuoteToCore(updated, client || getQuoteClient(updated)));
        await runAfterSave(() => createAuditLog({ module: 'quotation', entity_name: 'ProductQuote', entity_id: editItem.id, action: 'update', document_number: updated.quote_number, metadata: { total: updated.final_price || 0, line_items_count: data.items.length } }));
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
      ensureQuoteMarginIsSafe({ finalPrice: quote.final_price, totalCost: quote.total_cost, context: `orcamento ${quote.quote_number || ''}` });
      const storedItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
      const items = (storedItems.length ? storedItems : buildLegacyQuoteItems(quote)).map(normalizeItem);
      for (const [productId, quantity] of aggregateStockItems(items)) {
        const product = products.find((entry) => entry.id === productId);
        if (!product || product.track_stock === false || product.auto_deduct_on_sale === false || product.pricing_mode !== 'unitario') continue;
        if (quantity > parseDecimal(product.quantity)) throw new Error(`Estoque insuficiente para ${product.name}. Disponivel: ${product.quantity || 0}`);
      }
      const quoteClient = getQuoteClient(quote);
      const order = await erp.entities.SalesOrder.create({
        order_number: `PV-${Date.now().toString().slice(-6)}`,
        client_id: quoteClient?.id || '',
        client_name: quote.client_name,
        product_id: items[0]?.product_id || null,
        product_group: items[0]?.product_group || '',
        pricing_mode: items[0]?.pricing_mode || 'unitario',
        quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        unit_price: quote.final_price || quote.total_price || 0,
        items: quote.description || quote.items_summary || '',
        line_items_count: items.length,
        subtotal: quote.total_price || 0,
        discount_percent: quote.discount_pct || 0,
        labor_hours: quote.labor_hours || 0,
        labor_cost_total: quote.labor_cost_total || 0,
        machine_time_min: quote.cut_time_min || 0,
        machine_cost_total: quote.machine_cost_total || 0,
        general_art_cost: quote.general_art_cost || 0,
        additional_charge: quote.additional_charge || 0,
        total_cost: quote.total_cost || 0,
        total: quote.final_price || quote.total_price || 0,
        payment_method: 'pix',
        notes: quote.notes || '',
        status: 'novo',
        payment_status: 'pendente',
      });
      await erp.entities.SalesOrderItem.bulkCreate(items.map((item) => ({ sales_order_id: order.id, product_id: item.product_id || null, product_variant_id: item.product_variant_id || item.product_id || null, product_name: item.product_name || '', pricing_mode: item.pricing_mode || 'unitario', description: item.description || item.product_name || '', item_notes: item.item_notes || '', quantity: Number(item.quantity || 1), unit: item.unit || 'un', width_mm: item.width_mm ? Number(item.width_mm) : null, height_mm: item.height_mm ? Number(item.height_mm) : null, base_price: Number(item.base_price || 0), unit_price: Number(item.unit_price || 0), base_subtotal: Number(item.base_subtotal || 0), services_total: Number(item.services_total || 0), material_cost: Number(item.material_cost || 0), labor_hours: Number(item.labor_hours || 0), labor_cost_hour: Number(item.labor_cost_hour || 0), labor_cost_total: Number(item.labor_cost_total || 0), machine_time_min: Number(item.machine_time_min || 0), machine_cost_per_min: Number(item.machine_cost_per_min || 0), machine_cost_total: Number(item.machine_cost_total || 0), art_type: item.art_type || 'logo', art_cost: Number(item.art_cost || 0), art_description: item.art_description || '', discount_pct: Number(item.discount_pct || 0), total_cost: Number(item.total_cost || 0), total: Number(item.total || 0) })));
      for (const [productId, soldQty] of aggregateStockItems(items)) {
        const product = products.find((entry) => entry.id === productId);
        if (!product || product.track_stock === false || product.auto_deduct_on_sale === false || product.pricing_mode !== 'unitario') continue;
        const movement = await erp.entities.StockMovement.create({ product_id: product.id, product_name: product.name, type: 'saida', quantity: soldQty, reason: `Conversão do orçamento ${quote.quote_number}`, date: new Date().toISOString().slice(0, 10) });
        const updatedProduct = await erp.entities.Product.update(product.id, { quantity: parseDecimal(product.quantity) - soldQty });
        await runAfterSave(() => syncStockMovementItem(movement, updatedProduct));
      }
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
  }, [quotes, filters, clients]);

  const stats = useMemo(() => {
    const approved = quotes.filter((quote) => quote.status === 'aprovado').length;
    const openQuotes = quotes.filter((quote) => ['rascunho', 'enviado'].includes(quote.status));
    const totalValue = quotes.reduce((sum, quote) => sum + parseDecimal(quote.final_price), 0);
    return { total: quotes.length, open: openQuotes.length, approved, conversion: quotes.length ? Math.round((approved / quotes.length) * 100) : 0, averageTicket: quotes.length ? totalValue / quotes.length : 0, openValue: openQuotes.reduce((sum, quote) => sum + parseDecimal(quote.final_price), 0) };
  }, [quotes]);

  const openNew = () => { setEditItem(null); setComposerData(null); setShowForm(true); };
  const openEdit = async (quote) => {
    const storedItems = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
    setEditItem(quote);
    setComposerData({ header: mapQuoteHeader(quote), items: (storedItems.length ? storedItems : buildLegacyQuoteItems(quote)).map(normalizeItem) });
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

  return (
    <div className="space-y-6 page-neu">
      <Header title="Orçamentos" subtitle="Central comercial completa, elegante e realmente utilizável" />

      <QuoteHero stats={stats} onCreate={openNew} onExport={exportCsv} selectedCount={selectedIds.length} onBulkSend={bulkSend} />
      <QuoteAdvancedToolbar filters={filters} setFilters={setFilters} selectedCount={selectedIds.length} onBulkStatus={(status) => bulkStatus.mutate(status)} onClearSelection={() => setSelectedIds([])} view={view} setView={setView} />
      {view === 'pipeline' && <QuotePipelineBoard quotes={filteredQuotes} onView={setViewItem} onEdit={openEdit} onStatusChange={(quote, status) => updateStatus.mutate({ quote, status })} onConvert={(quote) => convertQuote.mutate(quote)} />}
      {view === 'cards' && <QuoteCardsGrid quotes={filteredQuotes} onView={setViewItem} onEdit={openEdit} onConvert={(quote) => convertQuote.mutate(quote)} onPdf={handleGeneratePdf} onEmail={handleEmailPdf} onWhatsApp={handleWhatsApp} />}
      {view === 'table' && <QuoteSmartTable quotes={filteredQuotes} selectedIds={selectedIds} onToggle={toggleSelection} onToggleAll={toggleAll} onView={setViewItem} onEdit={openEdit} onDelete={(quote) => deleteQuote.mutate(quote)} onConvert={(quote) => convertQuote.mutate(quote)} onPdf={handleGeneratePdf} onEmail={handleEmailPdf} onWhatsApp={handleWhatsApp} />}

      <MultiQuoteDialog open={showForm} onClose={() => { setShowForm(false); setEditItem(null); setComposerData(null); }} initialData={composerData} clients={clients} products={products} onCreateProduct={() => setShowProductForm(true)} onSubmit={(data) => saveQuote.mutateAsync(data)} saving={saveQuote.isPending} />
      <ProductFormDialog open={showProductForm} onClose={() => setShowProductForm(false)} categories={categoriesData} onCreateCategory={createCategory} onSubmit={createProduct} saving={false} />
      <QuoteDetailsDialog open={!!viewItem} onClose={() => setViewItem(null)} quote={viewItem} client={viewItem ? getQuoteClient(viewItem) : null} onGeneratePdf={handleGeneratePdf} onEmailPdf={handleEmailPdf} onWhatsApp={handleWhatsApp} onConvert={(quote) => { setViewItem(null); convertQuote.mutate(quote); }} onEdit={(quote) => { setViewItem(null); openEdit(quote); }} />
    </div>
  );
}
