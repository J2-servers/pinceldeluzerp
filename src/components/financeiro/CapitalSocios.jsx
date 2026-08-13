import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, TrendingUp, TrendingDown, PieChart, Wallet } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import CompanyCapitalList from '@/components/financeiro/CompanyCapitalList';
import moment from 'moment';
import { toast } from '@/components/ui/app-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency } from '@/lib/numberFormat';
import { PARTNERS } from '@/lib/financeConstants';

const PARTNER_COLORS = { Maeli: '#ec4899', Wesley: '#3b82f6', Juliano: '#f97316' };

const TYPE_LABELS = {
  aporte: { label: 'Aporte de Capital', style: { background: 'var(--green-muted)', color: 'var(--green)' }, signal: 1 },
  retirada: { label: 'Retirada', style: { background: 'var(--red-muted)', color: 'var(--red)' }, signal: -1 },
  pro_labore: { label: 'Pró-labore', style: { background: 'var(--orange-muted)', color: 'var(--orange)' }, signal: -1 },
  dividendo: { label: 'Dividendo', style: { background: 'var(--purple-muted)', color: 'var(--purple)' }, signal: -1 },
  emprestimo_socio: { label: 'Empréstimo do Sócio', style: { background: 'var(--accent-muted)', color: 'var(--accent)' }, signal: 1 },
  devolucao_emprestimo: { label: 'Devolução de Empréstimo', style: { background: 'var(--yellow-muted)', color: 'var(--yellow)' }, signal: -1 },
};

const CAPITAL_ASSET_CATEGORIES = ['maquinas', 'equipamentos'];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência Bancária' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bens', label: 'Integralização em Bens' },
  { value: 'equipamentos', label: 'Integralização em Equipamentos' },
];

const emptyForm = {
  partner: 'Maeli',
  type: 'aporte',
  amount: '',
  date: moment().format('YYYY-MM-DD'),
  description: '',
  payment_method: 'pix',
  asset_description: '',
  notes: '',
};

