import React, { useMemo, useState } from 'react';
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
import { Plus, Search, Download, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import moment from 'moment';
import { toast } from '@/components/ui/app-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { downloadCsv } from '@/lib/downloadUtils';
import { createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency } from '@/lib/numberFormat';
import { PARTNERS } from '@/lib/financeConstants';

const CATEGORIES = [
{ value: 'vendas', label: 'Vendas' },
{ value: 'servicos', label: 'Serviços' },
{ value: 'aluguel', label: 'Aluguel' },
{ value: 'salarios', label: 'Salários' },
{ value: 'fornecedores', label: 'Fornecedores' },
{ value: 'impostos', label: 'Impostos' },
{ value: 'manutencao', label: 'Manutenção' },
{ value: 'materiais', label: 'Materiais' },
{ value: 'outros', label: 'Outros' }];


const PAYMENT_METHODS = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'parcelado', 'boleto', 'crediario', 'transferencia'];

const emptyForm = {
  type: 'entrada', amount: '', description: '', category: 'vendas',
  payment_method: 'pix', date: moment().format('YYYY-MM-DD'), partner: 'Maeli', confirmed: true
};

export default function MovimentacoesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'list', '-date'],
    queryFn: () => erp.entities.Transaction.list('-date')
  });

  const create = useMutation({
    mutationFn: (data) => erp.entities.Transaction.create({ ...data, amount: Number(parseFloat(data.amount || 0).toFixed(2)) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Transação registrada!');
    }
  });

  const remove = useMutation({
    mutationFn: async (transaction) => {
      // Trilha de auditoria antes de apagar: quem, o que e quanto (com 3 socios
      // no mesmo caixa, exclusao sem rastro era o maior risco silencioso).
      await createAuditLog({
        module: 'financeiro', entity_name: 'Transaction', entity_id: transaction.id, action: 'delete',
        document_number: transaction.description || '',
        metadata: { type: transaction.type, amount: transaction.amount, category: transaction.category, date: transaction.date, partner: transaction.partner },
      });
      return erp.entities.Transaction.delete(transaction.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transactions'] }); toast.success('Lancamento excluido'); },
    onError: (error) => toast.error(error.message || 'Nao foi possivel excluir'),
  });

  const today = moment().format('YYYY-MM-DD');
  // `today` nao e lido dentro do callback (que usa moment() direto), mas forca
  // o recalculo quando o dia civil muda — sem isso o filtro de periodo
  // ("hoje"/"mes"/etc.) fica preso no dia em que a pagina foi aberta.
  const filtered = useMemo(() => transactions.filter((t) => {
    const matchSearch = t.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    const matchPartner = partnerFilter === 'all' || t.partner === partnerFilter;
    let matchPeriod = true;
    if (periodFilter === 'today') matchPeriod = moment(t.date).isSame(moment(), 'day');else
    if (periodFilter === 'month') matchPeriod = moment(t.date).isSame(moment(), 'month');else
    if (periodFilter === 'last30') matchPeriod = moment(t.date).isAfter(moment().subtract(30, 'days'));else
    if (periodFilter === 'year') matchPeriod = moment(t.date).isSame(moment(), 'year');
    return matchSearch && matchType && matchCat && matchPartner && matchPeriod;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [transactions, search, typeFilter, categoryFilter, partnerFilter, periodFilter, today]);

  const { totalEntradas, totalSaidas, saldo } = useMemo(() => {
    const entradas = filtered.filter((t) => t.type === 'entrada').reduce((s, t) => s + (t.amount || 0), 0);
    const saidas = filtered.filter((t) => t.type === 'saida').reduce((s, t) => s + (t.amount || 0), 0);
    return { totalEntradas: entradas, totalSaidas: saidas, saldo: entradas - saidas };
  }, [filtered]);

  // Por sócio
  const bySocio = useMemo(() => PARTNERS.map((p) => ({
    partner: p,
    entradas: filtered.filter((t) => t.type === 'entrada' && t.partner === p).reduce((s, t) => s + (t.amount || 0), 0),
    saidas: filtered.filter((t) => t.type === 'saida' && t.partner === p).reduce((s, t) => s + (t.amount || 0), 0)
  })), [filtered]);

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Pagamento', 'Sócio', 'Valor'];
    const rows = filtered.map((t) => [
    moment(t.date).format('DD/MM/YYYY'), t.type, t.description, t.category, t.payment_method, t.partner, t.amount]
    );
    downloadCsv([headers, ...rows], `movimentacoes-${moment().format('YYYY-MM')}.csv`);
  };

  const fmt = formatCurrency;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--green)' }} />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Entradas</p>
          <p className="font-bold" style={{ color: 'var(--green)' }}>{fmt(totalEntradas)}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <TrendingDown className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--red)' }} />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saídas</p>
          <p className="font-bold" style={{ color: 'var(--red)' }}>{fmt(totalSaidas)}</p>
        </GlassCard>
        <GlassCard className="text-center col-span-2">
          <Wallet className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saldo do Período</p>
          <p className="font-bold text-xl" style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(saldo)}</p>
        </GlassCard>
      </div>

      {/* Por sócio */}
      <div className="grid grid-cols-3 gap-3">
        {bySocio.map((s) =>
        <GlassCard key={s.partner} className="p-3">
            <p className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.partner}</p>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--green)' }}>+ {fmt(s.entradas)}</span>
              <span style={{ color: 'var(--red)' }}>- {fmt(s.saidas)}</span>
            </div>
            <p className="text-xs font-bold mt-1" style={{ color: s.entradas - s.saidas >= 0 ? 'var(--accent)' : 'var(--orange)' }}>
              Saldo: {fmt(s.entradas - s.saidas)}
            </p>
          </GlassCard>
        )}
      </div>

      {/* Filtros */}
      <GlassCard>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-48" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tipo</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categoria</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Sócio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sócio</SelectItem>
                {PARTNERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="last30">Últimos 30d</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button onClick={() => {setForm(emptyForm);setShowForm(true);}} className="gradient-primary" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Transação
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Tabela */}
      <GlassCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Data</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Tipo</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Descrição</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Categoria</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Pagamento</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Sócio</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) =>
              <TableRow key={t.id} style={{ borderColor: 'var(--border)' }} className="hover:bg-[var(--surface-2)]">
                  <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{moment(t.date).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <Badge style={t.type === 'entrada' ? { background: 'var(--green-muted)', color: 'var(--green)' } : { background: 'var(--red-muted)', color: 'var(--red)' }}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell style={{ color: 'var(--text-primary)' }}>{t.description}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t.category?.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.payment_method?.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t.partner || '-'}</TableCell>
                  <TableCell className="font-bold" style={{ color: t.type === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
                    {t.type === 'entrada' ? '+' : '-'} {fmt(t.amount)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPendingDelete(t)}>
                      <Trash2 className="w-3 h-3" style={{ color: 'var(--red)' }} />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {filtered.length === 0 &&
              <TableRow><TableCell colSpan={8} className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Nenhuma transação encontrada</TableCell></TableRow>
              }
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {e.preventDefault();create.mutate(form);}} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="" required />
              </div>
              <div className="space-y-2">
                <Label>Sócio Responsável</Label>
                <Select value={form.partner} onValueChange={(v) => setForm({ ...form, partner: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Salvando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(value) => !value && setPendingDelete(null)}
        title="Excluir lancamento?"
        description={pendingDelete ? `${pendingDelete.description || 'Lancamento'} - ${fmt(pendingDelete.amount)}. Esta acao fica registrada na auditoria e nao pode ser desfeita.` : ''}
        onConfirm={() => { remove.mutate(pendingDelete); setPendingDelete(null); }}
      />
    </div>);

}
