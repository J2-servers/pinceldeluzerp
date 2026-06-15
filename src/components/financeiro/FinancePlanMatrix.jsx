import React from 'react';
import { CheckCircle2, Landmark, LineChart, ReceiptText, ShieldCheck, Users } from 'lucide-react';

const plan = [
  { icon: Landmark, title: 'Caixa e resultado', text: 'Entradas, saídas, saldo, margem mensal e evolução histórica.' },
  { icon: ReceiptText, title: 'Contas operacionais', text: 'A pagar, a receber, vencidos, próximos vencimentos e baixa por responsável.' },
  { icon: LineChart, title: 'Fluxo futuro', text: 'Projeção de caixa para os próximos 30 dias com impacto de contas abertas.' },
  { icon: ShieldCheck, title: 'Risco financeiro', text: 'Inadimplência, contas vencidas, pressão de caixa e score de saúde.' },
  { icon: Users, title: 'Sócios e capital', text: 'Aportes, retiradas, participação societária e patrimônio vinculado.' },
  { icon: CheckCircle2, title: 'Governança', text: 'Categorias, formas de pagamento, comissões e impostos em abas de controle.' },
];

export default function FinancePlanMatrix() {
  return (
    <div className="rounded-[24px] p-4 bg-white/70 border border-white shadow-sm">
      <h3 className="font-black text-slate-800 mb-3">Plano financeiro implantado</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {plan.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl p-3 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4 text-blue-600" /><p className="font-black text-slate-800">{title}</p></div>
            <p className="text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}