export default function CapitalSocios() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterPartner, setFilterPartner] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: movements = [] } = useQuery({
    queryKey: ['partnerCapital'],
    queryFn: () => erp.entities.PartnerCapital.list('-date'),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['companyAssets'],
    queryFn: () => erp.entities.CompanyAsset.list('name'),
  });

  const createMovement = useMutation({
    mutationFn: (data) => erp.entities.PartnerCapital.create({ ...data, amount: Number(parseFloat(data.amount || 0).toFixed(2)) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerCapital']);
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Movimentação registrada!');
    }
  });

  const deleteMovement = useMutation({
    mutationFn: async (movement) => {
      // Retirada/aporte de socio apagado sem rastro era o maior risco financeiro.
      await createAuditLog({
        module: 'financeiro', entity_name: 'PartnerCapital', entity_id: movement.id, action: 'delete',
        document_number: `${movement.partner || ''} - ${TYPE_LABELS[movement.type]?.label || movement.type}`,
        metadata: { partner: movement.partner, type: movement.type, amount: movement.amount, date: movement.date },
      });
      return erp.entities.PartnerCapital.delete(movement.id);
    },
    onSuccess: () => { queryClient.invalidateQueries(['partnerCapital']); toast.success('Movimentacao excluida'); },
    onError: (error) => toast.error(error.message || 'Nao foi possivel excluir'),
  });

  // Calcular saldo de cada sócio, separando CAPITAL PROPRIO (equity) de EMPRESTIMO (dívida).
  const partnerBalances = PARTNERS.map(partner => {
    const moves = movements.filter(m => m.partner === partner);
    const capitalIn = moves.filter(m => m.type === 'aporte').reduce((a, m) => a + (m.amount || 0), 0);
    const loanIn = moves.filter(m => m.type === 'emprestimo_socio').reduce((a, m) => a + (m.amount || 0), 0);
    const loanOut = moves.filter(m => m.type === 'devolucao_emprestimo').reduce((a, m) => a + (m.amount || 0), 0);
    const withdrawals = moves.filter(m => ['retirada', 'pro_labore', 'dividendo'].includes(m.type)).reduce((a, m) => a + (m.amount || 0), 0);
    // Maquinários/equipamentos aportados contam como capital próprio.
    const assetsValue = assets.filter(a => a.responsible_partner === partner && CAPITAL_ASSET_CATEGORIES.includes(a.category)).reduce((s, a) => s + (a.current_value || a.purchase_value || 0), 0);
    // Participação societária é capital próprio: aporte em dinheiro + equipamento − retiradas.
    // Empréstimo do sócio é dívida da empresa e NÃO entra na participação.
    const equity = capitalIn + assetsValue - withdrawals; // capital próprio p/ % (inclui equipamento)
    const loanBalance = loanIn - loanOut; // o que a empresa ainda deve ao sócio
    const aportes = capitalIn + loanIn; // exibição compat (dinheiro que entrou)
    const saidas = withdrawals + loanOut;
    const saldo = capitalIn - withdrawals + loanBalance; // posição em dinheiro (equipamento é mostrado à parte)
    return { partner, aportes, saidas, saldo, assetsValue, equity, loanBalance, capitalIn };
  });

  const totalCapital = partnerBalances.reduce((s, p) => s + p.saldo, 0);
  const totalEquity = partnerBalances.reduce((s, p) => s + p.equity, 0);

  // % de participação usa o capital próprio (equity), com equipamento incluído.
  const pieData = partnerBalances.filter(p => p.equity > 0).map(p => ({
    name: p.partner,
    value: p.equity,
    percent: totalEquity > 0 ? ((p.equity / totalEquity) * 100).toFixed(1) : 0
  }));

  // Historico mensal de aportes
  const monthlyData = {};
  movements.filter(m => m.type === 'aporte').forEach(m => {
    const key = moment(m.date).format('MMM/YY');
    if (!monthlyData[key]) monthlyData[key] = { month: key, Maeli: 0, Wesley: 0, Juliano: 0 };
    monthlyData[key][m.partner] = (monthlyData[key][m.partner] || 0) + m.amount;
  });
  const barData = Object.values(monthlyData).slice(-6);

  const filteredMovements = filterPartner === 'all' ? movements : movements.filter(m => m.partner === filterPartner);

  const fmt = formatCurrency;

  return (
    <div className="space-y-6">
      {/* Cards por sócio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {partnerBalances.map(p => (
          <GlassCard key={p.partner} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-6 translate-x-6 opacity-10"
              style={{ background: PARTNER_COLORS[p.partner] }} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ background: PARTNER_COLORS[p.partner] + '33', border: `2px solid ${PARTNER_COLORS[p.partner]}`, color: 'var(--text-primary)' }}>
                {p.partner[0]}
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.partner}</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sócio</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Aportado</span>
                <span className="font-medium" style={{ color: 'var(--green)' }}>{fmt(p.aportes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Retiradas/Pró-labore</span>
                <span className="font-medium" style={{ color: 'var(--red)' }}>{fmt(p.saidas)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Saldo Líquido</span>
                <span className="font-bold text-lg" style={{ color: p.saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(p.saldo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Maquinários de aporte</span>
                <span className="text-xs" style={{ color: 'var(--accent)' }}>{fmt(p.assetsValue)}</span>
              </div>
              {totalCapital > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-tertiary)' }}>Participação</span>
                    <span style={{ color: 'var(--text-primary)' }}>{totalCapital > 0 ? ((p.saldo / totalCapital) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ boxShadow: 'var(--shadow-pressed)' }}>
                    <div className="h-2 rounded-full transition-all" style={{
                      width: `${totalCapital > 0 ? (p.saldo / totalCapital) * 100 : 0}%`,
                      background: PARTNER_COLORS[p.partner]
                    }} />
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <PieChart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Participação Societária
          </h4>
          {totalCapital > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${percent}%`} labelLine={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PARTNER_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>Nenhum aporte registrado</p>
          )}
        </GlassCard>

        <GlassCard>
          <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--green)' }} />
            Aportes por Mês
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              {PARTNERS.map(p => <Bar key={p} dataKey={p} fill={PARTNER_COLORS[p]} radius={[3,3,0,0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <CompanyCapitalList
        movements={movements}
        assets={assets}
        typeLabels={TYPE_LABELS}
        partnerColors={PARTNER_COLORS}
        paymentMethods={PAYMENT_METHODS}
        fmt={fmt}
      />

      {/* Tabela de movimentações */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wallet className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Histórico de Movimentações
          </h4>
          <div className="flex gap-3 items-center">
            <Select value={filterPartner} onValueChange={setFilterPartner}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sócio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os sócios</SelectItem>
                {PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowForm(true)} className="gradient-primary" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Registrar
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Data</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Sócio</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Tipo</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Forma</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Descrição</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map(m => {
                const typeInfo = TYPE_LABELS[m.type] || {};
                return (
                  <TableRow key={m.id} style={{ borderColor: 'var(--border)' }} className="hover:bg-[var(--surface-2)]">
                    <TableCell style={{ color: 'var(--text-tertiary)' }}>{moment(m.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>
                      <span className="font-medium" style={{ color: PARTNER_COLORS[m.partner] }}>{m.partner}</span>
                    </TableCell>
                    <TableCell>
                      <Badge style={typeInfo.style || { background: 'var(--surface-2)', color: 'var(--text-tertiary)' }}>{typeInfo.label || m.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.payment_method?.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-primary)' }}>{m.description || m.asset_description || '-'}</TableCell>
                    <TableCell className="font-bold" style={{ color: typeInfo.signal === 1 ? 'var(--green)' : 'var(--red)' }}>
                      {typeInfo.signal === 1 ? '+' : '-'} {fmt(m.amount)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setPendingDelete(m)}>
                        <TrendingDown className="w-3 h-3" style={{ color: 'var(--red)' }} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMovements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Nenhuma movimentação encontrada</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Dialog de registro */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg" style={{ background:'var(--bg)', boxShadow:'var(--shadow-xl)', borderRadius:'var(--r-2xl)', border:'1px solid var(--border)', color:'var(--text-primary)' }}>
          <DialogHeader>
            <DialogTitle>Registrar Movimentação Societária</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMovement.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sócio</Label>
                <Select value={form.partner} onValueChange={v => setForm({ ...form, partner: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="" required />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de Integralização</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className=""><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(form.payment_method === 'bens' || form.payment_method === 'equipamentos') && (
              <div className="space-y-2">
                <Label>Descrição do Bem / Equipamento</Label>
                <Input value={form.asset_description}
                  onChange={e => setForm({ ...form, asset_description: e.target.value })}
                  className=""
                  placeholder="Ex: Máquina CNC modelo X, valor avaliado..." />
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição / Justificativa</Label>
              <Input value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className=""
                placeholder="Detalhes da movimentação..." />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMovement.isPending}>
                {createMovement.isPending ? 'Salvando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(value) => !value && setPendingDelete(null)}
        title="Excluir movimentacao de capital?"
        description={pendingDelete ? `${pendingDelete.partner} - ${TYPE_LABELS[pendingDelete.type]?.label || pendingDelete.type} de ${fmt(pendingDelete.amount)}. Fica registrada na auditoria e nao pode ser desfeita.` : ''}
        onConfirm={() => { deleteMovement.mutate(pendingDelete); setPendingDelete(null); }}
      />
    </div>
  );
}