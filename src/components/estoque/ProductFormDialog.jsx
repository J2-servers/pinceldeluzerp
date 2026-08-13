import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Box, Boxes, CheckCircle2, Layers3, Package, Plus, Ruler, Trash2, Warehouse } from 'lucide-react';
import CategoryField from '@/components/catalog/CategoryField';
import ImageUploadField from '@/components/estoque/ImageUploadField';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { money } from '@/lib/pricingEngine';
import { normalizeText } from '@/lib/utils';

const units = ['un', 'm', 'm2', 'kg', 'cx', 'pc', 'rolo', 'folha'];
const pricingModes = [
  { value: 'unitario', label: 'Por unidade' },
  { value: 'area_m2', label: 'Por m2 / chapa' },
  { value: 'comprimento', label: 'Por comprimento' },
  { value: 'peso', label: 'Por peso' },
  { value: 'manual', label: 'Manual' },
];
const yesNoOptions = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Nao' },
];
const assetTypes = [
  { value: 'nenhum', label: 'Nao e patrimonio' },
  { value: 'empresa', label: 'Patrimonio da empresa' },
  { value: 'socio', label: 'Patrimonio de socio' },
];
const assetCategories = ['maquinas', 'veiculos', 'moveis', 'informatica', 'ferramentas', 'equipamentos', 'outros'];
const assetConditions = ['novo', 'bom', 'regular', 'ruim', 'inativo'];
const partners = ['Maeli', 'Wesley', 'Juliano'];

const defaultForm = {
  name: '',
  sku: '',
  barcode: '',
  brand: '',
  supplier_name: '',
  category: '',
  product_group: '',
  description: '',
  unit: 'un',
  pricing_mode: 'unitario',
  dimensions_required: false,
  can_quote: true,
  can_sell: true,
  track_stock: true,
  auto_deduct_on_sale: true,
  track_area_stock: false,
  min_stock_m2: 0,
  is_active: true,
  quantity: 0,
  min_quantity: 1,
  max_quantity: 0,
  lead_time_days: 0,
  sheet_width_mm: '',
  sheet_height_mm: '',
  thickness_mm: '',
  cost_price: 0,
  price_per_m2: 0,
  sale_price: 0,
  default_markup_pct: 35,
  material_waste_pct: 12,
  color: '',
  location: '',
  asset_type: 'nenhum',
  asset_category: 'equipamentos',
  asset_condition: 'bom',
  responsible_partner: 'Maeli',
  auto_create_asset: false,
  linked_asset_id: '',
  variant_group_id: '',
  variant_label: '',
  image_url: '',
  is_kit: false,
  kit_components: '',
  notes: '',
};

