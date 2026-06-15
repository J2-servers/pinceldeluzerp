import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import KPICard from '@/components/ui/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Zap, TrendingUp, CheckCircle, Award } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const fmt = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const PARTNERS = ['Maeli', 'Wesley', 'Juliano'];
const PARTNER_COLORS = { Maeli: '#ec4899', Wesley: '#3b82f6', Juliano: '#f97316' };

export default function Produtividade() {
  const [period, setPeriod] = useState('month');

  const { data: serviceOrders = [] } = useQuery({ queryKey: ['serviceOrders'], queryFn: () => erp.entities.ServiceOrder.list('-created_date', 200) });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 200) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ['timeEntries'], queryFn: () => erp.entities.TimeEntry.list('-date', 200) });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => erp.entities.Quote.list('-created_date', 200) });

  const filterByPeriod = items => {
    const now = moment();
    return items.filter(item => {
      const date = moment(item.created_date || item.date || item.started_at);
      if (period === 'week') return date.isSame(now, 'week');
      if (period === 'month') return date.isSame(now, 'month');
      if (period === 'quarter') return date.isSame(now, 'quarter');
      return true;
    });
  };

  const filteredOS = filterByPeriod(serviceOrders);
  const filteredOrders = filterByPeriod(salesOrders);
  const filteredQuotes = filterByPeriod(quotes);

  // SLA Analysis
  const osConc = filteredOS.filter(o => o.status === 'concluida');
  const osWithSLA = osConc.filter(o => o.started_at && o.completed_at);
  const avgCompletionTime = osWithSLA.length > 0
    ? osWithSLA.reduce((a, o) => a + moment(o.completed_at).diff(moment(o.started_at), 'hours'), 0) / osWithSLA.length
    : 0;

  const onTime = osConc.filter(o => !o.deadline || !o.completed_at || o.completed_at <= o.deadline + 'T23:59:59').length;
  const slaRate = osConc.length > 0 ? (onTime / osConc.length) * 100 : 0;

  // Conversion rate (quotes to orders)
  const approvedQuotes = filteredQuotes.filter(q => q.status === 'aprovado').length;
  const convRate = filteredQuotes.length > 0 ? (approvedQuotes / filteredQuotes.length) * 100 : 0;

  // Revenue per order
  const avgOrderValue = filteredOrders.length > 0
    ? filteredOrders.reduce((a, o) => a + (o.total || 0), 0) / filteredOrders.length
    : 0;

  // Weekly OS trend
  const weeklyData = React.useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const w = moment().subtract(7 - i, 'weeks');
      const wStart = w.clone().startOf('week').format('YYYY-MM-DD');
      const wEnd = w.clone().endOf('week').format('YYYY-MM-DD');
      const completed = serviceOrders.filter(o => o.completed_at >= wStart && o.completed_at <= wEnd).length;
      const created = serviceOrders.filter(o => (o.created_date || '').startsWith(wStart.slice(0, 7))).length;
      return { week: w.format('DD/MM'), Concluídas: completed, Criadas: created };
    });
  }, [serviceOrders]);

  // Partner productivity (by OS concluded)
  const partnerStats = PARTNERS.map(p => {
    const myOS = filteredOS.filter(o => (o.client_name || '').includes(p) || (o.created_by || '').includes(p));
    const concluded = myOS.filter(o => o.status === 'concluida').length;
    return { partner: p, concluded, total: myOS.length };
  });

  return (
    <div className="space-y-6">
      <Header title="Relatório de Produtividade" subtitle="Eficiência operacional e desempenho" />

      {/* Period filter */}
      <GlassCard>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Período:</span>
          {['week', 'month', 'quarter'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${period === p ? 'gradient-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Trimestre'}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="OS Concluídas" value={osConc.length} icon={CheckCircle} color="green" delay={0} />
        <KPICard title="Pedidos Emitidos" value={filteredOrders.length} icon={TrendingUp} color="blue" delay={0.1} />
        <KPICard title="Orçamentos" value={filteredQuotes.length} icon={Zap} color="purple" delay={0.2} />
        <KPICard title="Conversão" value={`${convRate.toFixed(1)}%`} icon={Award} color="pink" delay={0.3} />
        <KPICard title="Tempo Médio OS" value={`${avgCompletionTime.toFixed(1)}h`} icon={Clock} color="orange" delay={0.4} />
        <KPICard title="SLA no Prazo" value={`${slaRate.toFixed(1)}%`} icon={CheckCircle} color={slaRate >= 80 ? 'green' : 'red'} delay={0.5} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="text-white font-semibold mb-4">OS por Semana</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="Criadas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Concluídas" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-white font-semibold mb-4">Indicadores de Performance</h3>
          <div className="space-y-4">
            {[
              { label: 'Taxa de Conclusão de OS', value: filteredOS.length > 0 ? (osConc.length / filteredOS.length) * 100 : 0, color: 'bg-green-500' },
              { label: 'Taxa de Conversão (Orç → Pedido)', value: convRate, color: 'bg-blue-500' },
              { label: 'SLA no Prazo', value: slaRate, color: 'bg-pink-500' },
              { label: 'Pedidos com Pagamento Confirmado', value: filteredOrders.length > 0 ? (filteredOrders.filter(o => o.payment_status === 'pago').length / filteredOrders.length) * 100 : 0, color: 'bg-purple-500' },
            ].map((ind, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{ind.label}</span>
                  <span className={`font-medium ${ind.value >= 70 ? 'text-green-400' : ind.value >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{ind.value.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${ind.color}`} style={{ width: `${Math.min(100, ind.value)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Status breakdown */}
      <GlassCard>
        <h3 className="text-white font-semibold mb-4">Status das Ordens de Serviço</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['aguardando', 'em_andamento', 'pausada', 'concluida', 'cancelada'].map(status => {
            const count = filteredOS.filter(o => o.status === status).length;
            const pct = filteredOS.length > 0 ? (count / filteredOS.length) * 100 : 0;
            const colors = { aguardando: 'text-yellow-400 bg-yellow-500/20', em_andamento: 'text-blue-400 bg-blue-500/20', pausada: 'text-orange-400 bg-orange-500/20', concluida: 'text-green-400 bg-green-500/20', cancelada: 'text-red-400 bg-red-500/20' };
            return (
              <div key={status} className={`p-4 rounded-xl ${colors[status].split(' ')[1]} text-center`}>
                <p className={`text-2xl font-bold ${colors[status].split(' ')[0]}`}>{count}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{status.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-500">{pct.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}