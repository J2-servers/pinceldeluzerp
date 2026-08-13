import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderTree, Plus, Pencil, Check, X } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { normalizeText } from '@/lib/utils';
import { flattenTreeForSelect, mergeCategories, indentedLabel, getDescendantIds } from '@/components/catalog/categoryTree';

const ROOT = '__root__';

const toCode = (name) => normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Gerenciador de categorias em arvore: criar (raiz/sub), renomear e reparentar.
// NAO precisa estar plugado em nenhuma pagina para funcionar; e um componente autonomo.
// Props:
//   open, onClose           -> controle do dialog.
//   categories              -> lista plana de ProductCategory (vinda do pai).
//   onCategoriesChanged?()  -> pai pode revalidar sua lista apos cada alteracao (opcional).
export default function CategoryManagerDialog({ open, onClose, categories = [], onCategoriesChanged }) {
  // Alteracoes locais refletidas na hora, mesmo antes do refetch do pai (extra vence).
  const [local, setLocal] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rootName, setRootName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [subFor, setSubFor] = useState(null);
  const [subName, setSubName] = useState('');

  useEffect(() => {
    if (!open) {
      setLocal([]);
      setError('');
      setRootName('');
      setEditingId(null);
      setEditingName('');
      setSubFor(null);
      setSubName('');
    }
  }, [open]);

  const all = useMemo(() => mergeCategories(categories, local), [categories, local]);
  const rows = useMemo(() => flattenTreeForSelect(all), [all]);

  const applyLocal = (record) => { if (record) setLocal((prev) => mergeCategories(prev, [record])); };

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      onCategoriesChanged?.();
    } catch (e) {
      setError((e && e.message) || 'Operacao falhou.');
    } finally {
      setBusy(false);
    }
  };

  const nameTaken = (name, code) => all.some((c) => c && (c.name === name || (c.code && c.code === code)));

  const createRoot = () => {
    const name = rootName.trim();
    if (!name) return;
    const code = toCode(name);
    if (nameTaken(name, code)) { setError('Ja existe uma categoria com esse nome.'); return; }
    run(async () => {
      const created = await erp.entities.ProductCategory.create({ name, code, active: true });
      applyLocal(created);
      setRootName('');
    });
  };

  const createSub = (parent) => {
    const name = subName.trim();
    if (!name) return;
    const code = toCode(name);
    if (nameTaken(name, code)) { setError('Ja existe uma categoria com esse nome.'); return; }
    run(async () => {
      const created = await erp.entities.ProductCategory.create({
        name,
        code,
        parent_category_id: String(parent.id),
        active: true,
      });
      applyLocal(created);
      setSubFor(null);
      setSubName('');
    });
  };

  const saveRename = (cat) => {
    const name = editingName.trim();
    if (!name) return;
    run(async () => {
      const updated = await erp.entities.ProductCategory.update(cat.id, { name });
      applyLocal(updated || { ...cat, name });
      setEditingId(null);
      setEditingName('');
    });
  };

  const reparent = (cat, nextValue) => {
    const parent_category_id = nextValue === ROOT ? null : String(nextValue);
    run(async () => {
      const updated = await erp.entities.ProductCategory.update(cat.id, { parent_category_id });
      applyLocal(updated || { ...cat, parent_category_id });
    });
  };

  // Opcoes de pai para reparent: exclui a propria categoria e todos os seus descendentes (anti-ciclo).
  const parentChoices = (cat) => {
    const banned = getDescendantIds(all, cat.id);
    banned.add(String(cat.id));
    return rows.filter((r) => r.category.id !== undefined && r.category.id !== null && !banned.has(String(r.category.id)));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-blue-600" />
            Categorias de produto
          </DialogTitle>
          <DialogDescription>
            Organize as categorias em arvore: crie subcategorias, renomeie e mude o pai.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nova categoria raiz</Label>
          <div className="flex gap-2">
            <Input
              value={rootName}
              onChange={(e) => { setRootName(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createRoot(); } }}
              placeholder="Ex.: Acrilico"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={createRoot} disabled={busy || !rootName.trim()} className="shrink-0">
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="max-h-[46vh] space-y-1 overflow-y-auto pr-1">
          {rows.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-slate-400">Nenhuma categoria cadastrada ainda.</p>
          )}
          {rows.map(({ category, depth }) => {
            const currentParent = category.parent_category_id !== undefined && category.parent_category_id !== null
              ? String(category.parent_category_id)
              : ROOT;
            const isEditing = editingId === category.id;
            return (
              <div key={String(category.id)} className="rounded-lg border border-transparent px-1.5 py-1 hover:border-slate-200 hover:bg-white">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1" style={{ paddingLeft: `${depth * 16}px` }}>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); saveRename(category); }
                            if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                          }}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveRename(category)} disabled={busy} title="Salvar">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(null); setEditingName(''); }} title="Cancelar">
                          <X className="h-4 w-4 text-slate-400" />
                        </Button>
                      </div>
                    ) : (
                      <span className="truncate text-sm font-medium text-slate-700">
                        {depth > 0 && <span className="text-slate-300">↳ </span>}
                        {category.name}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1.5">
                      <Select value={currentParent} onValueChange={(v) => reparent(category, v)} disabled={busy}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Categoria pai" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROOT}>Sem pai (raiz)</SelectItem>
                          {parentChoices(category).map((r) => (
                            <SelectItem key={String(r.category.id)} value={String(r.category.id)}>
                              {indentedLabel(r.category.name, r.depth)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => { setSubFor(subFor === category.id ? null : category.id); setSubName(''); setError(''); }}
                        title="Adicionar subcategoria"
                      >
                        <Plus className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => { setEditingId(category.id); setEditingName(category.name); setError(''); }}
                        title="Renomear"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  )}
                </div>

                {subFor === category.id && !isEditing && (
                  <div className="mt-1.5 flex items-center gap-2" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
                    <Input
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); createSub(category); }
                        if (e.key === 'Escape') { setSubFor(null); setSubName(''); }
                      }}
                      placeholder={`Subcategoria de ${category.name}`}
                      className="h-8 flex-1"
                      autoFocus
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => createSub(category)} disabled={busy || !subName.trim()}>
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400">Renomear atualiza apenas a categoria; produtos ja gravados com o nome antigo nao mudam automaticamente.</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onClose?.()}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
