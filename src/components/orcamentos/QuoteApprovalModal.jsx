import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency, parseDecimal } from '@/lib/numberFormat';

/**
 * Decisão formal do cliente sobre o orçamento. Aprovar não é só mudar o status:
 * registra QUEM aprovou, quando e sobre qual revisão — e congela essa versão.
 * Reprovar exige um motivo, que fica no histórico.
 */
export default function QuoteApprovalModal({ quote, open, onClose, onConfirm }) {
  const [decision, setDecision] = useState('aprovar');
  const [approvedByName, setApprovedByName] = useState('');
  const [note, setNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDecision('aprovar');
    setApprovedByName(quote?.client_name || '');
    setNote('');
    setRejectionReason('');
    setSaving(false);
  }, [open, quote]);

  if (!quote) return null;

  const revision = Number(quote.revision || 1);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({
        decision,
        approvedByName: approvedByName.trim(),
        note: note.trim(),
        rejectionReason: rejectionReason.trim(),
        revision,
      });
    } finally {
      setSaving(false);
    }
  };

  const approving = decision === 'aprovar';
  const canConfirm = approving ? !!approvedByName.trim() : !!rejectionReason.trim();

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {approving ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            Decisão do cliente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Orçamento {quote.quote_number} · Rev. {revision}</p>
            <p className="text-sm font-semibold text-slate-800">{quote.client_name}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(parseDecimal(quote.final_price))}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision('aprovar')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${approving ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => setDecision('reprovar')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${!approving ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              Reprovar
            </button>
          </div>

          {approving ? (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Quem aprovou (no cliente)</Label>
                <Input className="h-11 rounded-2xl" value={approvedByName} onChange={(event) => setApprovedByName(event.target.value)} placeholder="Nome de quem aprovou" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Observação (opcional)</Label>
                <Input className="h-11 rounded-2xl" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex.: aprovado por WhatsApp, entrega para dia 20" />
              </div>
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Esta revisão será congelada como a versão aprovada. Edições posteriores geram uma nova revisão sem alterar o que foi aprovado.</p>
            </>
          ) : (
            <div className="space-y-1">
              <Label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Motivo da reprovação</Label>
              <Input className="h-11 rounded-2xl" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Ex.: preço acima do orçado pelo cliente" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button
              type="button"
              className={`rounded-2xl text-white ${approving ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={handleConfirm}
              disabled={saving || !canConfirm}
            >
              {saving ? 'Registrando...' : approving ? 'Confirmar aprovação' : 'Confirmar reprovação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
