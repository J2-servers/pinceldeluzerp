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
import { Plus, Trash2 } from 'lucide-react';
import moment from 'moment';
import { toast } from '@/components/ui/app-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency, parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { PARTNERS } from '@/lib/financeConstants';

const CATEGORIES = ['vendas', 'servicos', 'aluguel', 'comissao', 'outros'];
const PAYMENT_METHODS = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'crediario'];

const emptyForm = {
  description: '',
  client_name: '',
  amount: '',
  due_date: '',
  competence_date: moment().format('YYYY-MM-DD'),
  category: 'vendas',
  payment_method: 'pix',
  installments: 1,
  installment_number: 1,
  notes: '',
};

export default function ContasReceber() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: receivables = [] } = useQuery({
    queryKey: ['accountsReceivable'],
    queryFn: () => erp.entities.AccountReceivable.list('due_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'list', 'name'],
    queryFn: () => erp.entities.Client.list('name'),
  });

  const createReceivable = useMutation({
    mutationFn: (data) => erp.entities.AccountReceivable.create({ ...data, amount: roundCurrency(data.amount), installments: parseInt(data.installments) || 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries(['accountsReceivable']);
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Conta a receber criada!');
    }
  });

  const updateReceivable = useMutation({
    mutationFn: ({ id, data }) => erp.entities.AccountReceivable.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accountsReceivable']);
      toast.success('Atualizado!');
    }
  });

  const deleteReceivable = useMutation({
    mutationFn: async (receivable) => {
      await createAuditLog({
        module: 'financeiro', entity_name: 'AccountReceivable', entity_id: receivable.id, action: 'delete',
        document_number: receivable.description || receivable.client_name || '',
        metadata: { amount: receivable.amount, due_date: receivable.due_date, received: receivable.received },
      });
      return erp.entities.AccountReceivable.delete(receivable.id);
    },
    onSuccess: () => { queryClient.invalidateQueries(['accountsReceivable']); toast.success('Conta excluida'); },
    onError: (error) => toast.error(error.message || 'Nao foi possivel excluir'),
  });

  const markReceived = async (id, partner) => {
    const receivable = receivables.find((r) => r.id === id);
    if (!receivable) return;
    const receivedDate = moment().format('YYYY-MM-DD');
    const amount = roundCurrency(receivable.amount);
    await erp.entities.AccountReceivable.update(id, {
      received: true,
      received_date: receivedDate,
      received_by_partner: partner,
      amount_received: amount,
    });
    await erp.entities.Transaction.create({
      type: 'entrada',
      amount,
      description: receivable.description || `Recebimento ${receivable.client_name || ''}`.trim(),
      category: receivable.category || 'vendas',
      payment_method: receivable.payment_method || 'pix',
      date: receivedDate,
      confirmed: true,
      receivable_id: id,
      partner,
    });
    queryClient.invalidateQueries(['accountsReceivable']);
    queryClient.invalidateQueries(['transactions']);
    queryClient.invalidateQueries(['transactions-dashboard']);
    toast.success(`Recebimento confirmado por ${partner}`);
  };

  const today = moment().format('YYYY-MM-DD');

  const filtered = useMemo(() => receivables.filter(r => {
    const matchSearch = r.description?.toLowerCase().includes(search.toLowerCase()) || r.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'pending' && !r.received)
      || (statusFilter === 'received' && r.received)
      || (statusFilter === 'overdue' && !r.received && r.due_date < today);
    return matchSearch && matchStatus;
  }), [receivables, search, statusFilter, today]);

  const { totalPending, totalOverdue, totalReceivedMonth } = useMemo(() => ({
    totalPending: receivables.filter(r => !r.received).reduce((s, r) => s + parseDecimal(r.amount), 0),
    totalOverdue: receivables.filter(r => !r.received && r.due_date < today).reduce((s, r) => s + parseDecimal(r.amount), 0),
    totalReceivedMonth: receivables.filter(r => r.received && moment(r.received_date).isSame(moment(), 'month')).reduce((s, r) => s + parseDecimal(r.amount), 0),
  }), [receivables, today]);

  const fmt = formatCurrency;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>A Receber</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{fmt(totalPending)}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Vencido</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--red)' }}>{fmt(totalOverdue)}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Recebido este mês</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{fmt(totalReceivedMonth)}</p>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="received">Recebidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="gradient-primary" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Conta
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Descrição</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Cliente</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Categoria</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Vencimento</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Status</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Recebido por</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const overdue = !r.received && r.due_date < today;
                const daysLeft = moment(r.due_date).diff(moment(), 'days');
                return (
                  <TableRow key={r.id} style={{ borderColor: 'var(--border)', background: overdue ? 'var(--red-muted)' : undefined }} className="hover:bg-[var(--surface-2)]">
                    <TableCell className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {r.description}
                      {r.installments > 1 && <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>({r.installment_number}/{r.installments})</span>}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{r.client_name || '-'}</TableCell>
                    <TableCell><Badge className="text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{r.category}</Badge></TableCell>
                    <TableCell>
                      <div style={{ color: overdue ? 'var(--red)' : daysLeft <= 3 ? 'var(--yellow)' : 'var(--text-tertiary)' }}>
                        {moment(r.due_date).format('DD/MM/YYYY')}
                        {!r.received && <div className="text-xs">{overdue ? `${Math.abs(daysLeft)}d atraso` : daysLeft === 0 ? 'Hoje' : `${daysLeft}d`}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold" style={{ color: r.received ? 'var(--text-tertiary)' : 'var(--green)', textDecoration: r.received ? 'line-through' : undefined }}>{fmt(r.amount)}</TableCell>
                    <TableCell>
                      <Badge style={r.received ? { background: 'var(--green-muted)', color: 'var(--green)' } : overdue ? { background: 'var(--red-muted)', color: 'var(--red)' } : { background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {r.received ? 'Recebido' : overdue ? 'Vencido' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{r.received_by_partner || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!r.received && (
                          <Select onValueChange={(partner) => markReceived(r.id, partner)}>
                            <SelectTrigger className="w-28 h-7 text-xs" style={{ background: 'var(--green-muted)', color: 'var(--green)' }}>
                              <SelectValue placeholder="Confirmar" />
                            </SelectTrigger>
                            <SelectContent>
                              {PARTNERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPendingDelete(r)}>
                          <Trash2 className="w-3 h-3" style={{ color: 'var(--red)' }} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Nenhuma conta encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl" style={{ background:'var(--bg)', boxShadow:'var(--shadow-xl)', borderRadius:'var(--r-2xl)', border:'1px solid var(--border)', color:'var(--text-primary)' }}>
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createReceivable.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Descrição *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="" required />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                  list="clients-list" className="" />
                <datalist id="clients-list">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Recebimento</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="" required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="" required />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input type="number" min="1" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} className="" />
              </div>
              <div className="space-y-2">
                <Label>Parcela Nº</Label>
                <Input type="number" min="1" value={form.installment_number} onChange={e => setForm({ ...form, installment_number: e.target.value })} className="" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createReceivable.isPending}>
                {createReceivable.isPending ? 'Criando...' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(value) => !value && setPendingDelete(null)}
        title="Excluir conta a receber?"
        description={pendingDelete ? `${pendingDelete.description || pendingDelete.client_name || 'Conta'} - ${fmt(pendingDelete.amount)}. Fica registrada na auditoria e nao pode ser desfeita.` : ''}
        onConfirm={() => { deleteReceivable.mutate(pendingDelete); setPendingDelete(null); }}
      />
    </div>
  );
}
