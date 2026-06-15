import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Lock, PackagePlus, Plus, Send, ShoppingCart, X } from 'lucide-react';
import { erp } from '@/api/erpClient';
import StockProductBranchSelector from '@/components/products/StockProductBranchSelector';
import { inferProductBehavior } from '@/lib/productBehavior';
import { computeLine, createLineDraft, money, summarizeDocument } from '@/lib/commercialLinePricing';
import LineItemEditor from '@/components/commercial/LineItemEditor';
import { getCompanyLogoUrl, isSafeImageUrl } from '@/lib/brandingAssets';

const paymentMethods = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartao credito' },
  { value: 'cartao_debito', label: 'Cartao debito' },
  { value: 'parcelado', label: 'Parcelado' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'crediario', label: 'Crediario' },
];

const quoteHeader = {
  client_name: '',
  client_phone: '',
  discount_pct: 0,
  general_art_cost: 0,
  additional_charge: 0,
  valid_days: 7,
  deadline_days: 5,
  payment_conditions: '50% entrada, 50% na entrega',
  notes: '',
  internal_notes: '',
  created_by_partner: 'Maeli',
  status: 'rascunho',
};

const saleHeader = {
  client_name: '',
  payment_method: 'pix',
  delivery_date: '',
  discount_percent: 0,
  general_art_cost: 0,
  additional_charge: 0,
  notes: '',
  status: 'novo',
  payment_status: 'pendente',
};

function Field({ label, children, help }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</Label>
      {children}
      {help && <p className="text-[11px] leading-snug text-slate-500">{help}</p>}
    </div>
  );
}

