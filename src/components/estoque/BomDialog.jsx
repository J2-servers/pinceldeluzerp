import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trash2, Wrench, Package, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/app-toast';
import { erp } from '@/api/erpClient';
import { createAuditLog } from '@/lib/erpCoreSync';
import { formatCurrency } from '@/lib/numberFormat';
import { summarizeBom, materialLineCost, operationLineCost, bomLinePayload, componentCost } from '@/lib/bomEngine';

let keySeq = 0;
const nextKey = (prefix) => `${prefix}${(keySeq += 1)}`;
const emptyMaterial = () => ({ _key: nextKey('m'), line_type: 'material', component_product_id: '', quantity: 1, waste_pct: 0, unit: 'un' });
const emptyOperation = () => ({ _key: nextKey('o'), line_type: 'operation', operation_name: '', machine_minutes: 0, machine_cost_per_min: 0, labor_minutes: 0, labor_cost_per_hour: 0 });

export default function BomDialog({ open, onClose, product, products = [], onSaved }) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState([]);

  const { data: storedLines = [], isLoading } = useQuery({
    queryKey: ['productBom', product?.id],
    queryFn: () => erp.entities.ProductBOMItem.filter({ product_id: product.id }),
    enabled: !!product?.id && open,
  });

  useEffect(() => {
    if (!open) return;
    if (storedLines.length) {
      setLines(storedLines
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map((line, index) => ({ ...line, _key: line.id || `s${index}` })));
    } else {
      setLines([]);
    }
  }, [open, storedLines]);

  // Candidatos a material: qualquer produto menos o próprio (evita auto-referência).
  const materialOptions = useMemo(
    () => products.filter((item) => item.id !== product?.id),
    [products, product],
  );

  const materials = lines.filter((line) => line.line_type !== 'operation');
  const operations = lines.filter((line) => line.line_type === 'operation');

  const summary = useMemo(() => summarizeBom(lines, products), [lines, products]);

  const updateLine = (key, patch) => setLines((prev) => prev.map((line) => (line._key === key ? { ...line, ...patch } : line)));
  const removeLine = (key) => setLines((prev) => prev.filter((line) => line._key !== key));
  const addMaterial = () => setLines((prev) => [...prev, emptyMaterial()]);
  const addOperation = () => setLines((prev) => [...prev, emptyOperation()]);

  const onPickComponent = (key, componentId) => {
    const component = products.find((item) => item.id === componentId);
    updateLine(key, { component_product_id: componentId, unit: component?.unit || 'un', component_name: component?.name || '' });
  };

  const save = useMutation({
    mutationFn: async (applyCost) => {
      const validLines = lines.filter((line) => (line.line_type === 'operation' ? (line.operation_name || '').trim() : line.component_product_id));
      const payloads = validLines.map((line, index) => bomLinePayload(product.id, { ...line, sort_order: index }, products));
      // Substitui a ficha inteira (idempotente).
      const existing = await erp.entities.ProductBOMItem.filter({ product_id: product.id });
      await Promise.all(existing.map((line) => erp.entities.ProductBOMItem.delete(line.id)));
      if (payloads.length) await erp.entities.ProductBOMItem.bulkCreate(payloads);
      const totals = summarizeBom(validLines, products);
      if (applyCost) {
        await erp.entities.Product.update(product.id, { cost_price: totals.totalCost });
      }
      await createAuditLog({ module: 'inventory', entity_name: 'Product', entity_id: product.id, action: applyCost ? 'bom_apply_cost' : 'bom_update', document_number: product.sku || product.name, metadata: { material_cost: totals.materialCost, operation_cost: totals.operationCost, total_cost: totals.totalCost, lines: payloads.length } });
      return totals;
    },
    onSuccess: (totals, applyCost) => {
      queryClient.invalidateQueries({ queryKey: ['productBom', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSaved?.(totals);
      toast.success(applyCost ? `Ficha salva — custo do produto atualizado para ${formatCurrency(totals.totalCost)}` : 'Ficha técnica salva');
      onClose();
    },
    onError: (error) => toast.error(error.message || 'Não foi possível salvar a ficha técnica'),
  });

  if (!product) return null;
  const currentCost = componentCost(product);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" /> Ficha técnica — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-slate-500">Materiais consumidos e operações por <b>1 unidade</b> do produto. O custo rolado pode virar o custo oficial do produto.</p>

          {/* MATERIAIS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-black text-slate-800">Materiais</p>
              <Button type="button" size="sm" variant="outline" className="ml-auto h-8 rounded-xl text-xs" onClick={addMaterial}><Plus className="mr-1 h-3.5 w-3.5" /> Material</Button>
            </div>
            {isLoading && <p className="text-xs text-slate-500">Carregando ficha...</p>}
            {!isLoading && materials.length === 0 && <p className="text-xs text-slate-400">Nenhum material. Adicione a matéria-prima consumida.</p>}
            <div className="space-y-2">
              {materials.map((line) => {
                const component = products.find((item) => item.id === line.component_product_id);
                const cost = materialLineCost(line, component);
                return (
                  <div key={line._key} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-[10px] uppercase tracking-wide text-slate-400">Material</Label>
                      <Select value={line.component_product_id || ''} onValueChange={(value) => onPickComponent(line._key, value)}>
                        <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Escolher produto" /></SelectTrigger>
                        <SelectContent>
                          {materialOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.name} · {formatCurrency(componentCost(item))}/{item.unit || 'un'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] uppercase tracking-wide text-slate-400">Qtd ({line.unit || 'un'})</Label>
                      <Input className="h-9 rounded-xl text-xs" type="number" step="any" min="0" value={line.quantity ?? ''} onChange={(event) => updateLine(line._key, { quantity: event.target.value })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] uppercase tracking-wide text-slate-400">Perda %</Label>
                      <Input className="h-9 rounded-xl text-xs" type="number" step="any" min="0" value={line.waste_pct ?? ''} onChange={(event) => updateLine(line._key, { waste_pct: event.target.value })} />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Label className="text-[10px] uppercase tracking-wide text-slate-400">Custo</Label>
                      <p className="h-9 rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700">{formatCurrency(cost)}</p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeLine(line._key)} className="grid h-9 w-9 place-items-center rounded-xl text-red-500 hover:bg-red-50" title="Remover"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPERAÇÕES */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-black text-slate-800">Operações</p>
              <Button type="button" size="sm" variant="outline" className="ml-auto h-8 rounded-xl text-xs" onClick={addOperation}><Plus className="mr-1 h-3.5 w-3.5" /> Operação</Button>
            </div>
            {operations.length === 0 && <p className="text-xs text-slate-400">Nenhuma operação. Adicione corte, gravação, montagem...</p>}
            <div className="space-y-2">
              {operations.map((line) => (
                <div key={line._key} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-400">Operação</Label>
                    <Input className="h-9 rounded-xl text-xs" value={line.operation_name || ''} onChange={(event) => updateLine(line._key, { operation_name: event.target.value })} placeholder="Corte laser, gravação..." />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-400">Máq. min</Label>
                    <Input className="h-9 rounded-xl text-xs" type="number" step="any" min="0" value={line.machine_minutes ?? ''} onChange={(event) => updateLine(line._key, { machine_minutes: event.target.value })} />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-400">R$/min</Label>
                    <Input className="h-9 rounded-xl text-xs" type="number" step="any" min="0" value={line.machine_cost_per_min ?? ''} onChange={(event) => updateLine(line._key, { machine_cost_per_min: event.target.value })} />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-400">MO min</Label>
                    <Input className="h-9 rounded-xl text-xs" type="number" step="any" min="0" value={line.labor_minutes ?? ''} onChange={(event) => updateLine(line._key, { labor_minutes: event.target.value })} />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wide text-slate-400">MO R$/h</Label>
                    <Input className="h-9 rounded-xl text-xs" type="number" step="any" min="0" value={line.labor_cost_per_hour ?? ''} onChange={(event) => updateLine(line._key, { labor_cost_per_hour: event.target.value })} />
                  </div>
                  <div className="col-span-9 sm:col-span-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{formatCurrency(operationLineCost(line))}</span>
                  </div>
                  <div className="col-span-3 sm:col-span-12 flex justify-end sm:mt-1">
                    <button type="button" onClick={() => removeLine(line._key)} className="grid h-8 w-8 place-items-center rounded-xl text-red-500 hover:bg-red-50" title="Remover"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RESUMO */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Material</p>
              <p className="text-sm font-black text-slate-800">{formatCurrency(summary.materialCost)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Operações</p>
              <p className="text-sm font-black text-slate-800">{formatCurrency(summary.operationCost)}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-indigo-500">Custo/unidade</p>
              <p className="text-sm font-black text-indigo-700">{formatCurrency(summary.totalCost)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Custo atual do produto: <b>{formatCurrency(currentCost)}</b>{summary.totalCost > 0 && currentCost !== summary.totalCost ? ` · ficha calcula ${formatCurrency(summary.totalCost)}` : ''}</p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={onClose} disabled={save.isPending}>Cancelar</Button>
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => save.mutate(false)} disabled={save.isPending}>Salvar ficha</Button>
            <Button type="button" className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => save.mutate(true)} disabled={save.isPending}>
              <Sparkles className="mr-1 h-4 w-4" /> Salvar e usar como custo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
