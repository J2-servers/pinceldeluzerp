import React, { useMemo, useState } from 'react';
import { erp } from '@/api/erpClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, CheckCircle, XCircle, ExternalLink, Receipt } from 'lucide-react';
import { parseDecimal } from '@/lib/numberFormat';

export default function EmitirNotaModal({ open = true, onClose, pedido = null, order = null }) {
  const activeOrder = pedido || order;
  const initialForm = useMemo(() => ({
    tipo: 'nfse',
    cliente_nome: activeOrder?.client_name || '',
    cliente_cpf_cnpj: '',
    cliente_email: '',
    valor_total: activeOrder?.total || activeOrder?.final_price || activeOrder?.total_price || '',
    descricao: activeOrder?.items || activeOrder?.product_name || activeOrder?.description || 'Serviços conforme pedido',
  }), [activeOrder]);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const reset = () => {
    setResultado(null);
    setForm(initialForm);
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const handleEmitir = async () => {
    if (!form.cliente_nome || !parseDecimal(form.valor_total)) return;
    setLoading(true);
    setResultado(null);

    try {
      const res = await erp.functions.invoke('emitirNota', {
        tipo: form.tipo,
        pedido_id: activeOrder?.id || '',
        cliente_nome: form.cliente_nome,
        cliente_cpf_cnpj: form.cliente_cpf_cnpj || undefined,
        cliente_email: form.cliente_email || undefined,
        valor_total: parseDecimal(form.valor_total),
        descricao: form.descricao,
      });
      setResultado({ ok: !!res.data?.success, data: res.data || {} });
    } catch (e) {
      if (erp.isLocal) {
        try {
          const nota = await erp.entities.NotaFiscal.create({
            pedido_id: activeOrder?.id || '',
            tipo: form.tipo,
            cliente_nome: form.cliente_nome,
            cliente_cpf_cnpj: form.cliente_cpf_cnpj || '',
            cliente_email: form.cliente_email || '',
            valor_total: parseDecimal(form.valor_total),
            descricao: form.descricao,
            status: 'emitida_local',
            ambiente: 'local',
            numero_nota: `LOCAL-${Date.now().toString().slice(-6)}`,
            mensagem: 'Nota de contingencia criada no modo local. Sem validade fiscal.',
          });
          setResultado({ ok: true, data: nota });
          return;
        } catch (localError) {
          setResultado({ ok: false, data: { error: localError.message || e.message } });
          return;
        }
      }
      setResultado({ ok: false, data: { error: e.message } });
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--r-2xl)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Receipt className="w-4 h-4" style={{ color: 'var(--purple)' }} />
            Emitir Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tipo de Nota</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'nfse', label: 'NFS-e', sub: 'Nota de Serviço' },
                  { v: 'nfe', label: 'NF-e', sub: 'Nota de Produto' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, tipo: opt.v }))}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: form.tipo === opt.v ? 'var(--purple-muted)' : 'var(--bg)',
                      color: form.tipo === opt.v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      boxShadow: form.tipo === opt.v ? 'var(--shadow-pressed)' : 'var(--shadow-flat)',
                    }}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs opacity-70">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Nome do Cliente *</Label>
                <Input value={form.cliente_nome} onChange={f('cliente_nome')} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>CPF / CNPJ</Label>
                <Input value={form.cliente_cpf_cnpj} onChange={f('cliente_cpf_cnpj')} placeholder="Opcional" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Email (para envio)</Label>
                <Input value={form.cliente_email} onChange={f('cliente_email')} placeholder="Opcional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Valor Total (R$) *</Label>
                <Input value={form.valor_total} onChange={f('valor_total')} placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Descrição / Discriminação</Label>
              <Input value={form.descricao} onChange={f('descricao')} placeholder="Descrição dos serviços/produtos" />
            </div>

            <div className="pt-1 p-3 rounded-lg" style={{ background: 'var(--yellow-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--yellow)' }}>
                Em ambiente de <strong>homologação</strong>, as notas não têm validade fiscal. Mude para <strong>produção</strong> em Configurações quando estiver pronto.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={close} style={{ color: 'var(--text-secondary)' }}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={handleEmitir}
                disabled={loading || !form.cliente_nome || !parseDecimal(form.valor_total)}
                className="btn-add flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {loading ? 'Emitindo...' : 'Emitir Nota'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            {resultado.ok ? (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--green-muted)' }}>
                    <CheckCircle className="w-8 h-8" style={{ color: 'var(--green)' }} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Nota emitida</p>
                  {resultado.data.numero_nota && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Número: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{resultado.data.numero_nota}</span></p>
                  )}
                  {resultado.data.status === 'pendente' && (
                    <p className="text-sm mt-1" style={{ color: 'var(--yellow)' }}>Processando. Consulte em Notas Fiscais em instantes.</p>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  {resultado.data.url_danfe && (
                    <a href={resultado.data.url_danfe} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gradient-primary gap-2">
                        <ExternalLink className="w-3.5 h-3.5" /> Ver DANFE/PDF
                      </Button>
                    </a>
                  )}
                  {resultado.data.url_xml && (
                    <a href={resultado.data.url_xml} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <ExternalLink className="w-3.5 h-3.5" /> Download XML
                      </Button>
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--red-muted)' }}>
                    <XCircle className="w-8 h-8" style={{ color: 'var(--red)' }} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Erro na emissão</p>
                  <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: 'var(--red)' }}>{resultado.data.error || 'Erro desconhecido. Verifique as configurações.'}</p>
                </div>
              </>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={close} style={{ color: 'var(--text-secondary)' }}>
                Fechar
              </Button>
              {!resultado.ok && (
                <Button variant="outline" onClick={() => setResultado(null)} style={{ color: 'var(--purple)' }}>
                  Tentar novamente
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
