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

// Catalogo de adicionais frequentes (item 15): atalhos que adicionam uma linha
// ja rotulada; o valor fica editavel para ajuste caso-a-caso.
const ADDITIONAL_CATALOG = [
  'Acabamento especial',
  'Montagem',
  'Embalagem para presente',
  'Taxa de urgencia',
  'Instalacao',
  'Verniz / laminacao',
];

function LineAdditionals({ additionals, onChange }) {
  const list = Array.isArray(additionals) ? additionals : [];
  const update = (index, field, value) => onChange(list.map((item, current) => current === index ? { ...item, [field]: value } : item));
  const add = () => onChange([...list, { label: '', value: '' }]);
  const addFromCatalog = (label) => onChange([...list, { label, value: '' }]);
  const remove = (index) => onChange(list.filter((_, current) => current !== index));
  return (
    <div className="space-y-2">
      {list.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input className="h-10 rounded-xl" value={item.label} onChange={(event) => update(index, 'label', event.target.value)} placeholder="Ex: Acabamento especial" />
          <Input className="h-10 w-24 shrink-0 rounded-xl" type="number" step="0.01" min="0" value={item.value} onChange={(event) => update(index, 'value', event.target.value)} placeholder="R$" />
          <button type="button" className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => remove(index)}>Remover</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {ADDITIONAL_CATALOG.map((label) => (
          <button key={label} type="button" className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" onClick={() => addFromCatalog(label)}>
            + {label}
          </button>
        ))}
      </div>
      <button type="button" className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700" onClick={add}>
        <Plus className="mr-1 inline h-3.5 w-3.5" /> Adicionar servico ao item
      </button>
    </div>
  );
}

