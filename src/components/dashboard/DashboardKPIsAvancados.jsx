import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Percent, Tag, RefreshCw, Target, Activity, BarChart2, CheckCircle, Users, Cpu, AlertOctagon } from 'lucide-react';

// Mapeia cor lógica → CSS var semântica do design system
const COLOR_VAR = {
  pink:   '--red',
  green:  '--green',
  blue:   '--accent',
  orange: '--orange',
  purple: '--purple',
  red:    '--red',
  yellow: '--yellow',
};

function AdvKPI({ title, value, subtitle, icon: Icon, color = 'pink', delay = 0 }) {
  const cssVar = COLOR_VAR[color] || '--accent';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="kpi-card flex items-center gap-3"
      whileHover={{ y: -2 }}
    >
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: 40, height: 40, borderRadius: 'var(--r-md)',
          background: `var(${cssVar}-muted)`,
          boxShadow: 'var(--shadow-flat)',
        }}
      >
        <Icon className="w-5 h-5" style={{ color: `var(${cssVar})` }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{title}</p>
        <p className="text-lg font-extrabold truncate" style={{ color: `var(${cssVar})` }}>{value}</p>
        {subtitle && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
      </div>
    </motion.div>
  );
}

export default function DashboardKPIsAvancados({
  transactions = [],
  salesOrders = [],
  quotes = [],
  serviceOrders = [],
  products = [],
  machineCosts = [],
  goals = [],
}) {
  // #1 - ROI por máquina (simplificado: receita média por OS em andamento vs custo)
  const receitaTotal = transactions.filter(t => t.type === 'entrada').reduce((a, t) => a + (t.amount || 0), 0);
  const custoMaquinas = machineCosts.reduce((a, m) => a + ((m.total_cost_minute || 0) * 60 * 8 * 22), 0);
  const roiMaquina = custoMaquinas > 0 ? ((receitaTotal - custoMaquinas) / custoMaquinas * 100).toFixed(1) : 'N/A';

  // #2 - Tempo médio de produção (horas estimadas das OS concluídas)
  const osConcluidas = serviceOrders.filter(o => o.status === 'concluida');
  const tempoMedioProducao = osConcluidas.length > 0
    ? (osConcluidas.reduce((a, o) => a + (o.estimated_hours || 0), 0) / osConcluidas.length).toFixed(1)
    : 0;

  // #3 - Taxa de conversão orçamento → pedido
  const orcamentosAprovados = quotes.filter(q => q.status === 'aprovado').length;
  const totalOrcamentos = quotes.length;
  const taxaConversao = totalOrcamentos > 0 ? ((orcamentosAprovados / totalOrcamentos) * 100).toFixed(1) : 0;

  // #4 - Ticket médio
  const ticketMedio = salesOrders.length > 0
    ? (salesOrders.reduce((a, o) => a + (o.total || 0), 0) / salesOrders.length).toFixed(2)
    : 0;

  // #5 - Giro de estoque (vendas / estoque médio simplificado)
  const totalVendasProdutos = salesOrders.reduce((a, o) => a + (o.total || 0), 0);
  const totalEstoqueValor = products.reduce((a, p) => a + ((p.quantity || 0) * (p.cost_price || 0)), 0);
  const giroEstoque = totalEstoqueValor > 0 ? (totalVendasProdutos / totalEstoqueValor).toFixed(2) : 'N/A';

  // #8 - Custo operacional/hora (média das máquinas * 60)
  const custoHoraMedio = machineCosts.length > 0
    ? (machineCosts.reduce((a, m) => a + ((m.total_cost_minute || 0) * 60), 0) / machineCosts.length).toFixed(2)
    : 0;

  // #11 - % pedidos entregues no prazo
  const pedidosEntregues = salesOrders.filter(o => o.status === 'entregue');
  const pedidosNoPrazo = pedidosEntregues.filter(o => {
    if (!o.delivery_date || !o.created_date) return true;
    return o.delivery_date >= o.created_date;
  }).length;
  const taxaPrazo = pedidosEntregues.length > 0
    ? ((pedidosNoPrazo / pedidosEntregues.length) * 100).toFixed(1)
    : 100;

  // #13 - Receita por sócio
  const receitaMaeli = transactions.filter(t => t.type === 'entrada' && t.partner === 'Maeli').reduce((a, t) => a + (t.amount || 0), 0);
  const receitaWesley = transactions.filter(t => t.type === 'entrada' && t.partner === 'Wesley').reduce((a, t) => a + (t.amount || 0), 0);
  const receitaJuliano = transactions.filter(t => t.type === 'entrada' && t.partner === 'Juliano').reduce((a, t) => a + (t.amount || 0), 0);

  // #15 - Índice de inadimplência
  const totalVendas = salesOrders.reduce((a, o) => a + (o.total || 0), 0);
  const totalPendente = salesOrders.filter(o => o.payment_status === 'pendente').reduce((a, o) => a + (o.total || 0), 0);
  const indiceInadimplencia = totalVendas > 0 ? ((totalPendente / totalVendas) * 100).toFixed(1) : 0;

  // #7 - Metas com progresso
  const metasAtivas = goals.filter(g => !g.completed).length;
  const metasConcluidas = goals.filter(g => g.completed).length;

  // #12 - Margem contribuição média
  const margemMedia = products.length > 0
    ? (products.reduce((a, p) => {
        const margem = p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price * 100) : 0;
        return a + margem;
      }, 0) / products.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-tertiary)' }}>KPIs Avançados</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <AdvKPI title="ROI Máquinas" value={roiMaquina === 'N/A' ? 'N/A' : `${roiMaquina}%`} icon={Cpu} color="purple" delay={0} subtitle="Receita vs custo máq." />
        <AdvKPI title="Tempo Médio Prod." value={`${tempoMedioProducao}h`} icon={Clock} color="blue" delay={0.05} subtitle="Por OS concluída" />
        <AdvKPI title="Conversão Orç." value={`${taxaConversao}%`} icon={Percent} color="green" delay={0.1} subtitle={`${orcamentosAprovados}/${totalOrcamentos} aprovados`} />
        <AdvKPI title="Ticket Médio" value={`R$ ${Number(ticketMedio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Tag} color="pink" delay={0.15} subtitle="Por pedido" />
        <AdvKPI title="Giro Estoque" value={giroEstoque === 'N/A' ? 'N/A' : `${giroEstoque}x`} icon={RefreshCw} color="orange" delay={0.2} subtitle="Vendas / Estoque" />
        <AdvKPI title="Custo/Hora Máq." value={`R$ ${Number(custoHoraMedio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Activity} color="red" delay={0.25} subtitle="Média das máquinas" />
        <AdvKPI title="Metas Ativas" value={`${metasConcluidas}/${goals.length}`} icon={Target} color="yellow" delay={0.3} subtitle={`${metasAtivas} pendentes`} />
        <AdvKPI title="Margem Contrib." value={`${margemMedia}%`} icon={BarChart2} color="green" delay={0.35} subtitle="Média produtos" />
        <AdvKPI title="Entrega no Prazo" value={`${taxaPrazo}%`} icon={CheckCircle} color="green" delay={0.4} subtitle={`${pedidosEntregues.length} entregues`} />
        <AdvKPI title="Inadimplência" value={`${indiceInadimplencia}%`} icon={AlertOctagon} color="red" delay={0.45} subtitle={`R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
      </div>

      {/* #13 - Receita por sócio */}
      <div className="grid grid-cols-3 gap-3">
        <AdvKPI title="Receita Maeli" value={`R$ ${receitaMaeli.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Users} color="pink" delay={0.5} />
        <AdvKPI title="Receita Wesley" value={`R$ ${receitaWesley.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Users} color="blue" delay={0.55} />
        <AdvKPI title="Receita Juliano" value={`R$ ${receitaJuliano.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Users} color="purple" delay={0.6} />
      </div>
    </div>
  );
}