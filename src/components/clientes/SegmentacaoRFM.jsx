// Melhoria #71 — Segmentação de clientes por frequência de compra (RFM)
import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';
import moment from 'moment';

function calcRFM(client, orders) {
  const clientOrders = orders.filter(o => o.client_name === client.name || o.client_id === client.id);
  const recency = clientOrders.length > 0
    ? moment().diff(moment(clientOrders[0].created_date), 'days')
    : 999;
  const frequency = clientOrders.length;
  const monetary = clientOrders.reduce((a, o) => a + (o.total || 0), 0);
  return { recency, frequency, monetary };
}

function getSegment(rfm) {
  if (rfm.frequency >= 5 && rfm.recency <= 30) return { label: 'Campeão', bg: 'var(--green-muted)', text: 'var(--green)' };
  if (rfm.frequency >= 3 && rfm.recency <= 60) return { label: 'Fiel', bg: 'var(--accent-muted)', text: 'var(--accent)' };
  if (rfm.recency <= 30) return { label: 'Recente', bg: 'var(--purple-muted)', text: 'var(--purple)' };
  if (rfm.monetary >= 1000) return { label: 'Alto Valor', bg: 'var(--red-muted)', text: 'var(--red)' };
  if (rfm.recency > 180) return { label: 'Inativo', bg: 'var(--red-muted)', text: 'var(--red)' };
  if (rfm.recency > 90) return { label: 'Em Risco', bg: 'var(--orange-muted)', text: 'var(--orange)' };
  return { label: 'Regular', bg: 'var(--surface-2)', text: 'var(--text-tertiary)' };
}

export default function SegmentacaoRFM({ clients = [], orders = [] }) {
  const clientsRFM = clients.map(c => {
    const rfm = calcRFM(c, orders);
    const segment = getSegment(rfm);
    return { ...c, rfm, segment };
  }).sort((a, b) => b.rfm.monetary - a.rfm.monetary);

  const segments = ['Campeão', 'Fiel', 'Recente', 'Alto Valor', 'Regular', 'Em Risco', 'Inativo'];
  const segCount = (seg) => clientsRFM.filter(c => c.segment.label === seg).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {segments.map(seg => (
          <div key={seg} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{segCount(seg)}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{seg}</p>
          </div>
        ))}
      </div>
      <GlassCard hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: 'var(--red)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Segmentação RFM de Clientes</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Cliente</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Segmento</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Recência (dias)</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Frequência</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientsRFM.map(c => (
                <TableRow key={c.id} style={{ borderColor: 'var(--border)' }}>
                  <TableCell className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</TableCell>
                  <TableCell><Badge style={{ background: c.segment.bg, color: c.segment.text }}>{c.segment.label}</Badge></TableCell>
                  <TableCell style={{ color: 'var(--text-tertiary)' }}>{c.rfm.recency === 999 ? 'Nunca' : `${c.rfm.recency}d`}</TableCell>
                  <TableCell style={{ color: 'var(--text-tertiary)' }}>{c.rfm.frequency} pedidos</TableCell>
                  <TableCell className="font-semibold" style={{ color: 'var(--red)' }}>
                    R$ {c.rfm.monetary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}