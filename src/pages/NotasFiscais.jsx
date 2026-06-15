import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import EmitirNotaModal from '@/components/fiscal/EmitirNotaModal';
import { ExternalLink, FileText, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_MAP = {
  pendente: { label: 'Processando', badge: 'badge-orange' },
  emitida: { label: 'Autorizada', badge: 'badge-green' },
  cancelada: { label: 'Cancelada', badge: 'badge-purple' },
  erro: { label: 'Erro', badge: 'badge-red' },
};

const money = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const filterPeriods = [
  { label: 'Todos', value: 'all' },
  { label: 'Hoje', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mês', value: 'month' },
];

export default function NotasFiscais() {
  const [showEmitir, setShowEmitir] = useState(false);
  const [consultando, setConsultando] = useState(null);
  const [selectedNota, setSelectedNota] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const queryClient = useQueryClient();

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['notas_fiscais'],
    queryFn: () => erp.entities.NotaFiscal.list('-created_date', 100),
  });

  const consultarStatus = async (nota) => {
    if (!nota.referencia) return;
    setConsultando(nota.id);
    try {
      await erp.functions.invoke('consultarNota', {
        referencia: nota.referencia,
        tipo: nota.tipo,
        nota_id: nota.id,
      });
      queryClient.invalidateQueries({ queryKey: ['notas_fiscais'] });
    } catch (e) {}
    setConsultando(null);
  };

  const isInPeriod = (nota) => {
    if (filterPeriod === 'all') return true;
    const date = nota.created_date ? new Date(nota.created_date) : null;
    if (!date) return false;
    const now = new Date();
    if (filterPeriod === 'today') return date.toDateString() === now.toDateString();
    if (filterPeriod === 'week') { const week = new Date(now); week.setDate(week.getDate() - 7); return date >= week; }
    if (filterPeriod === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = notas.filter((n) => (filterStatus === 'all' || n.status === filterStatus) && isInPeriod(n));

  const totais = {
    emitidas: notas.filter(n => n.status === 'emitida').length,
    pendentes: notas.filter(n => n.status === 'pendente').length,
    erros: notas.filter(n => n.status === 'erro').length,
    valor: notas.filter(n => n.status === 'emitida').reduce((a, b) => a + (b.valor_total || 0), 0),
  };

  const kpis = [
    { label: 'Autorizadas', value: totais.emitidas, color: 'var(--green)' },
    { label: 'Processando', value: totais.pendentes, color: 'var(--orange)' },
    { label: 'Com Erro', value: totais.erros, color: 'var(--red)' },
    { label: 'Total Emitido', value: money(totais.valor), color: 'var(--purple)' },
  ];

  return (
    <div className="space-y-6">
      <Header title="Notas Fiscais" subtitle="NF-e e NFS-e via Focus NFe" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <p className="kpi-number" style={{ color: kpi.color }}>{kpi.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtro período */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {filterPeriods.map((p) => (
              <button
                key={p.value}
                onClick={() => setFilterPeriod(p.value)}
                className={filterPeriod === p.value ? 'card-pressed' : 'card'}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--r-full)', border: filterPeriod === p.value ? '1px solid var(--accent-border)' : '1px solid var(--border)', color: filterPeriod === p.value ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filtro status */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ value: 'all', label: 'Todos status' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))].map((s) => (
              <button
                key={s.value}
                onClick={() => setFilterStatus(s.value)}
                className={filterStatus === s.value ? 'card-pressed' : 'card'}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--r-full)', border: filterStatus === s.value ? '1px solid var(--accent-border)' : '1px solid var(--border)', color: filterStatus === s.value ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowEmitir(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', fontSize: 13, whiteSpace: 'nowrap' }}
        >
          <Plus size={15} /> Nova Nota
        </button>
      </div>

      {/* Tabela neumórfica */}
      <div className="card p-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={15} style={{ color: 'var(--accent)' }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>
            Notas emitidas <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 12 }}>({filtered.length})</span>
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-tertiary)' }}>
            <Loader2 size={28} style={{ margin: '0 auto 10px', opacity: 0.5, animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 14 }}>Carregando notas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-tertiary)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)' }}>Nenhuma nota encontrada</p>
            <p style={{ fontSize: 13 }}>Ajuste os filtros ou emita uma nova nota fiscal.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* Header da tabela */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 130px 110px 120px 80px', gap: 8, padding: '0 12px 10px', borderBottom: '1px solid var(--border)' }}>
              {['Data', 'Tipo', 'Cliente', 'Valor', 'Número', 'Status', 'Ações'].map((h) => (
                <p key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
              ))}
            </div>

            <div className="space-y-1" style={{ marginTop: 6 }}>
              {filtered.map((nota) => {
                const st = STATUS_MAP[nota.status] || STATUS_MAP.pendente;
                return (
                  <div
                    key={nota.id}
                    onClick={() => setSelectedNota(nota)}
                    style={{ display: 'grid', gridTemplateColumns: '100px 80px 1fr 130px 110px 120px 80px', gap: 8, padding: '12px', borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'background 0.15s ease', border: '1px solid transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-inner)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                      {nota.created_date ? format(new Date(nota.created_date), 'dd/MM/yy', { locale: ptBR }) : '-'}
                    </span>
                    <div style={{ alignSelf: 'center' }}>
                      <span className={nota.tipo === 'nfe' ? 'badge-blue' : 'badge-purple'} style={{ fontSize: 11, fontFamily: 'monospace' }}>
                        {nota.tipo?.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nota.cliente_nome}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
                      {money(nota.valor_total)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace', alignSelf: 'center' }}>{nota.numero_nota || '-'}</span>
                    <div style={{ alignSelf: 'center' }}>
                      <span className={st.badge} style={{ fontSize: 11 }}>{st.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignSelf: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {nota.status === 'pendente' && (
                        <button
                          onClick={() => consultarStatus(nota)}
                          disabled={consultando === nota.id}
                          style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                          title="Atualizar status"
                        >
                          {consultando === nota.id
                            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <RefreshCw size={13} />}
                        </button>
                      )}
                      {nota.url_danfe && (
                        <a
                          href={nota.url_danfe}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', textDecoration: 'none' }}
                          title="Ver DANFE/PDF"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes da NF */}
      {selectedNota && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setSelectedNota(null)}>
          <div
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', margin: 0 }}>Detalhes da Nota Fiscal</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{selectedNota.tipo?.toUpperCase()} — {selectedNota.numero_nota || 'sem número'}</p>
              </div>
              <button onClick={() => setSelectedNota(null)} style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Cliente', value: selectedNota.cliente_nome || '-' },
                { label: 'Data de emissão', value: selectedNota.created_date ? format(new Date(selectedNota.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-' },
                { label: 'Valor total', value: money(selectedNota.valor_total) },
                { label: 'Número', value: selectedNota.numero_nota || '-' },
                { label: 'Referência', value: selectedNota.referencia || '-' },
              ].map((row) => (
                <div key={row.label} className="card-pressed" style={{ padding: '10px 14px', border: '1px solid var(--border-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-pressed)', border: '1px solid var(--border-inner)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Status</span>
                <span className={(STATUS_MAP[selectedNota.status] || STATUS_MAP.pendente).badge} style={{ fontSize: 12 }}>
                  {(STATUS_MAP[selectedNota.status] || STATUS_MAP.pendente).label}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {selectedNota.status === 'pendente' && (
                <button
                  onClick={() => { consultarStatus(selectedNota); setSelectedNota(null); }}
                  className="btn-nm"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontWeight: 600, fontSize: 13 }}
                >
                  <RefreshCw size={14} /> Atualizar status
                </button>
              )}
              {selectedNota.url_danfe && (
                <a href={selectedNota.url_danfe} target="_blank" rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Ver DANFE
                </a>
              )}
              {!selectedNota.url_danfe && (
                <button onClick={() => setSelectedNota(null)} className="btn-nm" style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: 13 }}>Fechar</button>
              )}
            </div>
          </div>
        </div>
      )}

      <EmitirNotaModal open={showEmitir} onClose={() => { setShowEmitir(false); queryClient.invalidateQueries({ queryKey: ['notas_fiscais'] }); }} pedido={null} />
    </div>
  );
}
