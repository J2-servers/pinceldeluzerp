import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, ShoppingCart, DollarSign, Package, Users, Wrench, FileText, Search } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';
moment.locale('pt-br');

const MODULE_ICONS = {
  vendas: ShoppingCart,
  financeiro: DollarSign,
  estoque: Package,
  clientes: Users,
  producao: Wrench,
  orcamentos: FileText,
};

const MODULE_COLORS = {
  vendas: 'text-blue-400 bg-blue-500/20',
  financeiro: 'text-green-400 bg-green-500/20',
  estoque: 'text-purple-400 bg-purple-500/20',
  clientes: 'text-pink-400 bg-pink-500/20',
  producao: 'text-orange-400 bg-orange-500/20',
  orcamentos: 'text-yellow-400 bg-yellow-500/20',
};

export default function LogAtividades() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => erp.entities.Transaction.list('-date', 50) });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 30) });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => erp.entities.Quote.list('-created_date', 20) });
  const { data: serviceOrders = [] } = useQuery({ queryKey: ['serviceOrders'], queryFn: () => erp.entities.ServiceOrder.list('-created_date', 20) });
  const { data: stockMovements = [] } = useQuery({ queryKey: ['stockMovements'], queryFn: () => erp.entities.StockMovement.list('-date', 30) });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => erp.entities.Client.list('-created_date', 20) });

  const allEvents = React.useMemo(() => {
    const events = [];

    transactions.forEach(t => events.push({
      id: t.id, module: 'financeiro', date: t.date || t.created_date,
      title: `Transação ${t.type === 'entrada' ? 'de Entrada' : 'de Saída'}`,
      description: `${t.description || 'Sem descrição'} — R$ ${(t.amount || 0).toFixed(2)}`,
      user: t.partner || 'Sistema', type: t.type === 'entrada' ? 'success' : 'expense'
    }));

    salesOrders.forEach(o => events.push({
      id: o.id, module: 'vendas', date: o.created_date,
      title: `Pedido ${o.order_number || o.id?.slice(0, 8)}`,
      description: `Cliente: ${o.client_name || 'N/A'} — R$ ${(o.total || 0).toFixed(2)}`,
      user: o.seller_name || 'Sistema', type: 'order'
    }));

    quotes.forEach(q => events.push({
      id: q.id, module: 'orcamentos', date: q.created_date,
      title: `Orçamento ${q.quote_number || q.id?.slice(0, 8)}`,
      description: `Cliente: ${q.client_name || 'N/A'} — Status: ${q.status}`,
      user: 'Sistema', type: 'quote'
    }));

    serviceOrders.forEach(o => events.push({
      id: o.id, module: 'producao', date: o.created_date,
      title: `OS: ${o.title?.slice(0, 40)}`,
      description: `Cliente: ${o.client_name || 'N/A'} — Status: ${o.status}`,
      user: 'Sistema', type: 'os'
    }));

    stockMovements.forEach(m => events.push({
      id: m.id, module: 'estoque', date: m.date || m.created_date,
      title: `Movimentação de Estoque`,
      description: `${m.product_name || 'Produto'} — ${m.type === 'entrada' ? '+' : '-'}${m.quantity} un.`,
      user: 'Sistema', type: m.type
    }));

    clients.slice(0, 10).forEach(c => events.push({
      id: c.id, module: 'clientes', date: c.created_date,
      title: `Cliente cadastrado`,
      description: `${c.name} — ${c.phone || c.email || 'Sem contato'}`,
      user: 'Sistema', type: 'client'
    }));

    return events
      .filter(e => e.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 200);
  }, [transactions, salesOrders, quotes, serviceOrders, stockMovements, clients]);

  const filtered = allEvents.filter(e => {
    const matchSearch = search === '' || e.title.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === 'all' || e.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const groupedByDay = React.useMemo(() => {
    const groups = {};
    filtered.forEach(e => {
      const day = moment(e.date).format('YYYY-MM-DD');
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <Header title="Log de Atividades" subtitle="Histórico completo de ações no sistema" />

      {/* Filters */}
      <GlassCard>
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar atividade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-white/5 border-white/10" />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-44 bg-white/5 border-white/10"><SelectValue placeholder="Módulo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="orcamentos">Orçamentos</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="estoque">Estoque</SelectItem>
              <SelectItem value="clientes">Clientes</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Activity className="w-4 h-4" />
            <span>{filtered.length} registro(s)</span>
          </div>
        </div>
      </GlassCard>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedByDay.map(([day, events]) => (
          <div key={day}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-sm text-gray-400 font-medium whitespace-nowrap">
                {moment(day).isSame(moment(), 'day') ? 'Hoje' : moment(day).isSame(moment().subtract(1, 'day'), 'day') ? 'Ontem' : moment(day).format('DD [de] MMMM')}
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="space-y-2">
              {events.map((event, i) => {
                const colorClass = MODULE_COLORS[event.module] || 'text-gray-400 bg-gray-500/20';
                const [textColor, bgColor] = colorClass.split(' ');
                const Icon = MODULE_ICONS[event.module] || Activity;
                return (
                  <div key={`${event.id}-${i}`} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                    <div className={`p-2 rounded-lg shrink-0 ${bgColor}`}>
                      <Icon className={`w-4 h-4 ${textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium">{event.title}</p>
                        <Badge className={`text-xs ${bgColor} ${textColor}`}>{event.module}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{event.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{moment(event.date).format('HH:mm')}</p>
                      {event.user && event.user !== 'Sistema' && (
                        <p className="text-xs text-pink-400">{event.user}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <GlassCard className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhuma atividade encontrada</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}