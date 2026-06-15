import React from 'react';
import ClayBadge from './ClayBadge';

/**
 * StatusBadge — mapeia status de entidades para ClayBadge automaticamente
 */
const STATUS_MAP = {
  // SalesOrder
  novo:         { variant: 'blue',    label: 'Novo' },
  em_producao:  { variant: 'warning', label: 'Em Produção' },
  pronto:       { variant: 'purple',  label: 'Pronto' },
  entregue:     { variant: 'success', label: 'Entregue' },
  cancelado:    { variant: 'danger',  label: 'Cancelado' },
  cancelada:    { variant: 'danger',  label: 'Cancelada' },

  // PaymentStatus
  pendente:     { variant: 'orange',  label: 'Pendente' },
  parcial:      { variant: 'warning', label: 'Parcial' },
  pago:         { variant: 'success', label: 'Pago' },

  // ServiceOrder
  aguardando:   { variant: 'gray',    label: 'Aguardando' },
  em_andamento: { variant: 'info',    label: 'Em Andamento' },
  pausada:      { variant: 'warning', label: 'Pausada' },
  concluida:    { variant: 'success', label: 'Concluída' },

  // Client
  em_dia:       { variant: 'success', label: 'Em Dia' },
  atrasado:     { variant: 'warning', label: 'Atrasado' },
  inadimplente: { variant: 'danger',  label: 'Inadimplente' },

  // Asset
  novo_asset:   { variant: 'success', label: 'Novo' },
  bom:          { variant: 'info',    label: 'Bom' },
  regular:      { variant: 'warning', label: 'Regular' },
  ruim:         { variant: 'orange',  label: 'Ruim' },
  inativo:      { variant: 'danger',  label: 'Inativo' },

  // Priority
  baixa:        { variant: 'gray',    label: 'Baixa' },
  normal:       { variant: 'info',    label: 'Normal' },
  alta:         { variant: 'orange',  label: 'Alta' },
  urgente:      { variant: 'danger',  label: 'Urgente', dot: true },

  // Quote
  rascunho:     { variant: 'gray',    label: 'Rascunho' },
  enviado:      { variant: 'info',    label: 'Enviado' },
  aprovado:     { variant: 'success', label: 'Aprovado' },
  reprovado:    { variant: 'danger',  label: 'Reprovado' },
  expirado:     { variant: 'gray',    label: 'Expirado' },
  recusado:     { variant: 'danger',  label: 'Recusado' },

  // Maintenance
  concluido:    { variant: 'success', label: 'Concluído' },
  em_andamento_m: { variant: 'info', label: 'Em Andamento' },

  // Generic
  ativo:        { variant: 'success', label: 'Ativo' },
  inativa:      { variant: 'danger',  label: 'Inativa' },
  emitida:      { variant: 'success', label: 'Emitida' },
  erro:         { variant: 'danger',  label: 'Erro' },
};

export default function StatusBadge({ status, label: labelOverride, className }) {
  const mapped = STATUS_MAP[status];
  if (!mapped) {
    return (
      <ClayBadge variant="gray" className={className}>
        {labelOverride || status?.replace(/_/g, ' ') || '—'}
      </ClayBadge>
    );
  }
  return (
    <ClayBadge variant={mapped.variant} dot={mapped.dot} className={className}>
      {labelOverride || mapped.label}
    </ClayBadge>
  );
}