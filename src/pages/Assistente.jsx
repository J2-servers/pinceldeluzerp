import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, Wallet, Package, Users, AlertTriangle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Assistente() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => erp.entities.Transaction.list('-date', 100),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => erp.entities.Client.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => erp.entities.Product.list(),
  });

  const getContext = () => {
    const totalEntradas = transactions.filter(t => t.type === 'entrada').reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalSaidas = transactions.filter(t => t.type === 'saida').reduce((acc, t) => acc + (t.amount || 0), 0);
    const saldo = totalEntradas - totalSaidas;
    
    const inadimplentes = clients.filter(c => c.status === 'inadimplente');
    const lowStock = products.filter(p => (p.quantity || 0) <= (p.min_quantity || 5));

    return `
CONTEXTO ATUAL DA EMPRESA PINCEL DE LUZ:

FINANCEIRO:
- Total Entradas: R$ ${totalEntradas.toFixed(2)}
- Total Saídas: R$ ${totalSaidas.toFixed(2)}
- Saldo: R$ ${saldo.toFixed(2)}
- Transações recentes: ${transactions.length}

CLIENTES:
- Total de clientes: ${clients.length}
- Clientes inadimplentes: ${inadimplentes.length}
- Total em dívidas: R$ ${inadimplentes.reduce((acc, c) => acc + (c.total_debt || 0), 0).toFixed(2)}

ESTOQUE:
- Total de produtos: ${products.length}
- Produtos com estoque baixo: ${lowStock.length}
- Produtos críticos: ${lowStock.map(p => p.name).join(', ') || 'Nenhum'}
`;
  };

  const sendMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é um assistente inteligente da empresa Pincel de Luz, especializada em corte e gravação a laser.
Responda sempre em português, de forma clara e objetiva. Use emojis quando apropriado.

${getContext()}

PERGUNTA DO USUÁRIO: ${text}

Forneça uma resposta útil e acionável baseada nos dados da empresa.`,
      });

      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = { role: 'assistant', content: '❌ Erro ao processar sua solicitação. Tente novamente.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      sendMessage(input.trim());
    }
  };

  const quickActions = [
    { icon: Wallet, label: 'Balanço Financeiro', prompt: 'Faça um resumo do balanço financeiro atual da empresa' },
    { icon: Package, label: 'Estoque Crítico', prompt: 'Quais produtos estão com estoque crítico e precisam de reposição?' },
    { icon: Users, label: 'Clientes Inadimplentes', prompt: 'Liste os clientes inadimplentes e sugira ações de cobrança' },
    { icon: AlertTriangle, label: 'Alertas Gerais', prompt: 'Quais são os principais alertas e problemas que preciso resolver?' },
  ];

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <Header title="Assistente IA" subtitle="Seu assistente inteligente" />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            onClick={() => sendMessage(action.prompt)}
            disabled={loading}
            className="flex items-center gap-2 h-auto py-3 bg-white/5 border-white/10 hover:bg-white/10"
          >
            <action.icon className="w-4 h-4 text-pink-400" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Chat Area */}
      <GlassCard className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-pink-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Olá! Como posso ajudar?</h3>
              <p className="text-gray-400">
                Pergunte sobre finanças, estoque, clientes ou qualquer aspecto do seu negócio.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-pink-500/20 text-white ml-auto'
                    : 'bg-white/5 text-gray-200'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                <span className="text-gray-400">Pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-white/5 border-white/10"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} className="gradient-primary">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}