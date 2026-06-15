import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Box, CheckCircle2, Layers3, Package, Ruler, Warehouse } from 'lucide-react';
import CategoryField from '@/components/catalog/CategoryField';
import { parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { money } from '@/lib/pricingEngine';

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
  notes: '',
};

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

export default function ProductFormDialog({ open, onClose, product = null, onSubmit, saving, categories = [], onCreateCategory }) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!open) return;
    setForm(product ? { ...defaultForm, ...product } : defaultForm);
  }, [open, product]);

  const prices = useMemo(() => computedPrices(form), [form]);
  const usesArea = form.dimensions_required || form.pricing_mode === 'area_m2';
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
              <DialogTitle className="text-lg font-black text-slate-900">{product ? 'Editar produto' : 'Novo produto'}</DialogTitle>
              <p className="mt-1 text-sm text-slate-500">Ficha unica para estoque, orçamento, venda e tabela de material. Maquina e mao de obra ficam na aba Precificacao.</p>
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
                <Field label="SKU"><Input value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} /></Field>
                <Field label="Codigo de barras"><Input value={form.barcode} onChange={(event) => setForm((prev) => ({ ...prev, barcode: event.target.value }))} /></Field>
                <div className="md:col-span-2"><CategoryField value={form.category} categories={categories} onChange={(value) => setForm((prev) => ({ ...prev, category: value }))} onCreateCategory={onCreateCategory} /></div>
                <Field label="Grupo comercial" help="Usado em filtros, margem e relatorios."><Input value={form.product_group} onChange={(event) => setForm((prev) => ({ ...prev, product_group: event.target.value }))} placeholder="Acrilico, MDF, brindes..." /></Field>
                <Field label="Fornecedor"><Input value={form.supplier_name} onChange={(event) => setForm((prev) => ({ ...prev, supplier_name: event.target.value }))} /></Field>
                <div className="md:col-span-4">
                  <Field label="Descricao"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-20" /></Field>
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
              </div>
            </Section>

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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="Quantidade atual"><Input type="number" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))} /></Field>
                <Field label="Estoque minimo"><Input type="number" value={form.min_quantity} onChange={(event) => setForm((prev) => ({ ...prev, min_quantity: event.target.value }))} /></Field>
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
                <SummaryLine label="Estoque" value={form.track_stock ? `${form.quantity || 0} ${form.unit || ''}` : 'sem controle'} />
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
              <Button type="submit" disabled={saving || !form.name} className="w-full">{saving ? 'Salvando...' : product ? 'Salvar produto' : 'Criar produto'}</Button>
            </DialogFooter>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
