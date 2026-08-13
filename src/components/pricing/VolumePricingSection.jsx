import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { money } from '@/lib/pricingEngine';
import { CrudSection, EditingNotice, EmptyHint, Field, RowCard } from '@/components/pricing/pricingUi';
import { diffChangedFields, logPriceChange, snapshotFields } from '@/components/pricing/priceChangeLog';

const EMPTY_FORM = {
  product_name: '',
  min_quantity: '',
  max_quantity: '',
  mode: 'unit_price',
  unit_price: '',
  discount_percent: '',
  active: true,
};

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rangeText(rule) {
  const min = Number(rule.min_quantity || 0);
  const max = toNumberOrNull(rule.max_quantity);
  return max === null ? `${min} ou mais` : `${min} a ${max}`;
}

// CRUD de VolumePricing: faixas de quantidade por produto com preco unitario
// ou desconto percentual. Sobreposicao de faixas gera aviso, sem bloquear.
export default function VolumePricingSection({ userName }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const rules = useQuery({ queryKey: ['VolumePricing'], queryFn: () => erp.entities.VolumePricing.list('product_name'), initialData: [] });
  const products = useQuery({ queryKey: ['Product'], queryFn: () => erp.entities.Product.list('name'), initialData: [] });

  const sortedRules = useMemo(() => [...rules.data].sort((a, b) => (
    String(a.product_name || '').localeCompare(String(b.product_name || ''))
    || (Number(a.min_quantity || 0) - Number(b.min_quantity || 0))
  )), [rules.data]);

  const overlappingRules = useMemo(() => {
    const min = toNumberOrNull(form.min_quantity);
    if (!form.product_name || min === null) return [];
    const maxRaw = toNumberOrNull(form.max_quantity);
    const max = maxRaw === null ? Infinity : maxRaw;
    return rules.data.filter((rule) => {
      if (editingId && String(rule.id) === String(editingId)) return false;
      if (String(rule.product_name || '').toLowerCase() !== String(form.product_name).toLowerCase()) return false;
      const otherMin = Number(rule.min_quantity || 0);
      const otherMaxRaw = toNumberOrNull(rule.max_quantity);
      const otherMax = otherMaxRaw === null ? Infinity : otherMaxRaw;
      return min <= otherMax && otherMin <= max;
    });
  }, [rules.data, form.product_name, form.min_quantity, form.max_quantity, editingId]);

  const buildPayload = () => ({
    product_name: form.product_name,
    min_quantity: toNumberOrNull(form.min_quantity) ?? 0,
    max_quantity: toNumberOrNull(form.max_quantity),
    unit_price: form.mode === 'unit_price' ? toNumberOrNull(form.unit_price) : null,
    discount_percent: form.mode === 'discount' ? toNumberOrNull(form.discount_percent) : null,
    active: form.active !== false,
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const label = `${payload.product_name} (${rangeText(payload)})`;
      if (editingId) {
        const before = rules.data.find((rule) => String(rule.id) === String(editingId)) || {};
        await erp.entities.VolumePricing.update(editingId, payload);
        const changed = diffChangedFields(before, payload);
        if (changed.length) {
          await logPriceChange({ entityName: 'VolumePricing', recordId: editingId, recordLabel: label, action: 'update', changedFields: changed, userName });
        }
      } else {
        const created = await erp.entities.VolumePricing.create(payload);
        await logPriceChange({ entityName: 'VolumePricing', recordId: created?.id, recordLabel: label, action: 'create', changedFields: diffChangedFields({}, payload), userName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['VolumePricing'] });
      queryClient.invalidateQueries({ queryKey: ['PriceChangeLog'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (rule) => {
      await erp.entities.VolumePricing.delete(rule.id);
      await logPriceChange({
        entityName: 'VolumePricing',
        recordId: rule.id,
        recordLabel: `${rule.product_name || 'Produto'} (${rangeText(rule)})`,
        action: 'delete',
        changedFields: snapshotFields(rule),
        userName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['VolumePricing'] });
      queryClient.invalidateQueries({ queryKey: ['PriceChangeLog'] });
    },
  });

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      product_name: rule.product_name || '',
      min_quantity: rule.min_quantity ?? '',
      max_quantity: rule.max_quantity ?? '',
      mode: Number(rule.unit_price || 0) > 0 ? 'unit_price' : (Number(rule.discount_percent || 0) > 0 ? 'discount' : 'unit_price'),
      unit_price: rule.unit_price ?? '',
      discount_percent: rule.discount_percent ?? '',
      active: rule.active !== false,
    });
  };

  const minValue = toNumberOrNull(form.min_quantity);
  const maxValue = toNumberOrNull(form.max_quantity);
  const unitPriceValue = toNumberOrNull(form.unit_price);
  const discountValue = toNumberOrNull(form.discount_percent);
  const rangeInvalid = minValue !== null && maxValue !== null && maxValue < minValue;
  const canSave = !!form.product_name && minValue !== null && minValue >= 0 && !rangeInvalid
    && (form.mode === 'unit_price' ? unitPriceValue !== null && unitPriceValue > 0 : discountValue !== null && discountValue > 0);

  return (
    <CrudSection
      title="Desconto por volume"
      description="Faixas de quantidade por produto: acima de X unidades o preco unitario cai ou entra um desconto percentual."
      form={
        <div className="space-y-3">
          {editingId && <EditingNotice label={`${form.product_name || 'faixa'} (${rangeText({ min_quantity: form.min_quantity, max_quantity: form.max_quantity })})`} />}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Field label="Produto" help="Produto que recebe as faixas de volume.">
              <Select value={form.product_name || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, product_name: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {form.product_name && !products.data.some((product) => product.name === form.product_name) && (
                    <SelectItem value={form.product_name}>{form.product_name} (fora do cadastro)</SelectItem>
                  )}
                  {products.data.map((product) => (
                    <SelectItem key={product.id} value={product.name || String(product.id)}>{product.name || 'Produto'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Qtd minima" help="Inicio da faixa (inclusive).">
              <Input type="number" value={form.min_quantity} onChange={(e) => setForm((prev) => ({ ...prev, min_quantity: e.target.value }))} />
            </Field>
            <Field label="Qtd maxima" help="Fim da faixa. Vazio = sem limite.">
              <Input type="number" value={form.max_quantity} onChange={(e) => setForm((prev) => ({ ...prev, max_quantity: e.target.value }))} />
            </Field>
            <Field label="Tipo" help="Preco unitario fechado ou desconto % sobre o preco normal.">
              <Select value={form.mode} onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unit_price">Preco unitario</SelectItem>
                  <SelectItem value="discount">Desconto %</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.mode === 'unit_price' ? (
              <Field label="Preco unitario" help="Preco por unidade dentro da faixa.">
                <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))} />
              </Field>
            ) : (
              <Field label="Desconto %" help="Percentual abatido do preco normal na faixa.">
                <Input type="number" step="0.01" value={form.discount_percent} onChange={(e) => setForm((prev) => ({ ...prev, discount_percent: e.target.value }))} />
              </Field>
            )}
            <div className="flex items-end gap-2">
              <Button type="button" onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
                {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Status">
              <Select value={form.active ? 'ativa' : 'inativa'} onValueChange={(value) => setForm((prev) => ({ ...prev, active: value === 'ativa' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {rangeInvalid && (
            <p className="text-xs font-bold text-red-600">Qtd maxima menor que a qtd minima. Corrija a faixa para salvar.</p>
          )}
          {!rangeInvalid && !canSave && (
            <p className="text-xs text-slate-500">Selecione o produto, informe a qtd minima e um preco unitario ou desconto % maior que zero.</p>
          )}
          {!!overlappingRules.length && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Aviso: a faixa informada sobrepoe {overlappingRules.length} faixa(s) existente(s) deste produto:</strong>{' '}
              {overlappingRules.map((rule) => rangeText(rule)).join('; ')}. Voce pode salvar mesmo assim, mas revise para o motor nao escolher a faixa errada.
            </div>
          )}
        </div>
      }
    >
      {sortedRules.length ? sortedRules.map((rule) => (
        <RowCard
          key={rule.id}
          title={rule.product_name || 'Produto'}
          subtitle={`Faixa de ${rangeText(rule)} unidades`}
          metrics={[
            { label: 'Faixa', value: rangeText(rule) },
            { label: 'Condicao', value: Number(rule.unit_price || 0) > 0 ? `Unitario ${money(rule.unit_price)}` : `Desconto ${Number(rule.discount_percent || 0)}%` },
            { label: 'Status', value: rule.active === false ? 'Inativa' : 'Ativa' },
          ]}
          onEdit={() => startEdit(rule)}
          onDelete={() => deleteMutation.mutate(rule)}
        />
      )) : <EmptyHint>Nenhuma faixa de volume cadastrada. Crie faixas como 1 a 9, 10 a 49 e 50 ou mais para dar desconto progressivo.</EmptyHint>}
    </CrudSection>
  );
}
