import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User, Calendar, Package, DollarSign, CreditCard, FileText,
  Clock, CheckCircle, Factory, Truck
} from 'lucide-react';
import moment from 'moment';
import PDFPedidoButton from '@/components/vendas/PDFPedidoButton';

const statusColors = {
  novo: { background: 'var(--accent-muted)', color: 'var(--accent)' },
  em_producao: { background: 'var(--yellow-muted)', color: 'var(--yellow)' },
  pronto: { background: 'var(--purple-muted)', color: 'var(--purple)' },
  entregue: { background: 'var(--green-muted)', color: 'var(--green)' },
  cancelado: { background: 'var(--red-muted)', color: 'var(--red)' },
};

const paymentStatusColors = {
  pendente: { background: 'var(--orange-muted)', color: 'var(--orange)' },
  parcial: { background: 'var(--yellow-muted)', color: 'var(--yellow)' },
  pago: { background: 'var(--green-muted)', color: 'var(--green)' },
};

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartao credito',
  cartao_debito: 'Cartao debito',
  parcelado: 'Parcelado',
  boleto: 'Boleto',
  crediario: 'Crediario',
};

const statusIcons = {
  novo: Clock,
  em_producao: Factory,
  pronto: CheckCircle,
  entregue: Truck,
};

function InfoBlock({ icon: Icon, label, value, accent }) {
  return (
    <div
      className="rounded-xl p-3 flex items-start gap-3"
      style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)', boxShadow: 'var(--shadow-flat)' }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="font-medium text-sm break-words" style={{ color: 'var(--text-primary)' }}>{value || '-'}</p>
      </div>
    </div>
  );
}

export default function OrderDetailsModal({ order, open, onClose }) {
  if (!order) return null;

  const StatusIcon = statusIcons[order.status] || Clock;
  const itemLines = (order.items || '').split('\n').filter((line) => line.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto"
        style={{
          background: 'var(--bg)',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--r-2xl)',
          border: '1px solid var(--border)',
        }}
      >
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Pedido</p>
              <DialogTitle className="text-xl sm:text-2xl font-bold break-words" style={{ color: 'var(--accent)' }}>
                {order.order_number || '-'}
              </DialogTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="text-sm px-3 py-1 border-0" style={statusColors[order.status] || statusColors.novo}>
                <StatusIcon className="w-3.5 h-3.5 mr-1.5 inline" />
                {order.status?.replace(/_/g, ' ')}
              </Badge>
              <Badge className="text-sm px-3 py-1 border-0" style={paymentStatusColors[order.payment_status] || paymentStatusColors.pendente}>
                {order.payment_status}
              </Badge>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Detalhes do pedido, status, pagamento, itens, valores e acoes disponiveis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBlock icon={User} label="Cliente" value={order.client_name} accent="var(--accent)" />
            <InfoBlock
              icon={Calendar}
              label="Data de entrega"
              value={order.delivery_date ? moment(order.delivery_date).format('DD/MM/YYYY') : 'Nao definida'}
              accent="var(--orange)"
            />
            <InfoBlock
              icon={CreditCard}
              label="Forma de pagamento"
              value={paymentMethodLabels[order.payment_method] || order.payment_method}
              accent="var(--purple)"
            />
            <InfoBlock
              icon={Clock}
              label="Criado em"
              value={order.created_date ? moment(order.created_date).format('DD/MM/YYYY HH:mm') : '-'}
              accent="var(--text-tertiary)"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Itens / Servicos</p>
            </div>
            {itemLines.length > 0 ? (
              <div className="space-y-2">
                {itemLines.map((line, index) => (
                  <div
                    key={`${line}-${index}`}
                    className="rounded-xl px-4 py-3 text-sm break-words"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--bg)',
                      boxShadow: 'var(--shadow-pressed)',
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-xl px-4 py-6 text-center text-sm"
                style={{ color: 'var(--text-tertiary)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}
              >
                Nenhum item descrito
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--green)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Resumo financeiro</p>
            </div>
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}
            >
              <div className="flex justify-between gap-3 text-sm">
                <span style={{ color: 'var(--text-tertiary)' }}>Subtotal</span>
                <span className="text-right" style={{ color: 'var(--text-primary)' }}>R$ {(order.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {order.discount_percent > 0 && (
                <div className="flex justify-between gap-3 text-sm">
                  <span style={{ color: 'var(--text-tertiary)' }}>Desconto</span>
                  <span style={{ color: 'var(--orange)' }}>-{order.discount_percent}%</span>
                </div>
              )}
              <div className="pt-2 flex justify-between gap-3" style={{ borderTop: '1px solid var(--border-inner)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
                <span className="font-bold text-lg text-right" style={{ color: 'var(--green)' }}>
                  R$ {(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Observacoes</p>
              </div>
              <div
                className="rounded-xl px-4 py-3 text-sm italic break-words"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}
              >
                {order.notes}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border-inner)' }}>
            <PDFPedidoButton order={order} />
            <Button className="w-full sm:w-auto" variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
