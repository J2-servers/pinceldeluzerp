import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OperationalPresetSelects from '@/components/pricing/OperationalPresetSelects';

const money = (value) => `R$ ${(Number(value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Field({ label, help, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</Label>
      {children}
      {help && <p className="text-[11px] leading-snug text-slate-500">{help}</p>}
    </div>
  );
}

function ReadOnlyRate({ label, value, detail, tone = 'slate' }) {
  const toneClass = tone === 'blue'
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : tone === 'orange'
      ? 'border-orange-200 bg-orange-50 text-orange-700'
      : 'border-slate-200 bg-slate-50 text-slate-800';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-xs font-bold opacity-80">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
      <p className="mt-1 text-[11px] leading-snug opacity-80">{detail}</p>
    </div>
  );
}

export default function OperationCostFields({
  laborMinutes,
  machineMinutes,
  onLaborMinutesChange,
  onMachineMinutesChange,
  machineProfiles = [],
  laborProfiles = [],
  selectedMachineProfileId,
  selectedLaborProfileId,
  onMachineProfileChange,
  onLaborProfileChange,
  appliedLaborRate,
  appliedMachineRate,
  laborCostTotal,
  machineCostTotal,
  laborSaleTotal,
  machineSaleTotal,
  overheadCostTotal,
}) {
  const applyPreset = (handler, value) => {
    if (!handler) return;
    handler({ target: { value: String(value) } });
  };

  return (
    <div className="space-y-4">
      <OperationalPresetSelects
        mode="time-only"
        onSelect={(field, value) => {
          if (field === 'labor_minutes') applyPreset(onLaborMinutesChange, value);
          if (field === 'machine_minutes') applyPreset(onMachineMinutesChange, value);
        }}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Maquina/tabela usada" help="Define de qual tabela vem o custo/minuto e o preco/minuto.">
          <Select value={selectedMachineProfileId || undefined} onValueChange={onMachineProfileChange}>
            <SelectTrigger><SelectValue placeholder="Padrao do sistema" /></SelectTrigger>
            <SelectContent>
              {machineProfiles.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name || item.machine_name || 'Maquina'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Equipe/tabela usada" help="Define de qual tabela vem o custo/hora e o preco/hora.">
          <Select value={selectedLaborProfileId || undefined} onValueChange={onLaborProfileChange}>
            <SelectTrigger><SelectValue placeholder="Padrao do sistema" /></SelectTrigger>
            <SelectContent>
              {laborProfiles.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name || item.role || 'Mao de obra'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Minutos de maquina" help="Tempo real previsto de laser, CNC, impressora, plotter ou equipamento.">
          <Input type="number" step="1" min="0" value={machineMinutes || 0} onChange={onMachineMinutesChange} />
        </Field>
        <Field label="Minutos de mao de obra" help="Tempo humano previsto para preparar, produzir, conferir ou embalar.">
          <Input type="number" step="1" min="0" value={laborMinutes || 0} onChange={onLaborMinutesChange} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ReadOnlyRate label="Tabela mao de obra" value={`${money(appliedLaborRate)}/h`} detail="valor veio da aba Precificacao" tone="orange" />
        <ReadOnlyRate label="Tabela maquina" value={`${money(appliedMachineRate)}/min`} detail="valor veio da aba Precificacao" tone="blue" />
        <ReadOnlyRate label="Custo interno MO" value={money(laborCostTotal)} detail="tempo x custo interno" tone="orange" />
        <ReadOnlyRate label="Custo interno maquina" value={money(machineCostTotal)} detail="tempo x custo interno" tone="blue" />
        <ReadOnlyRate label="Estrutura aplicada" value={money(overheadCostTotal)} detail="rateio automatico de energia, aluguel, agua e despesas" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ReadOnlyRate label="Venda de mao de obra" value={money(laborSaleTotal)} detail="cobranca calculada pela tabela comercial" tone="orange" />
        <ReadOnlyRate label="Venda de maquina" value={money(machineSaleTotal)} detail="cobranca calculada pela tabela comercial" tone="blue" />
      </div>
    </div>
  );
}
