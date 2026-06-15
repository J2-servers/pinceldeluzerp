import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Plus, Trash2 } from 'lucide-react';
import moment from 'moment';

const RISK_LEVELS = {
  critico: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Crítico' },
  alto: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', label: 'Alto' },
  medio: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'Médio' },
  baixo: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'Baixo' },
};

const CATEGORIES = ['financeiro', 'operacional', 'comercial', 'juridico', 'tecnologia', 'pessoas', 'outros'];

export default function GestaoRiscos() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '', description: '', category: 'financeiro', level: 'medio',
    probability: 3, impact: 3, mitigation: '', status: 'identificado', deadline: ''
  });

  // Using Goals entity to store risks (type='risco')
  const { data: allGoals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => erp.entities.Goal.list() });
  const risks = allGoals.filter(g => g.type === 'risco' || g.title?.startsWith('[RISCO]'));

  const createMutation = useMutation({
    mutationFn: data => erp.entities.Goal.create({
      title: `[RISCO] ${data.title}`,
      type: 'risco',
      target_value: data.impact,
      current_value: data.probability,
      deadline: data.deadline,
      completed: data.status === 'mitigado',
      notes: JSON.stringify({ description: data.description, category: data.category, level: data.level, mitigation: data.mitigation, status: data.status })
    }),
    onSuccess: () => { queryClient.invalidateQueries(['goals']); setShowForm(false); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: id => erp.entities.Goal.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['goals'])
  });

  const resetForm = () => setFormData({ title: '', description: '', category: 'financeiro', level: 'medio', probability: 3, impact: 3, mitigation: '', status: 'identificado', deadline: '' });

  const parseRisk = (g) => {
    try {
      const notes = JSON.parse(g.notes || '{}');
      return { ...g, ...notes, probability: g.current_value || 3, impact: g.target_value || 3, title: g.title?.replace('[RISCO] ', '') };
    } catch { return { ...g, title: g.title?.replace('[RISCO] ', '') }; }
  };

  const parsedRisks = risks.map(parseRisk);
  const filtered = filter === 'all' ? parsedRisks : parsedRisks.filter(r => r.level === filter);

  const criticalCount = parsedRisks.filter(r => r.level === 'critico').length;
  const highCount = parsedRisks.filter(r => r.level === 'alto').length;
  const mitigatedCount = parsedRisks.filter(r => r.status === 'mitigado').length;

  // Risk matrix data
  const riskScore = r => ((r.probability || 3) * (r.impact || 3));

  return (
    <div className="space-y-6">
      <Header title="Gestão de Riscos" subtitle="Mapeamento e controle de riscos empresariais" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard delay={0}><p className="text-xs text-gray-400 mb-1">Total Riscos</p><p className="text-2xl font-bold text-white">{parsedRisks.length}</p></GlassCard>
        <GlassCard delay={0.1}><p className="text-xs text-gray-400 mb-1">Críticos/Altos</p><p className="text-2xl font-bold text-red-400">{criticalCount + highCount}</p></GlassCard>
        <GlassCard delay={0.2}><p className="text-xs text-gray-400 mb-1">Mitigados</p><p className="text-2xl font-bold text-green-400">{mitigatedCount}</p></GlassCard>
        <GlassCard delay={0.3}><p className="text-xs text-gray-400 mb-1">Em Monitoramento</p><p className="text-2xl font-bold text-blue-400">{parsedRisks.filter(r => r.status === 'monitorando').length}</p></GlassCard>
      </div>

      {/* Filter + Actions */}
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {['all', 'critico', 'alto', 'medio', 'baixo'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all capitalize ${filter === f ? 'gradient-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {f === 'all' ? 'Todos' : RISK_LEVELS[f]?.label}
              </button>
            ))}
          </div>
          <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }} className="gradient-primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />Novo Risco
          </Button>
        </div>
      </GlassCard>

      {/* Risk Matrix */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">Matriz de Riscos (Probabilidade × Impacto)</h3>
        <div className="grid grid-cols-5 gap-1 text-center text-xs">
          <div className="col-span-1" />
          {['1', '2', '3', '4', '5'].map(i => (
            <div key={i} className="py-1 text-gray-500">Prob {i}</div>
          ))}
          {['5', '4', '3', '2', '1'].map(impact => (
            <>
              <div key={`imp-${impact}`} className="py-1 text-gray-500 flex items-center justify-end pr-2">Imp {impact}</div>
              {['1', '2', '3', '4', '5'].map(prob => {
                const score = parseInt(prob) * parseInt(impact);
                const color = score >= 20 ? 'bg-red-500/30 border-red-500/40' : score >= 12 ? 'bg-orange-500/30 border-orange-500/40' : score >= 6 ? 'bg-yellow-500/30 border-yellow-500/40' : 'bg-green-500/30 border-green-500/40';
                const risksHere = parsedRisks.filter(r => r.probability === parseInt(prob) && r.impact === parseInt(impact));
                return (
                  <div key={`${prob}-${impact}`} className={`py-2 rounded border ${color} min-h-[36px] flex items-center justify-center`}>
                    {risksHere.length > 0 && <span className="text-white font-bold">{risksHere.length}</span>}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </GlassCard>

      {/* Risk List */}
      <div className="space-y-3">
        {filtered
          .sort((a, b) => riskScore(b) - riskScore(a))
          .map(risk => {
            const level = RISK_LEVELS[risk.level] || RISK_LEVELS.medio;
            const score = riskScore(risk);
            return (
              <div key={risk.id} className={`p-4 rounded-xl border ${level.border} ${level.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`${level.bg} ${level.color} border ${level.border}`}>{level.label}</Badge>
                      <Badge className="bg-white/10 text-gray-300 text-xs capitalize">{risk.category}</Badge>
                      <Badge className={`text-xs ${risk.status === 'mitigado' ? 'bg-green-500/20 text-green-400' : risk.status === 'monitorando' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {risk.status || 'identificado'}
                      </Badge>
                      <span className="text-xs text-gray-500">Score: {score}</span>
                    </div>
                    <p className="text-white font-semibold">{risk.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{risk.description}</p>
                    {risk.mitigation && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="text-green-400">Mitigação:</span> {risk.mitigation}
                      </p>
                    )}
                    {risk.deadline && (
                      <p className="text-xs text-gray-500 mt-1">Prazo: {moment(risk.deadline).format('DD/MM/YYYY')}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(risk.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        {filtered.length === 0 && (
          <GlassCard className="text-center py-10">
            <ShieldAlert className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum risco cadastrado</p>
          </GlassCard>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass border-white/10 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">Novo Risco</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RISK_LEVELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Probabilidade (1-5)</Label>
                <Input type="number" min={1} max={5} value={formData.probability} onChange={e => setFormData({ ...formData, probability: parseInt(e.target.value) || 1 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Impacto (1-5)</Label>
                <Input type="number" min={1} max={5} value={formData.impact} onChange={e => setFormData({ ...formData, impact: parseInt(e.target.value) || 1 })} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano de Mitigação</Label>
              <Input value={formData.mitigation} onChange={e => setFormData({ ...formData, mitigation: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identificado">Identificado</SelectItem>
                    <SelectItem value="monitorando">Monitorando</SelectItem>
                    <SelectItem value="mitigado">Mitigado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Cadastrar Risco</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}