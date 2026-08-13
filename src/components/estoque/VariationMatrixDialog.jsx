import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grid3x3, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { toast } from '@/components/ui/app-toast';
import ImageUploadField from '@/components/estoque/ImageUploadField';
import { createAuditLog } from '@/lib/erpCoreSync';
import { parseDecimal, roundCurrency, formatCurrency } from '@/lib/numberFormat';
import { normalizeText } from '@/lib/utils';

// Campos estruturais herdados do produto-base por cada variação nova.
const INHERIT_FIELDS = [
  'category', 'category_id', 'product_group', 'description', 'unit', 'pricing_mode',
  'dimensions_required', 'can_quote', 'can_sell', 'track_stock', 'auto_deduct_on_sale',
  'track_area_stock', 'min_stock_m2', 'min_quantity', 'max_quantity', 'lead_time_days',
  'sheet_width_mm', 'sheet_height_mm', 'thickness_mm', 'default_markup_pct',
  'material_waste_pct', 'waste_pct', 'supplier_name', 'brand', 'location',
  'price_per_m2', 'material_cost_m2', 'is_active',
];

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value === 'string' && value.trim()) {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
}

// Assinatura estável de uma combinação (ordena por nome de atributo).
function comboSignature(attrsMap) {
  return Object.keys(attrsMap).sort().map((k) => `${k}=${attrsMap[k]}`).join('|');
}

// Produto cartesiano dos valores de cada atributo.
function cartesian(attributes) {
  const valid = attributes.filter((a) => a.name.trim() && a.values.length);
  if (!valid.length) return [];
  return valid.reduce((acc, attr) => {
    const next = [];
    acc.forEach((combo) => {
      attr.values.forEach((value) => next.push({ ...combo, [attr.name.trim()]: value }));
    });
    return next;
  }, [{}]);
}

function skuSuffix(attrsMap) {
  return Object.values(attrsMap)
    .map((v) => normalizeText(String(v)).replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase())
    .filter(Boolean)
    .join('-');
}

