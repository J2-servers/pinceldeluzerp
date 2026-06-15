import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays, Bot, Send, Loader2, CheckCircle2, Clock, AlertCircle,
  Factory, ShoppingCart, Package, Wrench
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const STATUS_COLORS = {
  aguardando: 'bg-yellow-500/20 text-yellow-400',
  em_andamento: 'bg-blue-500/20 text-blue-400',
  concluida: 'bg-green-500/20 text-green-400',
  cancelada: 'bg-red-500/20 text-red-400',
  pausada: 'bg-orange-500/20 text-orange-400',
};

const QUICK_QUESTIONS = [
  'Como calcular o custo de corte a laser?',
  'Qual o prazo ideal para entrega de acrílico?',
  'Como fazer orçamento de MDF?',
  'Dicas para configurar velocidade de corte',
  'Como precificar serviços de gravação?',
];

export default function CockpitSocios() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Olá! Sou o assistente da **Pincel de Luz**. Posso te ajudar com dúvidas sobre produtos, materiais, processos de corte a laser, orçamentos e muito mais. O que você precisa hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: serviceOrders = [] } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => erp.entities.ServiceOrder.list('-created_date', 50),
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => erp.entities.SalesOrder.list('-created_date', 50),
  });

  const { data: productionQueue = [] } = useQuery({
    queryKey: ['productionQueue'],
    queryFn: () => erp.entities.ProductionQueue.list('-created_date', 50),
  });

  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => erp.entities.Product.list('name'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const todayOS = serviceOrders.filter(o =>
    o.status !== 'concluida' && o.status !== 'cancelada' &&
    (moment(o.deadline).isSame(moment(), 'day') || o.status === 'em_andamento')
  );

  const todayOrders = salesOrders.filter(o =>
    o.status !== 'entregue' && o.status !== 'cancelado' &&
    (moment(o.created_date).isSame(moment(), 'day') || o.status === 'em_producao')
  );

  const urgentProduction = productionQueue.filter(p =>
    p.status !== 'concluido' && p.status !== 'cancelado' &&
    (p.priority === 'urgente' || p.priority === 'alta')
  );

  const lowStockProducts = stockAlerts.filter(p =>
    p.current_quantity !== undefined && p.min_quantity !== undefined &&
    p.current_quantity <= p.min_quantity
  );

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const contextInfo = `
        Empresa: Pincel de Luz (corte a laser, MDF, acrílico, personalização)
        OS do dia: ${todayOS.length} ordens em andamento
        Pedidos pendentes: ${todayOrders.length}
        Produção urgente: ${urgentProduction.length} itens
      `;
      const result = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é o assistente técnico da Pincel de Luz, especialista em:
- Corte a laser CO2 e fibra
- Materiais: MDF, acrílico, couro, tecido, papel, plásticos
- Gravação a laser, corte e fresagem CNC
- Orçamentos para produtos personalizados
- Gestão de produção de pequena empresa

Contexto atual da empresa:
${contextInfo}

Pergunta do operador: ${msg}

Responda de forma clara, prática e objetiva. Use emojis quando ajudar na leitura. Se for sobre materiais ou configurações técnicas, seja específico com valores.`,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao consultar o assistente. Tente novamente.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Header title="Projetos do Dia" subtitle={`${moment().format('dddd, D [de] MMMM')} · Visão operacional + Assistente IA`} />

      {/* Painéis do dia */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard delay={0}>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-blue-400" />
            <span className="text-white font-semibold text-sm">OS Hoje</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{todayOS.length}</p>
          <p className="text-xs text-gray-500 mt-1">ordens em aberto</p>
        </GlassCard>
        <GlassCard delay={0.05}>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-green-400" />
            <span className="text-white font-semibold text-sm">Pedidos</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{todayOrders.length}</p>
          <p className="text-xs text-gray-500 mt-1">pedidos ativos</p>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span className="text-white font-semibold text-sm">Urgentes</span>
          </div>
          <p className="text-3xl font-bold text-orange-400">{urgentProduction.length}</p>
          <p className="text-xs text-gray-500 mt-1">na produção</p>
        </GlassCard>
        <GlassCard delay={0.15}>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-red-400" />
            <span className="text-white font-semibold text-sm">Estoque Baixo</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{lowStockProducts.length}</p>
          <p className="text-xs text-gray-500 mt-1">materiais</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de OS do dia */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-pink-400" />
            <h3 className="text-white font-semibold">Ordens de Serviço do Dia</h3>
          </div>
          {todayOS.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-medium">Tudo em dia!</p>
              <p className="text-gray-500 text-sm">Nenhuma OS urgente</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {todayOS.map(os => (
                <div key={os.id} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{os.title}</p>
                      <p className="text-gray-400 text-xs">{os.client_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={STATUS_COLORS[os.status] || 'bg-gray-500/20 text-gray-400'}>
                        {os.status?.replace(/_/g, ' ')}
                      </Badge>
                      {os.deadline && (
                        <span className={`text-[10px] ${moment(os.deadline).isBefore(moment()) ? 'text-red-400' : 'text-gray-500'}`}>
                          <Clock className="inline w-2.5 h-2.5 mr-0.5" />
                          {moment(os.deadline).format('DD/MM')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Assistente IA */}
        <GlassCard className="flex flex-col" style={{ minHeight: '420px' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Assistente Pincel de Luz</h3>
              <p className="text-[10px] text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Online
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-[260px] pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-pink-500/20 text-white border border-pink-500/30'
                    : 'bg-white/5 text-gray-200 border border-white/10'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                  <span className="text-gray-400 text-xs">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-pink-400 hover:border-pink-500/30 transition-all">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="Pergunta sobre produto, material, processo..."
              className="flex-1 bg-white/5 border-white/10 text-sm"
              disabled={loading}
            />
            <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="gradient-primary shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Pedidos ativos */}
      {todayOrders.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Factory className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-semibold">Pedidos em Produção</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayOrders.slice(0, 9).map(o => (
              <div key={o.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white text-sm font-medium truncate">{o.client_name}</p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">{o.description || 'Pedido'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-pink-400 text-xs font-bold">
                    R$ {(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <Badge className="text-[10px] bg-blue-500/20 text-blue-400">{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}