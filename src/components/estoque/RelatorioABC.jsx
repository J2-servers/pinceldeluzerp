// Melhoria #66 — Relatório ABC de estoque
import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart2 } from 'lucide-react';

export default function RelatorioABC({ products = [] }) {
  // Sort by value (qty * sale_price) descending
  const sorted = [...products]
    .map(p => ({
      ...p,
      valorTotal: (p.quantity || 0) * (p.sale_price || p.cost_price || 0)
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);

  const totalValue = sorted.reduce((a, p) => a + p.valorTotal, 0);
  let cumulative = 0;

  const withClass = sorted.map(p => {
    cumulative += p.valorTotal;
    const pct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
    return {
      ...p,
      abc: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C',
      pct: (totalValue > 0 ? (p.valorTotal / totalValue) * 100 : 0).toFixed(1),
    };
  });

  const classColors = {
    A: { background: 'var(--red-muted)', color: 'var(--red)' },
    B: { background: 'var(--yellow-muted)', color: 'var(--yellow)' },
    C: { background: 'var(--surface-3)', color: 'var(--text-tertiary)' },
  };

  const classCount = (cls) => withClass.filter(p => p.abc === cls).length;
  const classTotal = (cls) => withClass.filter(p => p.abc === cls).reduce((a, p) => a + p.valorTotal, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['A', 'B', 'C'].map(cls => (
          <GlassCard key={cls} hover={false} className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="border-0" style={classColors[cls]}>Classe {cls}</Badge>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{classCount(cls)} itens</span>
            </div>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>R$ {classTotal(cls).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {cls === 'A' ? '≈80% do valor total' : cls === 'B' ? '≈15% do valor' : '≈5% do valor'}
            </p>
          </GlassCard>
        ))}
      </div>
      <GlassCard hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Classificação ABC do Estoque</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table className="nm-hover-table">
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border-inner)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Classe</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Produto</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Qtd</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor Unit.</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor Total</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>% Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withClass.map(p => (
                <TableRow key={p.id} style={{ borderColor: 'var(--border-inner)' }}>
                  <TableCell><Badge className="border-0" style={classColors[p.abc]}>{p.abc}</Badge></TableCell>
                  <TableCell className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>{p.quantity} {p.unit}</TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>R$ {(p.sale_price || p.cost_price || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold" style={{ color: 'var(--accent)' }}>R$ {p.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell style={{ color: 'var(--text-secondary)' }}>{p.pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}