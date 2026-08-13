import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, MessageCircle, Send, ShoppingCart, CheckCircle2, XCircle, Copy, Layers, Star } from 'lucide-react';
import moment from 'moment';
import { formatMoney } from '@/components/orcamentos/quotePricing';
import QuoteRevisionsPanel from '@/components/orcamentos/QuoteRevisionsPanel';

const statusMap = {
  rascunho: 'bg-slate-100 text-slate-700 border border-slate-200',
  enviado: 'bg-blue-100 text-blue-700 border border-blue-200',
  aprovado: 'bg-green-100 text-green-700 border border-green-200',
  reprovado: 'bg-red-100 text-red-700 border border-red-200',
  expirado: 'bg-orange-100 text-orange-700 border border-orange-200'
};

export default function QuoteDetailsDialog({ open, onClose, quote, client, optionSiblings = [], onGeneratePdf, onEmailPdf, onWhatsApp, onEdit, onConvert, onDecision, onCreateOption, onRestoreRevision, onRevisionPdf, restoringRevisionId, onOpenSibling }) {
  if (!quote) return null;
  const totalCost = Number(quote.total_cost || 0);
  const finalPrice = Number(quote.final_price || quote.total_price || 0);
  const margin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;
  const belowCost = totalCost > 0 && finalPrice < totalCost;
  const revision = Number(quote.revision || 1);
  const editedAfterApproval = quote.status === 'aprovado' && quote.approved_revision && revision > Number(quote.approved_revision);
  const siblings = (optionSiblings || []).filter((item) => item.id !== quote.id);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto" style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
        <DialogHeader>
          <DialogTitle className="text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            {quote.quote_number || 'Orçamento'}
            <Badge variant="outline" className="ml-1 text-[11px]">Rev. {revision}</Badge>
            {quote.option_label && <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-[11px]">{quote.option_label}</Badge>}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalhes do orcamento, cliente, produto, valores, revisoes e acoes de envio ou conversao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {belowCost && (
            <div className="rounded-2xl p-4 bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-red-800">Atenção: orçamento abaixo do custo</p>
                <p className="text-sm text-red-700 mt-1">
                  O preço final está menor que o custo. Edite o orçamento antes de enviar, aprovar ou virar venda.
                </p>
              </div>
            </div>
          )}

          {quote.status === 'aprovado' && (
            <div className="rounded-2xl p-4 bg-green-50 border border-green-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-black text-green-800">Aprovado {quote.approved_by_name ? `por ${quote.approved_by_name}` : ''}</p>
                <p className="text-sm text-green-700 mt-0.5">
                  {quote.approved_at ? moment(quote.approved_at).format('DD/MM/YYYY HH:mm') : ''}
                  {quote.approved_revision ? ` · versão congelada: Rev. ${quote.approved_revision}` : ''}
                </p>
                {quote.approval_note && <p className="text-xs text-green-700 mt-1">“{quote.approval_note}”</p>}
                {editedAfterApproval && (
                  <p className="text-xs text-amber-700 mt-1 font-semibold">A versão atual (Rev. {revision}) foi editada depois da aprovação. A venda usa a versão aprovada (Rev. {quote.approved_revision}).</p>
                )}
              </div>
            </div>
          )}

          {quote.status === 'reprovado' && quote.rejection_reason && (
            <div className="rounded-2xl p-4 bg-red-50 border border-red-200 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-red-800">Reprovado</p>
                <p className="text-sm text-red-700 mt-0.5">{quote.rejection_reason}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Cliente</p>
              <p className="font-semibold text-slate-800">{quote.client_name}</p>
              {client?.email && <p className="text-xs text-slate-500 mt-1">{client.email}</p>}
              {quote.client_phone && <p className="text-xs text-slate-500">{quote.client_phone}</p>}
            </div>
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Produto</p>
              <p className="font-semibold text-slate-800">{quote.product_name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={statusMap[quote.status] || statusMap.rascunho}>{quote.status}</Badge>
                {quote.product_group && <Badge variant="outline">{quote.product_group}</Badge>}
              </div>
            </div>
          </div>

          {siblings.length > 0 && (
            <div className="rounded-2xl p-4 bg-purple-50 border border-purple-200">
              <p className="text-xs font-black uppercase tracking-wide text-purple-700 mb-2 flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Opções apresentadas ao cliente</p>
              <div className="space-y-1.5">
                {siblings.map((sibling) => (
                  <button key={sibling.id} type="button" onClick={() => onOpenSibling?.(sibling)} className="flex w-full items-center gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2 text-left hover:border-purple-300">
                    <span className="text-xs font-bold text-purple-700">{sibling.option_label || 'Opção'}</span>
                    {sibling.status === 'aprovado' && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{sibling.product_name}</span>
                    <span className="shrink-0 text-sm font-black text-slate-800">{formatMoney(sibling.final_price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {quote.description && (
            <div className="rounded-2xl p-4 bg-white border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Descrição</p>
              <p className="text-slate-700 break-words">{quote.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-orange-50 border border-orange-200">
              <p className="text-xs text-slate-500 mb-1">Custo total</p>
              <p className="font-bold text-orange-600">{formatMoney(quote.total_cost)}</p>
            </div>
            <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200">
              <p className="text-xs text-slate-500 mb-1">Preço unitário</p>
              <p className="font-bold text-blue-600">{formatMoney(quote.unit_price)}</p>
            </div>
            <div className="rounded-2xl p-4 bg-green-50 border border-green-200">
              <p className="text-xs text-slate-500 mb-1">Preço final</p>
              <p className="font-bold text-green-600">{formatMoney(quote.final_price)}</p>
              <p className={`text-xs mt-1 font-bold ${belowCost ? 'text-red-600' : 'text-green-700'}`}>Margem: {Number.isFinite(margin) ? margin.toFixed(1) : '0.0'}%</p>
            </div>
          </div>

          {(quote.width_mm || quote.height_mm) && (
            <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200">
              <p className="text-xs text-slate-500 mb-1">Medidas</p>
              <p className="font-semibold text-slate-800">{quote.width_mm} x {quote.height_mm}{quote.depth_mm ? ` x ${quote.depth_mm}` : ''} mm</p>
            </div>
          )}

          {quote.notes && (
            <div className="rounded-2xl p-4 bg-white border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Observações</p>
              <p className="text-slate-700 break-words">{quote.notes}</p>
            </div>
          )}

          <QuoteRevisionsPanel
            quote={quote}
            onRestore={(revisionRecord) => onRestoreRevision?.(quote, revisionRecord)}
            onPdf={(revisionRecord) => onRevisionPdf?.(quote, revisionRecord)}
            restoringId={restoringRevisionId}
          />
        </div>

        <DialogFooter className="pt-2 flex-wrap gap-2">
          <Button className="w-full sm:w-auto" variant="outline" onClick={onClose}>Fechar</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onGeneratePdf(quote)}><FileText className="w-4 h-4 mr-2" /> Gerar PDF</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEmailPdf(quote)} disabled={!client?.email}><Send className="w-4 h-4 mr-2" /> E-mail</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onWhatsApp(quote)}><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</Button>
          {onCreateOption && <Button className="w-full sm:w-auto" variant="outline" onClick={() => onCreateOption(quote)}><Copy className="w-4 h-4 mr-2" /> Duplicar como opção</Button>}
          {onDecision && <Button className="w-full sm:w-auto" variant="outline" onClick={() => onDecision(quote)}><CheckCircle2 className="w-4 h-4 mr-2" /> Decisão do cliente</Button>}
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onConvert(quote)} disabled={belowCost} title={belowCost ? 'Corrija o preço antes de virar venda' : undefined}><ShoppingCart className="w-4 h-4 mr-2" /> Virar venda</Button>
          <Button className="w-full sm:w-auto" onClick={() => onEdit(quote)}>Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
