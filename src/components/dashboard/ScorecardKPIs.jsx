import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

function Semaforo({ value, thresholds }) {
  // thresholds: { green: min for green, yellow: min for yellow }
  if (value >= thresholds.green) return <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />;
  if (value >= thresholds.yellow) return <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--yellow)' }} />;
  return <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--red)' }} />;
}

function getColor(value, thresholds) {
  if (value >= thresholds.green) return 'var(--green)';
  if (value >= thresholds.yellow) return 'var(--yellow)';
  return 'var(--red)';
}

export default function ScorecardKPIs({ transactions = [], salesOrders = [], quotes = [], serviceOrders = [], products = [], delay = 0 }) {
  // ── Cálculos ─────────────────────────────────────────────
  const totalIn = transactions.filter((t) => t.type === 'entrada').reduce((a, t) => a + (t.amount || 0), 0);
  const totalOut = transactions.filter((t) => t.type === 'saida').reduce((a, t) => a + (t.amount || 0), 0);
  const margem = totalIn > 0 ? (totalIn - totalOut) / totalIn * 100 : 0;

  const approvedQuotes = quotes.filter((q) => q.status === 'aprovado').length;
  const convRate = quotes.length > 0 ? approvedQuotes / quotes.length * 100 : 0;

  const paidOrders = salesOrders.filter((o) => o.payment_status === 'pago').length;
  const paymentRate = salesOrders.length > 0 ? paidOrders / salesOrders.length * 100 : 0;

  const concludedOS = serviceOrders.filter((o) => o.status === 'concluida').length;
  const totalOS = serviceOrders.length;
  const osRate = totalOS > 0 ? concludedOS / totalOS * 100 : 0;

  const criticalStock = products.filter((p) => p.track_stock !== false && Number(p.quantity || 0) <= Number(p.min_quantity || 1)).length;
  const stockProducts = products.filter((p) => p.track_stock !== false);
  const stockHealth = stockProducts.length > 0 ? (stockProducts.length - criticalStock) / stockProducts.length * 100 : 100;
  const saldo = totalIn - totalOut;

  const kpis = [
  {
    label: 'Margem de Lucro',
    value: `${margem.toFixed(1)}%`,
    raw: margem,
    thresholds: { green: 20, yellow: 10 },
    desc: 'Receita - Despesas / Receita'
  },
  {
    label: 'Taxa de Conversão',
    value: `${convRate.toFixed(1)}%`,
    raw: convRate,
    thresholds: { green: 50, yellow: 30 },
    desc: 'Orçamentos aprovados / total'
  },
  {
    label: 'Taxa de Pagamento',
    value: `${paymentRate.toFixed(1)}%`,
    raw: paymentRate,
    thresholds: { green: 70, yellow: 40 },
    desc: 'Pedidos pagos / total'
  },
  {
    label: 'Eficiência de OS',
    value: `${osRate.toFixed(1)}%`,
    raw: osRate,
    thresholds: { green: 60, yellow: 30 },
    desc: 'OS concluídas / total'
  },
  {
    label: 'Saúde do Estoque',
    value: `${stockHealth.toFixed(1)}%`,
    raw: stockHealth,
    thresholds: { green: 85, yellow: 60 },
    desc: 'Produtos acima do estoque mínimo'
  },
  {
    label: 'Saldo Financeiro',
    value: `R$ ${saldo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
    raw: saldo > 0 ? 100 : 0,
    thresholds: { green: 50, yellow: 1 },
    desc: 'Entradas - Saídas'
  }];


  const green = kpis.filter((k) => k.raw >= k.thresholds.green).length;
  const yellow = kpis.filter((k) => k.raw >= k.thresholds.yellow && k.raw < k.thresholds.green).length;
  const red = kpis.filter((k) => k.raw < k.thresholds.yellow).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--r-xl)' }}>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Scorecard de Saúde do Negócio</h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Semáforo automático de KPIs</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1" style={{ color: 'var(--green)' }}><CheckCircle className="w-4 h-4" /> {green}</span>
          <span className="flex items-center gap-1" style={{ color: 'var(--yellow)' }}><AlertTriangle className="w-4 h-4" /> {yellow}</span>
          <span className="flex items-center gap-1" style={{ color: 'var(--red)' }}><XCircle className="w-4 h-4" /> {red}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((kpi, i) =>
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
            <Semaforo value={kpi.raw} thresholds={kpi.thresholds} />
            <div className="min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
              <p className="font-bold text-sm" style={{ color: getColor(kpi.raw, kpi.thresholds) }}>{kpi.value}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{kpi.desc}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" style={{ color: 'var(--green)' }} /> Verde = meta atingida</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" style={{ color: 'var(--yellow)' }} /> Amarelo = atenção</span>
        <span className="flex items-center gap-1"><XCircle className="w-3 h-3" style={{ color: 'var(--red)' }} /> Vermelho = crítico</span>
      </div>
    </motion.div>);

}