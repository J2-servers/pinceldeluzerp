import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import { ArrowLeft, CheckCircle2, ClipboardList, Plus, XCircle } from 'lucide-react';
import moment from 'moment';

const inputStyle = {
  background: 'var(--bg)',
  boxShadow: 'var(--shadow-pressed)',
  border: '1px solid var(--border-inner)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-primary)',
  padding: '9px 13px',
  width: '100%',
  outline: 'none',
  fontSize: '14px',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-tertiary)',
  marginBottom: '6px',
};

const statusConfig = {
  planned: { label: 'Planejada', color: 'var(--accent)', bg: 'var(--accent-muted)' },
  in_progress: { label: 'Em andamento', color: 'var(--orange)', bg: 'var(--orange-muted)' },
  finished: { label: 'Concluida', color: 'var(--green)', bg: 'var(--green-muted)' },
  cancelled: { label: 'Cancelada', color: 'var(--red)', bg: 'var(--red-muted)' },
};

const defaultCreateForm = () => ({ name: '', date: moment().format('YYYY-MM-DD'), category: 'all' });

// Referencia estavel para o estado "sem itens" (evita reexecutar efeitos a cada render)
const noItems = [];

function parseCount(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export default function InventoryCountSession({ products = [], categories = [] }) {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState('list');
  const [activeSession, setActiveSession] = useState(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [counts, setCounts] = useState({});

  const { data: sessions = [] } = useQuery({
    queryKey: ['stockCountSessions'],
    queryFn: () => erp.entities.StockCountSession.list('-created_date', 100),
  });

  const { data: items = noItems, isLoading: loadingItems } = useQuery({
    queryKey: ['stockCountItems', activeSession?.id],
    queryFn: () => erp.entities.StockCountItem.filter({ session_id: activeSession.id }, 'product_name', 1000),
    enabled: !!activeSession?.id,
  });

  useEffect(() => {
    const next = {};
    items.forEach((item) => { next[item.id] = item.counted_quantity ?? ''; });
    setCounts(next);
  }, [items]);

  const readOnly = !!activeSession && ['finished', 'cancelled'].includes(activeSession.status);

  const createTargets = useMemo(
    () => products.filter((p) => p.track_stock !== false && (createForm.category === 'all' || p.category === createForm.category)),
    [products, createForm.category],
  );

  const progress = useMemo(() => {
    let counted = 0;
    let divergent = 0;
    items.forEach((item) => {
      const value = parseCount(counts[item.id]);
      if (value === null) return;
      counted += 1;
      if (value !== Number(item.expected_quantity || 0)) divergent += 1;
    });
    return { counted, divergent, total: items.length };
  }, [items, counts]);

  const createSession = useMutation({
    mutationFn: async (form) => {
      if (!String(form.name || '').trim()) throw new Error('Informe o nome da contagem');
      const targets = products.filter((p) => p.track_stock !== false && (form.category === 'all' || p.category === form.category));
      if (!targets.length) throw new Error('Nenhum produto com controle de estoque nesse filtro');
      const user = erp.auth.getCachedUser?.();
      const session = await erp.entities.StockCountSession.create({
        session_number: `INV-${moment().format('YYYYMMDD-HHmmss')}`,
        name: form.name.trim(),
        warehouse_id: 'principal',
        status: 'in_progress',
        scheduled_date: form.date || moment().format('YYYY-MM-DD'),
        started_at: new Date().toISOString(),
        responsible_user_email: user?.email || '',
        category_filter: form.category === 'all' ? '' : form.category,
        total_items: targets.length,
        divergence_count: 0,
      });
      await erp.entities.StockCountItem.bulkCreate(targets.map((p) => ({
        session_id: session.id,
        product_variant_id: p.id,
        product_id: p.id,
        product_name: p.name,
        sku: p.sku || '',
        unit: p.unit || 'un',
        expected_quantity: Number(p.quantity || 0),
      })));
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['stockCountSessions'] });
      queryClient.invalidateQueries({ queryKey: ['stockCountItems'] });
      setActiveSession(session);
      setScreen('count');
      setCreateForm(defaultCreateForm());
      toast.success(`Contagem "${session.name}" iniciada com ${session.total_items} itens`);
    },
    onError: (error) => toast.error(error.message || 'Falha ao criar contagem'),
  });

  const persistCount = async (item) => {
    if (readOnly) return;
    const counted = parseCount(counts[item.id]);
    const expected = Number(item.expected_quantity || 0);
    const stored = item.counted_quantity ?? null;
    if (counted === stored) return;
    try {
      await erp.entities.StockCountItem.update(item.id, {
        counted_quantity: counted,
        difference_quantity: counted === null ? null : counted - expected,
      });
    } catch (error) {
      toast.error(`Falha ao salvar contagem de ${item.product_name}: ${error.message}`);
    }
  };

  const applyAdjustments = useMutation({
    mutationFn: async () => {
      const user = erp.auth.getCachedUser?.();
      const reason = `Inventario: ${activeSession.name || activeSession.session_number}`;
      const pending = items.map((item) => {
        const counted = parseCount(counts[item.id]);
        const expected = Number(item.expected_quantity || 0);
        return { item, counted, expected, diff: counted === null ? 0 : counted - expected };
      });
      // Persiste as quantidades contadas antes de aplicar
      for (const entry of pending) {
        if (entry.counted === null && (entry.item.counted_quantity ?? null) === null) continue;
        await erp.entities.StockCountItem.update(entry.item.id, {
          counted_quantity: entry.counted,
          difference_quantity: entry.counted === null ? null : entry.diff,
        });
      }
      const divergent = pending.filter((entry) => entry.counted !== null && entry.diff !== 0);
      let applied = 0;
      const errors = [];
      for (const entry of divergent) {
        try {
          await erp.functions.invoke('adjustStock', {
            product_id: entry.item.product_id || entry.item.product_variant_id,
            delta: entry.diff,
            movement_type: 'ajuste',
            reason,
            reference_id: activeSession.id,
            user_name: user?.name || user?.full_name || user?.email || '',
          });
          applied += 1;
        } catch (error) {
          errors.push(`${entry.item.product_name}: ${error.message}`);
        }
      }
      await erp.entities.StockCountSession.update(activeSession.id, {
        status: 'finished',
        completed_at: new Date().toISOString(),
        total_items: items.length,
        divergence_count: divergent.length,
      });
      return { applied, errors, divergent: divergent.length };
    },
    onSuccess: ({ applied, errors, divergent }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['stockCountSessions'] });
      queryClient.invalidateQueries({ queryKey: ['stockCountItems'] });
      if (divergent === 0) toast.success('Sessao fechada sem divergencias');
      else toast.success(`${applied} de ${divergent} ajustes aplicados · sessao fechada`);
      if (errors.length) toast.error(errors.slice(0, 3).join(' | '));
      setScreen('list');
      setActiveSession(null);
    },
    onError: (error) => toast.error(error.message || 'Falha ao aplicar ajustes'),
  });

  const cancelSession = useMutation({
    mutationFn: () => erp.entities.StockCountSession.update(activeSession.id, { status: 'cancelled', completed_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockCountSessions'] });
      toast.success('Sessao cancelada');
      setScreen('list');
      setActiveSession(null);
    },
    onError: (error) => toast.error(error.message || 'Falha ao cancelar sessao'),
  });

  const openSession = (session) => {
    setActiveSession(session);
    setScreen('count');
  };

  if (screen === 'create') {
    return (
      <div className="card p-5 space-y-4" style={{ maxWidth: '560px' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={17} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Nova contagem de inventario</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Congela o saldo esperado dos produtos escolhidos para conferencia fisica.</p>
          </div>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); createSession.mutate(createForm); }}
          className="space-y-4"
        >
          <div>
            <label style={labelStyle}>Nome da contagem</label>
            <input style={inputStyle} value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ex: Inventario geral agosto" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Data</label>
              <input type="date" style={inputStyle} value={createForm.date} onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))} required />
            </div>
            <div>
              <label style={labelStyle}>Produtos</label>
              <select style={inputStyle} value={createForm.category} onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}>
                <option value="all">Todos os produtos</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', borderRadius: 'var(--r-lg)', padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {createTargets.length} {createTargets.length === 1 ? 'produto entra' : 'produtos entram'} nesta contagem (somente itens com controle de estoque).
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-nm" style={{ flex: 1 }} onClick={() => { setScreen('list'); setCreateForm(defaultCreateForm()); }}>Voltar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={createSession.isPending || !createTargets.length}>
              {createSession.isPending ? 'Criando...' : 'Iniciar contagem'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (screen === 'count' && activeSession) {
    const status = statusConfig[activeSession.status] || statusConfig.planned;
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" className="btn-nm" onClick={() => { setScreen('list'); setActiveSession(null); }} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center' }} aria-label="Voltar para a lista de sessoes">
                <ArrowLeft size={15} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{activeSession.name || activeSession.session_number}</h3>
                  <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {activeSession.scheduled_date ? moment(activeSession.scheduled_date).format('DD/MM/YYYY') : '-'} · {progress.counted}/{progress.total} contados · {progress.divergent} divergentes
                </p>
              </div>
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <button type="button" className="btn-nm" onClick={() => cancelSession.mutate()} disabled={cancelSession.isPending} style={{ color: 'var(--red)' }}>
                  Cancelar sessao
                </button>
                <button type="button" className="btn-primary" onClick={() => applyAdjustments.mutate()} disabled={applyAdjustments.isPending || !progress.counted}>
                  {applyAdjustments.isPending ? 'Aplicando...' : `Aplicar ajustes (${progress.divergent})`}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          {loadingItems && <div className="p-10 text-center" style={{ color: 'var(--text-tertiary)' }}>Carregando itens...</div>}
          {!loadingItems && !items.length && <div className="p-10 text-center" style={{ color: 'var(--text-tertiary)' }}>Nenhum item nesta sessao.</div>}
          {!loadingItems && items.length > 0 && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-inner)' }}>
                    {['Item', 'Esperado', 'Contado', 'Diferenca'].map((heading) => (
                      <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const counted = parseCount(counts[item.id]);
                    const expected = Number(item.expected_quantity || 0);
                    const diff = counted === null ? null : counted - expected;
                    const diffColor = diff === null ? 'var(--text-tertiary)' : diff === 0 ? 'var(--green)' : 'var(--orange)';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                        <td className="p-3">
                          <p className="font-black break-words" style={{ color: 'var(--text-primary)' }}>{item.product_name || '-'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.sku || 'sem SKU'}</p>
                        </td>
                        <td className="p-3 font-bold" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{expected} {item.unit || 'un'}</td>
                        <td className="p-3" style={{ minWidth: '120px' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            style={{ ...inputStyle, maxWidth: '120px', opacity: readOnly ? 0.7 : 1 }}
                            value={counts[item.id] ?? ''}
                            disabled={readOnly}
                            placeholder="-"
                            onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={() => persistCount(item)}
                            aria-label={`Quantidade contada de ${item.product_name || 'item'}`}
                          />
                        </td>
                        <td className="p-3 font-black" style={{ color: diffColor, whiteSpace: 'nowrap' }}>
                          {diff === null ? '—' : diff === 0 ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} /> ok</span> : `${diff > 0 ? '+' : ''}${diff}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={17} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Inventario fisico</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Crie uma sessao, conte os itens e aplique os ajustes de divergencia no estoque.</p>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => setScreen('create')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Nova contagem
          </button>
        </div>
      </div>

      {!sessions.length && (
        <div className="card p-10 text-center" style={{ color: 'var(--text-tertiary)' }}>
          Nenhuma contagem registrada ainda. Crie a primeira sessao de inventario.
        </div>
      )}

      {sessions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-inner)' }}>
                  {['Contagem', 'Data', 'Status', 'Itens', 'Divergencias', 'Acoes'].map((heading) => (
                    <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const status = statusConfig[session.status] || statusConfig.planned;
                  const open = ['planned', 'in_progress'].includes(session.status);
                  return (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                      <td className="p-3">
                        <p className="font-black break-words" style={{ color: 'var(--text-primary)' }}>{session.name || session.session_number}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{session.session_number}{session.category_filter ? ` · ${session.category_filter}` : ' · todos os produtos'}</p>
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{session.scheduled_date ? moment(session.scheduled_date).format('DD/MM/YYYY') : '-'}</td>
                      <td className="p-3">
                        <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                      </td>
                      <td className="p-3 font-bold" style={{ color: 'var(--text-secondary)' }}>{session.total_items ?? '-'}</td>
                      <td className="p-3">
                        {session.status === 'finished' ? (
                          <span className="inline-flex items-center gap-1 font-black" style={{ color: Number(session.divergence_count || 0) > 0 ? 'var(--orange)' : 'var(--green)' }}>
                            {Number(session.divergence_count || 0) > 0 ? <XCircle size={13} /> : <CheckCircle2 size={13} />} {session.divergence_count || 0}
                          </span>
                        ) : <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                      </td>
                      <td className="p-3">
                        <button type="button" className="btn-nm" onClick={() => openSession(session)} style={{ padding: '7px 14px', fontSize: '12px' }}>
                          {open ? 'Continuar contagem' : 'Ver itens'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
