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
import { Plus, Trash2, Edit } from 'lucide-react';
import moment from 'moment';
import { toast } from '@/components/ui/app-toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency, parseDecimal, roundCurrency } from '@/lib/numberFormat';
import { PARTNERS } from '@/lib/financeConstants';

const CATEGORIES = [
  'fornecedores','aluguel','salarios','impostos','manutencao','materiais','energia','internet','agua','gas','contabilidade','marketing','software','outros'
];
const COST_CENTERS = ['producao','administrativo','comercial','geral'];
const PAYMENT_METHODS = ['pix','dinheiro','cartao_credito','boleto','transferencia','debito_automatico'];

const emptyForm = {
  description: '',
  supplier_name: '',
  amount: '',
  due_date: '',
  competence_date: moment().format('YYYY-MM-DD'),
  category: 'fornecedores',
  cost_center: 'geral',
  payment_method: 'pix',
  installments: 1,
  installment_number: 1,
  recurrent: false,
  notes: '',
};

export default function ContasPagar({ filterStatus = 'pending' }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState(filterStatus);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: payables = [] } = useQuery({
    queryKey: ['accountsPayable'],
    queryFn: () => erp.entities.AccountPayable.list('due_date'),
  });

  const createPayable = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, amount: roundCurrency(data.amount), installments: parseInt(data.installments) || 1 };
      return erp.entities.AccountPayable.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['accountsPayable']);
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Conta a pagar criada!');
    }
  });

  const updatePayable = useMutation({
    mutationFn: ({ id, data }) => erp.entities.AccountPayable.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accountsPayable']);
      setEditItem(null);
      toast.success('Atualizado!');
    }
  });

  const deletePayable = useMutation({
    mutationFn: async (payable) => {
      await createAuditLog({
        module: 'financeiro', entity_name: 'AccountPayable', entity_id: payable.id, action: 'delete',
        document_number: payable.description || payable.supplier_name || '',
        metadata: { amount: payable.amount, due_date: payable.due_date, category: payable.category, paid: payable.paid },
      });
      return erp.entities.AccountPayable.delete(payable.id);
    },
    onSuccess: () => { queryClient.invalidateQueries(['accountsPayable']); toast.success('Conta excluida'); },
    onError: (error) => toast.error(error.message || 'Nao foi possivel excluir'),
  });

  const markPaid = async (id, partner) => {
    const payable = payables.find((p) => p.id === id);
    if (!payable) return;
    const paidDate = moment().format('YYYY-MM-DD');
    const amount = roundCurrency(payable.amount);
    await erp.entities.AccountPayable.update(id, {
      paid: true,
      paid_date: paidDate,
      paid_by_partner: partner,
      amount_paid: amount,
    });
    await erp.entities.Transaction.create({
      type: 'saida',
      amount,
      description: payable.description || `Pagamento ${payable.supplier_name || ''}`.trim(),
      category: payable.category || 'fornecedores',
      payment_method: payable.payment_method || 'pix',
      date: paidDate,
      confirmed: true,
      payable_id: id,
      partner,
    });
    queryClient.invalidateQueries(['accountsPayable']);
    queryClient.invalidateQueries(['transactions']);
    queryClient.invalidateQueries(['transactions-dashboard']);
    toast.success(`Marcado como pago por ${partner}`);
  };

  const today = moment().format('YYYY-MM-DD');

  const filtered = useMemo(() => payables.filter(p => {
    const matchSearch = p.description?.toLowerCase().includes(search.toLowerCase()) || p.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'pending' && !p.paid) || (statusFilter === 'paid' && p.paid) || (statusFilter === 'overdue' && !p.paid && p.due_date < today);
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  }), [payables, search, statusFilter, categoryFilter, today]);

  const { totalPending, totalOverdue, totalPaidMonth } = useMemo(() => ({
    totalPending: payables.filter(p => !p.paid).reduce((s, p) => s + parseDecimal(p.amount), 0),
    totalOverdue: payables.filter(p => !p.paid && p.due_date < today).reduce((s, p) => s + parseDecimal(p.amount), 0),
    totalPaidMonth: payables.filter(p => p.paid && moment(p.paid_date).isSame(moment(), 'month')).reduce((s, p) => s + parseDecimal(p.amount), 0),
  }), [payables, today]);

  const fmt = formatCurrency;

  const openEdit = (p) => {
    setEditItem(p);
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pendente</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{fmt(totalPending)}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Vencido</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--red)' }}>{fmt(totalOverdue)}</p>
        </GlassCard>
        <GlassCard className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pago este m�s</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{fmt(totalPaidMonth)}</p>
        </GlassCard>
      </div>

      {/* Filtros + A��o */}
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
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="gradient-primary" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Conta
          </Button>
        </div>
      </GlassCard>

      {/* Tabela */}
      <GlassCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Descri��o</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Fornecedor</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Categoria</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>C. Custo</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Vencimento</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Status</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Pago por</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const overdue = !p.paid && p.due_date < today;
                const daysLeft = moment(p.due_date).diff(moment(), 'days');
                return (
                  <TableRow key={p.id} style={{ borderColor: 'var(--border)', background: overdue ? 'var(--red-muted)' : undefined }} className="hover:bg-[var(--surface-2)]">
                    <TableCell className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {p.description}
                      {p.installments > 1 && <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>({p.installment_number}/{p.installments})</span>}
                      {p.recurrent && <Badge className="ml-2 text-xs" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>Recorrente</Badge>}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{p.supplier_name || '-'}</TableCell>
                    <TableCell><Badge className="text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{p.category}</Badge></TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.cost_center || '-'}</TableCell>
                    <TableCell>
                      <div style={{ color: overdue ? 'var(--red)' : daysLeft <= 3 ? 'var(--yellow)' : 'var(--text-tertiary)' }}>
                        {moment(p.due_date).format('DD/MM/YYYY')}
                        {!p.paid && <div className="text-xs">{overdue ? `${Math.abs(daysLeft)}d atraso` : daysLeft === 0 ? 'Hoje' : `${daysLeft}d`}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold" style={{ color: p.paid ? 'var(--text-tertiary)' : 'var(--red)', textDecoration: p.paid ? 'line-through' : undefined }}>{fmt(p.amount)}</TableCell>
                    <TableCell>
                      <Badge style={p.paid ? { background: 'var(--green-muted)', color: 'var(--green)' } : overdue ? { background: 'var(--red-muted)', color: 'var(--red)' } : { background: 'var(--orange-muted)', color: 'var(--orange)' }}>
                        {p.paid ? 'Pago' : overdue ? 'Vencido' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{p.paid_by_partner || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!p.paid && (
                          <Select onValueChange={(partner) => markPaid(p.id, partner)}>
                            <SelectTrigger className="w-28 h-7 text-xs" style={{ background: 'var(--green-muted)', color: 'var(--green)' }}>
                              <SelectValue placeholder="Dar baixa" />
                            </SelectTrigger>
                            <SelectContent>
                              {PARTNERS.map(partner => <SelectItem key={partner} value={partner}>{partner}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Edit className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPendingDelete(p)}>
                          <Trash2 className="w-3 h-3" style={{ color: 'var(--red)' }} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Nenhuma conta encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl" style={{ background:'var(--bg)', boxShadow:'var(--shadow-xl)', borderRadius:'var(--r-2xl)', border:'1px solid var(--border)', color:'var(--text-primary)' }}>
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createPayable.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Descri��o *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="" required />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} className="" />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={form.cost_center} onValueChange={v => setForm({ ...form, cost_center: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_CENTERS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger className=""><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="" required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="" required />
              </div>
              <div className="space-y-2">
                <Label>Compet�ncia</Label>
                <Input type="date" value={form.competence_date} onChange={e => setForm({ ...form, competence_date: e.target.value })} className="" />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input type="number" min="1" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} className="" />
              </div>
              <div className="space-y-2">
                <Label>Parcela N�</Label>
                <Input type="number" min="1" value={form.installment_number} onChange={e => setForm({ ...form, installment_number: e.target.value })} className="" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Observa��es</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createPayable.isPending}>
                {createPayable.isPending ? 'Criando...' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-lg" style={{ background:'var(--bg)', boxShadow:'var(--shadow-xl)', borderRadius:'var(--r-2xl)', border:'1px solid var(--border)', color:'var(--text-primary)' }}>
            <DialogHeader>
              <DialogTitle>Editar: {editItem.description}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" defaultValue={editItem.amount}
                    onChange={e => setEditItem({ ...editItem, amount: Number(parseFloat(e.target.value || 0).toFixed(2)) })}
                    className="" />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input type="date" defaultValue={editItem.due_date}
                    onChange={e => setEditItem({ ...editItem, due_date: e.target.value })}
                    className="" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input defaultValue={editItem.notes} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} className="" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button onClick={() => updatePayable.mutate({ id: editItem.id, data: { amount: editItem.amount, due_date: editItem.due_date, notes: editItem.notes } })}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(value) => !value && setPendingDelete(null)}
        title="Excluir conta a pagar?"
        description={pendingDelete ? `${pendingDelete.description || pendingDelete.supplier_name || 'Conta'} - ${fmt(pendingDelete.amount)}. Fica registrada na auditoria e nao pode ser desfeita.` : ''}
        onConfirm={() => { deletePayable.mutate(pendingDelete); setPendingDelete(null); }}
      />
    </div>
  );
}
