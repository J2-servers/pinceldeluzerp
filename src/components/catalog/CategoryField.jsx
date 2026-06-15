import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CategoryField({ value, categories = [], onChange, onCreateCategory }) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const mergedCategories = value && !categories.some((category) => category.name === value)
    ? [{ id: value, name: value }, ...categories]
    : categories;

  const handleCreate = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || !onCreateCategory) return;
    await onCreateCategory(trimmed);
    onChange(trimmed);
    setNewCategoryName('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-slate-500">Categoria *</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Selecione ou crie uma categoria" /></SelectTrigger>
          <SelectContent>
            {mergedCategories.map((category) => (
              <SelectItem key={category.id || category.name} value={category.name}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Criar nova categoria" />
        <Button type="button" variant="outline" onClick={handleCreate}>Criar</Button>
      </div>
    </div>
  );
}