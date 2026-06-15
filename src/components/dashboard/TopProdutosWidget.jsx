import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TopProdutosWidget({ salesOrders = [] }) {
  // Parse items from orders and count occurrences
  const productCounts = {};
  const productValues = {};

  salesOrders.filter((o) => !['cancelado'].includes(o.status)).forEach((o) => {
    if (!o.items) return;
    const lines = o.items.split('\n').filter((line) => line.trim());
    const structuredLines = lines.filter((line) => line.includes('•'));
    const productLines = structuredLines
      .map((line) => line.split('•')[0].trim())
      .filter((line) => line && !/^qtd:|^medidas:|^obs:|^arte:|^material:/i.test(line));

    const uniqueProducts = productLines.length ? productLines : [lines[0]?.trim()].filter(Boolean);
    uniqueProducts.forEach((name) => {
      const key = name.slice(0, 40);
      productCounts[key] = (productCounts[key] || 0) + 1;
      productValues[key] = (productValues[key] || 0) + Number(o.total || 0) / Math.max(uniqueProducts.length, 1);
    });
  });

  const top = Object.entries(productCounts).
  sort((a, b) => b[1] - a[1]).
  slice(0, 5).
  map(([name, count]) => ({ name, count, value: productValues[name] || 0 }));

  const maxCount = top[0]?.count || 1;

  const colors = ['var(--yellow)', 'var(--text-secondary)', 'var(--orange)', 'var(--accent)', 'var(--purple)'];
  const bars = ['var(--yellow)', 'var(--text-secondary)', 'var(--orange)', 'var(--accent)', 'var(--purple)'];

  return (
    <GlassCard accent="orange" delay={0.1}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'var(--orange-muted)', boxShadow: 'var(--shadow-flat)' }}>
            <Star className="w-4 h-4" style={{ color: 'var(--orange)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Serviços Mais Pedidos</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Por frequência nos pedidos</p>
          </div>
        </div>
        <Link to={createPageUrl('Vendas')} className="text-xs" style={{ color: 'var(--orange)' }}>Ver pedidos →</Link>
      </div>

      {top.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Nenhum dado disponível</p>}

      <div className="space-y-3">
        {top.map((item, i) =>
        <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold w-4" style={{ color: colors[i] }}>#{i + 1}</span>
                <span className="text-sm truncate max-w-[170px]" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.count}x</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
              <div
              className="h-full rounded-full"
              style={{ width: `${item.count / maxCount * 100}%`, background: bars[i] }} />

            </div>
          </div>
        )}
      </div>
    </GlassCard>);

}