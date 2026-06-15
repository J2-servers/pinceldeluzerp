import React from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Edit, Eye, FileText, MessageCircle, Send, ShoppingCart, Trash2 } from 'lucide-react';
import { formatMoney } from '@/components/orcamentos/quotePricing';

const statusMap = {
  rascunho: { background: 'var(--surface-3)', color: 'var(--text-secondary)' },
  enviado: { background: 'var(--accent-muted)', color: 'var(--accent)' },
  aprovado: { background: 'var(--green-muted)', color: 'var(--green)' },
  reprovado: { background: 'var(--red-muted)', color: 'var(--red)' },
  expirado: { background: 'var(--orange-muted)', color: 'var(--orange)' }
};

export default function QuoteListTable({ quotes, onView, onEdit, onDuplicate, onDelete, onPdf, onEmail, onWhatsApp, onConvert, getClient }) {
  return (
    <div className="w-full overflow-hidden">
      <Table className="quote-responsive-table w-full table-fixed">
        <TableHeader>
          <TableRow style={{ borderColor: 'var(--border-inner)' }}>
            <TableHead className="w-[110px]" style={{ color: 'var(--text-tertiary)' }}>Nº</TableHead>
            <TableHead className="w-[16%]" style={{ color: 'var(--text-tertiary)' }}>Cliente</TableHead>
            <TableHead style={{ color: 'var(--text-tertiary)' }}>Produto</TableHead>
            <TableHead className="w-[105px]" style={{ color: 'var(--text-tertiary)' }}>Grupo</TableHead>
            <TableHead className="w-[64px]" style={{ color: 'var(--text-tertiary)' }}>Qtd</TableHead>
            <TableHead className="w-[120px]" style={{ color: 'var(--text-tertiary)' }}>Preco final</TableHead>
            <TableHead className="w-[105px]" style={{ color: 'var(--text-tertiary)' }}>Status</TableHead>
            <TableHead className="w-[84px]" style={{ color: 'var(--text-tertiary)' }}>Data</TableHead>
            <TableHead className="w-[180px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>Nenhum orcamento encontrado</TableCell>
            </TableRow>
          )}
          {quotes.map((quote) => {
            const client = getClient(quote);
            const quoteNumber = quote.quote_number || '';

            return (
              <TableRow key={quote.id} style={{ borderColor: 'var(--border-inner)' }}>
                <TableCell data-label="Numero" className="text-xs font-mono break-words" style={{ color: 'var(--text-tertiary)' }}>{quoteNumber || '-'}</TableCell>
                <TableCell data-label="Cliente" className="font-medium break-words" style={{ color: 'var(--text-primary)' }}>{quote.client_name}</TableCell>
                <TableCell data-label="Produto" className="break-words" style={{ color: 'var(--text-secondary)' }}>{quote.product_name}</TableCell>
                <TableCell data-label="Grupo">{quote.product_group ? <Badge variant="outline">{quote.product_group}</Badge> : '-'}</TableCell>
                <TableCell data-label="Qtd" style={{ color: 'var(--text-tertiary)' }}>{quote.quantity}</TableCell>
                <TableCell data-label="Preco final" className="font-bold" style={{ color: 'var(--green)' }}>{formatMoney(quote.final_price)}</TableCell>
                <TableCell data-label="Status"><Badge className="border-0" style={statusMap[quote.status] || statusMap.rascunho}>{quote.status}</Badge></TableCell>
                <TableCell data-label="Data" className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{quote.created_date ? moment(quote.created_date).format('DD/MM/YY') : '-'}</TableCell>
                <TableCell data-label="Acoes" className="actions-cell">
                  <div className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ver orcamento ${quoteNumber}`} onClick={() => onView(quote)}><Eye className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Gerar PDF do orcamento ${quoteNumber}`} onClick={() => onPdf(quote)}><FileText className="w-4 h-4" style={{ color: 'var(--red)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Enviar orcamento ${quoteNumber} por e-mail`} onClick={() => onEmail(quote)} disabled={!client?.email}><Send className="w-4 h-4" style={{ color: 'var(--teal)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Editar orcamento ${quoteNumber}`} onClick={() => onEdit(quote)}><Edit className="w-4 h-4" style={{ color: 'var(--accent)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Converter orcamento ${quoteNumber} em venda`} onClick={() => onConvert(quote)}><ShoppingCart className="w-4 h-4" style={{ color: 'var(--orange)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Duplicar orcamento ${quoteNumber}`} onClick={() => onDuplicate(quote)}><Copy className="w-4 h-4" style={{ color: 'var(--purple)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Enviar orcamento ${quoteNumber} por WhatsApp`} onClick={() => onWhatsApp(quote)}><MessageCircle className="w-4 h-4" style={{ color: 'var(--green)' }} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Excluir orcamento ${quoteNumber}`} onClick={() => onDelete(quote)}><Trash2 className="w-4 h-4" style={{ color: 'var(--red)' }} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
