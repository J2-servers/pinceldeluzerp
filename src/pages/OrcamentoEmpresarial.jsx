import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from
'recharts';
import { Plus, Target, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import moment from 'moment';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const CATEGORIES = [
{ value: 'receitas', label: 'Receitas', color: 'text-green-400' },
{ value: 'vendas', label: 'Vendas', color: 'text-emerald-400' },
{ value: 'servicos', label: 'Serviços', color: 'text-teal-400' },
{ value: 'materiais', label: 'Materiais', color: 'text-orange-400' },
{ value: 'salarios', label: 'Salários', color: 'text-red-400' },
{ value: 'aluguel', label: 'Aluguel', color: 'text-red-300' },
{ value: 'marketing', label: 'Marketing', color: 'text-purple-400' },
{ value: 'outros', label: 'Outros', color: 'text-gray-400' }];


export default function OrcamentoEmpresarial() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(moment().year());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ category: 'receitas', month: '1', planned_amount: 0, description: '', year: moment().year() });

  const { data: budgets = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => erp.entities.Goal.list()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => erp.entities.Transaction.list('-date', 500)
  });

  // Budget items stored as Goals with type='orcamento'
  const budgetItems = budgets.filter((g) => g.type === 'orcamento' || g.title?.startsWith('[ORC]'));

  // Real data by category and month
  const getRealValue = (category, month) => {
    const isRevenue = ['receitas', 'vendas', 'servicos'].includes(category);
    return transactions.
    filter((t) => {
      const tMonth = moment(t.date).month() + 1;
      const tYear = moment(t.date).year();
      const matchCat = t.category === category || category === 'receitas' && t.type === 'entrada';
      return tYear === year && tMonth === parseInt(month) && matchCat;
    }).
    reduce((a, t) => a + (t.amount || 0), 0);
  };

  // Monthly comparison chart
  const chartData = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const mStr = moment().year(year).month(i).format('MMM');
      const planned = budgetItems.
      filter((b) => parseInt(b.current_value || 0) === m).
      reduce((a, b) => a + (b.target_value || 0), 0);
      const real = transactions.
      filter((t) => moment(t.date).year() === year && moment(t.date).month() + 1 === m && t.type === 'entrada').
      reduce((a, t) => a + (t.amount || 0), 0);
      return { month: mStr, Orçado: planned, Realizado: real, variacao: real - planned };
    });
  }, [budgetItems, transactions, year]);

  const totalPlanned = budgetItems.reduce((a, b) => a + (b.target_value || 0), 0);
  const totalRealized = transactions.filter((t) => moment(t.date).year() === year && t.type === 'entrada').reduce((a, t) => a + (t.amount || 0), 0);
  const variacao = totalRealized - totalPlanned;

  const createMutation = useMutation({
    mutationFn: (data) => erp.entities.Goal.create({ title: `[ORC] ${data.category} - Mês ${data.month}`, type: 'orcamento', target_value: data.planned_amount, current_value: data.month }),
    onSuccess: () => {queryClient.invalidateQueries(['goals']);setShowForm(false);}
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => erp.entities.Goal.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['goals'])
  });

  return (
    <div className="space-y-6">
      <Header title="Orçamento Empresarial" subtitle="Planejamento vs Realizado" />

      {/* Controls */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Ano:</span>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="bg-white/5 border-white/10 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[moment().year(), moment().year() - 1].map((y) =>
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowForm(true)} className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />Meta de Orçamento
          </Button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard delay={0}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Target className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Orçado</p>
              <p className="text-lg font-bold text-blue-400">{fmt(totalPlanned)}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Realizado</p>
              <p className="text-lg font-bold text-green-400">{fmt(totalRealized)}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.2}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${variacao >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {variacao >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <p className="text-xs text-gray-400">Variação</p>
              <p className={`text-lg font-bold ${variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {variacao >= 0 ? '+' : ''}{fmt(variacao)}
              </p>
              <p className="text-xs text-gray-500">{totalPlanned > 0 ? (variacao / totalPlanned * 100).toFixed(1) : 0}% do orçado</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Chart */}
      <GlassCard>
        <h3 className="text-slate-600 mb-4 font-semibold">Orçado vs Realizado por Mês</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(v) => fmt(v)} />
              <Bar dataKey="Orçado" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.7} />
              <Bar dataKey="Realizado" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Budget Items Table */}
      <GlassCard>
        <h3 className="text-slate-600 mb-4 font-semibold">Itens do Orçamento</h3>
        <div className="space-y-3">
          {budgetItems.map((item) => {
            const monthNum = item.current_value || 1;
            const planned = item.target_value || 0;
            const real = getRealValue('receitas', monthNum);
            const progress = planned > 0 ? Math.min(100, real / planned * 100) : 0;
            const monthName = moment().month(monthNum - 1).format('MMMM');
            return (
              <div key={item.id} className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">{item.title?.replace('[ORC] ', '')}</p>
                    <p className="text-xs text-gray-400">Mês: {monthName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Orçado / Realizado</p>
                      <p className="text-sm">
                        <span className="text-blue-400">{fmt(planned)}</span>
                        <span className="text-gray-500"> / </span>
                        <span className={real >= planned ? 'text-green-400' : 'text-yellow-400'}>{fmt(real)}</span>
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="flex-1 h-1.5 bg-white/10" />
                  <span className={`text-xs font-medium w-12 text-right ${progress >= 100 ? 'text-green-400' : progress >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </div>);

          })}
          {budgetItems.length === 0 &&
          <p className="text-gray-400 text-center py-8">Nenhum item orçado. Crie metas de orçamento.</p>
          }
        </div>
      </GlassCard>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Nova Meta de Orçamento</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {e.preventDefault();createMutation.mutate(formData);}} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={String(formData.month)} onValueChange={(v) => setFormData({ ...formData, month: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) =>
                    <SelectItem key={i + 1} value={String(i + 1)}>{moment().month(i).format('MMMM')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Orçado (R$)</Label>
                <Input type="number" step="0.01" value={formData.planned_amount}
                onChange={(e) => setFormData({ ...formData, planned_amount: parseFloat(e.target.value) || 0 })}
                className="bg-white/5 border-white/10" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>);

}