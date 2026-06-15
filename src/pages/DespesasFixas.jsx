import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import KPICard from '@/components/ui/KPICard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, DollarSign, Calendar, CheckCircle } from 'lucide-react';

const categories = [
  'aluguel', 'energia', 'agua', 'internet', 'telefone', 'software',
  'contador', 'seguro', 'manutencao', 'marketing', 'combustivel', 'limpeza', 'outros'
];

const paymentMethods = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'debito_automatico', label: 'Débito Automático' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

export default function DespesasFixas() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    due_day: 1,
    category: 'outros',
    payment_method: 'boleto',
    active: true
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['fixedExpenses'],
    queryFn: () => erp.entities.FixedExpense.list('due_day'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => erp.entities.FixedExpense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fixedExpenses']);
      setShowForm(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => erp.entities.FixedExpense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fixedExpenses']);
      setShowForm(false);
      setSelectedExpense(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => erp.entities.FixedExpense.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['fixedExpenses'])
  });

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      due_day: 1,
      category: 'outros',
      payment_method: 'boleto',
      active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedExpense) {
      updateMutation.mutate({ id: selectedExpense.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      name: expense.name || '',
      amount: expense.amount || 0,
      due_day: expense.due_day || 1,
      category: expense.category || 'outros',
      payment_method: expense.payment_method || 'boleto',
      active: expense.active !== false
    });
    setShowForm(true);
  };

  const toggleActive = async (expense) => {
    await updateMutation.mutateAsync({ 
      id: expense.id, 
      data: { active: !expense.active } 
    });
  };

  // KPIs
  const activeExpenses = expenses.filter(e => e.active);
  const totalMensal = activeExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalAnual = totalMensal * 12;

  return (
    <div className="space-y-6">
      <Header title="Despesas Fixas" subtitle="Gerencie suas despesas recorrentes" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          title="Total Mensal" 
          value={`R$ ${totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={DollarSign} 
          color="red" 
          delay={0} 
        />
        <KPICard 
          title="Total Anual" 
          value={`R$ ${totalAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={Calendar} 
          color="orange" 
          delay={0.1} 
        />
        <KPICard 
          title="Ativas / Total" 
          value={`${activeExpenses.length} / ${expenses.length}`} 
          icon={CheckCircle} 
          color="green" 
          delay={0.2} 
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setSelectedExpense(null); setShowForm(true); }} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Expenses Table */}
      <GlassCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-gray-400">Nome</TableHead>
                <TableHead className="text-gray-400">Categoria</TableHead>
                <TableHead className="text-gray-400">Valor</TableHead>
                <TableHead className="text-gray-400">Vencimento</TableHead>
                <TableHead className="text-gray-400">Forma Pgto</TableHead>
                <TableHead className="text-gray-400">Ativa</TableHead>
                <TableHead className="text-gray-400 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} className={`border-white/10 hover:bg-white/5 ${!expense.active ? 'opacity-50' : ''}`}>
                  <TableCell className="font-medium text-white">{expense.name}</TableCell>
                  <TableCell className="text-gray-400 capitalize">{expense.category}</TableCell>
                  <TableCell className="text-red-400 font-medium">
                    R$ {(expense.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-gray-400">Dia {expense.due_day}</TableCell>
                  <TableCell className="text-gray-400">
                    {expense.payment_method?.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={expense.active !== false}
                      onCheckedChange={() => toggleActive(expense)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(expense.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass border-pink-500/40 max-w-md" style={{boxShadow:'0 0 40px rgba(236,72,153,0.15)'}}>
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedExpense ? 'Editar Despesa' : 'Nova Despesa Fixa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Despesa ativa</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">
                {selectedExpense ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}