function StepRail({ stage, itemsCount }) {
  const steps = [
    { id: 'catalog', label: 'Produtos', help: 'Escolha itens', idle: 'border-sky-200 bg-sky-50', active: 'border-sky-400 bg-sky-100', done: 'border-emerald-300 bg-emerald-100', dot: 'bg-sky-600' },
    { id: 'configure', label: 'Medidas', help: 'Quantidade e detalhes', idle: 'border-violet-200 bg-violet-50', active: 'border-violet-400 bg-violet-100', done: 'border-emerald-300 bg-emerald-100', dot: 'bg-violet-600' },
    { id: 'review', label: 'Revisao e PDF', help: `${itemsCount} item(ns)`, idle: 'border-amber-200 bg-amber-50', active: 'border-blue-300 bg-blue-100', done: 'border-emerald-300 bg-emerald-100', dot: 'bg-blue-600' },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {steps.map((step, index) => {
        const active = stage === step.id;
        const done = step.id === 'catalog' ? itemsCount > 0 : step.id === 'configure' ? stage === 'review' : false;
        return (
          <div key={step.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm ${active ? step.active : done ? step.done : step.idle}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black text-white ${done ? 'bg-emerald-500' : active ? step.dot : 'bg-slate-400'}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{step.label}</p>
              <p className="truncate text-xs text-slate-500">{step.help}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MissingAlerts({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-600 text-white">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-black text-red-900">Falta resolver antes de finalizar</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <span key={alert} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-800">{alert}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderFields({ mode, header, setHeader, clients, missingClient }) {
  return (
    <section className={`rounded-[28px] border p-4 shadow-sm ${missingClient ? 'border-red-200 bg-red-50' : 'border-sky-200 bg-sky-50'}`}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-4">
          <Field label="Cliente" help="Obrigatorio para salvar ou enviar.">
            <Input list="commercial-clients-list" className={`h-11 rounded-2xl bg-white ${missingClient ? 'border-red-400 ring-2 ring-red-100' : ''}`} value={header.client_name} onChange={(event) => setHeader((prev) => ({ ...prev, client_name: event.target.value }))} required placeholder="Nome do cliente" />
            <datalist id="commercial-clients-list">{clients.map((client) => <option key={client.id} value={client.name} />)}</datalist>
          </Field>
        </div>
        {mode === 'quote' ? (
          <>
            <div className="lg:col-span-3"><Field label="WhatsApp"><Input className="h-11 rounded-2xl" value={header.client_phone} onChange={(event) => setHeader((prev) => ({ ...prev, client_phone: event.target.value }))} placeholder="(00) 00000-0000" /></Field></div>
            <div className="lg:col-span-2"><Field label="Validade"><Input className="h-11 rounded-2xl" type="number" min="1" value={header.valid_days} onChange={(event) => setHeader((prev) => ({ ...prev, valid_days: event.target.value }))} /></Field></div>
            <div className="lg:col-span-3"><Field label="Prazo de producao"><Input className="h-11 rounded-2xl" type="number" min="0" value={header.deadline_days} onChange={(event) => setHeader((prev) => ({ ...prev, deadline_days: event.target.value }))} /></Field></div>
          </>
        ) : (
          <>
            <div className="lg:col-span-4">
              <Field label="Pagamento">
                <Select value={header.payment_method} onValueChange={(value) => setHeader((prev) => ({ ...prev, payment_method: value }))}>
                  <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="lg:col-span-4"><Field label="Entrega"><Input className="h-11 rounded-2xl" type="date" value={header.delivery_date} onChange={(event) => setHeader((prev) => ({ ...prev, delivery_date: event.target.value }))} /></Field></div>
          </>
        )}
      </div>
    </section>
  );
}

function CartPanel({ items, totals, alerts, onEdit, onRemove, onReview }) {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Carrinho</p>
          <h3 className="text-xl font-black text-slate-950">{items.length} item(ns)</h3>
        </div>
        <p className="text-lg font-black text-blue-700">{money(totals.totalFinal)}</p>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.product_id || item.product_name}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{item.product_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Qtd. {item.quantity}{item.width_mm && item.height_mm ? ` - ${item.width_mm}x${item.height_mm}mm` : ''}
                  </p>
                  <p className="mt-2 font-black text-slate-950">{money(item.total)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50" onClick={() => onEdit(index)}>Editar</button>
                  <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => onRemove(index)}>Remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
          <PackagePlus className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-bold text-slate-600">Nenhum item ainda.</p>
        </div>
      )}
      {!!alerts.length && <div className="mt-3"><MissingAlerts alerts={alerts} /></div>}
      <Button type="button" className="mt-4 min-h-12 w-full rounded-2xl !text-white shadow-lg shadow-blue-200 [background:linear-gradient(135deg,#2563eb,#7c3aed,#db2777)] hover:brightness-110 disabled:opacity-100 disabled:saturate-50" disabled={!items.length} onClick={onReview}>
        Revisar orcamento <FileText className="h-4 w-4" />
      </Button>
    </aside>
  );
}

function PdfPreview({ header, items, totals, mode, company }) {
  const pdfLogo = getCompanyLogoUrl(company, 'pdf');
  const companyName = company?.company_name || 'Pincel de Luz';
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-black text-slate-950">Previa do PDF</h3>
      </div>
      <div className="rounded-[24px] bg-slate-200 p-4 md:p-8">
        <div className="mx-auto min-h-[560px] max-w-[460px] bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-slate-950 text-xs font-black text-white">
                {isSafeImageUrl(pdfLogo) ? <img src={pdfLogo} alt={companyName} className="h-full w-full object-contain bg-white p-1" /> : 'PL'}
              </div>
              <p className="mt-2 text-[10px] font-bold text-slate-500">{companyName}</p>
            </div>
            <div className="text-right">
              <h4 className="text-lg font-black text-slate-950">{mode === 'sale' ? 'Pedido de venda' : 'Orcamento'}</h4>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">previa</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 border-y border-slate-200 py-3 text-[10px]">
            <div><p className="font-black text-slate-400">Cliente</p><p className="font-bold text-slate-800">{header.client_name || '-'}</p></div>
            <div><p className="font-black text-slate-400">Validade</p><p className="font-bold text-slate-800">{header.valid_days || 7} dias</p></div>
            <div><p className="font-black text-slate-400">Condicoes</p><p className="font-bold text-slate-800">{header.payment_conditions || header.payment_method || '-'}</p></div>
          </div>
          <table className="mt-6 w-full text-left text-[10px]">
            <thead className="border-b border-slate-200 text-slate-400">
              <tr>
                <th className="py-2">Item e descricao</th>
                <th className="py-2 text-center">Qtd</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.product_name}-${index}`} className="border-b border-slate-100">
                  <td className="py-3">
                    <p className="font-black text-slate-900">{item.product_name}</p>
                    <p className="text-slate-500">{item.art_description || item.item_notes || 'Item personalizado'}</p>
                  </td>
                  <td className="py-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 text-right font-black">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto mt-6 w-44 rounded-xl bg-slate-100 p-3 text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
            <p className="text-lg font-black text-slate-950">{money(totals.totalFinal)}</p>
          </div>
          <div className="mt-8">
            <p className="text-[10px] font-black text-slate-400">Observacoes</p>
            <p className="mt-1 text-[10px] text-slate-600">{header.notes || company?.pdf_footer_text || 'Proposta valida conforme condicoes informadas.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommercialAssistantDialog({ mode = 'quote', open, onClose, initialData, products = [], clients = [], onCreateProduct, onSubmit, saving }) {
  const defaultHeader = mode === 'sale' ? saleHeader : quoteHeader;
  const [header, setHeader] = useState(defaultHeader);
  const [items, setItems] = useState([]);
  const [stage, setStage] = useState('catalog');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [editorLine, setEditorLine] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const { data: fixedExpenses = [] } = useQuery({ queryKey: ['pricing-fixed-expenses'], queryFn: () => erp.entities.FixedExpense.filter({ active: true }), enabled: open });
  const { data: machineCosts = [] } = useQuery({ queryKey: ['pricing-machine-costs'], queryFn: () => erp.entities.MachineCost.filter({ active: true }), enabled: open });
  const { data: laborProfiles = [] } = useQuery({ queryKey: ['pricing-labor-profiles'], queryFn: () => erp.entities.LaborRateProfile.filter({ active: true }), enabled: open });
  const { data: serviceProfiles = [] } = useQuery({ queryKey: ['pricing-service-profiles'], queryFn: () => erp.entities.ServicePricingProfile.filter({ active: true }), enabled: open });
  const { data: markupRules = [] } = useQuery({ queryKey: ['pricing-markup-rules'], queryFn: () => erp.entities.MarkupRule.list('name'), enabled: open });
  const { data: pricingSettingsRows = [] } = useQuery({ queryKey: ['pricing-settings'], queryFn: () => erp.entities.PricingSettings.list('-updated_date', 1), enabled: open });
  const { data: materialParameters = [] } = useQuery({ queryKey: ['pricing-material-parameters'], queryFn: () => erp.entities.MaterialParameter.filter({ active: true }), enabled: open });
  const { data: companyConfigs = [] } = useQuery({ queryKey: ['companyConfig'], queryFn: () => erp.entities.CompanyConfig.list('-created_date', 1), enabled: open });
  const companyConfig = companyConfigs[0] || null;

  const pricingConfig = useMemo(() => ({
    fixedExpenses,
    machineCosts,
    laborProfiles,
    serviceProfiles,
    markupRules,
    materialParameters,
    settings: pricingSettingsRows[0] || {},
  }), [fixedExpenses, machineCosts, laborProfiles, serviceProfiles, markupRules, materialParameters, pricingSettingsRows]);

  useEffect(() => {
    if (!open) return;
    setHeader(initialData?.header ? { ...defaultHeader, ...initialData.header } : { ...defaultHeader });
    setItems(initialData?.items || []);
    setStage(initialData?.items?.length ? 'review' : 'catalog');
    setSelectedProductId(null);
    setEditorLine(null);
    setEditingIndex(null);
  }, [open, initialData, mode]);

  const selectedProduct = products.find((item) => item.id === selectedProductId) || null;
  const productBehavior = inferProductBehavior(selectedProduct || {});
  const computedLine = useMemo(() => {
    if (!selectedProduct || !editorLine) return null;
    return computeLine(selectedProduct, editorLine, pricingConfig);
  }, [selectedProduct, editorLine, pricingConfig]);
  const totals = useMemo(() => summarizeDocument(items, {
    discountPct: mode === 'sale' ? header.discount_percent : header.discount_pct,
    generalArtCost: header.general_art_cost,
    additionalCharge: header.additional_charge,
  }), [items, header, mode]);

  const alerts = useMemo(() => {
    const list = [];
    if (!header.client_name) list.push('Informe o cliente.');
    if (!items.length) list.push('Adicione pelo menos um item.');
    items.forEach((item) => {
      if (Number(item.total || 0) <= 0) list.push(`${item.product_name || 'Item'} esta sem valor final.`);
      if (item.pricing_mode === 'area_m2' && (!item.width_mm || !item.height_mm)) list.push(`${item.product_name || 'Item'} precisa de largura e altura.`);
    });
    const margin = Number(totals.totalFinal || 0) > 0 ? ((Number(totals.totalFinal || 0) - Number(totals.totalCost || 0)) / Number(totals.totalFinal || 1)) * 100 : 0;
    if (items.length && margin < 0) list.push('Margem negativa.');
    return list;
  }, [header.client_name, items, totals]);

  const startProduct = (product) => {
    setSelectedProductId(product.id);
    setEditorLine(createLineDraft(product));
    setEditingIndex(null);
    setStage('configure');
  };

  const clearEditor = () => {
    setSelectedProductId(null);
    setEditorLine(null);
    setEditingIndex(null);
    setStage('catalog');
  };

  const saveLine = () => {
    if (!computedLine) return;
    setItems((prev) => editingIndex === null ? [...prev, computedLine] : prev.map((item, index) => index === editingIndex ? computedLine : item));
    clearEditor();
  };

  const editLine = (index) => {
    const item = items[index];
    if (!item?.product_id) return;
    setSelectedProductId(item.product_id);
    setEditorLine(item);
    setEditingIndex(index);
    setStage('configure');
  };

  const removeLine = (index) => setItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index));

  const submitDocument = (action = 'save') => {
    if (alerts.length) return;
    onSubmit({ header, items, totals, action });
  };

  const submit = (event) => {
    event.preventDefault();
    submitDocument('save');
  };

  const title = mode === 'sale' ? 'Venda assistida' : 'Orcamento assistido';
  const documentName = mode === 'sale' ? 'venda' : 'orcamento';

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="commercial-assistant-dialog w-[calc(100vw-1rem)] max-w-[1320px] max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden rounded-[30px] border-slate-200 bg-slate-50 p-0">
        <DialogHeader className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950">
                <FileText className="h-5 w-5 text-blue-600" /> {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Fluxo em lista: escolha produtos, configure medidas, revise o PDF e finalize.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <Lock className="h-4 w-4" /> Precos vêm das tabelas oficiais
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 p-3 md:p-5">
          <StepRail stage={stage} itemsCount={items.length} />

          {stage === 'catalog' && (
            <>
              <HeaderFields mode={mode} header={header} setHeader={setHeader} clients={clients} missingClient={!header.client_name} />
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
                <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-4 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-950">Adicionar produtos e materiais</h3>
                      <p className="text-sm text-slate-500">Cada item escolhido abre uma tela propria de quantidade, medidas e observacoes.</p>
                    </div>
                    <Button type="button" className="rounded-2xl !text-white shadow-lg shadow-orange-200 [background:linear-gradient(135deg,#f97316,#e11d48,#9333ea)] hover:brightness-110" onClick={onCreateProduct}>
                      <Plus className="h-4 w-4" /> Novo produto
                    </Button>
                  </div>
                  <StockProductBranchSelector selectedProductId={selectedProductId} onSelect={startProduct} mode={mode === 'sale' ? 'sale' : 'quote'} />
                </section>
                <CartPanel items={items} totals={totals} alerts={alerts} onEdit={editLine} onRemove={removeLine} onReview={() => setStage('review')} />
              </div>
            </>
          )}

          {stage === 'configure' && computedLine && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Configurar item</p>
                  <h3 className="text-3xl font-black tracking-tight text-slate-950">{computedLine.product_name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Informe somente o que muda neste item. O calculo de preco continua automatico.</p>
                </div>
                <Button type="button" className="rounded-2xl !text-white shadow-lg shadow-rose-200 [background:linear-gradient(135deg,#fb7185,#e11d48)] hover:brightness-110" onClick={clearEditor}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              </div>
              <LineItemEditor
                line={computedLine}
                dimensionsRequired={productBehavior.dimensionsRequired}
                machineProfiles={machineCosts}
                laborProfiles={laborProfiles}
                serviceProfiles={serviceProfiles}
                onChange={(field, value) => setEditorLine((prev) => ({ ...prev, [field]: value }))}
                onSave={saveLine}
                saveLabel={editingIndex === null ? `Adicionar ao ${documentName}` : 'Salvar alteracoes'}
              />
            </section>
          )}

          {stage === 'review' && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Etapa 3</p>
                  <h3 className="text-3xl font-black tracking-tight text-slate-950">Revisao e PDF</h3>
                  <p className="mt-1 text-sm text-slate-500">Confira os itens adicionados e visualize o documento antes de salvar.</p>
                </div>
                <Button type="button" className="rounded-2xl !text-white shadow-lg shadow-indigo-200 [background:linear-gradient(135deg,#0ea5e9,#4f46e5)] hover:brightness-110" onClick={() => setStage('catalog')}>
                  <ArrowLeft className="h-4 w-4" /> Voltar aos produtos
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="space-y-4">
                  <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <Field label="Desconto">
                      <Input className="h-11 rounded-2xl" type="number" min="0" value={mode === 'sale' ? header.discount_percent : header.discount_pct} onChange={(event) => setHeader((prev) => ({ ...prev, [mode === 'sale' ? 'discount_percent' : 'discount_pct']: event.target.value }))} />
                    </Field>
                    <div className="mt-4 rounded-[24px] p-5 text-white [background:linear-gradient(135deg,#020617,#1e1b4b)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Total final</p>
                      <p className="mt-2 text-3xl font-black">{money(totals.totalFinal)}</p>
                    </div>
                    <div className="mt-3"><MissingAlerts alerts={alerts} /></div>
                    <Button type="button" className="mt-4 min-h-12 w-full rounded-2xl !text-white shadow-lg shadow-blue-200 [background:linear-gradient(135deg,#2563eb,#7c3aed,#db2777)] hover:brightness-110 disabled:opacity-100 disabled:saturate-50" disabled={saving || alerts.length > 0} onClick={() => submitDocument('save')}>
                      <FileText className="h-4 w-4" /> {saving ? 'Salvando...' : mode === 'sale' ? 'Salvar venda' : 'Salvar orcamento'}
                    </Button>
                    <Button type="button" className="mt-2 min-h-12 w-full rounded-2xl !text-white shadow-lg shadow-emerald-200 [background:linear-gradient(135deg,#059669,#22c55e,#84cc16)] hover:brightness-110 disabled:opacity-100 disabled:saturate-50" disabled={saving || alerts.length > 0} onClick={() => submitDocument('save_and_send')}>
                      <Send className="h-4 w-4" /> Salvar e enviar
                    </Button>
                  </div>
                  <div className="rounded-[28px] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      <h4 className="font-black text-slate-950">Itens</h4>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={`${item.product_id || item.product_name}-${index}`} className="overflow-hidden rounded-2xl border border-cyan-200 bg-white p-3 shadow-sm">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="break-words font-black leading-tight text-slate-950">{item.product_name}</p>
                              <p className="mt-1 break-words text-xs text-slate-500">
                                {item.quantity} {item.unit || 'un'}{item.width_mm && item.height_mm ? ` - ${item.width_mm}x${item.height_mm}mm` : ''}
                              </p>
                              <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500">{item.art_description || item.item_notes || 'Sem observacao.'}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-col gap-2">
                            <span className="rounded-xl bg-slate-950 px-3 py-2 text-center font-black text-white">{money(item.total)}</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" className="min-h-9 rounded-xl bg-blue-600 px-2 text-xs font-black text-white shadow-sm hover:bg-blue-700" onClick={() => editLine(index)}>Editar</button>
                              <button type="button" className="min-h-9 rounded-xl bg-red-600 px-2 text-xs font-black text-white shadow-sm hover:bg-red-700" onClick={() => removeLine(index)}>Remover</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
                <PdfPreview header={header} items={items} totals={totals} mode={mode} company={companyConfig} />
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="space-y-3">
                  {mode === 'quote' && (
                    <Field label="Condicoes de pagamento">
                      <Textarea className="min-h-20 rounded-2xl" value={header.payment_conditions} onChange={(event) => setHeader((prev) => ({ ...prev, payment_conditions: event.target.value }))} />
                    </Field>
                  )}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Observacao para o cliente">
                      <Textarea className="min-h-24 rounded-2xl" value={header.notes} onChange={(event) => setHeader((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Texto que pode aparecer no PDF e na mensagem." />
                    </Field>
                    {mode === 'quote' && (
                      <Field label="Observacao interna">
                        <Textarea className="min-h-24 rounded-2xl" value={header.internal_notes} onChange={(event) => setHeader((prev) => ({ ...prev, internal_notes: event.target.value }))} placeholder="Apenas para a equipe." />
                      </Field>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
