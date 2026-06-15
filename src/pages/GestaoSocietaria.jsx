import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Plus, Percent,
  ArrowUpCircle, ArrowDownCircle, Landmark, Edit, Trash2
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const PARTNERS = ['Maeli', 'Wesley', 'Juliano'];
const COLORS = { Maeli: '#ec4899', Wesley: '#3b82f6', Juliano: '#f97316' };

const movTypes = [
  { value: 'aporte_capital', label: 'Aporte de Capital', dir: 'entrada', color: 'text-green-400', bg: 'bg-green-500/20' },
  { value: 'aporte_bem', label: 'Aporte em Bem/Equipamento', dir: 'entrada', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { value: 'retirada_pro_labore', label: 'Retirada Pró-Labore', dir: 'saida', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { value: 'retirada_dividendo', label: 'Distribuição de Dividendos', dir: 'saida', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { value: 'retirada_adiantamento', label: 'Adiantamento de Sócio', dir: 'saida', color: 'text-red-400', bg: 'bg-red-500/20' },
  { value: 'emprestimo_socio', label: 'Empréstimo do Sócio à Empresa', dir: 'entrada', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { value: 'devolucao_emprestimo', label: 'Devolução de Empréstimo', dir: 'saida', color: 'text-purple-400', bg: 'bg-purple-500/20' },
];

const payMethods = [
  'pix', 'transferencia', 'dinheiro', 'cheque', 'bem_imovel', 'bem_movel', 'equipamento'
];

const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtDate = d => d ? moment(d).format('DD/MM/YYYY') : '-';

function TypeBadge({ type }) {
  const t = movTypes.find(m => m.value === type);
  if (!t) return null;
  return <Badge className={`${t.bg} ${t.color} border-0 text-xs`}>{t.label}</Badge>;
}

export default function GestaoSocietaria() {
  const queryClient = useQueryClient();
  const [showContribForm, setShowContribForm] = useState(false);
  const [showEquityForm, setShowEquityForm] = useState(false);
  const [editingContrib, setEditingContrib] = useState(null);
  const [editingEquity, setEditingEquity] = useState(null);
  const [filterPartner, setFilterPartner] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const emptyContrib = {
    partner: 'Maeli', type: 'aporte_capital', amount: 0, date: moment().format('YYYY-MM-DD'),
    description: '', asset_description: '', document_ref: '', approved: false,
    payment_method: 'pix', notes: ''
  };
  const [contribForm, setContribForm] = useState(emptyContrib);

  const emptyEquity = {
    partner: 'Maeli', equity_percent: 0, initial_capital: 0,
    pro_labore_monthly: 0, role: '', entry_date: '', active: true
  };
  const [equityForm, setEquityForm] = useState(emptyEquity);

  const { data: contributions = [] } = useQuery({
    queryKey: ['partnerContributions'],
    queryFn: () => erp.entities.PartnerContribution.list('-date'),
  });

  const { data: equityRecords = [] } = useQuery({
    queryKey: ['partnerEquity'],
    queryFn: () => erp.entities.PartnerEquity.list('partner'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['companyAssets'],
    queryFn: () => erp.entities.CompanyAsset.list('name'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => erp.entities.Transaction.list('-date', 500),
  });

  const createContrib = useMutation({
    mutationFn: (d) => erp.entities.PartnerContribution.create(d),
    onSuccess: () => { queryClient.invalidateQueries(['partnerContributions']); setShowContribForm(false); setContribForm(emptyContrib); }
  });

  const updateContrib = useMutation({
    mutationFn: ({ id, data }) => erp.entities.PartnerContribution.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['partnerContributions']); setShowContribForm(false); setEditingContrib(null); }
  });

  const deleteContrib = useMutation({
    mutationFn: (id) => erp.entities.PartnerContribution.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['partnerContributions'])
  });

  const saveEquity = useMutation({
    mutationFn: (d) => editingEquity
      ? erp.entities.PartnerEquity.update(editingEquity.id, d)
      : erp.entities.PartnerEquity.create(d),
    onSuccess: () => { queryClient.invalidateQueries(['partnerEquity']); setShowEquityForm(false); setEditingEquity(null); setEquityForm(emptyEquity); }
  });

  const deleteEquity = useMutation({
    mutationFn: (id) => erp.entities.PartnerEquity.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['partnerEquity'])
  });

  // ─── Cálculos por sócio ─────────────────────────────────────────────────────
  const partnerStats = PARTNERS.map(partner => {
    const myContribs = contributions.filter(c => c.partner === partner);
    const aportesCapital = myContribs
      .filter(c => ['aporte_capital', 'aporte_bem', 'emprestimo_socio'].includes(c.type))
      .reduce((a, c) => a + (c.amount || 0), 0);
    const retiradas = myContribs
      .filter(c => ['retirada_pro_labore', 'retirada_dividendo', 'retirada_adiantamento', 'devolucao_emprestimo'].includes(c.type))
      .reduce((a, c) => a + (c.amount || 0), 0);
    const saldoLiquido = aportesCapital - retiradas;

    const equityInfo = equityRecords.find(e => e.partner === partner);
    const pct = equityInfo?.equity_percent || 0;

    // Pró-labore do mês atual vindo das transações
    const proLaboreMes = transactions
      .filter(t => t.partner === partner && t.type === 'saida' && t.category === 'salarios'
        && moment(t.date).isSame(moment(), 'month'))
      .reduce((a, t) => a + (t.amount || 0), 0);

    // Ativos registrados no patrimônio desse sócio
    const myAssets = assets.filter(a => a.responsible_partner === partner);
    const assetValue = myAssets.reduce((a, x) => a + (x.current_value || 0), 0);

    return {
      partner, aportesCapital, retiradas, saldoLiquido, pct,
      equityInfo, proLaboreMes, assetValue,
      totalPatrimonio: saldoLiquido + assetValue
    };
  });

  const totalCapital = partnerStats.reduce((a, s) => a + s.aportesCapital, 0);
  const totalRetiradas = partnerStats.reduce((a, s) => a + s.retiradas, 0);
  const totalEquity = partnerStats.reduce((a, s) => a + s.pct, 0);

  const pieData = partnerStats.map(s => ({ name: s.partner, value: s.aportesCapital }));

  // Histórico de aportes mensal (últimos 6 meses)
  const monthlyAportes = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, 'months');
      const mStr = m.format('YYYY-MM');
      const entry = { month: m.format('MMM/YY') };
      PARTNERS.forEach(p => {
        entry[p] = contributions
          .filter(c => c.partner === p && c.date?.startsWith(mStr)
            && ['aporte_capital', 'aporte_bem'].includes(c.type))
          .reduce((a, c) => a + (c.amount || 0), 0);
      });
      months.push(entry);
    }
    return months;
  }, [contributions]);

  // Filtros
  const filtered = contributions.filter(c => {
    if (filterPartner !== 'all' && c.partner !== filterPartner) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    return true;
  });

  const handleEditContrib = (c) => {
    setEditingContrib(c);
    setContribForm({ ...c });
    setShowContribForm(true);
  };

  const handleEditEquity = (e) => {
    setEditingEquity(e);
    setEquityForm({ ...e });
    setShowEquityForm(true);
  };

  const selectedType = movTypes.find(m => m.value === contribForm.type);

  return (
    <div className="space-y-6">
      <Header
        title="Gestão Societária"
        subtitle="Capital social, aportes, retiradas e patrimônio dos sócios"
      />

      {/* KPIs globais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/20"><ArrowUpCircle className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Aportado</p>
              <p className="text-base font-bold text-green-400">{fmt(totalCapital)}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.05}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20"><ArrowDownCircle className="w-5 h-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Retirado</p>
              <p className="text-base font-bold text-red-400">{fmt(totalRetiradas)}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20"><Landmark className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Saldo Líquido</p>
              <p className={`text-base font-bold ${(totalCapital - totalRetiradas) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {fmt(totalCapital - totalRetiradas)}
              </p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.15}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/20"><Percent className="w-5 h-5 text-pink-400" /></div>
            <div>
              <p className="text-xs text-gray-400">% Total Registrado</p>
              <p className={`text-base font-bold ${totalEquity === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                {totalEquity.toFixed(1)}%
              </p>
              {totalEquity !== 100 && <p className="text-[10px] text-yellow-500">Deve somar 100%</p>}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Cards por sócio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {partnerStats.map((s, i) => (
          <GlassCard key={s.partner} delay={i * 0.08}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ background: COLORS[s.partner] + '30', border: `2px solid ${COLORS[s.partner]}` }}>
                {s.partner[0]}
              </div>
              <div>
                <h3 className="text-white font-bold">{s.partner}</h3>
                <p className="text-xs text-gray-400">{s.equityInfo?.role || 'Sócio'}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-bold" style={{ color: COLORS[s.partner] }}>{s.pct.toFixed(1)}%</p>
                <p className="text-[10px] text-gray-500">participação</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                <span className="text-xs text-gray-400">Capital Integralizado</span>
                <span className="text-sm font-semibold text-green-400">{fmt(s.aportesCapital)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                <span className="text-xs text-gray-400">Total Retirado</span>
                <span className="text-sm font-semibold text-red-400">{fmt(s.retiradas)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                <span className="text-xs text-gray-400">Patrimônio em Ativos</span>
                <span className="text-sm font-semibold text-blue-400">{fmt(s.assetValue)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-white/5">
                <span className="text-xs text-gray-400">Pró-Labore (mês atual)</span>
                <span className="text-sm font-semibold text-orange-400">{fmt(s.proLaboreMes)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl mt-1"
                style={{ background: COLORS[s.partner] + '15', border: `1px solid ${COLORS[s.partner]}40` }}>
                <span className="text-xs font-bold text-white">Posição Líquida</span>
                <span className="text-base font-bold" style={{ color: COLORS[s.partner] }}>
                  {fmt(s.saldoLiquido)}
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <Tabs defaultValue="historico" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap">
          <TabsTrigger value="historico">Histórico de Movimentações</TabsTrigger>
          <TabsTrigger value="grafico">Gráficos</TabsTrigger>
          <TabsTrigger value="sociedade">Dados Societários</TabsTrigger>
        </TabsList>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          <GlassCard>
            <div className="flex flex-col md:flex-row gap-3 items-end justify-between">
              <div className="flex gap-3 flex-wrap">
                <Select value={filterPartner} onValueChange={setFilterPartner}>
                  <SelectTrigger className="w-36 bg-white/5 border-white/10"><SelectValue placeholder="Sócio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-52 bg-white/5 border-white/10"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {movTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setEditingContrib(null); setContribForm(emptyContrib); setShowContribForm(true); }}
                className="gradient-primary neon-glow">
                <Plus className="w-4 h-4 mr-2" /> Nova Movimentação
              </Button>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Data</TableHead>
                    <TableHead className="text-gray-400">Sócio</TableHead>
                    <TableHead className="text-gray-400">Tipo</TableHead>
                    <TableHead className="text-gray-400">Descrição</TableHead>
                    <TableHead className="text-gray-400">Valor</TableHead>
                    <TableHead className="text-gray-400">Forma</TableHead>
                    <TableHead className="text-gray-400">Aprovado</TableHead>
                    <TableHead className="text-gray-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-10">
                        Nenhuma movimentação registrada ainda.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(c => {
                    const t = movTypes.find(m => m.value === c.type);
                    const isEntrada = t?.dir === 'entrada';
                    return (
                      <TableRow key={c.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-gray-400 text-sm">{fmtDate(c.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: COLORS[c.partner] + '40', border: `1px solid ${COLORS[c.partner]}` }}>
                              {c.partner?.[0]}
                            </div>
                            <span className="text-white text-sm">{c.partner}</span>
                          </div>
                        </TableCell>
                        <TableCell><TypeBadge type={c.type} /></TableCell>
                        <TableCell className="text-gray-300 text-sm max-w-[160px] truncate">{c.description || '-'}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${isEntrada ? 'text-green-400' : 'text-red-400'}`}>
                            {isEntrada ? '+' : '-'} {fmt(c.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm capitalize">{c.payment_method?.replace(/_/g, ' ') || '-'}</TableCell>
                        <TableCell>
                          {c.approved
                            ? <Badge className="bg-green-500/20 text-green-400 border-0">Sim</Badge>
                            : <Badge className="bg-yellow-500/20 text-yellow-400 border-0">Pendente</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditContrib(c)}>
                              <Edit className="w-4 h-4 text-gray-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteContrib.mutate(c.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Tab: Gráficos */}
        <TabsContent value="grafico" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Distribuição de Capital Aportado</h3>
              <div className="flex items-center gap-4 h-[220px]">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {partnerStats.map(s => (
                    <div key={s.partner} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[s.partner] }} />
                      <div>
                        <p className="text-xs text-white font-medium">{s.partner}</p>
                        <p className="text-xs text-gray-400">{fmt(s.aportesCapital)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-white font-semibold mb-4">Aportes Mensais (6 meses)</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAportes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={v => fmt(v)} />
                    {PARTNERS.map(p => <Bar key={p} dataKey={p} fill={COLORS[p]} radius={[3, 3, 0, 0]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Comparativo aporte vs retirada por sócio */}
          <GlassCard>
            <h3 className="text-white font-semibold mb-4">Aporte vs Retirada por Sócio</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnerStats.map(s => ({ name: s.partner, Aportado: s.aportesCapital, Retirado: s.retiradas }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={v => fmt(v)} />
                  <Bar dataKey="Aportado" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Retirado" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Tab: Dados Societários */}
        <TabsContent value="sociedade" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingEquity(null); setEquityForm(emptyEquity); setShowEquityForm(true); }}
              className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" /> Cadastrar / Atualizar Sócio
            </Button>
          </div>
          <GlassCard>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Sócio</TableHead>
                    <TableHead className="text-gray-400">Participação</TableHead>
                    <TableHead className="text-gray-400">Capital Inicial</TableHead>
                    <TableHead className="text-gray-400">Pró-Labore Mensal</TableHead>
                    <TableHead className="text-gray-400">Cargo</TableHead>
                    <TableHead className="text-gray-400">Entrada</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equityRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-10">
                        Nenhum dado societário cadastrado. Clique em "Cadastrar Sócio".
                      </TableCell>
                    </TableRow>
                  )}
                  {equityRecords.map(e => (
                    <TableRow key={e.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: COLORS[e.partner] + '40', border: `1.5px solid ${COLORS[e.partner]}` }}>
                            {e.partner?.[0]}
                          </div>
                          <span className="text-white">{e.partner}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: COLORS[e.partner] }}>{e.equity_percent}%</span>
                      </TableCell>
                      <TableCell className="text-green-400">{fmt(e.initial_capital)}</TableCell>
                      <TableCell className="text-orange-400">{fmt(e.pro_labore_monthly)}</TableCell>
                      <TableCell className="text-gray-300">{e.role || '-'}</TableCell>
                      <TableCell className="text-gray-400">{fmtDate(e.entry_date)}</TableCell>
                      <TableCell>
                        <Badge className={e.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {e.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditEquity(e)}>
                            <Edit className="w-4 h-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteEquity.mutate(e.id)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {equityRecords.length > 0 && (
              <div className={`mt-3 p-3 rounded-xl ${Math.abs(totalEquity - 100) < 0.01 ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <p className={`text-sm font-medium ${Math.abs(totalEquity - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {Math.abs(totalEquity - 100) < 0.01
                    ? '✓ Participações somam 100% — quadro societário correto'
                    : `⚠ Participações somam ${totalEquity.toFixed(1)}% — deveria ser 100%`}
                </p>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Dialog: Nova/Editar Movimentação */}
      <Dialog open={showContribForm} onOpenChange={(o) => { setShowContribForm(o); if (!o) setEditingContrib(null); }}>
        <DialogContent className="glass border-pink-500/40 max-w-lg" style={{ boxShadow: '0 0 40px rgba(236,72,153,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingContrib ? 'Editar Movimentação' : 'Nova Movimentação Societária'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editingContrib ? updateContrib.mutate({ id: editingContrib.id, data: contribForm }) : createContrib.mutate(contribForm); }}
            className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sócio *</Label>
                <Select value={contribForm.partner} onValueChange={v => setContribForm({ ...contribForm, partner: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={contribForm.date} onChange={e => setContribForm({ ...contribForm, date: e.target.value })}
                  className="bg-white/5 border-white/10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Movimentação *</Label>
              <Select value={contribForm.type} onValueChange={v => setContribForm({ ...contribForm, type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {movTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className={t.color}>{t.dir === 'entrada' ? '↑' : '↓'}</span> {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className={`text-xs ${selectedType.color}`}>
                  {selectedType.dir === 'entrada' ? '↑ Entrada de recursos para a empresa' : '↓ Saída de recursos da empresa'}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={contribForm.amount}
                  onChange={e => setContribForm({ ...contribForm, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10" required />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={contribForm.payment_method} onValueChange={v => setContribForm({ ...contribForm, payment_method: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {payMethods.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição / Justificativa</Label>
              <Input value={contribForm.description}
                onChange={e => setContribForm({ ...contribForm, description: e.target.value })}
                className="bg-white/5 border-white/10" placeholder="Ex: Aporte inicial de capital conforme contrato..." />
            </div>
            {contribForm.type === 'aporte_bem' && (
              <div className="space-y-2">
                <Label>Descrição do Bem</Label>
                <Input value={contribForm.asset_description}
                  onChange={e => setContribForm({ ...contribForm, asset_description: e.target.value })}
                  className="bg-white/5 border-white/10" placeholder="Ex: Laser CO2 80W, NF 12345..." />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Documento / Ata</Label>
                <Input value={contribForm.document_ref}
                  onChange={e => setContribForm({ ...contribForm, document_ref: e.target.value })}
                  className="bg-white/5 border-white/10" placeholder="Ex: ATA-001/2025" />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <Switch checked={contribForm.approved} onCheckedChange={v => setContribForm({ ...contribForm, approved: v })} />
                  <Label className="cursor-pointer">Aprovado em assembleia</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={contribForm.notes}
                onChange={e => setContribForm({ ...contribForm, notes: e.target.value })}
                className="bg-white/5 border-white/10 h-20" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowContribForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">
                {editingContrib ? 'Salvar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Dados Societários */}
      <Dialog open={showEquityForm} onOpenChange={(o) => { setShowEquityForm(o); if (!o) setEditingEquity(null); }}>
        <DialogContent className="glass border-blue-500/40 max-w-md" style={{ boxShadow: '0 0 40px rgba(59,130,246,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingEquity ? 'Editar Dados Societários' : 'Cadastrar Sócio'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveEquity.mutate(equityForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sócio *</Label>
                <Select value={equityForm.partner} onValueChange={v => setEquityForm({ ...equityForm, partner: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Participação (%) *</Label>
                <Input type="number" step="0.01" min="0" max="100" value={equityForm.equity_percent}
                  onChange={e => setEquityForm({ ...equityForm, equity_percent: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capital Integralizado (R$)</Label>
                <Input type="number" step="0.01" value={equityForm.initial_capital}
                  onChange={e => setEquityForm({ ...equityForm, initial_capital: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Pró-Labore Mensal (R$)</Label>
                <Input type="number" step="0.01" value={equityForm.pro_labore_monthly}
                  onChange={e => setEquityForm({ ...equityForm, pro_labore_monthly: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cargo / Função</Label>
                <Input value={equityForm.role}
                  onChange={e => setEquityForm({ ...equityForm, role: e.target.value })}
                  className="bg-white/5 border-white/10" placeholder="Ex: Diretor Comercial" />
              </div>
              <div className="space-y-2">
                <Label>Data de Entrada</Label>
                <Input type="date" value={equityForm.entry_date}
                  onChange={e => setEquityForm({ ...equityForm, entry_date: e.target.value })}
                  className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <Switch checked={equityForm.active} onCheckedChange={v => setEquityForm({ ...equityForm, active: v })} />
              <Label>Sócio ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEquityForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">
                {editingEquity ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}