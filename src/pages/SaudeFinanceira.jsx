import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import moment from 'moment';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#ef4444';
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Regular' : 'Crítico';
  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
        strokeDasharray={`${score / 100 * 251.2} 251.2`} />
      </svg>
      <div className="absolute bottom-0 text-center">
        <p className="text-[#00b806] text-4xl font-black">{score}</p>
        <p className="text-sm font-semibold" style={{ color }}>{label}</p>
      </div>
    </div>);

}

function IndicatorRow({ label, score, weight, description, status }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const bg = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="p-4 bg-white/5 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-slate-600 text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${color}`}>{score}/100</p>
          <p className="text-xs text-gray-500">Peso: {weight}%</p>
        </div>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${score}%` }} />
      </div>
    </div>);

}

export default function SaudeFinanceira() {
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => erp.entities.Transaction.list('-date', 500) });
  const { data: payables = [] } = useQuery({ queryKey: ['accountsPayable'], queryFn: () => erp.entities.AccountPayable.filter({ paid: false }) });
  const { data: receivables = [] } = useQuery({ queryKey: ['accountsReceivable'], queryFn: () => erp.entities.AccountReceivable.filter({ received: false }) });
  const { data: fixedExpenses = [] } = useQuery({ queryKey: ['fixedExpenses'], queryFn: () => erp.entities.FixedExpense.filter({ active: true }) });
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: () => erp.entities.Goal.list() });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => erp.entities.Client.list() });

  const scores = React.useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    const thisMonth = moment().format('YYYY-MM');

    const totalIn = transactions.filter((t) => t.type === 'entrada').reduce((a, t) => a + (t.amount || 0), 0);
    const totalOut = transactions.filter((t) => t.type === 'saida').reduce((a, t) => a + (t.amount || 0), 0);
    const saldo = totalIn - totalOut;

    const monthIn = transactions.filter((t) => t.type === 'entrada' && t.date?.startsWith(thisMonth)).reduce((a, t) => a + (t.amount || 0), 0);
    const monthOut = transactions.filter((t) => t.type === 'saida' && t.date?.startsWith(thisMonth)).reduce((a, t) => a + (t.amount || 0), 0);
    const monthFixed = fixedExpenses.reduce((a, e) => a + (e.amount || 0), 0);

    // 1. Liquidez (saldo positivo)
    const liquidez = saldo > 0 ? Math.min(100, saldo / (monthOut || 1) * 20) : 0;

    // 2. Margem (lucro / receita)
    const margem = totalIn > 0 ? Math.min(100, (totalIn - totalOut) / totalIn * 200) : 0;

    // 3. Pagamentos em dia
    const overduePayables = payables.filter((p) => p.due_date < today).length;
    const totalPayables = payables.length || 1;
    const pagamentos = Math.max(0, 100 - overduePayables / totalPayables * 100);

    // 4. Recebíveis (% recebidos)
    const overdueRec = receivables.filter((r) => r.due_date < today).length;
    const totalRec = receivables.length || 1;
    const recebimentos = Math.max(0, 100 - overdueRec / totalRec * 100);

    // 5. Metas
    const completedGoals = goals.filter((g) => g.completed).length;
    const totalGoals = goals.length || 1;
    const metasScore = completedGoals / totalGoals * 100;

    // 6. Inadimplência de clientes
    const inadimplentes = clients.filter((c) => c.status === 'inadimplente').length;
    const totalClients = clients.length || 1;
    const inadimplenciaScore = Math.max(0, 100 - inadimplentes / totalClients * 200);

    const weights = { liquidez: 25, margem: 25, pagamentos: 20, recebimentos: 15, metas: 10, inadimplencia: 5 };
    const totalScore = Math.round(
      (liquidez * weights.liquidez + margem * weights.margem + pagamentos * weights.pagamentos +
      recebimentos * weights.recebimentos + metasScore * weights.metas + inadimplenciaScore * weights.inadimplencia) / 100
    );

    return {
      total: Math.min(100, Math.max(0, totalScore)),
      liquidez: Math.min(100, Math.max(0, Math.round(liquidez))),
      margem: Math.min(100, Math.max(0, Math.round(margem))),
      pagamentos: Math.min(100, Math.max(0, Math.round(pagamentos))),
      recebimentos: Math.min(100, Math.max(0, Math.round(recebimentos))),
      metas: Math.min(100, Math.max(0, Math.round(metasScore))),
      inadimplencia: Math.min(100, Math.max(0, Math.round(inadimplenciaScore)))
    };
  }, [transactions, payables, receivables, fixedExpenses, goals, clients]);

  const radarData = [
  { subject: 'Liquidez', value: scores.liquidez },
  { subject: 'Margem', value: scores.margem },
  { subject: 'Pagamentos', value: scores.pagamentos },
  { subject: 'Recebimentos', value: scores.recebimentos },
  { subject: 'Metas', value: scores.metas },
  { subject: 'Inadimpl.', value: scores.inadimplencia }];


  const indicators = [
  { label: 'Liquidez', score: scores.liquidez, weight: 25, description: 'Capacidade de honrar compromissos de curto prazo' },
  { label: 'Margem de Lucro', score: scores.margem, weight: 25, description: 'Percentual de lucro sobre as receitas totais' },
  { label: 'Pagamentos em Dia', score: scores.pagamentos, weight: 20, description: 'Proporção de contas pagas dentro do prazo' },
  { label: 'Recebimentos', score: scores.recebimentos, weight: 15, description: 'Eficiência na cobrança de valores a receber' },
  { label: 'Metas Alcançadas', score: scores.metas, weight: 10, description: 'Percentual de metas concluídas' },
  { label: 'Base de Clientes', score: scores.inadimplencia, weight: 5, description: 'Saúde da carteira de clientes' }];


  const overallStatus = scores.total >= 80 ? { label: 'Empresa Saudável', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle } :
  scores.total >= 60 ? { label: 'Situação Estável', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: TrendingUp } :
  { label: 'Atenção Necessária', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle };

  const StatusIcon = overallStatus.icon;

  return (
    <div className="space-y-6">
      <Header title="Saúde Financeira" subtitle="Score e diagnóstico financeiro completo" />

      {/* Score principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="flex flex-col items-center justify-center py-6">
          <p className="text-gray-400 text-sm mb-4">Score de Saúde Financeira</p>
          <ScoreGauge score={scores.total} />
          <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-xl ${overallStatus.bg}`}>
            <StatusIcon className={`w-4 h-4 ${overallStatus.color}`} />
            <span className={`font-semibold text-sm ${overallStatus.color}`}>{overallStatus.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">Score calculado com base em 6 indicadores ponderados</p>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-slate-600 mb-4 font-semibold">Radar de Indicadores</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(v) => [`${v}/100`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.map((ind, i) =>
        <IndicatorRow key={i} {...ind} />
        )}
      </div>

      {/* Recommendations */}
      <GlassCard>
        <h3 className="text-slate-600 mb-4 font-semibold">Recomendações</h3>
        <div className="space-y-3">
          {scores.liquidez < 60 &&
          <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">Liquidez baixa — considere revisar despesas e aumentar a reserva de caixa.</p>
            </div>
          }
          {scores.margem < 50 &&
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-300">Margem de lucro baixa — revise sua precificação e reduza custos variáveis.</p>
            </div>
          }
          {scores.pagamentos < 70 &&
          <div className="flex items-start gap-3 p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-300">Muitos pagamentos em atraso — programe um fluxo de pagamentos regular.</p>
            </div>
          }
          {scores.recebimentos < 70 &&
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">Recebíveis em atraso — intensifique a cobrança de clientes inadimplentes.</p>
            </div>
          }
          {scores.total >= 80 &&
          <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-sm text-green-300">Excelente saúde financeira! Continue monitorando os indicadores regularmente.</p>
            </div>
          }
        </div>
      </GlassCard>
    </div>);

}