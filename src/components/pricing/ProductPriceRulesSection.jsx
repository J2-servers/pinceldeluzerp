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
  customer_id: '',
  product_master_id: '',
  mode: 'price',
  price: '',
  discount_pct: '',
  minimum_quantity: 1,
  starts_at: '',
  ends_at: '',
  active: true,
};

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function formatDay(value) {
  if (!value) return null;
  const date = new Date(`${dateOnly(value)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateOnly(value) : date.toLocaleDateString('pt-BR');
}

function vigenciaText(rule) {
  const start = formatDay(rule.starts_at);
  const end = formatDay(rule.ends_at);
  if (!start && !end) return 'Sempre';
  if (start && end) return `${start} a ${end}`;
  if (start) return `A partir de ${start}`;
  return `Ate ${end}`;
}

// CRUD de ProductPriceRule: preco fixo ou desconto % por cliente e produto.
// Esta tela so gerencia as regras; a aplicacao no calculo fica no motor.
export default function ProductPriceRulesSection({ userName }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const rules = useQuery({ queryKey: ['ProductPriceRule'], queryFn: () => erp.entities.ProductPriceRule.list('-updated_date'), initialData: [] });
  const clients = useQuery({ queryKey: ['Client'], queryFn: () => erp.entities.Client.list('name'), initialData: [] });
  const products = useQuery({ queryKey: ['Product'], queryFn: () => erp.entities.Product.list('name'), initialData: [] });

  const clientNameById = useMemo(() => new Map(clients.data.map((client) => [String(client.id), client.name || 'Cliente'])), [clients.data]);
  const productNameById = useMemo(() => new Map(products.data.map((product) => [String(product.id), product.name || 'Produto'])), [products.data]);

  const labelFor = (payload) => `${clientNameById.get(String(payload.customer_id)) || 'Cliente'} - ${productNameById.get(String(payload.product_master_id)) || 'Produto'}`;

  const buildPayload = () => ({
    customer_id: form.customer_id,
    product_master_id: form.product_master_id,
    minimum_quantity: toNumberOrNull(form.minimum_quantity) ?? 1,
    price: form.mode === 'price' ? toNumberOrNull(form.price) : null,
    discount_pct: form.mode === 'discount' ? toNumberOrNull(form.discount_pct) : null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    active: form.active !== false,
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (editingId) {
        const before = rules.data.find((rule) => String(rule.id) === String(editingId)) || {};
        await erp.entities.ProductPriceRule.update(editingId, payload);
        const changed = diffChangedFields(before, payload);
        if (changed.length) {
          await logPriceChange({ entityName: 'ProductPriceRule', recordId: editingId, recordLabel: labelFor(payload), action: 'update', changedFields: changed, userName });
        }
      } else {
        const created = await erp.entities.ProductPriceRule.create(payload);
        await logPriceChange({ entityName: 'ProductPriceRule', recordId: created?.id, recordLabel: labelFor(payload), action: 'create', changedFields: diffChangedFields({}, payload), userName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ProductPriceRule'] });
      queryClient.invalidateQueries({ queryKey: ['PriceChangeLog'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (rule) => {
      await erp.entities.ProductPriceRule.delete(rule.id);
      await logPriceChange({ entityName: 'ProductPriceRule', recordId: rule.id, recordLabel: labelFor(rule), action: 'delete', changedFields: snapshotFields(rule), userName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ProductPriceRule'] });
      queryClient.invalidateQueries({ queryKey: ['PriceChangeLog'] });
    },
  });

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      customer_id: rule.customer_id ? String(rule.customer_id) : '',
      product_master_id: rule.product_master_id ? String(rule.product_master_id) : '',
      mode: Number(rule.price || 0) > 0 ? 'price' : (Number(rule.discount_pct || 0) > 0 ? 'discount' : 'price'),
      price: rule.price ?? '',
      discount_pct: rule.discount_pct ?? '',
      minimum_quantity: rule.minimum_quantity ?? 1,
      starts_at: dateOnly(rule.starts_at),
      ends_at: dateOnly(rule.ends_at),
      active: rule.active !== false,
    });
  };

  const priceValue = toNumberOrNull(form.price);
  const discountValue = toNumberOrNull(form.discount_pct);
  const canSave = !!form.customer_id && !!form.product_master_id
    && (form.mode === 'price' ? priceValue !== null && priceValue > 0 : discountValue !== null && discountValue > 0);

  return (
    <CrudSection
      title="Preco por cliente"
      description="Preco fixo ou desconto percentual negociado por cliente e produto, com vigencia opcional. O motor de calculo aplica a regra ativa automaticamente."
      form={
        <div className="space-y-3">
          {editingId && <EditingNotice label={labelFor(form)} />}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Cliente" help="Cliente que recebe a condicao especial.">
              <Select value={form.customer_id || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {form.customer_id && !clients.data.some((client) => String(client.id) === form.customer_id) && (
                    <SelectItem value={form.customer_id}>Cliente fora do cadastro</SelectItem>
                  )}
                  {clients.data.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>{client.name || 'Cliente'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Produto" help="Produto que recebe a regra.">
              <Select value={form.product_master_id || undefined} onValueChange={(value) => setForm((prev) => ({ ...prev, product_master_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {form.product_master_id && !products.data.some((product) => String(product.id) === form.product_master_id) && (
                    <SelectItem value={form.product_master_id}>Produto fora do cadastro</SelectItem>
                  )}
                  {products.data.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>{product.name || 'Produto'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de regra" help="Escolha um dos dois: preco final fixo ou desconto sobre o preco calculado.">
              <Select value={form.mode} onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Preco fixo</SelectItem>
                  <SelectItem value="discount">Desconto %</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.mode === 'price' ? (
              <Field label="Preco fixo" help="Preco final aplicado para este cliente neste produto.">
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
              </Field>
            ) : (
              <Field label="Desconto %" help="Percentual abatido do preco calculado pelo motor.">
                <Input type="number" step="0.01" value={form.discount_pct} onChange={(e) => setForm((prev) => ({ ...prev, discount_pct: e.target.value }))} />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Qtd minima" help="Quantidade minima para a regra valer.">
              <Input type="number" value={form.minimum_quantity} onChange={(e) => setForm((prev) => ({ ...prev, minimum_quantity: e.target.value }))} />
            </Field>
            <Field label="Inicio da vigencia" help="Opcional. Vazio = vale desde ja.">
              <Input type="date" value={form.starts_at} onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))} />
            </Field>
            <Field label="Fim da vigencia" help="Opcional. Vazio = sem data de expiracao.">
              <Input type="date" value={form.ends_at} onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.active ? 'ativa' : 'inativa'} onValueChange={(value) => setForm((prev) => ({ ...prev, active: value === 'ativa' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end gap-2">
              <Button type="button" onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
                {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </div>
          {!canSave && (
            <p className="text-xs text-slate-500">Selecione cliente e produto e informe preco fixo ou desconto % maior que zero.</p>
          )}
        </div>
      }
    >
      {rules.data.length ? rules.data.map((rule) => (
        <RowCard
          key={rule.id}
          title={clientNameById.get(String(rule.customer_id)) || 'Cliente nao informado'}
          subtitle={productNameById.get(String(rule.product_master_id)) || 'Produto nao informado'}
          metrics={[
            { label: 'Regra', value: Number(rule.price || 0) > 0 ? `Preco fixo ${money(rule.price)}` : `Desconto ${Number(rule.discount_pct || 0)}%` },
            { label: 'Qtd minima', value: rule.minimum_quantity || 1 },
            { label: 'Vigencia', value: vigenciaText(rule) },
            { label: 'Status', value: rule.active === false ? 'Inativa' : 'Ativa' },
          ]}
          onEdit={() => startEdit(rule)}
          onDelete={() => deleteMutation.mutate(rule)}
        />
      )) : <EmptyHint>Nenhuma regra de preco por cliente cadastrada. Selecione cliente e produto acima para criar a primeira condicao especial.</EmptyHint>}
    </CrudSection>
  );
}
