import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search } from 'lucide-react';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function MargemProdutos() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('margem');

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => erp.entities.Product.list() });
  const { data: salesOrders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => erp.entities.SalesOrder.list('-created_date', 300) });

  const productStats = React.useMemo(() => {
    return products.map((p) => {
      const custo = p.cost || 0;
      const preco = p.price || 0;
      const lucroUnit = preco - custo;
      const margem = preco > 0 ? lucroUnit / preco * 100 : 0;
      const markup = custo > 0 ? (preco - custo) / custo * 100 : 0;

      // Calculate sales from orders (basic matching by product name)
      const totalVendido = salesOrders.
      filter((o) => {
        const items = o.items || '';
        return typeof items === 'string' && items.toLowerCase().includes((p.name || '').toLowerCase());
      }).
      reduce((a, o) => a + (o.total || 0), 0);

      const qtdVendida = p.sold_quantity || 0;
      const receitaTotal = qtdVendida * preco;
      const lucroTotal = qtdVendida * lucroUnit;

      return { ...p, custo, preco, lucroUnit, margem, markup, totalVendido, qtdVendida, receitaTotal, lucroTotal };
    }).
    filter((p) => p.name?.toLowerCase().includes(search.toLowerCase())).
    sort((a, b) => {
      if (sortBy === 'margem') return b.margem - a.margem;
      if (sortBy === 'lucro') return b.lucroTotal - a.lucroTotal;
      if (sortBy === 'receita') return b.receitaTotal - a.receitaTotal;
      return b.markup - a.markup;
    });
  }, [products, salesOrders, search, sortBy]);

  const topByMargem = [...productStats].sort((a, b) => b.margem - a.margem).slice(0, 10);
  const avgMargem = productStats.length > 0 ? productStats.reduce((a, p) => a + p.margem, 0) / productStats.length : 0;
  const totalPotencial = productStats.reduce((a, p) => a + (p.lucroTotal || 0), 0);

  const getMargemColor = (margem) => {
    if (margem >= 50) return '#22c55e';
    if (margem >= 30) return '#3b82f6';
    if (margem >= 15) return '#f97316';
    return '#ef4444';
  };

  const getMargemBadge = (margem) => {
    if (margem >= 50) return 'bg-green-500/20 text-green-400';
    if (margem >= 30) return 'bg-blue-500/20 text-blue-400';
    if (margem >= 15) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
  };

  return (
    <div className="space-y-6">
      <Header title="Margem por Produto" subtitle="Análise de rentabilidade do portfólio" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard delay={0}>
          <p className="text-xs text-gray-400 mb-1">Total Produtos</p>
          <p className="text-slate-600 text-2xl font-bold">{products.length}</p>
        </GlassCard>
        <GlassCard delay={0.1}>
          <p className="text-xs text-gray-400 mb-1">Margem Média</p>
          <p className={`text-2xl font-bold ${avgMargem >= 30 ? 'text-green-400' : avgMargem >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>{avgMargem.toFixed(1)}%</p>
        </GlassCard>
        <GlassCard delay={0.2}>
          <p className="text-xs text-gray-400 mb-1">Maior Margem</p>
          <p className="text-2xl font-bold text-pink-400">{productStats[0]?.margem?.toFixed(1) || 0}%</p>
          <p className="text-xs text-gray-500">{productStats[0]?.name?.slice(0, 20) || '-'}</p>
        </GlassCard>
        <GlassCard delay={0.3}>
          <p className="text-xs text-gray-400 mb-1">Lucro Total Potencial</p>
          <p className="text-2xl font-bold text-orange-400">{fmt(totalPotencial)}</p>
        </GlassCard>
      </div>

      {/* Chart top 10 */}
      <GlassCard>
        <h3 className="text-slate-600 mb-4 font-semibold">Top 10 Produtos por Margem</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topByMargem} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(v) => [`${v.toFixed(1)}%`, 'Margem']} />
              <Bar dataKey="margem" radius={[0, 4, 4, 0]}>
                {topByMargem.map((p, i) => <Cell key={i} fill={getMargemColor(p.margem)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-600 font-semibold">Análise Completa de Produtos</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-sm w-48" />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300">
              <option value="margem">Margem %</option>
              <option value="markup">Markup %</option>
              <option value="lucro">Lucro Total</option>
              <option value="receita">Receita Total</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-gray-400 pb-3 font-medium">Produto</th>
                <th className="text-right text-gray-400 pb-3">Custo</th>
                <th className="text-right text-gray-400 pb-3">Preço</th>
                <th className="text-right text-gray-400 pb-3">Lucro Unit.</th>
                <th className="text-right text-gray-400 pb-3">Markup</th>
                <th className="text-right text-gray-400 pb-3">Margem</th>
                <th className="text-right text-gray-400 pb-3">Qtd Vend.</th>
                <th className="text-right text-gray-400 pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {productStats.map((p, i) =>
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 text-white font-medium">{p.name}</td>
                  <td className="py-2.5 text-right text-red-400">{fmt(p.custo)}</td>
                  <td className="py-2.5 text-right text-green-400">{fmt(p.preco)}</td>
                  <td className="py-2.5 text-right text-blue-400">{fmt(p.lucroUnit)}</td>
                  <td className="py-2.5 text-right text-gray-300">{p.markup.toFixed(1)}%</td>
                  <td className="py-2.5 text-right font-bold" style={{ color: getMargemColor(p.margem) }}>{p.margem.toFixed(1)}%</td>
                  <td className="py-2.5 text-right text-gray-400">{p.qtdVendida}</td>
                  <td className="py-2.5 text-right">
                    <Badge className={`text-xs ${getMargemBadge(p.margem)}`}>
                      {p.margem >= 50 ? 'Alta' : p.margem >= 30 ? 'Boa' : p.margem >= 15 ? 'Regular' : 'Baixa'}
                    </Badge>
                  </td>
                </tr>
              )}
              {productStats.length === 0 &&
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">Nenhum produto com dados de custo/preço</td></tr>
              }
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>);

}