function LineMaterials({ materials, products = [], onChange }) {
  const list = Array.isArray(materials) ? materials : [];
  const update = (index, patch) => onChange(list.map((item, current) => (current === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(list.filter((_, current) => current !== index));
  const add = () => onChange([...list, { product_id: '', name: '', quantity: 1, waste_pct: 0, unit: 'un', unit_cost: 0, sale_price: 0 }]);
  const pick = (index, productId) => {
    const p = products.find((item) => item.id === productId);
    update(index, { product_id: productId, name: p?.name || '', unit: p?.unit || 'un', unit_cost: Number(p?.cost_price || 0), sale_price: Number(p?.sale_price || 0) });
  };
  return (
    <div className="space-y-2">
      {list.map((item, index) => {
        const cost = Number(item.unit_cost || 0) * Number(item.quantity || 0) * (1 + Number(item.waste_pct || 0) / 100);
        return (
          <div key={index} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-12 sm:col-span-5">
              <Select value={item.product_id || undefined} onValueChange={(value) => pick(index, value)}>
                <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue placeholder="Material do estoque" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {money(p.cost_price)}/{p.unit || 'un'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input className="h-10 rounded-xl text-xs" type="number" step="any" min="0" value={item.quantity} onChange={(event) => update(index, { quantity: event.target.value })} placeholder={`Qtd/${item.unit || 'un'}`} />
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Input className="h-10 rounded-xl text-xs" type="number" step="any" min="0" value={item.waste_pct} onChange={(event) => update(index, { waste_pct: event.target.value })} placeholder="Perda %" />
            </div>
            <div className="col-span-3 sm:col-span-2">
              <span className="block truncate rounded-lg bg-slate-100 px-2 py-2 text-xs font-bold text-slate-700">{money(cost)}</span>
            </div>
            <div className="col-span-1 flex justify-end">
              <button type="button" className="rounded-lg px-1.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => remove(index)}>x</button>
            </div>
          </div>
        );
      })}
      <button type="button" className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700" onClick={add}>
        <Plus className="mr-1 inline h-3.5 w-3.5" /> Adicionar material do estoque
      </button>
    </div>
  );
}

function LineLaborSteps({ steps, onChange }) {
  const list = Array.isArray(steps) ? steps : [];
  const update = (index, patch) => onChange(list.map((item, current) => (current === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(list.filter((_, current) => current !== index));
  const add = () => onChange([...list, { name: '', minutes: 0, cost_per_hour: 0, is_setup: false }]);
  return (
    <div className="space-y-2">
      {list.map((item, index) => {
        const cost = (Number(item.minutes || 0) / 60) * Number(item.cost_per_hour || 0);
        return (
          <div key={index} className="grid grid-cols-12 items-center gap-2">
            <Input className="col-span-12 h-10 rounded-xl text-xs sm:col-span-4" value={item.name || ''} onChange={(event) => update(index, { name: event.target.value })} placeholder="Etapa (preparo/corte/acabamento)" />
            <Input className="col-span-4 h-10 rounded-xl text-xs sm:col-span-2" type="number" min="0" value={item.minutes} onChange={(event) => update(index, { minutes: event.target.value })} placeholder="min" />
            <Input className="col-span-4 h-10 rounded-xl text-xs sm:col-span-2" type="number" min="0" value={item.cost_per_hour} onChange={(event) => update(index, { cost_per_hour: event.target.value })} placeholder="R$/h" />
            <label className="col-span-4 flex items-center gap-1 text-[11px] font-bold text-slate-600 sm:col-span-2"><input type="checkbox" checked={!!item.is_setup} onChange={(event) => update(index, { is_setup: event.target.checked })} /> setup</label>
            <span className="col-span-9 truncate text-xs font-bold text-slate-700 sm:col-span-1">{money(cost)}</span>
            <button type="button" className="col-span-3 rounded-lg px-1.5 py-1 text-right text-xs font-bold text-red-700 hover:bg-red-50 sm:col-span-1" onClick={() => remove(index)}>remover</button>
          </div>
        );
      })}
      <button type="button" className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700" onClick={add}><Plus className="mr-1 inline h-3.5 w-3.5" /> Adicionar etapa de mao de obra</button>
    </div>
  );
}

function LineMachineOps({ ops, onChange }) {
  const list = Array.isArray(ops) ? ops : [];
  const update = (index, patch) => onChange(list.map((item, current) => (current === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(list.filter((_, current) => current !== index));
  const add = () => onChange([...list, { name: '', minutes: 0, cost_per_min: 0, length_m: 0, rate_per_m: 0, is_setup: false }]);
  return (
    <div className="space-y-2">
      {list.map((item, index) => {
        const cost = Number(item.minutes || 0) * Number(item.cost_per_min || 0) + Number(item.length_m || 0) * Number(item.rate_per_m || 0);
        return (
          <div key={index} className="grid grid-cols-12 items-center gap-2">
            <Input className="col-span-12 h-10 rounded-xl text-xs sm:col-span-3" value={item.name || ''} onChange={(event) => update(index, { name: event.target.value })} placeholder="Operacao (corte/gravacao/CNC)" />
            <Input className="col-span-4 h-10 rounded-xl text-xs sm:col-span-1" type="number" min="0" value={item.minutes} onChange={(event) => update(index, { minutes: event.target.value })} placeholder="min" />
            <Input className="col-span-4 h-10 rounded-xl text-xs sm:col-span-2" type="number" step="any" min="0" value={item.cost_per_min} onChange={(event) => update(index, { cost_per_min: event.target.value })} placeholder="R$/min" />
            <Input className="col-span-4 h-10 rounded-xl text-xs sm:col-span-1" type="number" step="any" min="0" value={item.length_m} onChange={(event) => update(index, { length_m: event.target.value })} placeholder="corte m" />
            <Input className="col-span-4 h-10 rounded-xl text-xs sm:col-span-2" type="number" step="any" min="0" value={item.rate_per_m} onChange={(event) => update(index, { rate_per_m: event.target.value })} placeholder="R$/m" />
            <label className="col-span-4 flex items-center gap-1 text-[11px] font-bold text-slate-600 sm:col-span-1"><input type="checkbox" checked={!!item.is_setup} onChange={(event) => update(index, { is_setup: event.target.checked })} /> setup</label>
            <span className="col-span-2 truncate text-xs font-bold text-slate-700 sm:col-span-1">{money(cost)}</span>
            <button type="button" className="col-span-2 rounded-lg px-1 py-1 text-right text-xs font-bold text-red-700 hover:bg-red-50 sm:col-span-1" onClick={() => remove(index)}>x</button>
          </div>
        );
      })}
      <button type="button" className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700" onClick={add}><Plus className="mr-1 inline h-3.5 w-3.5" /> Adicionar operacao de maquina</button>
    </div>
  );
}

function LineQtyTiers({ tiers, onChange }) {
  const list = Array.isArray(tiers) ? tiers : [];
  const update = (index, patch) => onChange(list.map((item, current) => (current === index ? { ...item, ...patch } : item)));
  const remove = (index) => onChange(list.filter((_, current) => current !== index));
  const add = () => onChange([...list, { min_qty: 1, unit_price: 0 }]);
  return (
    <div className="space-y-2">
      {list.map((item, index) => (
        <div key={index} className="grid grid-cols-12 items-center gap-2">
          <span className="col-span-3 text-xs font-bold text-slate-600 sm:col-span-2">A partir de</span>
          <Input className="col-span-3 h-10 rounded-xl text-xs sm:col-span-3" type="number" min="1" value={item.min_qty} onChange={(event) => update(index, { min_qty: event.target.value })} placeholder="qtd" />
          <span className="col-span-2 text-center text-xs text-slate-400 sm:col-span-1">un</span>
          <Input className="col-span-3 h-10 rounded-xl text-xs sm:col-span-4" type="number" step="any" min="0" value={item.unit_price} onChange={(event) => update(index, { unit_price: event.target.value })} placeholder="R$/un" />
          <button type="button" className="col-span-1 text-right text-xs font-bold text-red-700 hover:text-red-900 sm:col-span-2" onClick={() => remove(index)}>x</button>
        </div>
      ))}
      <button type="button" className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700" onClick={add}><Plus className="mr-1 inline h-3.5 w-3.5" /> Adicionar faixa de preco por quantidade</button>
    </div>
  );
}

export default function LineItemEditor({
  line,
  dimensionsRequired,
  machineProfiles = [],
  laborProfiles = [],
  serviceProfiles = [],
  products = [],
  onChange,
  onSave,
  saveLabel = 'Adicionar item',
}) {
  const areaM2 = dimensionsRequired ? calcAreaM2(line.width_mm, line.height_mm) : 0;
  const profit = Number(line.total || 0) - Number(line.total_cost || 0);
  const margin = Number(line.total || 0) > 0 ? (profit / Number(line.total || 1)) * 100 : 0;
  const minMargin = Number(line.min_margin_pct || 0);
  const belowCost = profit < 0;
  const lowMargin = !belowCost && minMargin > 0 && margin < minMargin;
  const missingMeasure = dimensionsRequired && (!Number(line.width_mm || 0) || !Number(line.height_mm || 0));
  const priceSourceLabel = line.price_source === 'client_price_rule' ? 'Preco do cliente'
    : line.price_source === 'volume_pricing' ? 'Preco por volume'
      : line.price_source === 'locked' ? 'Preco travado' : null;

  // Composicao granular do preco (o motor ja calcula cada parte; aqui so expomos).
  const breakdownRows = [
    ['Material', line.base_subtotal, line.material_cost],
    ['Maquina', line.machine_sale_total, line.machine_cost_total],
    ['Mao de obra', line.labor_sale_total, line.labor_cost_total],
    ['Setup', line.setup_sale_total, null],
    ['Arte / design', line.art_price, null],
    ['Servicos adicionais', line.additionals_total, null],
  ].filter((row) => Number(row[1] || 0) > 0);
  const discountApplied = Number(line.discount_applied || 0);
  const overheadCost = Number(line.overhead_cost_total || 0);

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

      <ConfigRow title="Materiais da peca" help="Materia-prima consumida do estoque, por unidade (com perda). Soma ao custo e ao preco.">
        <LineMaterials materials={line.materials} products={products} onChange={(next) => onChange('materials', next)} />
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

      <ConfigRow title="Etapas de mao de obra" help="Detalhe as etapas (preparo, corte, acabamento, montagem), cada uma com tempo e custo/hora. Marque 'setup' quando o tempo for fixo por peca (nao multiplica pela quantidade).">
        <LineLaborSteps steps={line.labor_steps} onChange={(next) => onChange('labor_steps', next)} />
      </ConfigRow>

      <ConfigRow title="Operacoes de maquina" help="Corte, gravacao ou CNC — cobra por minuto e/ou por comprimento de corte (m). Marque 'setup' para tempo fixo por peca.">
        <LineMachineOps ops={line.machine_ops} onChange={(next) => onChange('machine_ops', next)} />
      </ConfigRow>

      <ConfigRow title="Desconto do item" help="Percentual ou valor fixo em R$ so neste item.">
        <div className="grid grid-cols-2 gap-3">
          <Input className="h-12 rounded-2xl" type="number" min="0" max="100" value={line.discount_pct || 0} onChange={(event) => onChange('discount_pct', event.target.value)} placeholder="%" />
          <Input className="h-12 rounded-2xl" type="number" step="0.01" min="0" value={line.discount_value || 0} onChange={(event) => onChange('discount_value', event.target.value)} placeholder="R$" />
        </div>
      </ConfigRow>

      <ConfigRow title="Servicos adicionais" help="Itens extras cobrados junto (acabamento, montagem...).">
        <LineAdditionals additionals={line.additionals} onChange={(next) => onChange('additionals', next)} />
      </ConfigRow>

      <ConfigRow title="Faixas por quantidade" help="Preco unitario especial de atacado a partir de certa quantidade. A maior faixa atingida vence e sobrepoe o preco calculado.">
        <LineQtyTiers tiers={line.qty_tiers} onChange={(next) => onChange('qty_tiers', next)} />
      </ConfigRow>

      <ConfigRow title="Preco avancado" help="Margem-alvo so desta linha, imposto (repasse), arredondamento comercial e preco fechado negociado.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Margem-alvo (%) desta linha</label>
            <Input className="h-11 rounded-2xl" type="number" step="any" min="0" max="99" value={line.target_margin_override_pct || 0} onChange={(event) => onChange('target_margin_override_pct', event.target.value)} placeholder="usa a padrao" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Imposto (%) — repasse</label>
            <Input className="h-11 rounded-2xl" type="number" step="any" min="0" max="100" value={line.tax_pct || 0} onChange={(event) => onChange('tax_pct', event.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Arredondar preco para</label>
            <Select value={String(line.round_to || 0)} onValueChange={(value) => onChange('round_to', value)}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="Nao arredondar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Nao arredondar</SelectItem>
                <SelectItem value="0.05">R$ 0,05</SelectItem>
                <SelectItem value="0.1">R$ 0,10</SelectItem>
                <SelectItem value="0.5">R$ 0,50</SelectItem>
                <SelectItem value="1">R$ 1,00</SelectItem>
                <SelectItem value="5">R$ 5,00</SelectItem>
                <SelectItem value="10">R$ 10,00</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Modo de arredondamento</label>
            <Select value={line.round_mode || 'nearest'} onValueChange={(value) => onChange('round_mode', value)}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Mais proximo</SelectItem>
                <SelectItem value="up">Sempre para cima</SelectItem>
                <SelectItem value="down">Sempre para baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-bold text-slate-500">Preco fechado (R$/un) — negociado</label>
            <Input className="h-11 rounded-2xl" type="number" step="any" min="0" value={line.closed_unit_price || 0} onChange={(event) => onChange('closed_unit_price', event.target.value)} placeholder="deixe 0 para usar o calculo" />
            <p className="mt-1 text-[11px] text-slate-400">Quando preenchido, congela o preco da linha e recalcula a margem (ignora desconto e arredondamento).</p>
          </div>
        </div>
      </ConfigRow>

      <div className="mt-4 rounded-[24px] bg-slate-950 p-5 text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Composicao do preco</p>
        <div className="mt-3 space-y-1.5">
          {breakdownRows.map(([label, value, cost]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{label}</span>
              <span className="font-semibold text-white">
                {money(value)}
                {cost != null && Number(cost) > 0 && <span className="ml-2 text-[11px] font-normal text-slate-500">custo {money(cost)}</span>}
              </span>
            </div>
          ))}
          {overheadCost > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Overhead (custo indireto)</span>
              <span className="text-[11px] text-slate-500">custo {money(overheadCost)}</span>
            </div>
          )}
          {discountApplied > 0 && (
            <div className="flex items-center justify-between text-sm text-amber-300">
              <span>Desconto do item</span>
              <span className="font-semibold">- {money(discountApplied)}</span>
            </div>
          )}
          {Number(line.tax_value) > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Imposto ({Number(line.tax_pct || 0)}%) — repasse</span>
              <span className="font-semibold">+ {money(line.tax_value)}</span>
            </div>
          )}
          {Number(line.closed_unit_price) > 0 && (
            <div className="flex items-center justify-between text-sm text-blue-300">
              <span>Preco fechado (negociado)</span>
              <span className="font-semibold">{money(line.closed_unit_price)}/un</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Total do item</p>
            <p className="text-3xl font-black">{money(line.total)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {priceSourceLabel && <Pill tone="blue">{priceSourceLabel}</Pill>}
            <Pill tone="slate">Custo {money(line.total_cost)}</Pill>
            <Pill tone="slate">Lucro {money(Number(line.total || 0) - Number(line.total_cost || 0))}</Pill>
            <Pill tone={belowCost ? 'red' : lowMargin ? 'amber' : 'green'}>
              {belowCost || lowMargin ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Margem {margin.toFixed(1)}%{minMargin > 0 ? ` / min ${minMargin.toFixed(0)}%` : ''}
            </Pill>
          </div>
        </div>
        {lowMargin && (
          <p className="mt-3 text-xs font-bold text-amber-300">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            Abaixo da margem minima da categoria. Voce ainda pode adicionar, mas revise o preco.
          </p>
        )}
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
