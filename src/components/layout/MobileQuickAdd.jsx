import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ShoppingCart, Wrench, ArrowRight } from 'lucide-react';

const actions = [
  {
    title: 'Novo orçamento',
    description: 'Abre o assistente comercial oficial, com itens, custos e sincronização correta.',
    icon: FileText,
    to: '/Orcamentos?novo=1',
    color: '#4f79f5',
  },
  {
    title: 'Lançar venda',
    description: 'Usa o fluxo principal de vendas, com itens detalhados e baixa de estoque.',
    icon: ShoppingCart,
    to: '/Vendas?novo=1',
    color: '#16a34a',
  },
  {
    title: 'Ordem de serviço',
    description: 'Acesse a área de produção/serviços para acompanhar ou criar atividades.',
    icon: Wrench,
    to: '/OrdensServico',
    color: '#7c3aed',
  },
];

export default function MobileQuickAdd({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden" style={{ background: 'var(--bg)' }}>
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-200 bg-white">
          <DialogTitle>Lançamento rápido</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${action.color}18`, color: action.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800">{action.title}</p>
                  <p className="text-xs text-slate-500 leading-snug">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            );
          })}
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}