import React from 'react';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { calcAreaM2, money } from '@/lib/commercialLinePricing';

function ConfigRow({ title, help, children }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-slate-100 py-4 md:grid-cols-[170px_minmax(0,1fr)] md:items-start">
      <div>
        <p className="font-black text-slate-950">{title}</p>
        {help && <p className="mt-1 text-xs leading-relaxed text-slate-500">{help}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export default function LineItemEditor({
  line,
  dimensionsRequired,
  machineProfiles = [],
  laborProfiles = [],
  serviceProfiles = [],
  onChange,
  onSave,
  saveLabel = 'Adicionar item',
}) {
  const areaM2 = dimensionsRequired ? calcAreaM2(line.width_mm, line.height_mm) : 0;
  const profit = Number(line.total || 0) - Number(line.total_cost || 0);
  const margin = Number(line.total || 0) > 0 ? (profit / Number(line.total || 1)) * 100 : 0;
  const belowCost = profit < 0;
  const lowMargin = !belowCost && margin < 20;
  const missingMeasure = dimensionsRequired && (!Number(line.width_mm || 0) || !Number(line.height_mm || 0));

  return (
    <div className="rounded-[30px] border border-blue-200 bg-white p-4 shadow-sm md:p-5">
      <ConfigRow title="Quantidade" help="Quantidade deste item no documento.">
        <Input className="h-12 rounded-2xl text-base" type="number" min="1" value={line.quantity} onChange={(event) => onChange('quantity', event.target.value)} />
      </ConfigRow>

      {dimensionsRequired && (
        <ConfigRow title="Medidas" help="Largura e altura em milimetros.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input className="h-12 rounded-2xl text-base" type="number" min="0" value={line.width_mm} onChange={(event) => onChange('width_mm', event.target.value)} placeholder="Largura mm" />
            <Input className="h-12 rounded-2xl text-base" type="number" min="0" value={line.height_mm} onChange={(event) => onChange('height_mm', event.target.value)} placeholder="Altura mm" />
          </div>
          <div className="mt-2">
            <Pill tone={missingMeasure ? 'amber' : 'blue'}>Area calculada: {areaM2.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m2</Pill>
          </div>
        </ConfigRow>
      )}

      <ConfigRow title="Detalhes" help="Arte, gravacao, corte, acabamento ou observacoes.">
        <Textarea className="min-h-24 rounded-2xl text-base" value={line.art_description || ''} onChange={(event) => onChange('art_description', event.target.value)} placeholder="Ex: corte a laser + gravacao da logo no MDF" />
      </ConfigRow>

      <ConfigRow title="Producao" help="Use padrao quando nao precisar alterar servico ou tempo.">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Select value={line.service_profile_id || undefined} onValueChange={(value) => onChange('service_profile_id', value)}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Servico padrao" /></SelectTrigger>
            <SelectContent>{serviceProfiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.name || 'Servico'}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-12 rounded-2xl" type="number" step="1" min="0" value={line.machine_time_min || 0} onChange={(event) => onChange('machine_time_min', event.target.value)} placeholder="Min maquina" />
          <Input className="h-12 rounded-2xl" type="number" step="1" min="0" value={line.labor_minutes || 0} onChange={(event) => onChange('labor_minutes', event.target.value)} placeholder="Min equipe" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Select value={line.machine_profile_id || undefined} onValueChange={(value) => onChange('machine_profile_id', value)}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Maquina padrao" /></SelectTrigger>
            <SelectContent>{machineProfiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name || item.machine_name || 'Maquina'}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={line.labor_profile_id || undefined} onValueChange={(value) => onChange('labor_profile_id', value)}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Equipe padrao" /></SelectTrigger>
            <SelectContent>{laborProfiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name || item.role || 'Mao de obra'}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </ConfigRow>

      <div className="mt-4 rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Subtotal calculado</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-3xl font-black">{money(line.total)}</p>
          <div className="flex flex-wrap gap-2">
            <Pill tone="slate">Custo {money(line.total_cost)}</Pill>
            <Pill tone={belowCost ? 'red' : lowMargin ? 'amber' : 'green'}>
              {belowCost || lowMargin ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Margem {margin.toFixed(1)}%
            </Pill>
          </div>
        </div>
      </div>

      {line.material_pricing_warning && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          {line.material_pricing_warning}
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" className="min-h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-6 text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-fuchsia-700" onClick={onSave} disabled={missingMeasure || belowCost}>
          {missingMeasure ? 'Informe medidas' : belowCost ? 'Corrija antes de adicionar' : saveLabel} <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
