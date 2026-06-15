import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, ChevronRight, Package, Plus } from 'lucide-react';
import StockProductBranchSelector from '@/components/products/StockProductBranchSelector';
import { inferProductBehavior } from '@/lib/productBehavior';
import { buildQuoteFromProduct, calculateQuoteTotals, formatMoney } from '@/components/orcamentos/quotePricing';
import OperationCostFields from '@/components/pricing/OperationCostFields';

const defaultForm = {
  product_id: '',
  product_name: '',
  product_group: '',
  pricing_mode: 'unitario',
  client_name: '',
  client_phone: '',
  description: '',
  quantity: 1,
  width_mm: '',
  height_mm: '',
  depth_mm: '',
  material: 'outro',
  material_color: '',
  material_thickness_mm: '',
  material_cost: 0,
  total_cost: 0,
  unit_price: 0,
  total_price: 0,
  final_price: 0,
  manual_unit_price: 0,
  price_per_m2_override: 0,
  labor_hours: 0,
  labor_cost_hour: 0,
  labor_cost_total: 0,
  cut_time_min: 0,
  machine_cost_per_min: 0,
  machine_cost_total: 0,
  discount_pct: 0,
  valid_days: 7,
  deadline_days: 5,
  payment_conditions: '50% entrada, 50% na entrega',
  notes: '',
  internal_notes: '',
  status: 'rascunho',
  created_by_partner: 'Maeli'
};

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'reprovado', label: 'Reprovado' },
  { value: 'expirado', label: 'Expirado' }
];

const partnerOptions = ['Maeli', 'Wesley', 'Juliano'];

