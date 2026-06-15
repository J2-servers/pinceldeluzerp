import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import Header from '@/components/layout/Header';
import ProductFormDialog from '@/components/estoque/ProductFormDialog';
import MultiSaleDialog from '@/components/commercial/MultiSaleDialog';
import EmitirNotaModal from '@/components/fiscal/EmitirNotaModal';
import OrderDetailsModal from '@/components/vendas/OrderDetailsModal';
import SalesHero from '@/components/vendas/SalesHero';
import SalesAdvancedToolbar from '@/components/vendas/SalesAdvancedToolbar';
import SalesSmartTable from '@/components/vendas/SalesSmartTable';
import SalesPipelineBoard from '@/components/vendas/SalesPipelineBoard';
import SalesCardsGrid from '@/components/vendas/SalesCardsGrid';
import SalesDailyPanel from '@/components/vendas/SalesDailyPanel';
import { syncLegacyProductToCore, syncLegacySalesOrderToCore, syncStockMovementItem, createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';
import { downloadCsv } from '@/lib/downloadUtils';
import { sendWhatsAppMessage, whatsappResultMessage } from '@/lib/whatsappSender';
import { syncProductMaterialParameter } from '@/lib/productMaterialSync';
import moment from 'moment';

const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const runAfterSave = async (operation) => {
  try {
    await operation();
  } catch (error) {
    console.warn('Etapa auxiliar não bloqueou o salvamento principal:', error);
  }
};
const defaultFilters = { search: '', status: 'all', payment: 'all', period: 'all', sort: 'recent', minValue: '', onlyLate: false, onlyPendingPayment: false };

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

const ensureServiceOrderForSale = async (order) => {
  const existing = await erp.entities.ServiceOrder.filter({ sales_order_id: order.id });
  if (existing.length) return existing[0];
  return erp.entities.ServiceOrder.create({
    title: `OS - ${order.order_number}`,
    client_id: order.client_id || '',
    client_name: order.client_name,
    sales_order_id: order.id,
    description: order.items,
    priority: 'normal',
    deadline: order.delivery_date || '',
    status: 'aguardando',
  });
};

const ensureFinancialEntryForSale = async (order) => {
  const existing = await erp.entities.Transaction.filter({ order_id: order.id });
  if (existing.length) return existing[0];
  return erp.entities.Transaction.create({
    type: 'entrada',
    amount: order.total || 0,
    description: `Venda ${order.order_number} - ${order.client_name}`,
    category: 'vendas',
    payment_method: order.payment_method || 'pix',
    date: moment().format('YYYY-MM-DD'),
    client_id: order.client_id || '',
    order_id: order.id,
    confirmed: true,
  });
};

export default function Vendas() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editorData, setEditorData] = useState(null);
  const [notaOrder, setNotaOrder] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState('table');

  const { data: orders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date') });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => erp.entities.Client.list('name') });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list('name') });
  const { data: categoriesData = [] } = useQuery({ queryKey: ['productCategories'], queryFn: () => erp.entities.ProductCategory.list('name') });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('novo') === '1') {
      setSelectedOrder(null);
      setEditorData(null);
      setShowForm(true);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const search = params.get('search') || params.get('busca');
    const nextView = params.get('view');
    if (search) setFilters((prev) => ({ ...prev, search, status: 'all', payment: 'all', period: 'all' }));
    if (['table', 'pipeline', 'cards'].includes(nextView)) setView(nextView);
  }, []);

  const mapOrderHeader = (order) => ({ client_name: order.client_name || '', client_id: order.client_id || '', payment_method: order.payment_method || 'pix', delivery_date: order.delivery_date || '', discount_percent: parseDecimal(order.discount_percent), general_art_cost: parseDecimal(order.general_art_cost), additional_charge: parseDecimal(order.additional_charge), notes: order.notes || '', status: order.status || 'novo', payment_status: order.payment_status || 'pendente' });

  const buildLegacyOrderItems = (order) => {
    const product = products.find((item) => item.id === order.product_id) || null;
    return [normalizeItem({ product_id: product?.id || order.product_id || null, product_variant_id: product?.id || order.product_id || null, product_name: product?.name || (order.items || '').split('\n')[0] || 'Item legado', product_group: order.product_group || product?.product_group || '', pricing_mode: order.pricing_mode || product?.pricing_mode || 'unitario', quantity: Number(order.quantity || 1), unit: product?.unit || 'un', width_mm: order.width_mm || '', height_mm: order.height_mm || '', base_price: Number(order.unit_price || product?.sale_price || order.total || 0), base_subtotal: Number(order.subtotal || order.total || 0), services_total: Number(order.labor_cost_total || 0) + Number(order.machine_cost_total || 0) + Number(order.general_art_cost || 0), material_cost: Number(order.total_cost || 0) - Number(order.labor_cost_total || 0) - Number(order.machine_cost_total || 0), labor_hours: Number(order.labor_hours || 0), labor_cost_hour: Number(order.labor_cost_hour || 0), labor_cost_total: Number(order.labor_cost_total || 0), machine_time_min: Number(order.machine_time_min || 0), machine_cost_per_min: Number(order.machine_cost_per_min || 0), machine_cost_total: Number(order.machine_cost_total || 0), art_type: 'outro', art_cost: Number(order.general_art_cost || 0), total_cost: Number(order.total_cost || 0), total: Number(order.total || 0), unit_price: Number(order.unit_price || order.total || 0), description: order.items || 'Item legado' })];
  };

  const mapOrderItemPayload = (orderId, item) => ({ sales_order_id: orderId, product_id: item.product_id || null, product_variant_id: item.product_variant_id || item.product_id || null, product_name: item.product_name || '', pricing_mode: item.pricing_mode || 'unitario', description: item.description || item.product_name || '', item_notes: item.item_notes || '', quantity: Number(item.quantity || 1), unit: item.unit || 'un', width_mm: item.width_mm ? Number(item.width_mm) : null, height_mm: item.height_mm ? Number(item.height_mm) : null, base_price: Number(item.base_price || 0), unit_price: Number(item.unit_price || 0), base_subtotal: Number(item.base_subtotal || 0), services_total: Number(item.services_total || 0), material_cost: Number(item.material_cost || 0), labor_hours: Number(item.labor_hours || 0), labor_cost_hour: Number(item.labor_cost_hour || 0), labor_cost_total: Number(item.labor_cost_total || 0), machine_time_min: Number(item.machine_time_min || 0), machine_cost_per_min: Number(item.machine_cost_per_min || 0), machine_cost_total: Number(item.machine_cost_total || 0), art_type: item.art_type || 'logo', art_cost: Number(item.art_cost || 0), art_description: item.art_description || '', discount_pct: Number(item.discount_pct || 0), total_cost: Number(item.total_cost || 0), total: Number(item.total || 0) });

  const buildOrderPayload = ({ header, items, totals }) => ({ client_name: header.client_name, client_id: header.client_id || '', product_id: items[0]?.product_id || null, product_group: items[0]?.product_group || '', pricing_mode: items[0]?.pricing_mode || 'unitario', quantity: items.reduce((sum, item) => sum + parseDecimal(item.quantity), 0), unit_price: totals.totalFinal, items: totals.itemsText, line_items_count: items.length, subtotal: totals.subtotalBeforeDiscount, discount_percent: parseDecimal(header.discount_percent), labor_hours: items.reduce((sum, item) => sum + parseDecimal(item.labor_hours), 0), labor_cost_total: items.reduce((sum, item) => sum + parseDecimal(item.labor_cost_total), 0), machine_time_min: items.reduce((sum, item) => sum + parseDecimal(item.machine_time_min), 0), machine_cost_total: items.reduce((sum, item) => sum + parseDecimal(item.machine_cost_total), 0), general_art_cost: parseDecimal(header.general_art_cost), additional_charge: parseDecimal(header.additional_charge), total_cost: totals.totalCost, total: totals.totalFinal, payment_method: header.payment_method || 'pix', delivery_date: header.delivery_date || '', notes: header.notes || '', status: header.status || 'novo', payment_status: header.payment_status || 'pendente' });

  const saveOrder = useMutation({
    mutationFn: async (data) => {
      if (!data?.header || !Array.isArray(data?.items) || !data?.totals) {
        throw new Error('Dados da venda incompletos. Reabra o assistente e tente novamente.');
      }
      if (!data.items.length) {
        throw new Error('Adicione pelo menos um item antes de salvar a venda.');
      }
      const payload = buildOrderPayload(data);
      const client = clients.find((item) => normalizeText(item.name) === normalizeText(payload.client_name));
      if (client) payload.client_id = client.id;
      if (!selectedOrder) {
        for (const [productId, quantity] of aggregateStockItems(data.items)) {
          const product = products.find((entry) => entry.id === productId);
          if (!product || product.track_stock === false || product.auto_deduct_on_sale === false || product.pricing_mode !== 'unitario') continue;
          if (quantity > parseDecimal(product.quantity)) {
            throw new Error(`Estoque insuficiente para ${product.name}. Disponivel: ${product.quantity || 0}`);
          }
        }
      }

      if (selectedOrder) {
        const updated = await erp.entities.SalesOrder.update(selectedOrder.id, payload);
        const existingItems = await erp.entities.SalesOrderItem.filter({ sales_order_id: selectedOrder.id });
        await Promise.all(existingItems.map((item) => erp.entities.SalesOrderItem.delete(item.id)));
        await erp.entities.SalesOrderItem.bulkCreate(data.items.map((item) => mapOrderItemPayload(selectedOrder.id, item)));
        const firstProduct = products.find((item) => item.id === data.items[0]?.product_id) || null;
        await runAfterSave(() => syncLegacySalesOrderToCore(updated, firstProduct));
        await runAfterSave(() => createAuditLog({ module: 'sales', entity_name: 'SalesOrder', entity_id: selectedOrder.id, action: 'update', document_number: updated.order_number, metadata: { total: updated.total || 0, line_items_count: data.items.length } }));
        return updated;
      }

      const created = await erp.entities.SalesOrder.create({ ...payload, order_number: `PV-${Date.now().toString().slice(-6)}` });
      await erp.entities.SalesOrderItem.bulkCreate(data.items.map((item) => mapOrderItemPayload(created.id, item)));
      const firstProduct = products.find((item) => item.id === data.items[0]?.product_id) || null;
      await runAfterSave(() => syncLegacySalesOrderToCore(created, firstProduct));
      await runAfterSave(() => createAuditLog({ module: 'sales', entity_name: 'SalesOrder', entity_id: created.id, action: 'create', document_number: created.order_number, metadata: { total: created.total || 0, line_items_count: data.items.length } }));

      for (const [productId, soldQty] of aggregateStockItems(data.items)) {
        const product = products.find((entry) => entry.id === productId);
        if (!product || product.track_stock === false || product.auto_deduct_on_sale === false || product.pricing_mode !== 'unitario') continue;
        const movement = await erp.entities.StockMovement.create({ product_id: product.id, product_name: product.name, type: 'saida', quantity: soldQty, reason: `Venda ${created.order_number}`, date: moment().format('YYYY-MM-DD') });
        const updatedProduct = await erp.entities.Product.update(product.id, { quantity: parseDecimal(product.quantity) - soldQty });
        await runAfterSave(() => syncStockMovementItem(movement, updatedProduct));
      }
      return created;
    },
    onSuccess: async (savedOrder, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setShowForm(false);
      setSelectedOrder(null);
      setEditorData(null);
      if (variables?.action === 'save_and_send') {
        await runAfterSave(() => handleWhatsApp(savedOrder));
      }
      toast.success(selectedOrder ? 'Pedido atualizado' : 'Pedido criado');
    },
    onError: (error) => toast.error(error.message || 'Não foi possível salvar o pedido')
  });

  const deleteMutation = useMutation({
    mutationFn: async (order) => {
      const existingItems = await erp.entities.SalesOrderItem.filter({ sales_order_id: order.id });
      await Promise.all(existingItems.map((item) => erp.entities.SalesOrderItem.delete(item.id)));
      await createAuditLog({ module: 'sales', entity_name: 'SalesOrder', entity_id: order.id, action: 'delete', document_number: order.order_number });
      return erp.entities.SalesOrder.delete(order.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salesOrders'] }); toast.success('Pedido excluído'); }
  });

  const handleStatusChange = async (order, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'entregue' && order.payment_status !== 'pago') {
      updates.payment_status = 'pago';
      await ensureFinancialEntryForSale(order);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    }
    if (newStatus === 'em_producao') {
      await ensureServiceOrderForSale(order);
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
    }
    const updated = await erp.entities.SalesOrder.update(order.id, updates);
    await createAuditLog({ module: 'sales', entity_name: 'SalesOrder', entity_id: order.id, action: 'status_change', document_number: order.order_number, metadata: { from: order.status, to: newStatus } });
    queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    toast.success('Status atualizado');
    return updated;
  };

  const bulkStatus = async (status) => {
    const selected = orders.filter((order) => selectedIds.includes(order.id));
    await Promise.all(selected.map((order) => handleStatusChange(order, status)));
    setSelectedIds([]);
  };

  const openEdit = async (order) => {
    const storedItems = await erp.entities.SalesOrderItem.filter({ sales_order_id: order.id });
    setSelectedOrder(order);
    setEditorData({ header: mapOrderHeader(order), items: (storedItems.length ? storedItems : buildLegacyOrderItems(order)).map(normalizeItem) });
    setShowForm(true);
  };

  const filteredOrders = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return orders.filter((order) => {
      const text = normalizeText([order.client_name, order.order_number, order.items, order.notes, order.status, order.payment_status].join(' '));
      const created = order.created_date ? moment(order.created_date) : null;
      const age = created ? moment().diff(created, 'days') : 0;
      const late = order.delivery_date && order.delivery_date < today && !['entregue', 'cancelado'].includes(order.status);
      return (!filters.search || text.includes(normalizeText(filters.search))) &&
        (filters.status === 'all' || order.status === filters.status) &&
        (filters.payment === 'all' || order.payment_status === filters.payment) &&
        (filters.period === 'all' || (filters.period === 'today' && created?.isSame(moment(), 'day')) || (['7', '30'].includes(filters.period) && age <= Number(filters.period)) || (filters.period === 'late' && late)) &&
        (!filters.minValue || parseDecimal(order.total) >= parseDecimal(filters.minValue)) &&
        (!filters.onlyLate || late) &&
        (!filters.onlyPendingPayment || order.payment_status !== 'pago');
    }).sort((a, b) => {
      if (filters.sort === 'value_desc') return parseDecimal(b.total) - parseDecimal(a.total);
      if (filters.sort === 'value_asc') return parseDecimal(a.total) - parseDecimal(b.total);
      if (filters.sort === 'delivery') return String(a.delivery_date || '9999').localeCompare(String(b.delivery_date || '9999'));
      if (filters.sort === 'client') return String(a.client_name || '').localeCompare(String(b.client_name || ''));
      return String(b.created_date || '').localeCompare(String(a.created_date || ''));
    });
  }, [orders, filters]);

  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + parseDecimal(order.total), 0);
    return { total: orders.length, open: orders.filter((order) => !['entregue', 'cancelado'].includes(order.status)).length, production: orders.filter((order) => order.status === 'em_producao').length, delivered: orders.filter((order) => order.status === 'entregue').length, pendingValue: orders.filter((order) => order.payment_status !== 'pago').reduce((sum, order) => sum + parseDecimal(order.total), 0), averageTicket: orders.length ? totalValue / orders.length : 0 };
  }, [orders]);

  const daily = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return { late: orders.filter((order) => order.delivery_date && order.delivery_date < today && !['entregue', 'cancelado'].includes(order.status)), pendingPayment: orders.filter((order) => order.payment_status !== 'pago'), production: orders.filter((order) => order.status === 'em_producao'), ready: orders.filter((order) => order.status === 'pronto') };
  }, [orders]);

  const exportCsv = () => {
    const header = ['numero', 'cliente', 'itens', 'total', 'custo', 'status', 'pagamento', 'entrega'];
    const rows = filteredOrders.map((order) => [order.order_number, order.client_name, order.items, order.total || 0, order.total_cost || 0, order.status, order.payment_status, order.delivery_date || '']);
    downloadCsv([header, ...rows], `vendas-${moment().format('YYYY-MM-DD')}.csv`);
  };

  const handleWhatsApp = async (order) => {
    const client = clients.find((item) => normalizeText(item.name) === normalizeText(order.client_name));
    const phone = client?.whatsapp || client?.phone || '';
    const message = `Ola ${order.client_name}!\n\nSobre o pedido ${order.order_number}:\nStatus: ${order.status}\nValor: ${formatCurrency(order.total)}\n\nPodemos seguir?`;
    const result = await sendWhatsAppMessage({ phone, message });
    if (result.sent || result.copied) toast.success(whatsappResultMessage(result));
    else toast.error(whatsappResultMessage(result));
  };

  const toggleSelection = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds((prev) => filteredOrders.every((order) => prev.includes(order.id)) ? [] : filteredOrders.map((order) => order.id));

  return (
    <div className="space-y-6 page-neu">
      <Header title="Vendas" subtitle="Central de pedidos, produção, entrega e recebimento" />
      <SalesHero stats={stats} onCreate={() => { setSelectedOrder(null); setEditorData(null); setShowForm(true); }} onExport={exportCsv} selectedCount={selectedIds.length} onBulkInvoice={() => { const first = orders.find((order) => selectedIds.includes(order.id)); if (first) setNotaOrder(first); }} />
      <SalesAdvancedToolbar filters={filters} setFilters={setFilters} selectedCount={selectedIds.length} onBulkStatus={bulkStatus} onClearSelection={() => setSelectedIds([])} view={view} setView={setView} />
      <SalesDailyPanel late={daily.late} pendingPayment={daily.pendingPayment} production={daily.production} ready={daily.ready} onView={(order) => { setSelectedOrder(order); setShowDetails(true); }} onWhatsApp={handleWhatsApp} />

      {view === 'pipeline' && <SalesPipelineBoard orders={filteredOrders} onView={(order) => { setSelectedOrder(order); setShowDetails(true); }} onEdit={openEdit} onStatusChange={handleStatusChange} onInvoice={setNotaOrder} />}
      {view === 'cards' && <SalesCardsGrid orders={filteredOrders} onView={(order) => { setSelectedOrder(order); setShowDetails(true); }} onEdit={openEdit} onStatusChange={handleStatusChange} onInvoice={setNotaOrder} />}
      {view === 'table' && <SalesSmartTable orders={filteredOrders} selectedIds={selectedIds} onToggle={toggleSelection} onToggleAll={toggleAll} onView={(order) => { setSelectedOrder(order); setShowDetails(true); }} onEdit={openEdit} onDelete={(order) => deleteMutation.mutate(order)} onStatusChange={handleStatusChange} onInvoice={setNotaOrder} />}

      <MultiSaleDialog open={showForm} onClose={() => { setShowForm(false); setSelectedOrder(null); setEditorData(null); }} initialData={editorData} clients={clients} products={products} onCreateProduct={() => setShowProductForm(true)} onSubmit={(data) => saveOrder.mutateAsync(data)} saving={saveOrder.isPending} />
      <ProductFormDialog open={showProductForm} onClose={() => setShowProductForm(false)} categories={categoriesData} onCreateCategory={async (name) => { const code = normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); const existing = categoriesData.find((item) => item.code === code || item.name === name); if (existing) return existing; const created = await erp.entities.ProductCategory.create({ name, code, active: true }); queryClient.invalidateQueries({ queryKey: ['productCategories'] }); return created; }} onSubmit={async (data) => { const created = await erp.entities.Product.create(data); await syncLegacyProductToCore(created); await runAfterSave(() => syncProductMaterialParameter(created)); await createAuditLog({ module: 'inventory', entity_name: 'Product', entity_id: created.id, action: 'create', document_number: created.sku || created.name }); queryClient.invalidateQueries({ queryKey: ['products'] }); queryClient.invalidateQueries({ queryKey: ['pricing-material-parameters'] }); queryClient.invalidateQueries({ queryKey: ['MaterialParameter'] }); setShowProductForm(false); }} saving={false} />
      <OrderDetailsModal order={selectedOrder} open={showDetails} onClose={() => setShowDetails(false)} />
      {notaOrder && <EmitirNotaModal order={notaOrder} onClose={() => setNotaOrder(null)} />}
    </div>
  );
}
