import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgePercent,
  Calculator,
  CheckCircle2,
  Factory,
  Gauge,
  History,
  Landmark,
  Package,
  Plus,
  Save,
  Scissors,
  SlidersHorizontal,
  Tag,
  Users,
} from 'lucide-react';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/lib/auth/useAuth';
import {
  DEFAULT_LABOR_PROFILE,
  DEFAULT_MACHINE_PROFILE,
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_SERVICE_PROFILES,
  buildPricingContext,
  getLaborRate,
  getMachineRate,
  money,
} from '@/lib/pricingEngine';
import { CrudSection, EditingNotice, EmptyHint, Field, RowCard } from '@/components/pricing/pricingUi';
import { diffChangedFields, logPriceChange, snapshotFields } from '@/components/pricing/priceChangeLog';
import PricingSettingsSection from '@/components/pricing/PricingSettingsSection';
import PriceChangeHistorySection from '@/components/pricing/PriceChangeHistorySection';
import ProductPriceRulesSection from '@/components/pricing/ProductPriceRulesSection';
import VolumePricingSection from '@/components/pricing/VolumePricingSection';

const tabs = [
  { id: 'visao', label: 'Visao geral', icon: Calculator },
  { id: 'parametros', label: 'Parametros', icon: SlidersHorizontal },
  { id: 'despesas', label: 'Despesas', icon: Landmark },
  { id: 'maquinas', label: 'Maquinas', icon: Factory },
  { id: 'equipe', label: 'Mao de obra', icon: Users },
  { id: 'materiais', label: 'Materiais', icon: Package },
  { id: 'servicos', label: 'Servicos', icon: Scissors },
  { id: 'regras', label: 'Margens', icon: Gauge },
  { id: 'cliente', label: 'Preco por cliente', icon: Tag },
  { id: 'volume', label: 'Desconto por volume', icon: BadgePercent },
  { id: 'historico', label: 'Historico', icon: History },
];

const expenseDefaults = [
  { name: 'Energia eletrica', category: 'estrutura', amount: 900, active: true },
  { name: 'Aluguel', category: 'estrutura', amount: 1800, active: true },
  { name: 'Agua', category: 'estrutura', amount: 120, active: true },
  { name: 'Internet e sistemas', category: 'administrativo', amount: 180, active: true },
  { name: 'Manutencao preventiva', category: 'operacao', amount: 350, active: true },
];

const markupDefaults = [
  { name: 'Padrao comunicacao visual', product_group: 'outros', minimum_margin_pct: 20, target_margin_pct: 35, active: true },
  { name: 'Acrilico e chapas', product_group: 'Acrilico', minimum_margin_pct: 25, target_margin_pct: 40, active: true },
  { name: 'Produtos prontos', product_group: 'brindes', minimum_margin_pct: 20, target_margin_pct: 35, active: true },
];

const presetDefaults = [
  { name: 'Maquina 5 min', preset_type: 'machine_minutes', label: '5 min maquina', value: 5, sort_order: 1, active: true },
  { name: 'Maquina 15 min', preset_type: 'machine_minutes', label: '15 min maquina', value: 15, sort_order: 2, active: true },
  { name: 'Maquina 30 min', preset_type: 'machine_minutes', label: '30 min maquina', value: 30, sort_order: 3, active: true },
  { name: 'MO 15 min', preset_type: 'labor_minutes', label: '15 min mao de obra', value: 15, sort_order: 1, active: true },
  { name: 'MO 30 min', preset_type: 'labor_minutes', label: '30 min mao de obra', value: 30, sort_order: 2, active: true },
  { name: 'MO 60 min', preset_type: 'labor_minutes', label: '60 min mao de obra', value: 60, sort_order: 3, active: true },
];

const materialDefaults = [
  {
    name: 'Acrilico transparente 2mm',
    material_type: 'Acrilico',
    pricing_mode: 'area_m2',
    unit: 'm2',
    sheet_width_mm: 1000,
    sheet_height_mm: 2000,
    sheet_cost: 280,
    cost_per_m2: 140,
    sale_price_per_m2: 260,
    waste_pct: 15,
    active: true,
  },
  {
    name: 'MDF branco 3mm',
    material_type: 'MDF',
    pricing_mode: 'area_m2',
    unit: 'm2',
    sheet_width_mm: 600,
    sheet_height_mm: 900,
    sheet_cost: 38,
    cost_per_m2: 70.37,
    sale_price_per_m2: 130,
    waste_pct: 12,
    active: true,
  },
  {
    name: 'Produto unitario padrao',
    material_type: 'unitario',
    pricing_mode: 'unitario',
    unit: 'un',
    unit_cost: 10,
    sale_price: 25,
    waste_pct: 3,
    active: true,
  },
];

const seedEntityMissingByName = async (entity, currentRows, defaults, userName) => {
  const existingNames = new Set(currentRows.map((item) => String(item.name || '').toLowerCase()));
  for (const item of defaults) {
    const name = String(item.name || '').toLowerCase();
    if (!existingNames.has(name)) {
      const created = await erp.entities[entity].create(item);
      await logPriceChange({
        entityName: entity,
        recordId: created?.id,
        recordLabel: item.name,
        action: 'create',
        changedFields: diffChangedFields({}, item),
        userName,
      });
    }
  }
};

