// Melhoria #28 — Relatório de inadimplência com aging (0-30, 31-60, 61-90 dias)
import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertOctagon } from 'lucide-react';
import moment from 'moment';

function getBucket(dueDate) {
  const dias = moment().diff(moment(dueDate), 'days');
  if (dias <= 0) return null; // não vencido
  if (dias <= 30) return '0-30 dias';
  if (dias <= 60) return '31-60 dias';
  if (dias <= 90) return '61-90 dias';
  return '+90 dias';
}

const bucketStyles = {
  '0-30 dias': { background: 'var(--yellow-muted)', color: 'var(--yellow)' },
  '31-60 dias': { background: 'var(--orange-muted)', color: 'var(--orange)' },
  '61-90 dias': { background: 'var(--red-muted)', color: 'var(--red)' },
  '+90 dias': { background: 'var(--red-muted)', color: 'var(--red)' }
};

export default function InadimplenciaAging({ receivables = [] }) {
  const vencidas = receivables.
  filter((r) => !r.received && r.due_date && moment(r.due_date).isBefore(moment(), 'day')).
  map((r) => ({ ...r, bucket: getBucket(r.due_date), dias: moment().diff(moment(r.due_date), 'days') })).
  sort((a, b) => b.dias - a.dias);

  const totais = ['0-30 dias', '31-60 dias', '61-90 dias', '+90 dias'].map((bucket) => ({
    bucket,
    total: vencidas.filter((v) => v.bucket === bucket).reduce((a, v) => a + (v.amount || 0), 0),
    count: vencidas.filter((v) => v.bucket === bucket).length
  }));

  const totalInadimplente = vencidas.reduce((a, v) => a + (v.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {totais.map((t) =>
        <GlassCard key={t.bucket} hover={false} className="py-3">
            <Badge className="mb-2" style={bucketStyles[t.bucket]}>{t.bucket}</Badge>
            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>R$ {t.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.count} registro(s)</p>
          </GlassCard>
        )}
      </div>
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5" style={{ color: 'var(--red)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Contas Vencidas em Aberto</h3>
          </div>
          <span className="font-bold" style={{ color: 'var(--red)' }}>Total: R$ {totalInadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        {vencidas.length === 0 ?
        <p className="text-center py-6" style={{ color: 'var(--text-tertiary)' }}>Nenhuma inadimplência registrada</p> :

        <Table>
            <TableHeader>
              <TableRow style={{ borderColor: 'var(--border)' }}>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Cliente</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Descrição</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Vencimento</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Atraso</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Valor</TableHead>
                <TableHead style={{ color: 'var(--text-tertiary)' }}>Faixa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vencidas.map((v) =>
            <TableRow key={v.id} style={{ borderColor: 'var(--border)' }} className="hover:bg-[var(--surface-2)]">
                  <TableCell style={{ color: 'var(--text-primary)' }}>{v.client_name || '-'}</TableCell>
                  <TableCell style={{ color: 'var(--text-tertiary)' }}>{v.description}</TableCell>
                  <TableCell style={{ color: 'var(--red)' }}>{moment(v.due_date).format('DD/MM/YYYY')}</TableCell>
                  <TableCell className="font-medium" style={{ color: 'var(--red)' }}>{v.dias} dias</TableCell>
                  <TableCell className="font-semibold" style={{ color: 'var(--text-primary)' }}>R$ {(v.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell><Badge style={bucketStyles[v.bucket]}>{v.bucket}</Badge></TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
        }
      </GlassCard>
    </div>);

}