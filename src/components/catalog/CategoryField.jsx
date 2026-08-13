import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { erp } from '@/api/erpClient';
import { normalizeText } from '@/lib/utils';
import { flattenTreeForSelect, mergeCategories, indentedLabel } from '@/components/catalog/categoryTree';

const NO_PARENT = '__none__';

const toCode = (name) => normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Seletor de categoria do produto.
// Compat: value continua sendo o NOME da categoria; a assinatura aceita as mesmas props de antes.
// Extras opcionais:
//   - onCreateCategory(name)  -> fluxo atual dos pais (usado quando NAO ha categoria pai).
//   - onCategoriesChanged()   -> pai pode revalidar a lista apos criacao direta (opcional).
export default function CategoryField({ value, categories = [], onChange, onCreateCategory, onCategoriesChanged }) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentValue, setParentValue] = useState(NO_PARENT);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  // Categorias criadas aqui aparecem na hora, mesmo antes do refetch do pai.
  const [localCategories, setLocalCategories] = useState([]);

  const allCategories = useMemo(
    () => mergeCategories(categories, localCategories),
    [categories, localCategories],
  );

  // Lista achatada (pai -> filhos indentados) para o select principal.
  const flat = useMemo(() => flattenTreeForSelect(allCategories), [allCategories]);

  // Garante que o valor atual apareca mesmo que ainda nao esteja na lista carregada.
  const hasValue = !!value && flat.some((row) => row.category && row.category.name === value);
  const options = value && !hasValue
    ? [{ category: { id: `__current__:${value}`, name: value }, depth: 0 }, ...flat]
    : flat;

  // Somente categorias reais (com id) podem ser pai de uma nova subcategoria.
  const parentOptions = useMemo(
    () => flat.filter((row) => row.category && row.category.id !== undefined && row.category.id !== null),
    [flat],
  );

  const resetCreate = () => {
    setNewCategoryName('');
    setParentValue(NO_PARENT);
    setError('');
  };

  const handleCreate = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || creating) return;
    setError('');

    const parentId = parentValue && parentValue !== NO_PARENT ? parentValue : null;
    const code = toCode(trimmed);

    // Evita duplicar: se ja existe categoria com o mesmo nome/codigo, apenas seleciona.
    const existing = allCategories.find(
      (item) => item && (item.name === trimmed || (item.code && item.code === code)),
    );
    if (existing) {
      onChange(existing.name);
      resetCreate();
      return;
    }

    setCreating(true);
    try {
      if (parentId) {
        // Precisamos persistir parent_category_id. Como os pais que fornecem onCreateCategory
        // ignoram o 2o argumento (eles fazem create({name, code, active})), o proprio campo cria
        // aqui a subcategoria com o pai. Nao chamamos onCreateCategory para nao duplicar o registro.
        const created = await erp.entities.ProductCategory.create({
          name: trimmed,
          code,
          parent_category_id: parentId,
          active: true,
        });
        if (created) setLocalCategories((prev) => mergeCategories(prev, [created]));
        onChange(trimmed);
        onCategoriesChanged?.();
      } else if (onCreateCategory) {
        // Sem pai: mantem o fluxo atual dos pais (dedupe + invalidate deles).
        const created = await onCreateCategory(trimmed);
        if (created && created.id) setLocalCategories((prev) => mergeCategories(prev, [created]));
        onChange(trimmed);
        onCategoriesChanged?.();
      } else {
        onChange(trimmed);
      }
      resetCreate();
    } catch (err) {
      setError((err && err.message) || 'Falha ao criar categoria.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-slate-500">Categoria *</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Selecione ou crie uma categoria" /></SelectTrigger>
          <SelectContent>
            {options.map((row) => (
              <SelectItem key={(row.category && (row.category.id ?? row.category.name)) || row.depth} value={row.category.name}>
                {indentedLabel(row.category.name, row.depth)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
        <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nova categoria</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newCategoryName}
            onChange={(e) => { setNewCategoryName(e.target.value); if (error) setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
            placeholder="Nome da categoria"
            className="flex-1"
          />
          <Select value={parentValue} onValueChange={setParentValue}>
            <SelectTrigger className="sm:w-52"><SelectValue placeholder="Categoria pai (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>Sem categoria pai</SelectItem>
              {parentOptions.map((row) => (
                <SelectItem key={String(row.category.id)} value={String(row.category.id)}>
                  {indentedLabel(row.category.name, row.depth)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={handleCreate}
            disabled={creating || !newCategoryName.trim()}
            className="shrink-0"
          >
            {creating ? 'Criando...' : 'Criar'}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-[11px] text-slate-400">Escolha uma categoria pai para criar uma subcategoria (ex.: Acrilico › Acrilico preto).</p>
      </div>
    </div>
  );
}
