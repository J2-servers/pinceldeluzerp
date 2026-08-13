import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEFAULT_PRICING_SETTINGS } from '@/lib/pricingEngine';
import { Field } from '@/components/pricing/pricingUi';
import { diffChangedFields, logPriceChange } from '@/components/pricing/priceChangeLog';

const SETTINGS_FIELDS = [
  { key: 'tax_pct', label: 'Imposto %', help: 'Percentual de imposto sobre a venda - entra no custo comercial de cada orcamento.' },
  { key: 'card_fee_pct', label: 'Taxa de cartao %', help: 'Taxa media de cartao/PIX descontada do preco - reduz a margem liquida.' },
  { key: 'commission_pct', label: 'Comissao %', help: 'Comissao paga ao vendedor sobre o preco de venda.' },
  { key: 'material_waste_pct', label: 'Perda padrao de material %', help: 'Perda aplicada quando o material nao define perda propria.' },
  { key: 'monthly_productive_machine_minutes', label: 'Min produtivos maquina/mes', help: 'Minutos produtivos/mes da maquina - divide as despesas fixas para formar o custo por minuto.' },
  { key: 'monthly_productive_labor_hours', label: 'Horas produtivas MO/mes', help: 'Horas produtivas/mes da equipe - dividem as despesas fixas para formar o custo por hora.' },
  { key: 'target_margin_pct', label: 'Margem alvo %', help: 'Margem sugerida quando nenhuma regra de grupo se aplica ao produto.' },
  { key: 'minimum_margin_pct', label: 'Margem minima %', help: 'Piso de seguranca - abaixo desta margem o preco e tratado como risco.' },
];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// Edicao do singleton PricingSettings: usa o primeiro registro existente;
// se nao existir nenhum, cria com os defaults atuais no momento de salvar.
export default function PricingSettingsSection({ record, userName }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const base = { ...DEFAULT_PRICING_SETTINGS, ...(record || {}) };
    return SETTINGS_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: base[field.key] ?? '' }), {});
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = SETTINGS_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: toNumber(form[field.key]) }), {});
      if (record?.id) {
        await erp.entities.PricingSettings.update(record.id, payload);
        const changed = diffChangedFields(record, payload);
        if (changed.length) {
          await logPriceChange({
            entityName: 'PricingSettings',
            recordId: record.id,
            recordLabel: record.name || 'Configuracao padrao',
            action: 'update',
            changedFields: changed,
            userName,
          });
        }
      } else {
        const data = { ...DEFAULT_PRICING_SETTINGS, ...payload, name: 'Configuracao padrao', active: true };
        const created = await erp.entities.PricingSettings.create(data);
        await logPriceChange({
          entityName: 'PricingSettings',
          recordId: created?.id,
          recordLabel: 'Configuracao padrao',
          action: 'create',
          changedFields: diffChangedFields({}, data),
          userName,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['PricingSettings'] });
      queryClient.invalidateQueries({ queryKey: ['PriceChangeLog'] });
    },
  });

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900">Parametros globais de precificacao</h2>
          <p className="mt-1 text-sm text-slate-500">
            Valores que alimentam todo o motor de preco: impostos, taxas, perda padrao e capacidade produtiva mensal.
            {record?.id ? ' Editando a configuracao existente.' : ' Nenhuma configuracao salva ainda - ao salvar, o registro e criado com estes valores.'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SETTINGS_FIELDS.map((field) => (
            <Field key={field.key} label={field.label} help={field.help}>
              <Input type="number" step="0.01" value={form[field.key]} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />
            </Field>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Salvando...' : 'Salvar parametros'}
          </Button>
          {saveMutation.isSuccess && !saveMutation.isPending && <p className="text-sm font-bold text-emerald-600">Parametros salvos.</p>}
          {saveMutation.isError && <p className="text-sm font-bold text-red-600">Erro ao salvar: {saveMutation.error?.message}</p>}
        </div>
      </div>
    </section>
  );
}
