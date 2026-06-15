// Melhoria #18 — Gestão de comissões por vendedor/sócio com relatório
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
import { Plus, Check } from 'lucide-react';
import moment from 'moment';

export default function GestaoComissoes() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    seller_name: 'Maeli',
    order_id: '',
    order_total: 0,
    commission_percent: 5,
    commission_value: 0,
  });

  const { data: comissoes = [] } = useQuery({
    queryKey: ['sellerCommissions'],
    queryFn: () => erp.entities.SellerCommission.list('-created_date'),
  });

  const create = useMutation({
    mutationFn: (data) => erp.entities.SellerCommission.create({
      ...data,
      commission_value: (data.order_total * data.commission_percent) / 100,
    }),
    onSuccess: () => { qc.invalidateQueries(['sellerCommissions']); setShowForm(false); },
  });

  const markPaid = useMutation({
    mutationFn: (id) => erp.entities.SellerCommission.update(id, { paid: true, paid_date: moment().format('YYYY-MM-DD') }),
    onSuccess: () => qc.invalidateQueries(['sellerCommissions']),
  });

  const totalPendente = comissoes.filter(c => !c.paid).reduce((a, c) => a + (c.commission_value || 0), 0);
  const totalPago = comissoes.filter(c => c.paid).reduce((a, c) => a + (c.commission_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover={false} className="py-3">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Comissões</p>
          <p className="text-xl font-bold" style={{ color: 'var(--red)' }}>R$ {(totalPendente + totalPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </GlassCard>
        <GlassCard hover={false} className="py-3">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pendentes</p>
          <p className="text-xl font-bold" style={{ color: 'var(--orange)' }}>R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </GlassCard>
        <GlassCard hover={false} className="py-3">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pagas</p>
          <p className="text-xl font-bold" style={{ color: 'var(--green)' }}>R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </GlassCard>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" /> Nova Comissão
        </Button>
      </div>
      <GlassCard hover={false}>
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: 'var(--border)' }}>
              <TableHead style={{ color: 'var(--text-tertiary)' }}>Vendedor</TableHead>
              <TableHead style={{ color: 'var(--text-tertiary)' }}>Pedido</TableHead>
              <TableHead style={{ color: 'var(--text-tertiary)' }}>Total Pedido</TableHead>
              <TableHead style={{ color: 'var(--text-tertiary)' }}>%</TableHead>
              <TableHead style={{ color: 'var(--text-tertiary)' }}>Comissão</TableHead>
              <TableHead style={{ color: 'var(--text-tertiary)' }}>Status</TableHead>
              <TableHead className="text-right" style={{ color: 'var(--text-tertiary)' }}>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.map(c => (
              <TableRow key={c.id} style={{ borderColor: 'var(--border)' }} className="hover:bg-[var(--surface-2)]">
                <TableCell className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.seller_name}</TableCell>
                <TableCell style={{ color: 'var(--text-tertiary)' }}>{c.order_id || '-'}</TableCell>
                <TableCell style={{ color: 'var(--text-tertiary)' }}>R$ {(c.order_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell style={{ color: 'var(--text-tertiary)' }}>{c.commission_percent}%</TableCell>
                <TableCell className="font-bold" style={{ color: 'var(--red)' }}>R$ {(c.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Badge style={c.paid ? { background: 'var(--green-muted)', color: 'var(--green)' } : { background: 'var(--orange-muted)', color: 'var(--orange)' }}>
                    {c.paid ? `Pago ${moment(c.paid_date).format('DD/MM')}` : 'Pendente'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {!c.paid && (
                    <Button size="sm" variant="ghost" onClick={() => markPaid.mutate(c.id)}>
                      <Check className="w-4 h-4" style={{ color: 'var(--green)' }} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <DialogHeader><DialogTitle style={{ color: 'var(--text-primary)' }}>Nova Comissão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Vendedor/Sócio</Label>
              <Select value={form.seller_name} onValueChange={v => setForm({ ...form, seller_name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Maeli', 'Wesley', 'Juliano'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Total do Pedido (R$)</Label>
                <Input type="number" value={form.order_total} onChange={e => setForm({ ...form, order_total: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label>Percentual (%)</Label>
                <Input type="number" value={form.commission_percent} onChange={e => setForm({ ...form, commission_percent: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--red-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Comissão calculada</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--red)' }}>
                R$ {((form.order_total * form.commission_percent) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="gradient-primary" onClick={() => create.mutate(form)}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}