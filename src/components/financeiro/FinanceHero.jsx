import React from 'react';
import { AlertTriangle, Banknote, CalendarClock, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: tone }} />
        <p className="text-[11px] uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
      <p className="text-xl font-black" style={{ color: tone }}>{value}</p>
    </div>
  );
}

export default function FinanceHero({ summary }) {
  const healthColor = summary.healthScore >= 75 ? 'var(--green)' : summary.healthScore >= 45 ? 'var(--orange)' : 'var(--red)';

  return (
    <div className="rounded-[30px] p-5 md:p-7 relative overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--r-2xl)' }}>
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-3" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            <WalletCards className="w-3.5 h-3.5" /> Cockpit financeiro avançado
          </div>
          <h2 className="text-2xl md:text-4xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>Controle de caixa, contas, inadimplência, sócios, impostos e projeção em tempo real.</h2>
          <p className="text-sm md:text-base mt-3" style={{ color: 'var(--text-secondary)' }}>A página agora funciona como central financeira: mostra riscos, liquidez, previsões, resultado do mês e onde agir primeiro.</p>
        </div>
        <div className="rounded-[28px] p-5 min-w-[220px] text-center" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
          <p className="text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>Saúde financeira</p>
          <p className="text-5xl font-black my-2" style={{ color: healthColor }}>{summary.healthScore}</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{summary.healthLabel}</p>
        </div>
      </div>
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-6 gap-3 mt-7">
        <Metric icon={TrendingUp} label="Entradas mês" value={money(summary.monthIncome)} tone="var(--green)" />
        <Metric icon={TrendingDown} label="Saídas mês" value={money(summary.monthExpense)} tone="var(--red)" />
        <Metric icon={Banknote} label="Resultado" value={money(summary.monthResult)} tone={summary.monthResult >= 0 ? 'var(--accent)' : 'var(--red)'} />
        <Metric icon={CalendarClock} label="A receber" value={money(summary.openReceivable)} tone="var(--purple)" />
        <Metric icon={AlertTriangle} label="A pagar" value={money(summary.openPayable)} tone="var(--orange)" />
        <Metric icon={WalletCards} label="Saldo caixa" value={money(summary.cashBalance)} tone="var(--text-primary)" />
      </div>
    </div>
  );
}