export default function QuoteFormDialog({ open, onClose, editItem, clients = [], products = [], onSubmit, saving, onCreateProduct }) {
  const [form, setForm] = useState(defaultForm);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [step, setStep] = useState('produto');

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      const matchedProduct = products.find((product) => product.id === editItem.product_id) || products.find((product) => product.name === editItem.product_name) || null;
      setSelectedProductId(matchedProduct?.id || null);
      setForm({ ...defaultForm, ...editItem, manual_unit_price: editItem.unit_price || 0, price_per_m2_override: matchedProduct?.price_per_m2 || 0 });
      setStep('produto');
      return;
    }
    setForm(defaultForm);
    setSelectedProductId(null);
    setStep('produto');
  }, [open, editItem, products]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) || null;
  const behavior = inferProductBehavior(selectedProduct || {});
  const totals = useMemo(() => calculateQuoteTotals(form, selectedProduct), [form, selectedProduct]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      material_cost: Math.max(0, totals.unitCost - totals.laborCostUnit - totals.machineCostUnit),
      labor_cost_total: totals.laborCostUnit * (parseFloat(prev.quantity) || 1),
      machine_cost_total: totals.machineCostUnit * (parseFloat(prev.quantity) || 1),
      total_cost: totals.totalCost,
      unit_price: totals.unitPrice,
      total_price: totals.subtotal,
      final_price: totals.finalPrice,
    }));
  }, [totals.unitCost, totals.totalCost, totals.unitPrice, totals.subtotal, totals.finalPrice]);

  const handleSelectProduct = (product) => {
    setSelectedProductId(product.id);
    setForm((prev) => buildQuoteFromProduct(prev, product));
  };

  const handleSave = (event) => {
    event.preventDefault();
    onSubmit({ ...form, quantity: Number(form.quantity || 1) });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-4xl max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden p-0" style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
        <div className="px-4 sm:px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-inner)' }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-muted)', boxShadow: 'var(--shadow-flat)' }}>
            <Calculator className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editItem ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Escolha o produto primeiro e o sistema monta o modelo certo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border-inner)' }}>
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
            <p className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Custo total</p>
            <p className="text-lg font-bold" style={{ color: 'var(--orange)' }}>{formatMoney(totals.totalCost)}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
            <p className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Preço unitário</p>
            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{formatMoney(totals.unitPrice)}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
            <p className="text-[11px] mb-1" style={{ color: 'var(--text-tertiary)' }}>Preço final</p>
            <p className="text-lg font-bold" style={{ color: 'var(--green)' }}>{formatMoney(totals.finalPrice)}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="px-4 sm:px-6 py-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'produto', label: 'Produto' },
              { id: 'cliente', label: 'Cliente' },
              { id: 'preco', label: behavior.dimensionsRequired ? 'Medidas & preço' : 'Preço & quantidade' },
              { id: 'comercial', label: 'Comercial' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={step === item.id ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: 'var(--text-inverted)', boxShadow: 'var(--shadow-raised-sm)' } : { background: 'var(--bg)', color: 'var(--text-tertiary)', boxShadow: 'var(--shadow-pressed)' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {step === 'produto' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={onCreateProduct}><Plus className="w-4 h-4 mr-2" /> Novo produto</Button>
              </div>
              <StockProductBranchSelector selectedProductId={selectedProductId} onSelect={handleSelectProduct} mode="quote" />
              {selectedProduct && (
                <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
                  <Package className="w-5 h-5 mt-0.5" style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Grupo: {behavior.productGroup || '-'} • Modo: {behavior.dimensionsRequired ? 'Por medidas' : 'Por unidade'}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep('cliente')} disabled={!selectedProduct}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'cliente' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Cliente *</Label>
                <Input list="quote-clients" value={form.client_name} onChange={(e) => setForm((prev) => ({ ...prev, client_name: e.target.value }))} required />
                <datalist id="quote-clients">{clients.map((client) => <option key={client.id} value={client.name} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Telefone / WhatsApp</Label>
                <Input value={form.client_phone} onChange={(e) => setForm((prev) => ({ ...prev, client_phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="h-24" placeholder="Detalhes do que será produzido" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="button" onClick={() => setStep('preco')} disabled={!selectedProduct}>
                  Ir para precificação <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'preco' && selectedProduct && (
            <div className="space-y-4">
              <div className={`grid gap-4 ${behavior.dimensionsRequired ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wide text-slate-500">Quantidade</Label>
                  <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} />
                </div>
                {behavior.dimensionsRequired && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-slate-500">Largura (mm)</Label>
                      <Input type="number" value={form.width_mm} onChange={(e) => setForm((prev) => ({ ...prev, width_mm: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-slate-500">Altura (mm)</Label>
                      <Input type="number" value={form.height_mm} onChange={(e) => setForm((prev) => ({ ...prev, height_mm: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-slate-500">Preço por m²</Label>
                      <Input type="number" step="0.01" value={form.price_per_m2_override} onChange={(e) => setForm((prev) => ({ ...prev, price_per_m2_override: e.target.value }))} />
                    </div>
                  </>
                )}
                {!behavior.dimensionsRequired && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-slate-500">Preço unitário</Label>
                      <Input type="number" step="0.01" value={form.manual_unit_price} onChange={(e) => setForm((prev) => ({ ...prev, manual_unit_price: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wide text-slate-500">Desconto (%)</Label>
                      <Input type="number" step="0.01" value={form.discount_pct} onChange={(e) => setForm((prev) => ({ ...prev, discount_pct: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>

              {behavior.dimensionsRequired && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Área da peça</p>
                    <p className="font-bold" style={{ color: 'var(--accent)' }}>{totals.areaM2.toFixed(4)} m²</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Custo por peça</p>
                    <p className="font-bold" style={{ color: 'var(--orange)' }}>{formatMoney(totals.unitCost)}</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)', boxShadow: 'var(--shadow-pressed)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Preço por peça</p>
                    <p className="font-bold" style={{ color: 'var(--green)' }}>{formatMoney(totals.unitPrice)}</p>
                  </div>
                </div>
              )}

              <OperationCostFields
                laborHours={form.labor_hours}
                laborRate={form.labor_cost_hour}
                machineMinutes={form.cut_time_min}
                machineRate={form.machine_cost_per_min}
                onLaborHoursChange={(e) => setForm((prev) => ({ ...prev, labor_hours: e.target.value }))}
                onLaborRateChange={(e) => setForm((prev) => ({ ...prev, labor_cost_hour: e.target.value }))}
                onMachineMinutesChange={(e) => setForm((prev) => ({ ...prev, cut_time_min: e.target.value }))}
                onMachineRateChange={(e) => setForm((prev) => ({ ...prev, machine_cost_per_min: e.target.value }))}
                laborTotal={form.labor_cost_total}
                machineTotal={form.machine_cost_total}
              />

              <div className="md:w-56">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Desconto (%)</Label>
                <Input type="number" step="0.01" value={form.discount_pct} onChange={(e) => setForm((prev) => ({ ...prev, discount_pct: e.target.value }))} />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep('comercial')}>
                  Ir para dados comerciais <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'comercial' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Responsável</Label>
                <Select value={form.created_by_partner} onValueChange={(value) => setForm((prev) => ({ ...prev, created_by_partner: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{partnerOptions.map((partner) => <SelectItem key={partner} value={partner}>{partner}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Validade (dias)</Label>
                <Input type="number" value={form.valid_days} onChange={(e) => setForm((prev) => ({ ...prev, valid_days: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Prazo de produção (dias)</Label>
                <Input type="number" value={form.deadline_days} onChange={(e) => setForm((prev) => ({ ...prev, deadline_days: e.target.value }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Condições de pagamento</Label>
                <Input value={form.payment_conditions} onChange={(e) => setForm((prev) => ({ ...prev, payment_conditions: e.target.value }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Observações para o cliente</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="h-24" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Notas internas</Label>
                <Textarea value={form.internal_notes} onChange={(e) => setForm((prev) => ({ ...prev, internal_notes: e.target.value }))} className="h-20" />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 sticky bottom-0" style={{ borderTop: '1px solid var(--border-inner)', background: 'var(--bg)' }}>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !selectedProduct}>{saving ? 'Salvando...' : editItem ? 'Salvar orçamento' : 'Criar orçamento'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