const machineDefaults = [
  {
    ...DEFAULT_MACHINE_PROFILE,
    id: undefined,
    name: 'Laser CO2 principal',
    machine_type: 'laser',
    internal_minute_cost: 0.75,
    sale_minute_price: 1.8,
    setup_fee: 8,
    monthly_total_cost: 3200,
    productive_minutes_month: 7200,
  },
];

const laborDefaults = [
  { ...DEFAULT_LABOR_PROFILE, id: undefined, name: 'Operador de laser', role: 'operador', internal_hour_cost: 28, sale_hour_price: 65 },
  { name: 'Designer / arte finalista', role: 'designer', internal_hour_cost: 35, sale_hour_price: 90, active: true },
];

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const toneClass = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-black uppercase opacity-80">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {detail && <p className="mt-1 text-xs opacity-80">{detail}</p>}
    </div>
  );
}

function useEntity(entity, sort = 'name') {
  return useQuery({
    queryKey: [entity],
    queryFn: () => erp.entities[entity].list(sort),
    initialData: [],
  });
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeSheetDimension(value) {
  const number = numberOrZero(value);
  return number > 0 && number < 100 ? number * 10 : number;
}

function areaFromSheet(width, height) {
  const normalizedWidth = normalizeSheetDimension(width);
  const normalizedHeight = normalizeSheetDimension(height);
  return normalizedWidth > 0 && normalizedHeight > 0 ? (normalizedWidth * normalizedHeight) / 1000000 : 0;
}

function materialFromProduct(product) {
  const isArea = product.dimensions_required || product.pricing_mode === 'area_m2' || product.price_per_m2;
  const sheetWidth = normalizeSheetDimension(product.sheet_width_mm);
  const sheetHeight = normalizeSheetDimension(product.sheet_height_mm);
  const sheetArea = areaFromSheet(sheetWidth, sheetHeight);
  const costPerM2 = numberOrZero(product.cost_per_m2 || product.material_cost_m2 || (sheetArea > 0 ? numberOrZero(product.cost_price) / sheetArea : 0));
  const salePerM2 = numberOrZero(product.price_per_m2 || product.sale_price);
  const unitCost = numberOrZero(product.cost_price);
  const unitSale = numberOrZero(product.sale_price);

  return {
    name: product.name,
    product_id: product.id,
    product_name: product.name,
    sku: product.sku || product.code || '',
    material_type: product.product_group || product.category || (isArea ? 'material' : 'unitario'),
    category: product.category || product.product_group || '',
    pricing_mode: isArea ? 'area_m2' : 'unitario',
    unit: product.unit || (isArea ? 'm2' : 'un'),
    sheet_width_mm: sheetWidth,
    sheet_height_mm: sheetHeight,
    sheet_cost: numberOrZero(product.cost_price),
    cost_per_m2: isArea ? costPerM2 : 0,
    sale_price_per_m2: isArea ? (salePerM2 > costPerM2 ? salePerM2 : costPerM2 / 0.65) : 0,
    unit_cost: isArea ? 0 : unitCost,
    sale_price: isArea ? 0 : (unitSale > unitCost ? unitSale : unitCost / 0.65),
    waste_pct: numberOrZero(product.waste_pct || product.loss_pct || DEFAULT_PRICING_SETTINGS.material_waste_pct),
    active: product.active !== false,
    notes: 'Importado automaticamente do cadastro de produtos para governanca de precificacao.',
  };
}

export default function Precificacao() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userName = user?.name || user?.email || 'Sistema';
  const [activeTab, setActiveTab] = useState('visao');
  const fixedExpenses = useEntity('FixedExpense', 'name');
  const machineCosts = useEntity('MachineCost', 'name');
  const laborProfiles = useEntity('LaborRateProfile', 'name');
  const serviceProfiles = useEntity('ServicePricingProfile', 'name');
  const markupRules = useEntity('MarkupRule', 'name');
  const operationalPresets = useEntity('OperationalPreset', 'sort_order');
  const pricingSettings = useEntity('PricingSettings', '-updated_date');
  const materialParameters = useEntity('MaterialParameter', 'name');
  const products = useEntity('Product', 'name');

  const settings = pricingSettings.data[0] || DEFAULT_PRICING_SETTINGS;
  const context = useMemo(() => buildPricingContext({
    fixedExpenses: fixedExpenses.data,
    machineCosts: machineCosts.data,
    laborProfiles: laborProfiles.data,
    serviceProfiles: serviceProfiles.data,
    markupRules: markupRules.data,
    materialParameters: materialParameters.data,
    settings,
  }), [fixedExpenses.data, machineCosts.data, laborProfiles.data, serviceProfiles.data, markupRules.data, materialParameters.data, settings]);

  const invalidateWithHistory = (entity) => {
    queryClient.invalidateQueries({ queryKey: [entity] });
    queryClient.invalidateQueries({ queryKey: ['PriceChangeLog'] });
  };

  const createMutation = useMutation({
    mutationFn: async ({ entity, data }) => {
      const created = await erp.entities[entity].create(data);
      await logPriceChange({
        entityName: entity,
        recordId: created?.id,
        recordLabel: data.name || data.product_name || '',
        action: 'create',
        changedFields: diffChangedFields({}, data),
        userName,
      });
      return created;
    },
    onSuccess: (_, variables) => invalidateWithHistory(variables.entity),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ entity, id, data, before }) => {
      const updated = await erp.entities[entity].update(id, data);
      const changed = diffChangedFields(before || {}, data);
      if (changed.length) {
        await logPriceChange({
          entityName: entity,
          recordId: id,
          recordLabel: data.name || data.product_name || before?.name || '',
          action: 'update',
          changedFields: changed,
          userName,
        });
      }
      return updated;
    },
    onSuccess: (_, variables) => invalidateWithHistory(variables.entity),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ entity, id, record }) => {
      await erp.entities[entity].delete(id);
      await logPriceChange({
        entityName: entity,
        recordId: id,
        recordLabel: record?.name || record?.product_name || '',
        action: 'delete',
        changedFields: snapshotFields(record),
        userName,
      });
    },
    onSuccess: (_, variables) => invalidateWithHistory(variables.entity),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!pricingSettings.data.length) {
        const data = { ...DEFAULT_PRICING_SETTINGS, name: 'Configuracao padrao', active: true };
        const created = await erp.entities.PricingSettings.create(data);
        await logPriceChange({ entityName: 'PricingSettings', recordId: created?.id, recordLabel: 'Configuracao padrao', action: 'create', changedFields: diffChangedFields({}, data), userName });
      }
      await seedEntityMissingByName('FixedExpense', fixedExpenses.data, expenseDefaults, userName);
      await seedEntityMissingByName('MachineCost', machineCosts.data, machineDefaults, userName);
      await seedEntityMissingByName('LaborRateProfile', laborProfiles.data, laborDefaults, userName);
      await seedEntityMissingByName('ServicePricingProfile', serviceProfiles.data, DEFAULT_SERVICE_PROFILES.map((profile) => ({
        name: profile.name,
        service_type: profile.service_type,
        default_machine_minutes: profile.default_machine_minutes,
        default_labor_minutes: profile.default_labor_minutes,
        setup_fee: profile.setup_fee,
        sale_price: profile.sale_price,
        active: profile.active,
      })), userName);
      await seedEntityMissingByName('MarkupRule', markupRules.data, markupDefaults, userName);
      await seedEntityMissingByName('OperationalPreset', operationalPresets.data, presetDefaults, userName);
      await seedEntityMissingByName('MaterialParameter', materialParameters.data, materialDefaults, userName);
    },
    onSuccess: () => {
      ['PricingSettings', 'FixedExpense', 'MachineCost', 'LaborRateProfile', 'ServicePricingProfile', 'MarkupRule', 'OperationalPreset', 'MaterialParameter', 'PriceChangeLog'].forEach((entity) => {
        queryClient.invalidateQueries({ queryKey: [entity] });
      });
    },
  });

  const importMaterialsMutation = useMutation({
    mutationFn: async () => {
      const existingKeys = new Set(materialParameters.data.flatMap((item) => [
        item.product_id ? `id:${item.product_id}` : null,
        item.name ? `name:${String(item.name).toLowerCase()}` : null,
      ].filter(Boolean)));
      const candidates = products.data
        .filter((product) => product && product.active !== false)
        .filter((product) => !existingKeys.has(`id:${product.id}`) && !existingKeys.has(`name:${String(product.name || '').toLowerCase()}`))
        .map(materialFromProduct)
        .filter((material) => material.name && (material.cost_per_m2 > 0 || material.unit_cost > 0 || material.sale_price_per_m2 > 0 || material.sale_price > 0));

      for (const material of candidates) {
        const created = await erp.entities.MaterialParameter.create(material);
        await logPriceChange({ entityName: 'MaterialParameter', recordId: created?.id, recordLabel: material.name, action: 'create', changedFields: diffChangedFields({}, material), userName });
      }
      return candidates.length;
    },
    onSuccess: () => invalidateWithHistory('MaterialParameter'),
  });

  const [expenseForm, setExpenseForm] = useState({ name: '', category: 'estrutura', amount: '', active: true });
  const [machineForm, setMachineForm] = useState({ name: '', machine_type: 'laser', internal_minute_cost: '', sale_minute_price: '', setup_fee: 0, monthly_total_cost: '', productive_minutes_month: 7200, active: true });
  const [laborForm, setLaborForm] = useState({ name: '', role: 'operador', internal_hour_cost: '', sale_hour_price: '', active: true });
  const [serviceForm, setServiceForm] = useState({ name: '', service_type: 'gravacao', default_machine_minutes: 0, default_labor_minutes: 0, setup_fee: 0, sale_price: 0, notes: '', active: true });
  const [ruleForm, setRuleForm] = useState({ name: '', product_group: 'outros', minimum_margin_pct: 20, target_margin_pct: 35, active: true });
  const [materialForm, setMaterialForm] = useState({ name: '', material_type: 'Acrilico', pricing_mode: 'area_m2', unit: 'm2', sheet_width_mm: '', sheet_height_mm: '', sheet_cost: '', cost_per_m2: '', sale_price_per_m2: '', unit_cost: '', sale_price: '', waste_pct: 12, active: true, notes: '' });

  // Edicao in-place: guarda o id em edicao por entidade. O formulario de
  // criacao vira formulario de edicao e o salvamento usa update(id, payload),
  // preservando o id do registro e as referencias existentes.
  const [editingIds, setEditingIds] = useState({});
  const setEditing = (entity, id) => setEditingIds((prev) => ({ ...prev, [entity]: id }));

  const entityRows = {
    FixedExpense: fixedExpenses.data,
    MachineCost: machineCosts.data,
    LaborRateProfile: laborProfiles.data,
    ServicePricingProfile: serviceProfiles.data,
    MarkupRule: markupRules.data,
    MaterialParameter: materialParameters.data,
  };

  const resetExpenseForm = () => setExpenseForm({ name: '', category: 'estrutura', amount: '', active: true });
  const resetMachineForm = () => setMachineForm({ name: '', machine_type: 'laser', internal_minute_cost: '', sale_minute_price: '', setup_fee: 0, monthly_total_cost: '', productive_minutes_month: 7200, active: true });
  const resetLaborForm = () => setLaborForm({ name: '', role: 'operador', internal_hour_cost: '', sale_hour_price: '', active: true });
  const resetServiceForm = () => setServiceForm({ name: '', service_type: 'gravacao', default_machine_minutes: 0, default_labor_minutes: 0, setup_fee: 0, sale_price: 0, notes: '', active: true });
  const resetRuleForm = () => setRuleForm({ name: '', product_group: 'outros', minimum_margin_pct: 20, target_margin_pct: 35, active: true });
  const resetMaterialForm = () => setMaterialForm({ name: '', material_type: 'Acrilico', pricing_mode: 'area_m2', unit: 'm2', sheet_width_mm: '', sheet_height_mm: '', sheet_cost: '', cost_per_m2: '', sale_price_per_m2: '', unit_cost: '', sale_price: '', waste_pct: 12, active: true, notes: '' });

  const save = (entity, data, reset) => {
    const editingId = editingIds[entity];
    if (editingId) {
      const before = (entityRows[entity] || []).find((row) => String(row.id) === String(editingId));
      updateMutation.mutate({ entity, id: editingId, data, before });
    } else {
      createMutation.mutate({ entity, data });
    }
    setEditing(entity, null);
    reset();
  };

  const cancelEdit = (entity, reset) => {
    setEditing(entity, null);
    reset();
  };

  const startExpenseEdit = (item) => {
    setEditing('FixedExpense', item.id);
    setExpenseForm({ name: item.name || '', category: item.category || 'estrutura', amount: item.amount ?? '', active: item.active !== false });
  };

  const startMachineEdit = (item) => {
    setEditing('MachineCost', item.id);
    setMachineForm({
      name: item.name || item.machine_name || '',
      machine_type: item.machine_type || 'laser',
      internal_minute_cost: item.internal_minute_cost ?? '',
      sale_minute_price: item.sale_minute_price ?? '',
      setup_fee: item.setup_fee ?? 0,
      monthly_total_cost: item.monthly_total_cost ?? '',
      productive_minutes_month: item.productive_minutes_month ?? 7200,
      active: item.active !== false,
    });
  };

  const startLaborEdit = (item) => {
    setEditing('LaborRateProfile', item.id);
    setLaborForm({
      name: item.name || '',
      role: item.role || 'operador',
      internal_hour_cost: item.internal_hour_cost ?? '',
      sale_hour_price: item.sale_hour_price ?? '',
      active: item.active !== false,
    });
  };

  const startServiceEdit = (item) => {
    setEditing('ServicePricingProfile', item.id);
    setServiceForm({
      name: item.name || '',
      service_type: item.service_type || 'gravacao',
      default_machine_minutes: item.default_machine_minutes ?? 0,
      default_labor_minutes: item.default_labor_minutes ?? 0,
      setup_fee: item.setup_fee ?? 0,
      sale_price: item.sale_price ?? 0,
      notes: item.notes || '',
      active: item.active !== false,
    });
  };

  const startRuleEdit = (item) => {
    setEditing('MarkupRule', item.id);
    setRuleForm({
      name: item.name || '',
      product_group: item.product_group || 'outros',
      minimum_margin_pct: item.minimum_margin_pct ?? 20,
      target_margin_pct: item.target_margin_pct ?? 35,
      active: item.active !== false,
    });
  };

  const startMaterialEdit = (item) => {
    setEditing('MaterialParameter', item.id);
    setMaterialForm({
      name: item.name || '',
      material_type: item.material_type || 'Acrilico',
      pricing_mode: item.pricing_mode || 'unitario',
      unit: item.unit || (item.pricing_mode === 'area_m2' ? 'm2' : 'un'),
      sheet_width_mm: item.sheet_width_mm ?? '',
      sheet_height_mm: item.sheet_height_mm ?? '',
      sheet_cost: item.sheet_cost ?? '',
      cost_per_m2: item.cost_per_m2 ?? '',
      sale_price_per_m2: item.sale_price_per_m2 ?? '',
      unit_cost: item.unit_cost ?? '',
      sale_price: item.sale_price ?? '',
      waste_pct: item.waste_pct ?? 12,
      active: item.active !== false,
      notes: item.notes || '',
    });
  };

  const saveMaterial = () => {
    const payload = {
      ...materialForm,
      sheet_width_mm: numberOrZero(materialForm.sheet_width_mm),
      sheet_height_mm: numberOrZero(materialForm.sheet_height_mm),
      sheet_cost: numberOrZero(materialForm.sheet_cost),
      cost_per_m2: numberOrZero(materialForm.cost_per_m2),
      sale_price_per_m2: numberOrZero(materialForm.sale_price_per_m2),
      unit_cost: numberOrZero(materialForm.unit_cost),
      sale_price: numberOrZero(materialForm.sale_price),
      waste_pct: numberOrZero(materialForm.waste_pct),
    };
    save('MaterialParameter', payload, resetMaterialForm);
  };

  const activeExpenses = useMemo(() => fixedExpenses.data.filter((item) => item.active !== false), [fixedExpenses.data]);
  const { avgMachineSale, avgLaborSale } = useMemo(() => {
    const totalMachine = context.machineProfiles.reduce((sum, item) => sum + getMachineRate(item, context).sale_minute_price, 0);
    const totalLabor = context.laborProfiles.reduce((sum, item) => sum + getLaborRate(item, context).sale_hour_price, 0);
    return {
      avgMachineSale: context.machineProfiles.length ? totalMachine / context.machineProfiles.length : 0,
      avgLaborSale: context.laborProfiles.length ? totalLabor / context.laborProfiles.length : 0,
    };
  }, [context]);
  const materialCount = useMemo(() => materialParameters.data.filter((item) => item.active !== false).length, [materialParameters.data]);
  const productsWithoutMaterial = useMemo(() => products.data.filter((product) => {
    const needsMaterialTable = product?.dimensions_required || product?.pricing_mode === 'area_m2' || Number(product?.price_per_m2 || 0) > 0;
    if (product?.active === false || !needsMaterialTable) return false;
    return !context.materialParameters.some((material) => String(material.product_id || '') === String(product.id) || String(material.name || '').toLowerCase() === String(product.name || '').toLowerCase());
  }), [products.data, context]);
  const materialIssues = useMemo(() => materialParameters.data.filter((item) => item.active !== false && item.pricing_mode === 'area_m2' && !Number(item.cost_per_m2 || 0) && !Number(item.sheet_cost || 0)), [materialParameters.data]);

  return (
    <div className="space-y-6">
      <Header title="Precificacao estrutural" subtitle="Tabelas que alimentam orcamentos, vendas, OS, margem e ponto de equilibrio." />

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-blue-900 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-black">Regra do ERP: o orcamento informa consumo e operacao; esta pagina define os custos e precos.</h2>
              <p className="mt-1 text-sm">Aqui ficam energia, aluguel, maquinas, equipe, servicos e margem. O atendente nao precisa digitar custo manual no pedido.</p>
            </div>
          </div>
          <Button type="button" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <Save className="h-4 w-4" /> {seedMutation.isPending ? 'Instalando...' : 'Instalar base inicial'}
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Landmark} label="Despesas fixas" value={money(context.monthlyFixedCost)} detail={`${activeExpenses.length} itens ativos`} tone="blue" />
        <MetricCard icon={Factory} label="Maquina media" value={`${money(avgMachineSale)}/min`} detail="preco comercial medio" tone="orange" />
        <MetricCard icon={Users} label="Mao de obra media" value={`${money(avgLaborSale)}/h`} detail="preco comercial medio" tone="green" />
        <MetricCard icon={Package} label="Materiais" value={materialCount} detail={`${productsWithoutMaterial.length} produtos sem tabela`} tone="blue" />
        <MetricCard icon={Scissors} label="Perfis de servico" value={context.serviceProfiles.length} detail="modelos de operacao" tone="purple" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-black transition ${active ? 'border-blue-300 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 shadow-sm'}`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'visao' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Como o preco passa a ser formado</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><strong>1. Material direto:</strong> produto, chapa, m2, unidade e perda de aproveitamento.</p>
              <p><strong>2. Operacao:</strong> minutos de maquina e minutos de mao de obra informados no orcamento.</p>
              <p><strong>3. Estrutura:</strong> energia, aluguel, agua, manutencao e despesas rateadas pelas tabelas.</p>
              <p><strong>4. Comercial:</strong> margem minima, margem alvo, setup, arte, impostos e descontos autorizados.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Checklist de confiabilidade</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                ['Despesas cadastradas', activeExpenses.length > 0],
                ['Pelo menos uma maquina', context.machineProfiles.length > 0],
                ['Pelo menos uma tabela de mao de obra', context.laborProfiles.length > 0],
                ['Materiais com custo governado', materialCount > 0],
                ['Perfis de servico configurados', context.serviceProfiles.length > 0],
                ['Regras de margem configuradas', context.markupRules.length > 0],
              ].map(([label, ok]) => (
                <div key={label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  <CheckCircle2 className="h-4 w-4" /> <span className="font-bold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'parametros' && (
        <PricingSettingsSection key={pricingSettings.data[0]?.id || 'nova-configuracao'} record={pricingSettings.data[0]} userName={userName} />
      )}

      {activeTab === 'despesas' && (
        <CrudSection
          title="Despesas da estrutura"
          description="Energia, aluguel, agua, internet, manutencao, contabilidade e qualquer custo necessario para a empresa existir."
          form={
            <div className="space-y-3">
              {editingIds.FixedExpense && <EditingNotice label={expenseForm.name} />}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Field label="Nome"><Input value={expenseForm.name} onChange={(e) => setExpenseForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Categoria"><Input value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))} /></Field>
                <Field label="Valor mensal"><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} /></Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" onClick={() => save('FixedExpense', expenseForm, resetExpenseForm)}>
                    {editingIds.FixedExpense ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingIds.FixedExpense ? 'Salvar' : 'Adicionar'}
                  </Button>
                  {editingIds.FixedExpense && <Button type="button" variant="outline" onClick={() => cancelEdit('FixedExpense', resetExpenseForm)}>Cancelar</Button>}
                </div>
              </div>
            </div>
          }
        >
          {fixedExpenses.data.length ? fixedExpenses.data.map((item) => (
            <RowCard
              key={item.id}
              title={item.name || 'Despesa'}
              subtitle={item.category}
              metrics={[{ label: 'Valor mensal', value: money(item.amount) }]}
              onEdit={() => startExpenseEdit(item)}
              onDelete={() => deleteMutation.mutate({ entity: 'FixedExpense', id: item.id, record: item })}
            />
          )) : <EmptyHint>Nenhuma despesa cadastrada. Instale a base inicial ou adicione as despesas reais da empresa.</EmptyHint>}
        </CrudSection>
      )}

      {activeTab === 'maquinas' && (
        <CrudSection
          title="Maquinas e equipamentos"
          description="Cada maquina precisa ter custo interno e preco comercial por minuto. O orcamento usa esta tabela automaticamente."
          form={
            <div className="space-y-3">
              {editingIds.MachineCost && <EditingNotice label={machineForm.name} />}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Field label="Nome"><Input value={machineForm.name} onChange={(e) => setMachineForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Tipo"><Input value={machineForm.machine_type} onChange={(e) => setMachineForm((p) => ({ ...p, machine_type: e.target.value }))} /></Field>
                <Field label="Custo/min"><Input type="number" value={machineForm.internal_minute_cost} onChange={(e) => setMachineForm((p) => ({ ...p, internal_minute_cost: Number(e.target.value || 0) }))} /></Field>
                <Field label="Venda/min"><Input type="number" value={machineForm.sale_minute_price} onChange={(e) => setMachineForm((p) => ({ ...p, sale_minute_price: Number(e.target.value || 0) }))} /></Field>
                <Field label="Setup"><Input type="number" value={machineForm.setup_fee} onChange={(e) => setMachineForm((p) => ({ ...p, setup_fee: Number(e.target.value || 0) }))} /></Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" onClick={() => save('MachineCost', machineForm, resetMachineForm)}>
                    {editingIds.MachineCost ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingIds.MachineCost ? 'Salvar' : 'Adicionar'}
                  </Button>
                  {editingIds.MachineCost && <Button type="button" variant="outline" onClick={() => cancelEdit('MachineCost', resetMachineForm)}>Cancelar</Button>}
                </div>
              </div>
            </div>
          }
        >
          {context.machineProfiles.map((item) => {
            const rate = getMachineRate(item, context);
            const raw = machineCosts.data.find((row) => String(row.id) === String(item.id));
            return (
              <RowCard
                key={item.id}
                title={rate.name}
                subtitle={rate.machine_type}
                metrics={[{ label: 'Custo/min', value: money(rate.internal_minute_cost) }, { label: 'Venda/min', value: money(rate.sale_minute_price) }, { label: 'Overhead/min', value: money(rate.overhead_minute) }, { label: 'Setup', value: money(rate.setup_fee) }]}
                onEdit={raw ? () => startMachineEdit(raw) : null}
                onDelete={raw ? () => deleteMutation.mutate({ entity: 'MachineCost', id: raw.id, record: raw }) : null}
              />
            );
          })}
        </CrudSection>
      )}

      {activeTab === 'equipe' && (
        <CrudSection
          title="Mao de obra e funcoes"
          description="Use funcoes reais: operador laser, designer, acabamento, instalador, atendimento. O sistema calcula custo/hora e preco/hora."
          form={
            <div className="space-y-3">
              {editingIds.LaborRateProfile && <EditingNotice label={laborForm.name} />}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <Field label="Nome"><Input value={laborForm.name} onChange={(e) => setLaborForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Funcao"><Input value={laborForm.role} onChange={(e) => setLaborForm((p) => ({ ...p, role: e.target.value }))} /></Field>
                <Field label="Custo/h"><Input type="number" value={laborForm.internal_hour_cost} onChange={(e) => setLaborForm((p) => ({ ...p, internal_hour_cost: Number(e.target.value || 0) }))} /></Field>
                <Field label="Venda/h"><Input type="number" value={laborForm.sale_hour_price} onChange={(e) => setLaborForm((p) => ({ ...p, sale_hour_price: Number(e.target.value || 0) }))} /></Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" onClick={() => save('LaborRateProfile', laborForm, resetLaborForm)}>
                    {editingIds.LaborRateProfile ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingIds.LaborRateProfile ? 'Salvar' : 'Adicionar'}
                  </Button>
                  {editingIds.LaborRateProfile && <Button type="button" variant="outline" onClick={() => cancelEdit('LaborRateProfile', resetLaborForm)}>Cancelar</Button>}
                </div>
              </div>
            </div>
          }
        >
          {context.laborProfiles.map((item) => {
            const rate = getLaborRate(item, context);
            const raw = laborProfiles.data.find((row) => String(row.id) === String(item.id));
            return (
              <RowCard
                key={item.id}
                title={rate.name}
                subtitle={item.role}
                metrics={[{ label: 'Custo/h', value: money(rate.internal_hour_cost) }, { label: 'Venda/h', value: money(rate.sale_hour_price) }, { label: 'Overhead/h', value: money(rate.overhead_hour) }]}
                onEdit={raw ? () => startLaborEdit(raw) : null}
                onDelete={raw ? () => deleteMutation.mutate({ entity: 'LaborRateProfile', id: raw.id, record: raw }) : null}
              />
            );
          })}
        </CrudSection>
      )}

      {activeTab === 'materiais' && (
        <CrudSection
          title="Materiais, chapas e produtos de base"
          description="Tabela governada para custo real de materia-prima. O orcamento apenas informa consumo; esta tela define custo, perda e preco comercial."
          form={
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-black">Sincronizar com estoque</h3>
                  <p className="mt-1 text-sm">Cria parametros de material a partir dos produtos existentes, sem duplicar itens ja vinculados.</p>
                </div>
                <Button type="button" onClick={() => importMaterialsMutation.mutate()} disabled={importMaterialsMutation.isPending || !products.data.length}>
                  <Package className="h-4 w-4" /> {importMaterialsMutation.isPending ? 'Importando...' : 'Importar produtos do estoque'}
                </Button>
              </div>

              {editingIds.MaterialParameter && <EditingNotice label={materialForm.name} />}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <Field label="Nome"><Input value={materialForm.name} onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Tipo"><Input value={materialForm.material_type} onChange={(e) => setMaterialForm((p) => ({ ...p, material_type: e.target.value }))} /></Field>
                <Field label="Modo">
                  <Select value={materialForm.pricing_mode} onValueChange={(value) => setMaterialForm((p) => ({ ...p, pricing_mode: value, unit: value === 'area_m2' ? 'm2' : 'un' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="area_m2">m2 / chapa</SelectItem>
                      <SelectItem value="unitario">unidade</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Unidade"><Input value={materialForm.unit} onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))} /></Field>
                <Field label="Perda %"><Input type="number" step="0.01" value={materialForm.waste_pct} onChange={(e) => setMaterialForm((p) => ({ ...p, waste_pct: e.target.value }))} /></Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" onClick={saveMaterial} disabled={!materialForm.name}>
                    {editingIds.MaterialParameter ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingIds.MaterialParameter ? 'Salvar' : 'Adicionar'}
                  </Button>
                  {editingIds.MaterialParameter && <Button type="button" variant="outline" onClick={() => cancelEdit('MaterialParameter', resetMaterialForm)}>Cancelar</Button>}
                </div>
              </div>

              {materialForm.pricing_mode === 'area_m2' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Chapa larg. mm"><Input type="number" value={materialForm.sheet_width_mm} onChange={(e) => setMaterialForm((p) => ({ ...p, sheet_width_mm: e.target.value }))} /></Field>
                  <Field label="Chapa alt. mm"><Input type="number" value={materialForm.sheet_height_mm} onChange={(e) => setMaterialForm((p) => ({ ...p, sheet_height_mm: e.target.value }))} /></Field>
                  <Field label="Custo da chapa"><Input type="number" step="0.01" value={materialForm.sheet_cost} onChange={(e) => setMaterialForm((p) => ({ ...p, sheet_cost: e.target.value }))} /></Field>
                  <Field label="Custo por m2"><Input type="number" step="0.01" value={materialForm.cost_per_m2} onChange={(e) => setMaterialForm((p) => ({ ...p, cost_per_m2: e.target.value }))} help="Se vazio, o motor usa custo da chapa dividido pela area." /></Field>
                  <Field label="Venda por m2"><Input type="number" step="0.01" value={materialForm.sale_price_per_m2} onChange={(e) => setMaterialForm((p) => ({ ...p, sale_price_per_m2: e.target.value }))} /></Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Custo unitario"><Input type="number" step="0.01" value={materialForm.unit_cost} onChange={(e) => setMaterialForm((p) => ({ ...p, unit_cost: e.target.value }))} /></Field>
                  <Field label="Venda unitario"><Input type="number" step="0.01" value={materialForm.sale_price} onChange={(e) => setMaterialForm((p) => ({ ...p, sale_price: e.target.value }))} /></Field>
                  <Field label="Observacao"><Input value={materialForm.notes} onChange={(e) => setMaterialForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
                </div>
              )}

              {!!materialIssues.length && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>{materialIssues.length} material(is) por m2 sem custo confiavel.</strong> Corrija custo por m2, custo da chapa ou dimensoes para evitar preco estimado.
                </div>
              )}
            </div>
          }
        >
          {materialParameters.data.length ? materialParameters.data.map((item) => {
            const mode = item.pricing_mode || 'unitario';
            return (
              <RowCard
                key={item.id}
                title={item.name || item.product_name || 'Material'}
                subtitle={`${item.material_type || item.category || 'material'} - ${mode === 'area_m2' ? 'vendido por m2' : 'vendido por unidade'}`}
                metrics={mode === 'area_m2' ? [
                  { label: 'Custo/m2', value: money(item.cost_per_m2 || (areaFromSheet(item.sheet_width_mm, item.sheet_height_mm) > 0 ? Number(item.sheet_cost || 0) / areaFromSheet(item.sheet_width_mm, item.sheet_height_mm) : 0)) },
                  { label: 'Venda/m2', value: money(item.sale_price_per_m2) },
                  { label: 'Chapa', value: `${normalizeSheetDimension(item.sheet_width_mm)}x${normalizeSheetDimension(item.sheet_height_mm)}mm` },
                  { label: 'Perda', value: `${item.waste_pct || 0}%` },
                ] : [
                  { label: 'Custo un.', value: money(item.unit_cost || item.cost_price) },
                  { label: 'Venda un.', value: money(item.sale_price) },
                  { label: 'Unidade', value: item.unit || 'un' },
                  { label: 'Perda', value: `${item.waste_pct || 0}%` },
                ]}
                onEdit={() => startMaterialEdit(item)}
                onDelete={() => deleteMutation.mutate({ entity: 'MaterialParameter', id: item.id, record: item })}
              />
            );
          }) : <EmptyHint>Nenhum material governado ainda. Importe produtos do estoque ou cadastre chapas e itens unitarios manualmente.</EmptyHint>}
        </CrudSection>
      )}

      {activeTab === 'servicos' && (
        <CrudSection
          title="Perfis de servico"
          description="Modelos prontos para corte, gravacao, criacao de logo, acabamento, instalacao e entrega."
          form={
            <div className="space-y-3">
              {editingIds.ServicePricingProfile && <EditingNotice label={serviceForm.name} />}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Field label="Nome"><Input value={serviceForm.name} onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Tipo">
                  <Select value={serviceForm.service_type} onValueChange={(value) => setServiceForm((p) => ({ ...p, service_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['corte', 'gravacao', 'arte', 'acabamento', 'instalacao', 'frete'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Min maquina"><Input type="number" value={serviceForm.default_machine_minutes} onChange={(e) => setServiceForm((p) => ({ ...p, default_machine_minutes: Number(e.target.value || 0) }))} /></Field>
                <Field label="Min MO"><Input type="number" value={serviceForm.default_labor_minutes} onChange={(e) => setServiceForm((p) => ({ ...p, default_labor_minutes: Number(e.target.value || 0) }))} /></Field>
                <Field label="Preco fixo"><Input type="number" value={serviceForm.sale_price} onChange={(e) => setServiceForm((p) => ({ ...p, sale_price: Number(e.target.value || 0) }))} /></Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" onClick={() => save('ServicePricingProfile', serviceForm, resetServiceForm)}>
                    {editingIds.ServicePricingProfile ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingIds.ServicePricingProfile ? 'Salvar' : 'Adicionar'}
                  </Button>
                  {editingIds.ServicePricingProfile && <Button type="button" variant="outline" onClick={() => cancelEdit('ServicePricingProfile', resetServiceForm)}>Cancelar</Button>}
                </div>
                <div className="md:col-span-3 xl:col-span-6">
                  <Field label="Observacao"><Textarea value={serviceForm.notes} onChange={(e) => setServiceForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
                </div>
              </div>
            </div>
          }
        >
          {context.serviceProfiles.map((item) => {
            const raw = serviceProfiles.data.find((row) => String(row.id) === String(item.id));
            return (
              <RowCard
                key={item.id}
                title={item.name}
                subtitle={item.notes || item.service_type}
                metrics={[{ label: 'Tipo', value: item.service_type || 'servico' }, { label: 'Min maquina', value: item.default_machine_minutes || 0 }, { label: 'Min MO', value: item.default_labor_minutes || 0 }, { label: 'Preco fixo', value: money(item.sale_price) }]}
                onEdit={raw ? () => startServiceEdit(raw) : null}
                onDelete={raw ? () => deleteMutation.mutate({ entity: 'ServicePricingProfile', id: raw.id, record: raw }) : null}
              />
            );
          })}
        </CrudSection>
      )}

      {activeTab === 'regras' && (
        <CrudSection
          title="Regras de margem"
          description="Margem minima bloqueia prejuizo. Margem alvo sugere o preco ideal por grupo de produto."
          form={
            <div className="space-y-3">
              {editingIds.MarkupRule && <EditingNotice label={ruleForm.name} />}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <Field label="Nome"><Input value={ruleForm.name} onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="Grupo"><Input value={ruleForm.product_group} onChange={(e) => setRuleForm((p) => ({ ...p, product_group: e.target.value }))} /></Field>
                <Field label="Margem minima %"><Input type="number" value={ruleForm.minimum_margin_pct} onChange={(e) => setRuleForm((p) => ({ ...p, minimum_margin_pct: Number(e.target.value || 0) }))} /></Field>
                <Field label="Margem alvo %"><Input type="number" value={ruleForm.target_margin_pct} onChange={(e) => setRuleForm((p) => ({ ...p, target_margin_pct: Number(e.target.value || 0) }))} /></Field>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" onClick={() => save('MarkupRule', ruleForm, resetRuleForm)}>
                    {editingIds.MarkupRule ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingIds.MarkupRule ? 'Salvar' : 'Adicionar'}
                  </Button>
                  {editingIds.MarkupRule && <Button type="button" variant="outline" onClick={() => cancelEdit('MarkupRule', resetRuleForm)}>Cancelar</Button>}
                </div>
              </div>
            </div>
          }
        >
          {context.markupRules.length ? context.markupRules.map((item) => {
            const raw = markupRules.data.find((row) => String(row.id) === String(item.id));
            return (
              <RowCard
                key={item.id}
                title={item.name || item.product_group || 'Regra'}
                subtitle={item.product_group || item.material_type}
                metrics={[{ label: 'Minima', value: `${item.minimum_margin_pct || item.min_margin_pct || 20}%` }, { label: 'Alvo', value: `${item.target_margin_pct || item.margin_pct || 35}%` }]}
                onEdit={raw ? () => startRuleEdit(raw) : null}
                onDelete={raw ? () => deleteMutation.mutate({ entity: 'MarkupRule', id: raw.id, record: raw }) : null}
              />
            );
          }) : <EmptyHint>Nenhuma regra cadastrada. O sistema usa fallback de 20% minima e 35% alvo.</EmptyHint>}
        </CrudSection>
      )}

      {activeTab === 'cliente' && <ProductPriceRulesSection userName={userName} />}

      {activeTab === 'volume' && <VolumePricingSection userName={userName} />}

      {activeTab === 'historico' && <PriceChangeHistorySection />}
    </div>
  );
}
