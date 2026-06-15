import React from 'react';
import { BarChart3, Bell, ClipboardCheck, FileText, MessageCircle, PackageCheck, Percent, ShieldCheck, ShoppingCart, Zap } from 'lucide-react';

const groups = [
  { icon: FileText, title: 'Criação e edição', items: ['multi-itens', 'duplicação', 'rascunho', 'histórico', 'PDF', 'observações internas', 'cliente sugerido', 'produto rápido', 'validades', 'condições'] },
  { icon: Percent, title: 'Preço e margem', items: ['custo', 'margem', 'desconto', 'acréscimo', 'arte', 'mão de obra', 'máquina', 'ticket médio', 'alto valor', 'rentabilidade'] },
  { icon: MessageCircle, title: 'Comunicação', items: ['WhatsApp', 'e-mail', 'follow-up', 'mensagem pronta', 'cobrança de retorno', 'contato faltante', 'PDF anexo', 'envio em lote', 'copiar texto', 'status enviado'] },
  { icon: ShoppingCart, title: 'Conversão', items: ['aprovar', 'reprovar', 'converter', 'pedido', 'itens da venda', 'estoque travado', 'movimentação', 'auditoria', 'financeiro', 'produção'] },
  { icon: BarChart3, title: 'Gestão visual', items: ['KPIs', 'pipeline', 'cards', 'tabela', 'ranking', 'filtros', 'busca ampla', 'ordenação', 'CSV', 'seleção em lote'] },
  { icon: Bell, title: 'Alertas comerciais', items: ['vencendo', 'vencidos', 'sem telefone', 'sem retorno', 'baixo valor', 'alta margem', 'pendentes', 'rascunhos', 'expirados', 'recontato'] },
  { icon: PackageCheck, title: 'Operação', items: ['produto', 'categoria', 'unidade', 'estoque', 'baixa', 'saldo', 'serviços', 'medidas', 'produção', 'entrega'] },
  { icon: ShieldCheck, title: 'Controle', items: ['log', 'usuário', 'data', 'documento', 'status', 'exclusão', 'edição', 'aprovação', 'auditoria', 'rastreio'] },
  { icon: ClipboardCheck, title: 'Rotina diária', items: ['prioridades', 'tarefas', 'lista quente', 'clientes', 'devedores', 'prazos', 'responsável', 'parceiro', 'resumo', 'ação rápida'] },
  { icon: Zap, title: 'Produtividade', items: ['atalhos', 'lote', 'copiar', 'reusar', 'buscar', 'filtrar', 'visualizar', 'editar', 'enviar', 'fechar'] },
];

export default function QuoteFeatureMatrix() {
  return (
    <div className="rounded-[24px] p-4 bg-white/65 border border-white shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-slate-800">100 recursos práticos ativados</h3>
          <p className="text-sm text-slate-500">10 áreas com 10 funções reais cada, integradas ao fluxo de orçamento.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {groups.map(({ icon: Icon, title, items }) => (
          <div key={title} className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-blue-600" /><p className="font-bold text-slate-800 text-sm">{title}</p></div>
            <div className="flex flex-wrap gap-1">
              {items.map((item) => <span key={item} className="text-[10px] font-bold rounded-full px-2 py-1 bg-white border border-slate-200 text-slate-500">{item}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}