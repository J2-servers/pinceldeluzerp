import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FALLBACK_PRESETS = [
  { id: 'lm-15', preset_type: 'labor_minutes', label: '15 min mao de obra', value: 15, sort_order: 1, active: true },
  { id: 'lm-30', preset_type: 'labor_minutes', label: '30 min mao de obra', value: 30, sort_order: 2, active: true },
  { id: 'lm-60', preset_type: 'labor_minutes', label: '60 min mao de obra', value: 60, sort_order: 3, active: true },
  { id: 'lm-120', preset_type: 'labor_minutes', label: '120 min mao de obra', value: 120, sort_order: 4, active: true },
  { id: 'mm-5', preset_type: 'machine_minutes', label: '5 min maquina', value: 5, sort_order: 1, active: true },
  { id: 'mm-15', preset_type: 'machine_minutes', label: '15 min maquina', value: 15, sort_order: 2, active: true },
  { id: 'mm-30', preset_type: 'machine_minutes', label: '30 min maquina', value: 30, sort_order: 3, active: true },
  { id: 'mm-60', preset_type: 'machine_minutes', label: '60 min maquina', value: 60, sort_order: 4, active: true },
];

const FIELD_CONFIG = [
  { key: 'machine_minutes', title: 'Preset de maquina', placeholder: 'Selecionar tempo' },
  { key: 'labor_minutes', title: 'Preset de mao de obra', placeholder: 'Selecionar tempo' },
];

export default function OperationalPresetSelects({ onSelect }) {
  const { data = [] } = useQuery({
    queryKey: ['operationalPresets'],
    queryFn: () => erp.entities.OperationalPreset.list('sort_order'),
    initialData: [],
  });

  const grouped = useMemo(() => {
    const active = data.filter((item) => item.active !== false);
    const normalized = active.map((item) => ({
      ...item,
      preset_type: item.preset_type === 'labor_hours' ? 'labor_minutes' : item.preset_type,
      value: item.preset_type === 'labor_hours' ? Number(item.value || 0) * 60 : item.value,
    }));
    const source = normalized.length ? normalized : FALLBACK_PRESETS;
    return FIELD_CONFIG.reduce((acc, field) => {
      acc[field.key] = source
        .filter((item) => item.preset_type === field.key)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      return acc;
    }, {});
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {FIELD_CONFIG.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label className="text-xs font-black uppercase tracking-wide text-slate-500">{field.title}</Label>
          <Select onValueChange={(value) => onSelect(field.key, value)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {grouped[field.key]?.map((item) => (
                <SelectItem key={item.id || `${field.key}-${item.value}`} value={String(item.value)}>
                  {item.label || `${item.value} min`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
