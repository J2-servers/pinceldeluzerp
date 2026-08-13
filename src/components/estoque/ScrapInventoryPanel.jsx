import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import { CheckCircle2, Plus, Recycle, Scissors, Search, Trash2, X } from 'lucide-react';
import { parseDecimal } from '@/lib/numberFormat';
import { normalizeText } from '@/lib/utils';

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
  disponivel: { label: 'Disponivel', color: 'var(--green)', bg: 'var(--green-muted)' },
  reservado: { label: 'Reservado', color: 'var(--orange)', bg: 'var(--orange-muted)' },
  utilizado: { label: 'Utilizado', color: 'var(--text-tertiary)', bg: 'var(--surface-2)' },
};

const formatM2 = (value) => `${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m2`;
const isAreaStockProduct = (p) => p?.pricing_mode === 'area_m2' && !!p?.track_area_stock;
const scrapArea = (scrap) => Number(scrap.area || 0) || (parseDecimal(scrap.width) * parseDecimal(scrap.height)) / 1000000;

const defaultScrapForm = { product_id: '', material: '', width: '', height: '', thickness: '', location: '', notes: '' };
const defaultFilters = { material: 'all', status: 'all', fitW: '', fitH: '' };

export default function ScrapInventoryPanel({ products = [] }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultScrapForm);
  const [filters, setFilters] = useState(defaultFilters);

  const { data: scraps = [], isLoading } = useQuery({
    queryKey: ['scrapInventory'],
    queryFn: () => erp.entities.ScrapInventory.list('-created_date', 500),
  });

  const areaProducts = useMemo(() => products.filter(isAreaStockProduct), [products]);
  const materials = useMemo(() => [...new Set(scraps.map((s) => String(s.material || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [scraps]);

  const findLinked = (scrap) => {
    if (scrap.product_id) {
      const byId = products.find((p) => p.id === scrap.product_id);
      if (isAreaStockProduct(byId)) return byId;
    }
    const norm = normalizeText(scrap.material || '');
    if (!norm) return null;
    return areaProducts.find((p) => normalizeText(p.name || '') === norm) || null;
  };

  const fitW = parseDecimal(filters.fitW);
  const fitH = parseDecimal(filters.fitH);
  const fitActive = fitW > 0 && fitH > 0;

  const filtered = useMemo(() => scraps.filter((s) => {
    const status = s.status || 'disponivel';
    if (filters.material !== 'all' && String(s.material || '').trim() !== filters.material) return false;
    if (filters.status !== 'all' && status !== filters.status) return false;
    if (fitActive) {
      if (status !== 'disponivel') return false;
      const w = parseDecimal(s.width);
      const h = parseDecimal(s.height);
      const fits = (w >= fitW && h >= fitH) || (h >= fitW && w >= fitH);
      if (!fits) return false;
    }
    return true;
  }), [scraps, filters.material, filters.status, fitActive, fitW, fitH]);

  const summary = useMemo(() => {
    const available = scraps.filter((s) => (s.status || 'disponivel') === 'disponivel');
    return { availableCount: available.length, availableArea: available.reduce((sum, s) => sum + scrapArea(s), 0) };
  }, [scraps]);

  const formArea = (parseDecimal(form.width) * parseDecimal(form.height)) / 1000000;

  const createScrap = useMutation({
    mutationFn: async (data) => {
      const width = parseDecimal(data.width);
      const height = parseDecimal(data.height);
      if (!String(data.material || '').trim()) throw new Error('Informe o material do retalho');
      if (!(width > 0) || !(height > 0)) throw new Error('Informe largura e altura em mm');
      const area = (width * height) / 1000000;
      const linked = data.product_id ? products.find((p) => p.id === data.product_id) : null;
      return erp.entities.ScrapInventory.create({
        material: String(data.material).trim(),
        width,
        height,
        thickness: parseDecimal(data.thickness) || null,
        area: Number(area.toFixed(4)),
        status: 'disponivel',
        location: String(data.location || '').trim(),
        product_id: linked?.id || '',
        notes: String(data.notes || '').trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapInventory'] });
      setShowForm(false);
      setForm(defaultScrapForm);
      toast.success('Retalho registrado');
    },
    onError: (error) => toast.error(error.message || 'Falha ao registrar retalho'),
  });

  const markUsed = useMutation({
    mutationFn: (scrap) => erp.entities.ScrapInventory.update(scrap.id, { status: 'utilizado', used_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapInventory'] });
      toast.success('Retalho marcado como utilizado');
    },
    onError: (error) => toast.error(error.message || 'Falha ao atualizar retalho'),
  });

  const toggleReserve = useMutation({
    mutationFn: (scrap) => erp.entities.ScrapInventory.update(scrap.id, { status: (scrap.status || 'disponivel') === 'reservado' ? 'disponivel' : 'reservado' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scrapInventory'] }),
    onError: (error) => toast.error(error.message || 'Falha ao atualizar retalho'),
  });

  const discardScrap = useMutation({
    mutationFn: async (scrap) => {
      const area = scrapArea(scrap);
      const now = new Date().toISOString();
      await erp.entities.ScrapInventory.update(scrap.id, { status: 'utilizado', used_at: now, discarded_at: now });
      const linked = findLinked(scrap);
      if (linked && area > 0) {
        const user = erp.auth.getCachedUser?.();
        await erp.functions.invoke('adjustStock', {
          product_id: linked.id,
          delta: -area,
          movement_type: 'ajuste',
          reason: 'Sucata de retalho',
          user_name: user?.name || user?.full_name || user?.email || '',
        });
        return { adjusted: true, area, linkedName: linked.name };
      }
      return { adjusted: false, area, linkedName: '' };
    },
    onSuccess: ({ adjusted, area, linkedName }) => {
      queryClient.invalidateQueries({ queryKey: ['scrapInventory'] });
      if (adjusted) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
        toast.success(`Sucata registrada · baixa de ${formatM2(area)} em ${linkedName}`);
      } else {
        toast.success('Retalho descartado como sucata');
      }
    },
    onError: (error) => toast.error(error.message || 'Falha ao descartar retalho'),
  });

  const removeScrap = useMutation({
    mutationFn: (scrap) => erp.entities.ScrapInventory.delete(scrap.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrapInventory'] });
      toast.success('Retalho removido');
    },
    onError: (error) => toast.error(error.message || 'Falha ao remover retalho'),
  });

  const selectProduct = (id) => {
    const product = products.find((p) => p.id === id);
    setForm((prev) => ({
      ...prev,
      product_id: id,
      material: product?.name || prev.material,
      thickness: prev.thickness || (product?.thickness_mm ? String(product.thickness_mm) : ''),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Cabecalho */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={17} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Retalhos e sobras</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {summary.availableCount} {summary.availableCount === 1 ? 'retalho disponivel' : 'retalhos disponiveis'} · {formatM2(summary.availableArea)} reaproveitaveis
              </p>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setForm(defaultScrapForm); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Registrar retalho
          </button>
        </div>
      </div>

      {/* Filtros e busca "que serve para" */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label style={labelStyle}>Material</label>
            <select style={inputStyle} value={filters.material} onChange={(e) => setFilters((prev) => ({ ...prev, material: e.target.value }))}>
              <option value="all">Todos os materiais</option>
              {materials.map((material) => <option key={material} value={material}>{material}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="all">Todos os status</option>
              <option value="disponivel">Disponivel</option>
              <option value="reservado">Reservado</option>
              <option value="utilizado">Utilizado</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Serve para largura (mm)</label>
            <input type="number" step="any" min="0" style={inputStyle} value={filters.fitW} onChange={(e) => setFilters((prev) => ({ ...prev, fitW: e.target.value }))} placeholder="Ex: 300" />
          </div>
          <div>
            <label style={labelStyle}>Serve para altura (mm)</label>
            <input type="number" step="any" min="0" style={inputStyle} value={filters.fitH} onChange={(e) => setFilters((prev) => ({ ...prev, fitH: e.target.value }))} placeholder="Ex: 400" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          <Search size={13} />
          {fitActive ? (
            <span>
              <strong style={{ color: 'var(--accent)' }}>{filtered.length}</strong> {filtered.length === 1 ? 'retalho comporta' : 'retalhos comportam'} a peca {fitW} x {fitH} mm (considera rotacao).
            </span>
          ) : (
            <span>Informe largura e altura para ver quais retalhos disponiveis comportam a peca desejada.</span>
          )}
          {(filters.material !== 'all' || filters.status !== 'all' || fitActive) && (
            <button type="button" className="btn-nm" onClick={() => setFilters(defaultFilters)} style={{ padding: '4px 12px', fontSize: '12px', marginLeft: 'auto' }}>Limpar</button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        {isLoading && <div className="p-10 text-center" style={{ color: 'var(--text-tertiary)' }}>Carregando retalhos...</div>}
        {!isLoading && !filtered.length && (
          <div className="p-10 text-center" style={{ color: 'var(--text-tertiary)' }}>
            {scraps.length ? 'Nenhum retalho para os filtros selecionados.' : 'Nenhum retalho registrado ainda. Registre a primeira sobra reaproveitavel.'}
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-inner)' }}>
                  {['Material', 'Medida', 'Area', 'Status', 'Local', 'Acoes'].map((heading) => (
                    <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest font-black" style={{ color: 'var(--text-tertiary)' }}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((scrap) => {
                  const status = scrap.status || 'disponivel';
                  const config = statusConfig[status] || statusConfig.disponivel;
                  const linked = findLinked(scrap);
                  const done = status === 'utilizado';
                  return (
                    <tr key={scrap.id} style={{ borderBottom: '1px solid var(--border-inner)' }}>
                      <td className="p-3">
                        <p className="font-black break-words" style={{ color: 'var(--text-primary)' }}>{scrap.material || '-'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {scrap.thickness ? `${scrap.thickness} mm esp.` : 'sem espessura'}{linked ? ' · vinculado ao estoque' : ''}
                        </p>
                      </td>
                      <td className="p-3 font-bold" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{parseDecimal(scrap.width)} x {parseDecimal(scrap.height)} mm</td>
                      <td className="p-3 font-black" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{formatM2(scrapArea(scrap))}</td>
                      <td className="p-3">
                        <span className="text-xs font-bold rounded-full px-2 py-1" style={{ background: config.bg, color: config.color }}>{config.label}</span>
                      </td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{scrap.location || '-'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {!done && (
                            <>
                              <button type="button" className="btn-nm" title="Usar: marca como utilizado sem baixar estoque (a area ja saiu na venda que gerou a peca)" onClick={() => markUsed.mutate(scrap)} style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green)' }}>
                                <CheckCircle2 size={13} /> Usar
                              </button>
                              <button type="button" className="btn-nm" title={status === 'reservado' ? 'Liberar retalho' : 'Reservar retalho'} onClick={() => toggleReserve.mutate(scrap)} style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--orange)' }}>
                                {status === 'reservado' ? 'Liberar' : 'Reservar'}
                              </button>
                              <button type="button" className="btn-nm" title="Descartar como sucata: baixa a area perdida do saldo do produto vinculado" onClick={() => discardScrap.mutate(scrap)} style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--red)' }}>
                                <Recycle size={13} /> Descartar
                              </button>
                            </>
                          )}
                          <button type="button" className="btn-nm" title="Remover registro" onClick={() => removeScrap.mutate(scrap)} style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} style={{ color: 'var(--text-tertiary)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal registrar retalho */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)', borderRadius: 'var(--r-2xl)', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Registrar retalho</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-raised)', border: 'none', borderRadius: 'var(--r-md)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createScrap.mutate(form); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Produto vinculado (opcional)</label>
                <select style={inputStyle} value={form.product_id} onChange={(e) => selectProduct(e.target.value)}>
                  <option value="">Material avulso (sem vinculo)</option>
                  {areaProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Vincular a um produto de acrilico por area permite baixar a perda do saldo ao descartar.</div>
              </div>

              <div>
                <label style={labelStyle}>Material</label>
                <input type="text" style={inputStyle} value={form.material} onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))} required placeholder="Ex: Acrilico transparente 3mm" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Largura (mm)</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={form.width} onChange={(e) => setForm((prev) => ({ ...prev, width: e.target.value }))} required placeholder="300" />
                </div>
                <div>
                  <label style={labelStyle}>Altura (mm)</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={form.height} onChange={(e) => setForm((prev) => ({ ...prev, height: e.target.value }))} required placeholder="400" />
                </div>
                <div>
                  <label style={labelStyle}>Espessura (mm)</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={form.thickness} onChange={(e) => setForm((prev) => ({ ...prev, thickness: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Localizacao</label>
                <input type="text" style={inputStyle} value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Prateleira, caixa de sobras..." />
              </div>

              <div>
                <label style={labelStyle}>Observacoes</label>
                <input type="text" style={inputStyle} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Opcional" />
              </div>

              <div style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)', borderRadius: 'var(--r-lg)', padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Area calculada: <strong style={{ color: 'var(--accent)' }}>{formatM2(formArea)}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="button" className="btn-nm" style={{ flex: 1, padding: '10px' }} onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }} disabled={createScrap.isPending}>
                  {createScrap.isPending ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
