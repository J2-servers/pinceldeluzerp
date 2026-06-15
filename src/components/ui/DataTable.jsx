import React from 'react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';

const accentMap = {
  pink: { color: 'var(--red)', muted: 'var(--red-muted)' },
  orange: { color: 'var(--orange)', muted: 'var(--orange-muted)' },
  green: { color: 'var(--green)', muted: 'var(--green-muted)' },
  blue: { color: 'var(--accent)', muted: 'var(--accent-muted)' },
  purple: { color: 'var(--purple)', muted: 'var(--purple-muted)' },
  red: { color: 'var(--red)', muted: 'var(--red-muted)' },
  cyan: { color: 'var(--teal)', muted: 'var(--teal-muted)' },
  default: { color: 'var(--accent)', muted: 'var(--accent-muted)' }
};

export default function DataTable({ columns = [], data = [], accent = 'default', emptyMessage = 'Nenhum registro encontrado', loading = false, className }) {
  const a = accentMap[accent] || accentMap.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn('relative overflow-hidden rounded-2xl', className)}
      style={{
        background: 'var(--bg)',
        boxShadow: 'var(--shadow-md)'
      }}>

      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${a.color}, transparent)`, opacity: 0.7 }} />

      <div className="w-full overflow-hidden">
        <Table className="erp-responsive-table">
          <TableHeader>
            <TableRow
              className="border-0 hover:bg-transparent"
              style={{ background: a.muted, borderBottom: '1px solid var(--border)' }}>

              {columns.map((col) =>
              <TableHead
                key={col.key}
                className={cn('font-black text-[0.68rem] uppercase tracking-[0.12em] py-3.5 px-4 first:pl-6', col.headerClassName)}
                style={{ color: 'var(--text-tertiary)' }}>

                  {col.label}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
            <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-14" style={{ color: 'var(--text-tertiary)' }}>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid var(--accent-muted)', borderTopColor: 'var(--accent)' }} />
                    <span>Carregando...</span>
                  </div>
                </TableCell>
              </TableRow>
            }
            {!loading && data.length === 0 &&
            <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-14" style={{ color: 'var(--text-tertiary)' }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            }
            {!loading && data.map((row, rowIdx) =>
            <TableRow
              key={row.id || rowIdx}
              className="border-0 transition-all duration-150 cursor-default"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = a.muted}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}>

                {columns.map((col, colIdx) =>
              <TableCell
                key={col.key}
                data-label={col.label || ''}
                className={cn('px-4 py-3.5 text-sm opacity-100 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', col.className)}

                style={{ color: 'var(--text-primary)' }}>

                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </TableCell>
              )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>);

}