function parseKitComponents(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeSheetDimension(value) {
  const dimension = parseDecimal(value);
  return dimension > 0 && dimension < 100 ? dimension * 10 : dimension;
}

function sheetAreaM2(form) {
  const width = normalizeSheetDimension(form.sheet_width_mm);
  const height = normalizeSheetDimension(form.sheet_height_mm);
  if (!width || !height) return 0;
  return (width * height) / 1000000;
}

function computedPrices(form) {
  const cost = parseDecimal(form.cost_price);
  const sale = parseDecimal(form.sale_price);
  const markup = parseDecimal(form.default_markup_pct);
  const targetSale = sale || (cost > 0 ? cost * (1 + markup / 100) : 0);
  const area = sheetAreaM2(form);
  return {
    cost,
    sale: roundCurrency(targetSale),
    area,
    costPerM2: area > 0 ? roundCurrency(cost / area) : roundCurrency(form.price_per_m2),
    salePerM2: area > 0 && targetSale > 0 ? roundCurrency(targetSale / area) : roundCurrency(form.price_per_m2),
  };
}

function Field({ label, help, children }) {
  return (
    <label className="space-y-1.5">
      <Label className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</Label>
      {children}
      {help && <span className="block text-[11px] leading-snug text-slate-500">{help}</span>}
    </label>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="font-black text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SummaryLine({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-0.5 break-words text-sm font-black">{value}</p>
    </div>
  );
}

export default function ProductFormDialog({ open, onClose, product = null, onSubmit, saving, categories = [], onCreateCategory, products = [], variationSource = null }) {
  const [form, setForm] = useState(defaultForm);
  const [kitRows, setKitRows] = useState([]);
  const [kitDraft, setKitDraft] = useState({ product_id: '', quantity: 1 });

  useEffect(() => {
    if (!open) return;
    if (variationSource) {
      const copy = { ...variationSource };
      ['id', 'created_date', 'updated_date', 'created_by', 'updated_by'].forEach((key) => delete copy[key]);
      setForm({
        ...defaultForm,
        ...copy,
        sku: '',
        barcode: '',
        quantity: 0,
        linked_asset_id: '',
        auto_create_asset: false,
        variant_group_id: variationSource.variant_group_id || variationSource.id,
        variant_label: '',
      });
      setKitRows(parseKitComponents(variationSource.kit_components));
    } else {
      setForm(product ? { ...defaultForm, ...product } : defaultForm);
      setKitRows(parseKitComponents(product?.kit_components));
    }
    setKitDraft({ product_id: '', quantity: 1 });
  }, [open, product, variationSource]);

  const generateSku = () => {
    const base = normalizeText(form.category || '').replace(/[^a-z0-9]/g, '');
    const prefix = (base.slice(0, 3) || 'prd').toUpperCase();
    const existing = new Set(products.map((item) => String(item.sku || '').trim().toUpperCase()).filter(Boolean));
    let seq = 0;
    existing.forEach((sku) => {
      if (!sku.startsWith(`${prefix}-`)) return;
      const num = parseInt(sku.slice(prefix.length + 1), 10);
      if (Number.isFinite(num) && num > seq) seq = num;
    });
    let next = seq + 1;
    let candidate = `${prefix}-${String(next).padStart(4, '0')}`;
    while (existing.has(candidate)) {
      next += 1;
      candidate = `${prefix}-${String(next).padStart(4, '0')}`;
    }
    setForm((prev) => ({ ...prev, sku: candidate }));
  };

  const kitCandidates = useMemo(
    () => products.filter((item) => item.id && item.id !== product?.id),
    [products, product?.id],
  );

  const kitEstimatedCost = useMemo(() => kitRows.reduce((sum, row) => {
    const component = products.find((item) => item.id === row.product_id);
    return sum + parseDecimal(row.quantity) * Number(component?.cost_price || 0);
  }, 0), [kitRows, products]);

  const addKitComponent = () => {
    const target = products.find((item) => item.id === kitDraft.product_id);
    if (!target) return;
    const quantity = parseDecimal(kitDraft.quantity) || 1;
    setKitRows((prev) => {
      const exists = prev.some((row) => row.product_id === target.id);
      if (exists) return prev.map((row) => (row.product_id === target.id ? { ...row, quantity } : row));
      return [...prev, { product_id: target.id, product_name: target.name, quantity }];
    });
    setKitDraft({ product_id: '', quantity: 1 });
  };

  const removeKitComponent = (productId) => {
    setKitRows((prev) => prev.filter((row) => row.product_id !== productId));
  };

  const isVariation = !!variationSource || !!product?.variant_label;

  const prices = useMemo(() => computedPrices(form), [form]);
  const usesArea = form.dimensions_required || form.pricing_mode === 'area_m2';
  const trackArea = usesArea && !!form.track_area_stock;
  const priceOk = usesArea ? prices.salePerM2 > prices.costPerM2 && prices.costPerM2 > 0 : prices.sale > prices.cost && prices.cost > 0;

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      quantity: parseDecimal(form.quantity),
      min_quantity: parseDecimal(form.min_quantity),
      max_quantity: parseDecimal(form.max_quantity),
      lead_time_days: parseDecimal(form.lead_time_days),
      cost_price: roundCurrency(form.cost_price),
      sale_price: roundCurrency(prices.sale),
      pricing_mode: usesArea ? 'area_m2' : form.pricing_mode,
      dimensions_required: usesArea,
      track_area_stock: trackArea,
      min_stock_m2: trackArea ? parseDecimal(form.min_stock_m2) : 0,
      price_per_m2: usesArea ? prices.salePerM2 : roundCurrency(form.price_per_m2),
      material_cost_m2: usesArea ? prices.costPerM2 : 0,
      default_markup_pct: parseDecimal(form.default_markup_pct),
      waste_pct: parseDecimal(form.material_waste_pct),
      material_waste_pct: parseDecimal(form.material_waste_pct),
      sheet_width_mm: usesArea && form.sheet_width_mm ? normalizeSheetDimension(form.sheet_width_mm) : null,
      sheet_height_mm: usesArea && form.sheet_height_mm ? normalizeSheetDimension(form.sheet_height_mm) : null,
      thickness_mm: form.thickness_mm ? parseDecimal(form.thickness_mm) : null,
      default_labor_hours: 0,
      labor_cost_hour: 0,
      default_machine_minutes: 0,
      machine_cost_per_min: 0,
      default_art_cost: 0,
      art_template_notes: '',
      variant_group_id: form.variant_group_id || '',
      variant_label: String(form.variant_label || '').trim(),
      image_url: String(form.image_url || '').trim(),
      is_kit: !!form.is_kit,
      kit_components: form.is_kit && kitRows.length
        ? JSON.stringify(kitRows.map((row) => ({ product_id: row.product_id, product_name: row.product_name, quantity: parseDecimal(row.quantity) || 0 })))
        : '',
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[1280px] max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden p-0 bg-slate-50">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
              <Box className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-black text-slate-900">{variationSource ? 'Nova variacao' : product ? 'Editar produto' : 'Novo produto'}</DialogTitle>
                {variationSource && <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-black text-purple-700">Variacao de {variationSource.name}</span>}
                {!variationSource && product?.variant_label && <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-black text-purple-700">Variacao: {product.variant_label}</span>}
                {!variationSource && product?.is_kit && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700">Kit</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{variationSource ? 'Copia do produto original com saldo zerado. Ajuste o rotulo da variacao, SKU e precos.' : 'Ficha unica para estoque, orçamento, venda e tabela de material. Maquina e mao de obra ficam na aba Precificacao.'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_320px] sm:p-6">
          <div className="space-y-4">
            <Section icon={Package} title="1. Identificacao" description="Nome, grupo e descricao precisam deixar claro o que sera vendido ou usado como material.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Field label="Nome *"><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required placeholder="Ex: Acrilico transparente 2mm" /></Field>
                </div>
                <Field label="SKU">
                  <div className="flex gap-2">
                    <Input value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} className="flex-1" />
                    {!String(form.sku || '').trim() && (
                      <Button type="button" variant="outline" onClick={generateSku} className="shrink-0 px-3" title="Gerar SKU automatico pela categoria">Gerar</Button>
                    )}
                  </div>
                </Field>
                <Field label="Codigo de barras"><Input value={form.barcode} onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))} /></Field>
                {isVariation && (
                  <div className="md:col-span-2">
                    <Field label={variationSource ? 'Nome da variacao *' : 'Nome da variacao'} help="Ex: Preto 3mm. Identifica esta variacao dentro do grupo.">
                      <Input value={form.variant_label || ''} onChange={(event) => setForm((prev) => ({ ...prev, variant_label: event.target.value }))} required={!!variationSource} placeholder="Preto 3mm" />
                    </Field>
                  </div>
                )}
                <div className="md:col-span-2"><CategoryField value={form.category} categories={categories} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} onCreateCategory={onCreateCategory} /></div>
                <Field label="Grupo comercial" help="Usado em filtros, margem e relatorios."><Input value={form.product_group} onChange={(event) => setForm((prev) => ({ ...prev, product_group: event.target.value }))} placeholder="Acrilico, MDF, brindes..." /></Field>
                <Field label="Fornecedor"><Input value={form.supplier_name} onChange={(event) => setForm((prev) => ({ ...prev, supplier_name: event.target.value }))} /></Field>
                <div className="md:col-span-4">
                  <Field label="Descricao"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-20" /></Field>
                </div>
                <div className="md:col-span-4">
                  <Field label={isVariation ? 'Imagem da variacao' : 'Imagem do produto'} help="Aparece na tabela de estoque e no seletor de venda.">
                    <ImageUploadField value={form.image_url} onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))} label={form.name || 'Produto'} />
                  </Field>
                </div>
              </div>
            </Section>

            <Section icon={Layers3} title="2. Como o sistema usa este item" description="Define se aparece em orçamento, venda, estoque e se exige medida.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="Unidade"><Select value={form.unit} onValueChange={(value) => setForm((prev) => ({ ...prev, unit: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Modo de preco"><Select value={form.pricing_mode} onValueChange={(value) => setForm((prev) => ({ ...prev, pricing_mode: value, dimensions_required: value === 'area_m2' ? true : prev.dimensions_required }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{pricingModes.map((mode) => <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Usa medidas?"><Select value={String(usesArea)} onValueChange={(value) => setForm((prev) => ({ ...prev, dimensions_required: value === 'true', pricing_mode: value === 'true' ? 'area_m2' : 'unitario', unit: value === 'true' ? 'm2' : prev.unit }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Ativo?"><Select value={String(form.is_active)} onValueChange={(value) => setForm((prev) => ({ ...prev, is_active: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Pode orcar?"><Select value={String(form.can_quote)} onValueChange={(value) => setForm((prev) => ({ ...prev, can_quote: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Pode vender?"><Select value={String(form.can_sell)} onValueChange={(value) => setForm((prev) => ({ ...prev, can_sell: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Controla estoque?"><Select value={String(form.track_stock)} onValueChange={(value) => setForm((prev) => ({ ...prev, track_stock: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Baixa na venda?"><Select value={String(form.auto_deduct_on_sale)} onValueChange={(value) => setForm((prev) => ({ ...prev, auto_deduct_on_sale: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="E kit/combo?" help="Kit agrupa outros produtos que saem juntos na venda."><Select value={String(!!form.is_kit)} onValueChange={(value) => setForm((prev) => ({ ...prev, is_kit: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
              </div>
            </Section>

            {form.is_kit && (
              <Section icon={Boxes} title="Composicao (kit)" description="Componentes que formam este kit. A baixa de estoque dos componentes acontece na venda.">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_130px_auto]">
                  <Field label="Componente">
                    <Select value={kitDraft.product_id} onValueChange={(value) => setKitDraft((prev) => ({ ...prev, product_id: value }))}>
                      <SelectTrigger><SelectValue placeholder="Escolha um produto" /></SelectTrigger>
                      <SelectContent>
                        {kitCandidates.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}{item.sku ? ` (${item.sku})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Quantidade">
                    <Input type="number" min="0.01" step="any" value={kitDraft.quantity} onChange={(event) => setKitDraft((prev) => ({ ...prev, quantity: event.target.value }))} />
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={addKitComponent} disabled={!kitDraft.product_id} className="h-10">
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                </div>
                {kitRows.length === 0 && <p className="mt-3 text-sm text-slate-500">Nenhum componente adicionado ainda.</p>}
                {kitRows.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {kitRows.map((row) => {
                      const component = products.find((item) => item.id === row.product_id);
                      return (
                        <div key={row.product_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">{row.product_name || component?.name || row.product_id}</p>
                            <p className="text-xs text-slate-500">{parseDecimal(row.quantity)} {component?.unit || 'un'} · custo unit. {money(component?.cost_price || 0)}</p>
                          </div>
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeKitComponent(row.product_id)} aria-label={`Remover ${row.product_name || 'componente'}`}>
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      );
                    })}
                    <p className="text-xs font-bold text-slate-600">Custo estimado dos componentes: {money(kitEstimatedCost)}</p>
                  </div>
                )}
              </Section>
            )}

            <Section icon={Ruler} title="3. Material, medidas e preco" description="Aqui fica apenas materia-prima e preco base. Operacao entra no orçamento por perfil e tempo.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {usesArea && (
                  <>
                    <Field label="Largura da chapa (mm)" help="Se digitar 60, o sistema entende 60cm e salva 600mm."><Input type="number" value={form.sheet_width_mm || ''} onChange={(event) => setForm((prev) => ({ ...prev, sheet_width_mm: event.target.value }))} /></Field>
                    <Field label="Altura da chapa (mm)"><Input type="number" value={form.sheet_height_mm || ''} onChange={(event) => setForm((prev) => ({ ...prev, sheet_height_mm: event.target.value }))} /></Field>
                  </>
                )}
                <Field label="Espessura (mm)"><Input type="number" value={form.thickness_mm || ''} onChange={(event) => setForm((prev) => ({ ...prev, thickness_mm: event.target.value }))} /></Field>
                <Field label="Cor / acabamento"><Input value={form.color || ''} onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))} /></Field>
                <Field label={usesArea ? 'Custo da chapa' : 'Custo unitario'}><Input type="number" step="0.01" value={form.cost_price} onChange={(event) => setForm((prev) => ({ ...prev, cost_price: event.target.value }))} /></Field>
                <Field label={usesArea ? 'Venda da chapa' : 'Venda unitario'} help="Se ficar zero, usa markup padrao."><Input type="number" step="0.01" value={form.sale_price} onChange={(event) => setForm((prev) => ({ ...prev, sale_price: event.target.value }))} /></Field>
                <Field label="Markup padrao %"><Input type="number" step="0.01" value={form.default_markup_pct} onChange={(event) => setForm((prev) => ({ ...prev, default_markup_pct: event.target.value }))} /></Field>
                <Field label="Perda %"><Input type="number" step="0.01" value={form.material_waste_pct} onChange={(event) => setForm((prev) => ({ ...prev, material_waste_pct: event.target.value }))} /></Field>
              </div>
            </Section>

            <Section icon={Warehouse} title="4. Estoque e reposicao" description="Quantidade, minimo e localizacao para evitar vender o que nao existe.">
              {usesArea && (
                <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
                    <div>
                      <p className="text-sm font-black text-slate-800">Controlar estoque por area (m2)</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">Ligado: o saldo deste item passa a ser a area disponivel em m2 (nao pecas). A entrada e feita por chapa e a baixa acontece pela medida da peca vendida.</p>
                    </div>
                    <Select value={String(!!form.track_area_stock)} onValueChange={(value) => setForm((prev) => ({ ...prev, track_area_stock: value === 'true', unit: value === 'true' ? 'm2' : prev.unit }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label={trackArea ? 'Area disponivel (m2)' : 'Quantidade atual'} help={trackArea ? 'Saldo em m2. Baixa pela medida da peca vendida.' : undefined}><Input type="number" step="any" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} /></Field>
                {trackArea ? (
                  <Field label="Estoque minimo (m2)" help="Alerta quando o saldo em m2 fica abaixo deste valor."><Input type="number" step="any" value={form.min_stock_m2} onChange={(event) => setForm((prev) => ({ ...prev, min_stock_m2: event.target.value }))} /></Field>
                ) : (
                  <Field label="Estoque minimo"><Input type="number" value={form.min_quantity} onChange={(event) => setForm((prev) => ({ ...prev, min_quantity: event.target.value }))} /></Field>
                )}
                <Field label="Estoque maximo"><Input type="number" value={form.max_quantity} onChange={(event) => setForm((prev) => ({ ...prev, max_quantity: event.target.value }))} /></Field>
                <Field label="Reposicao dias"><Input type="number" value={form.lead_time_days} onChange={(event) => setForm((prev) => ({ ...prev, lead_time_days: event.target.value }))} /></Field>
                <div className="md:col-span-2"><Field label="Localizacao"><Input value={form.location || ''} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Prateleira, caixa, sala, estoque..." /></Field></div>
              </div>
            </Section>

            <Section icon={Box} title="5. Governanca e patrimonio" description="Use apenas quando o item tambem representa equipamento ou patrimonio.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="Tipo patrimonial"><Select value={form.asset_type} onValueChange={(value) => setForm((prev) => ({ ...prev, asset_type: value, auto_create_asset: value !== 'nenhum' ? prev.auto_create_asset : false }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{assetTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Criar patrimonio?"><Select value={String(form.auto_create_asset)} onValueChange={(value) => setForm((prev) => ({ ...prev, auto_create_asset: value === 'true' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yesNoOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Categoria"><Select value={form.asset_category} onValueChange={(value) => setForm((prev) => ({ ...prev, asset_category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{assetCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Condicao"><Select value={form.asset_condition} onValueChange={(value) => setForm((prev) => ({ ...prev, asset_condition: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{assetConditions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Responsavel"><Select value={form.responsible_partner} onValueChange={(value) => setForm((prev) => ({ ...prev, responsible_partner: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{partners.map((partner) => <SelectItem key={partner} value={partner}>{partner}</SelectItem>)}</SelectContent></Select></Field>
                <div className="md:col-span-3"><Field label="Observacoes internas"><Input value={form.notes || ''} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} /></Field></div>
              </div>
            </Section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-black text-slate-900">Resumo do cadastro</h3>
              <p className="mt-1 text-sm text-slate-500">Confere como este item vai entrar no ERP.</p>
              <div className="mt-4 space-y-2">
                <SummaryLine label="Item" value={form.name || 'Sem nome'} tone={form.name ? 'green' : 'amber'} />
                <SummaryLine label="Uso" value={`${form.can_quote ? 'orcamento' : ''}${form.can_quote && form.can_sell ? ' + ' : ''}${form.can_sell ? 'venda' : ''}` || 'bloqueado'} tone={form.can_quote || form.can_sell ? 'blue' : 'amber'} />
                <SummaryLine label="Precificacao" value={usesArea ? `${money(prices.salePerM2)} por m2` : `${money(prices.sale)} por ${form.unit || 'un'}`} tone={priceOk ? 'green' : 'amber'} />
                <SummaryLine label="Custo" value={usesArea ? `${money(prices.costPerM2)} por m2` : money(prices.cost)} />
                <SummaryLine label="Estoque" value={form.track_stock ? (trackArea ? `${form.quantity || 0} m2 disponivel` : `${form.quantity || 0} ${form.unit || ''}`) : 'sem controle'} tone={trackArea ? 'blue' : 'slate'} />
              </div>
              {!priceOk && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Revise custo e venda. O ideal e o preco comercial ficar acima do custo antes de usar no orçamento.</p>
                  </div>
                </div>
              )}
              {priceOk && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" /> Cadastro pronto para orçamento e venda.
                </div>
              )}
            </div>

            <DialogFooter className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Button type="button" variant="outline" onClick={onClose} className="w-full">Cancelar</Button>
              <Button type="submit" disabled={saving || !form.name} className="w-full">{saving ? 'Salvando...' : variationSource ? 'Criar variacao' : product ? 'Salvar produto' : 'Criar produto'}</Button>
            </DialogFooter>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