export default function VariationMatrixDialog({ open, onClose, baseProduct, products = [], onSaved }) {
  const queryClient = useQueryClient();
  const groupId = baseProduct ? (baseProduct.variant_group_id || baseProduct.id) : '';
  const [attributes, setAttributes] = useState([]);
  const [overrides, setOverrides] = useState({}); // signature -> {include, sku, sale_price, cost_price, quantity, image_url, existingId}
  const [newAttrName, setNewAttrName] = useState('');

  const groupMembers = useMemo(
    () => (groupId ? products.filter((p) => (p.variant_group_id || '') === groupId && p.id !== groupId) : []),
    [products, groupId],
  );

  useEffect(() => {
    if (!open || !baseProduct) return;
    // 1) atributos: do schema do pai, ou reconstruídos das variações existentes.
    let attrs = parseJson(baseProduct.variant_attribute_schema, []);
    if (!attrs.length && groupMembers.length) {
      const map = {};
      groupMembers.forEach((m) => {
        const va = parseJson(m.variant_attributes, {});
        Object.entries(va).forEach(([name, value]) => {
          if (!map[name]) map[name] = new Set();
          map[name].add(String(value));
        });
      });
      attrs = Object.entries(map).map(([name, set]) => ({ name, values: Array.from(set) }));
    }
    setAttributes(attrs.map((a) => ({ name: a.name, values: [...(a.values || [])] })));

    // 2) overrides: variações existentes prefilladas por assinatura.
    const initial = {};
    groupMembers.forEach((m) => {
      const va = parseJson(m.variant_attributes, {});
      const sig = comboSignature(va);
      if (!sig) return;
      initial[sig] = {
        include: m.is_active !== false,
        sku: m.sku || '',
        sale_price: m.sale_price ?? '',
        cost_price: m.cost_price ?? '',
        quantity: m.quantity ?? 0,
        image_url: m.image_url || '',
        existingId: m.id,
      };
    });
    setOverrides(initial);
    setNewAttrName('');
  }, [open, baseProduct, groupMembers]);

  const combos = useMemo(() => cartesian(attributes), [attributes]);

  const existingSkus = useMemo(
    () => new Set(products.map((p) => String(p.sku || '').trim().toUpperCase()).filter(Boolean)),
    [products],
  );

  const rows = useMemo(() => combos.map((attrsMap) => {
    const sig = comboSignature(attrsMap);
    const label = Object.values(attrsMap).join(' · ');
    const ov = overrides[sig] || {};
    const baseSku = String(baseProduct?.sku || normalizeText(baseProduct?.name || 'PRD').replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase() || 'PRD');
    const autoSku = `${baseSku}-${skuSuffix(attrsMap)}`;
    return {
      sig, attrsMap, label,
      isNew: !ov.existingId,
      include: ov.include ?? true,
      sku: ov.sku ?? autoSku,
      sale_price: ov.sale_price ?? (baseProduct?.sale_price ?? ''),
      cost_price: ov.cost_price ?? (baseProduct?.cost_price ?? ''),
      quantity: ov.quantity ?? 0,
      image_url: ov.image_url ?? '',
      existingId: ov.existingId || null,
    };
  }), [combos, overrides, baseProduct]);

  const setRow = (sig, field, value) => setOverrides((prev) => ({ ...prev, [sig]: { ...prev[sig], [field]: value } }));

  const addAttribute = () => {
    const name = newAttrName.trim();
    if (!name || attributes.some((a) => a.name.trim().toLowerCase() === name.toLowerCase())) return;
    setAttributes((prev) => [...prev, { name, values: [] }]);
    setNewAttrName('');
  };
  const removeAttribute = (index) => setAttributes((prev) => prev.filter((_, i) => i !== index));
  const addValue = (index, raw) => {
    const value = String(raw).trim();
    if (!value) return;
    setAttributes((prev) => prev.map((a, i) => (i === index && !a.values.includes(value) ? { ...a, values: [...a.values, value] } : a)));
  };
  const removeValue = (index, value) => setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, values: a.values.filter((v) => v !== value) } : a)));

  const includedRows = rows.filter((r) => r.include);
  const newCount = rows.filter((r) => r.isNew && r.include).length;
  const existingCount = rows.filter((r) => !r.isNew).length;

  const save = useMutation({
    mutationFn: async () => {
      const schema = attributes.filter((a) => a.name.trim() && a.values.length).map((a) => ({ name: a.name.trim(), values: a.values }));
      // 1) pai vira o container do grupo e guarda o schema de atributos.
      await erp.entities.Product.update(baseProduct.id, {
        variant_group_id: groupId || baseProduct.id,
        variant_attribute_schema: JSON.stringify(schema),
      });
      // 2) cada combinação incluída: cria ou atualiza a variação.
      for (const r of rows.filter((row) => row.include)) {
        const payload = {
          variant_group_id: groupId || baseProduct.id,
          variant_attributes: JSON.stringify(r.attrsMap),
          variant_label: r.label,
          sku: String(r.sku || '').trim(),
          sale_price: roundCurrency(r.sale_price),
          cost_price: roundCurrency(r.cost_price),
          quantity: parseDecimal(r.quantity),
          image_url: r.image_url || '',
          is_active: true,
        };
        if (r.existingId) {
          await erp.entities.Product.update(r.existingId, payload);
        } else {
          const inherited = {};
          INHERIT_FIELDS.forEach((f) => { if (baseProduct[f] !== undefined) inherited[f] = baseProduct[f]; });
          await erp.entities.Product.create({ ...inherited, name: baseProduct.name, product_group: baseProduct.product_group || baseProduct.category || '', ...payload });
        }
      }
      // 3) combinações existentes agora desmarcadas: desativa (não apaga).
      for (const r of rows.filter((row) => !row.include && row.existingId)) {
        await erp.entities.Product.update(r.existingId, { is_active: false });
      }
      await createAuditLog({
        module: 'inventory', entity_name: 'Product', entity_id: baseProduct.id, action: 'variation_matrix',
        document_number: baseProduct.name,
        metadata: { attributes: schema.map((s) => s.name), combinations: rows.filter((row) => row.include).length },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSaved?.();
      toast.success('Variacoes salvas');
      onClose();
    },
    onError: (error) => toast.error(error.message || 'Nao foi possivel salvar as variacoes'),
  });

  if (!baseProduct) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[1080px] max-h-[calc(100dvh-1rem)] overflow-y-auto p-0 bg-slate-50">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700"><Grid3x3 className="h-5 w-5" /></span>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">Matriz de variacoes — {baseProduct.name}</DialogTitle>
              <p className="mt-0.5 text-sm text-slate-500">Defina os atributos e o sistema gera cada combinacao com SKU, preco, custo e estoque proprios.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* Atributos */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-black text-slate-900">1. Atributos e valores</h3>
            <div className="space-y-3">
              {attributes.map((attr, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-9 max-w-[220px] bg-white"
                      value={attr.name}
                      onChange={(event) => setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, name: event.target.value } : a)))}
                      placeholder="Nome do atributo (ex: Cor)"
                    />
                    <button type="button" className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => removeAttribute(index)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {attr.values.map((value) => (
                      <span key={value} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
                        {value}
                        <button type="button" onClick={() => removeValue(index, value)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <ValueAdder onAdd={(v) => addValue(index, v)} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input className="h-9 max-w-[220px]" value={newAttrName} onChange={(event) => setNewAttrName(event.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttribute(); } }} placeholder="Novo atributo (ex: Espessura)" />
                <Button type="button" variant="outline" className="h-9" onClick={addAttribute} disabled={!newAttrName.trim()}><Plus className="h-4 w-4" /> Atributo</Button>
              </div>
            </div>
          </section>

          {/* Combinações */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black text-slate-900">2. Combinacoes</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">{includedRows.length} ativas</span>
                {newCount > 0 && <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700">{newCount} novas</span>}
                {existingCount > 0 && <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700">{existingCount} existentes</span>}
              </div>
            </div>
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                Adicione atributos com pelo menos um valor para gerar as combinacoes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="py-2 pr-2">Ativa</th>
                      <th className="py-2 pr-2">Foto</th>
                      <th className="py-2 pr-2">Variacao</th>
                      <th className="py-2 pr-2">SKU</th>
                      <th className="py-2 pr-2">Venda</th>
                      <th className="py-2 pr-2">Custo</th>
                      <th className="py-2 pr-2">Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const dupSku = r.include && r.sku && existingSkus.has(String(r.sku).toUpperCase()) && !r.existingId;
                      return (
                        <tr key={r.sig} className={`border-b border-slate-100 ${r.include ? '' : 'opacity-50'}`}>
                          <td className="py-2 pr-2"><input type="checkbox" checked={r.include} onChange={(e) => setRow(r.sig, 'include', e.target.checked)} /></td>
                          <td className="py-2 pr-2"><ImageUploadField compact size={40} value={r.image_url} onChange={(url) => setRow(r.sig, 'image_url', url)} label={r.label} /></td>
                          <td className="py-2 pr-2">
                            <span className="font-bold text-slate-800">{r.label}</span>
                            {r.isNew ? <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">nova</span> : null}
                          </td>
                          <td className="py-2 pr-2"><Input className={`h-8 w-32 ${dupSku ? 'border-red-400' : ''}`} value={r.sku} onChange={(e) => setRow(r.sig, 'sku', e.target.value)} title={dupSku ? 'SKU ja usado por outro produto' : ''} /></td>
                          <td className="py-2 pr-2"><Input className="h-8 w-24" type="number" step="0.01" value={r.sale_price} onChange={(e) => setRow(r.sig, 'sale_price', e.target.value)} /></td>
                          <td className="py-2 pr-2"><Input className="h-8 w-24" type="number" step="0.01" value={r.cost_price} onChange={(e) => setRow(r.sig, 'cost_price', e.target.value)} /></td>
                          <td className="py-2 pr-2"><Input className="h-8 w-20" type="number" step="any" value={r.quantity} onChange={(e) => setRow(r.sig, 'quantity', e.target.value)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {includedRows.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Valor de venda somando as variacoes ativas: {formatCurrency(includedRows.reduce((s, r) => s + parseDecimal(r.sale_price) * parseDecimal(r.quantity), 0))} em estoque.
              </p>
            )}
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending || includedRows.length === 0}>
            {save.isPending ? 'Salvando...' : `Salvar ${includedRows.length} variacao(oes)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValueAdder({ onAdd }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-8 w-32"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(value); setValue(''); } }}
        placeholder="+ valor"
      />
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => { onAdd(value); setValue(''); }} disabled={!value.trim()}><Plus className="h-3.5 w-3.5" /></Button>
    </div>
  );
}
