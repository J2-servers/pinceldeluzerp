import { Copy, MessageCircle, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/app-toast';
import { copyToClipboard, fmtDT } from './helpers';

export default function MessageDetailModal({ log, onClose }) {
  if (!log) return null;
  const sent = log.status === 'sent';
  const prepared = log.status === 'prepared';
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-600" />
            Detalhe da Mensagem
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-semibold">{log.client_name || 'Sem nome'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Telefone</p>
              <p className="font-semibold">{log.phone || '--'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Status</p>
              <Badge className={sent ? 'bg-emerald-100 text-emerald-700' : prepared ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}>
                {sent ? 'Enviada' : prepared ? 'Preparada' : 'Falhou'}
              </Badge>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Canal</p>
              <Badge variant="outline">{log.channel || 'desconhecido'}</Badge>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Fonte</p>
              <p className="font-medium">{log.source || 'sistema'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Template</p>
              <p className="font-medium">{log.template || 'avulsa'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Data/Hora</p>
              <p className="font-medium">{fmtDT(log.created_date)}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Conteúdo da mensagem</p>
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-800 whitespace-pre-wrap">{log.message || 'sem conteúdo'}</div>
          </div>
          {log.reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <strong>Motivo da falha:</strong> {log.reason}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => { await copyToClipboard(log.message); toast.success('Mensagem copiada'); }}>
              <Copy className="h-4 w-4" /> Copiar texto
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { await copyToClipboard(log.phone); toast.success('Telefone copiado'); }}>
              <Phone className="h-4 w-4" /> Copiar telefone
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
