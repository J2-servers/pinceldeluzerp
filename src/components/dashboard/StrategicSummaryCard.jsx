import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarClock, ClipboardList, DollarSign, FileText, Package, Target, Users } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/ui/KPICard';
import { createPageUrl } from '@/utils';

const shortMoney = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

export default function StrategicSummaryCard({ clientsCount, vipCount, riskCount, stockValue, receivables, payables }) {
  return (
    <GlassCard hover={false} className="h-full !p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        <h3 className="font-black text-slate-800">Resumo estratégico</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KPICard title="Clientes" value={clientsCount} icon={Users} color="blue" subtitle={`${vipCount} VIP · ${riskCount} risco`} />
        <KPICard title="Estoque" value={shortMoney(stockValue)} icon={Package} color="purple" subtitle="Valor em estoque" />
        <KPICard title="A receber" value={shortMoney(receivables)} icon={DollarSign} color="green" subtitle="Previsto" />
        <KPICard title="A pagar" value={shortMoney(payables)} icon={ClipboardList} color="orange" subtitle="Compromissos" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to={createPageUrl('Orcamentos')}><FileText className="w-4 h-4" /> Orçamentos</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to={createPageUrl('Financeiro')}><DollarSign className="w-4 h-4" /> Financeiro</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to={createPageUrl('Metas')}><Target className="w-4 h-4" /> Metas</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to={createPageUrl('Agenda')}><CalendarClock className="w-4 h-4" /> Agenda</Link></Button>
      </div>
    </GlassCard>
  );
}