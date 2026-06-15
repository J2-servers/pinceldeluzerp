import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wallet, UserRound, CalendarDays, FileText } from 'lucide-react';
import moment from 'moment';

const CAPITAL_ASSET_CATEGORIES = ['maquinas', 'equipamentos'];

export default function CompanyCapitalList({ movements, assets = [], typeLabels, partnerColors, paymentMethods, fmt }) {
  const movementCapital = movements
    .filter((item) => typeLabels[item.type]?.signal === 1)
    .map((item) => ({ ...item, source: 'movement' }));

  const assetCapital = assets
    .filter((asset) => asset.responsible_partner && CAPITAL_ASSET_CATEGORIES.includes(asset.category))
    .map((asset) => ({
      id: `asset-${asset.id}`,
      partner: asset.responsible_partner,
      type: 'ativo_empresa',
      amount: Number(asset.current_value || asset.purchase_value || 0),
      date: asset.purchase_date || asset.acquisition_date || asset.created_date,
      description: asset.name || asset.description || 'Ativo da empresa',
      payment_method: asset.asset_category || asset.category || 'ativo',
      asset_description: asset.notes,
      source: 'asset',
    }));

  const capitalItems = [...movementCapital, ...assetCapital]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const totalCapital = capitalItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const getPaymentLabel = (value) => paymentMethods.find((method) => method.value === value)?.label || value?.replace(/_/g, ' ') || 'Não informado';

  return (
    <div className="p-5" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--r-xl)' }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h4 className="font-black flex items-center gap-2 text-lg" style={{ color: 'var(--text-primary)' }}>
            <Wallet className="w-5 h-5" style={{ color: 'var(--green)' }} />
            Capital da Empresa
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Lista de aportes em dinheiro e maquinários; itens de estoque ficam fora desta conta.</p>
        </div>
        <div className="rounded-2xl px-4 py-3 text-right" style={{ background: 'var(--green-muted)' }}>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--green)' }}>Total em capital</p>
          <p className="text-2xl font-black" style={{ color: 'var(--green)' }}>{fmt(totalCapital)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {capitalItems.map((item) => {
          const typeInfo = item.source === 'asset'
            ? { label: 'Maquinário de aporte', style: { background: 'var(--accent-muted)', color: 'var(--accent)' } }
            : (typeLabels[item.type] || {});
          return (
            <div key={item.id} className="rounded-2xl p-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_1.5fr_auto] gap-4 items-center" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Capital / Aporte</p>
                <Badge style={typeInfo.style || { background: 'var(--green-muted)', color: 'var(--green)' }}>{typeInfo.label || item.type}</Badge>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: partnerColors[item.partner] || '#64748b', color: '#fff' }}>
                  {(item.partner || '?')[0]}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Quem aportou</p>
                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{item.partner || 'Não informado'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Valor aportado</p>
                <p className="text-xl font-black" style={{ color: 'var(--green)' }}>{fmt(item.amount)}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><CalendarDays className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /> {moment(item.date).format('DD/MM/YYYY')}</div>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><UserRound className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /> {getPaymentLabel(item.payment_method)}</div>
                <div className="sm:col-span-2 flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}><FileText className="w-4 h-4 mt-0.5" style={{ color: 'var(--text-tertiary)' }} /> <span>{item.description || item.asset_description || item.notes || 'Sem descrição'}</span></div>
              </div>

              <div className="text-right">
                <span className="inline-flex rounded-full px-3 py-1 text-xs font-black" style={{ background: 'var(--green-muted)', color: 'var(--green)' }}>Entrada</span>
              </div>
            </div>
          );
        })}

        {capitalItems.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface-2)' }}>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>Nenhum capital registrado ainda.</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Clique em “Registrar” para adicionar o primeiro aporte.</p>
          </div>
        )}
      </div>
    </div>
  );
}