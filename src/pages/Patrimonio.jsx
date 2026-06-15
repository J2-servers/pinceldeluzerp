import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { AlertTriangle, Building2, DollarSign, Download, Edit, Plus, Trash2, Wrench } from 'lucide-react';

import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import ModuleHero from '@/components/system/ModuleHero';
import MetricCard from '@/components/system/MetricCard';
import SmartPanel from '@/components/system/SmartPanel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { downloadCsv } from '@/lib/downloadUtils';

const assetCategories = ['maquinas', 'veiculos', 'moveis', 'informatica', 'ferramentas', 'equipamentos', 'outros'];
const conditions = ['novo', 'bom', 'regular', 'ruim', 'inativo'];
const partners = ['Maeli', 'Wesley', 'Juliano'];
const maintenanceTypes = ['preventiva', 'corretiva', 'substituicao', 'calibracao'];

const defaultAsset = {
  name: '',
  category: 'maquinas',
  description: '',
  purchase_value: 0,
  current_value: 0,
  depreciation_rate: 10,
  serial_number: '',
  location: '',
  condition: 'bom',
  responsible_partner: 'Maeli',
  purchase_date: '',
};

const defaultMaintenance = {
  asset_id: '',
  asset_name: '',
  type: 'preventiva',
  priority: 'normal',
  description: '',
  cost: 0,
  technician: '',
  scheduled_date: moment().format('YYYY-MM-DD'),
  status: 'pendente',
};

const money = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Patrimonio() {
  const queryClient = useQueryClient();
  const [showAsset, setShowAsset] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filters, setFilters] = useState({ partner: 'all', condition: 'all', category: 'all' });
  const [assetForm, setAssetForm] = useState(defaultAsset);
  const [maintenanceForm, setMaintenanceForm] = useState(defaultMaintenance);

  const { data: assets = [] } = useQuery({
    queryKey: ['companyAssets'],
    queryFn: () => erp.entities.CompanyAsset.list('name'),
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ['assetMaintenances'],
    queryFn: () => erp.entities.AssetMaintenance.list('-scheduled_date'),
  });

  const saveAsset = useMutation({
    mutationFn: (data) =>
      selectedAsset ? erp.entities.CompanyAsset.update(selectedAsset.id, data) : erp.entities.CompanyAsset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyAssets'] });
      setShowAsset(false);
      setSelectedAsset(null);
      setAssetForm(defaultAsset);
    },
  });

  const deleteAsset = useMutation({
    mutationFn: (id) => erp.entities.CompanyAsset.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companyAssets'] }),
  });

  const saveMaintenance = useMutation({
    mutationFn: (data) => erp.entities.AssetMaintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetMaintenances'] });
      setShowMaintenance(false);
      setMaintenanceForm(defaultMaintenance);
    },
  });

  const deleteMaintenance = useMutation({
    mutationFn: (id) => erp.entities.AssetMaintenance.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetMaintenances'] }),
  });

  const filteredAssets = assets.filter(
    (asset) =>
      (filters.partner === 'all' || asset.responsible_partner === filters.partner) &&
      (filters.condition === 'all' || asset.condition === filters.condition) &&
      (filters.category === 'all' || asset.category === filters.category)
  );

  const stats = useMemo(
    () => ({
      total: assets.length,
      purchase: assets.reduce((sum, item) => sum + Number(item.purchase_value || 0), 0),
      current: assets.reduce((sum, item) => sum + Number(item.current_value || 0), 0),
      pending: maintenances.filter((item) => item.status === 'pendente' || !item.status).length,
      critical: assets.filter((item) => ['ruim', 'inativo'].includes(item.condition)).length,
    }),
    [assets, maintenances]
  );

  const openAsset = (asset = null) => {
    setSelectedAsset(asset);
    setAssetForm(asset ? { ...defaultAsset, ...asset } : defaultAsset);
    setShowAsset(true);
  };

  const openMaintenance = (asset) => {
    setMaintenanceForm({ ...defaultMaintenance, asset_id: asset.id, asset_name: asset.name });
    setShowMaintenance(true);
  };

  const exportCsv = () => {
    const rows = [
      ['Ativo', 'Categoria', 'Condicao', 'Valor compra', 'Valor atual', 'Responsavel'],
      ...filteredAssets.map((asset) => [
        asset.name,
        asset.category,
        asset.condition,
        asset.purchase_value,
        asset.current_value,
        asset.responsible_partner,
      ]),
    ];
    downloadCsv(rows, 'patrimonio.csv');
  };

  return (
    <div className="space-y-6 page-neu">
      <Header title="Patrimonio" subtitle="Controle de ativos, valores, responsaveis e manutencoes" />

      <ModuleHero
        eyebrow="Ativos da empresa"
        icon={Building2}
        tone="#ea580c"
        title="Patrimonio com visao financeira e manutencao preventiva."
        subtitle="Acompanhe maquinas, veiculos, equipamentos, responsaveis, depreciacao, condicao e custo de manutencao."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={() => openAsset()}>
              <Plus className="w-4 h-4" />
              Novo ativo
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard icon={Building2} label="Ativos" value={stats.total} color="#ea580c" />
          <MetricCard icon={DollarSign} label="Valor compra" value={money(stats.purchase)} color="#2563eb" />
          <MetricCard icon={DollarSign} label="Valor atual" value={money(stats.current)} color="#16a34a" />
          <MetricCard icon={Wrench} label="Manutencoes" value={stats.pending} color="#7c3aed" />
          <MetricCard icon={AlertTriangle} label="Criticos" value={stats.critical} color="#dc2626" />
        </div>
      </ModuleHero>

      <SmartPanel title="Filtros patrimoniais" icon={Building2} tone="#ea580c">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="clay-select min-w-0"
            value={filters.partner}
            onChange={(event) => setFilters({ ...filters, partner: event.target.value })}
            aria-label="Filtrar por responsavel"
          >
            <option value="all">Todos responsaveis</option>
            {partners.map((partner) => (
              <option key={partner} value={partner}>
                {partner}
              </option>
            ))}
          </select>
          <select
            className="clay-select min-w-0"
            value={filters.condition}
            onChange={(event) => setFilters({ ...filters, condition: event.target.value })}
            aria-label="Filtrar por condicao"
          >
            <option value="all">Todas condicoes</option>
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
          <select
            className="clay-select min-w-0"
            value={filters.category}
            onChange={(event) => setFilters({ ...filters, category: event.target.value })}
            aria-label="Filtrar por categoria"
          >
            <option value="all">Todas categorias</option>
            {assetCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setFilters({ partner: 'all', condition: 'all', category: 'all' })}>
            Limpar
          </Button>
        </div>
      </SmartPanel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <SmartPanel title="Ativos cadastrados" icon={Building2} tone="#ea580c" className="xl:col-span-2">
          <div className="w-full overflow-hidden">
            <table className="erp-responsive-table w-full table-fixed text-sm">
              <thead>
                <tr>
                  {['Ativo', 'Categoria', 'Condicao', 'Valor atual', 'Responsavel', 'Acoes'].map((heading) => (
                    <th key={heading} className="text-left p-3 text-xs uppercase tracking-widest text-slate-500 font-black">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-t border-slate-100 hover:bg-orange-50/40">
                    <td data-label="Ativo" className="p-3 min-w-0">
                      <p className="font-black text-slate-800 break-words">{asset.name}</p>
                      <p className="text-xs text-slate-500 break-words">{asset.serial_number || asset.location || 'sem identificacao'}</p>
                    </td>
                    <td data-label="Categoria" className="p-3 capitalize text-slate-600 break-words">
                      {asset.category}
                    </td>
                    <td data-label="Condicao" className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          ['ruim', 'inativo'].includes(asset.condition) ? 'badge-danger' : 'badge-success'
                        }`}
                      >
                        {asset.condition}
                      </span>
                    </td>
                    <td data-label="Valor atual" className="p-3 font-black text-green-700">
                      {money(asset.current_value)}
                    </td>
                    <td data-label="Responsavel" className="p-3 text-slate-600 break-words">
                      {asset.responsible_partner}
                    </td>
                    <td data-label="Acoes" className="p-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openMaintenance(asset)}
                          aria-label={`Registrar manutencao de ${asset.name}`}
                        >
                          <Wrench className="w-4 h-4 text-orange-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openAsset(asset)} aria-label={`Editar ${asset.name}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteAsset.mutate(asset.id)}
                          aria-label={`Excluir ${asset.name}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAssets.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhum ativo encontrado.</p>}
          </div>
        </SmartPanel>

        <SmartPanel title="Manutencoes recentes" icon={Wrench} tone="#7c3aed">
          <div className="space-y-2">
            {maintenances.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl p-3 bg-slate-50 border border-slate-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 break-words">{item.asset_name}</p>
                    <p className="text-xs text-slate-500 break-words">
                      {item.type} - {item.scheduled_date ? moment(item.scheduled_date).format('DD/MM') : 'sem data'}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMaintenance.mutate(item.id)}
                    aria-label={`Excluir manutencao de ${item.asset_name || 'ativo'}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <p className="text-sm font-bold text-red-600 mt-2">{money(item.cost)}</p>
              </div>
            ))}
            {maintenances.length === 0 && <p className="text-sm text-slate-500">Nenhuma manutencao registrada.</p>}
          </div>
        </SmartPanel>
      </div>

      <Dialog open={showAsset} onOpenChange={setShowAsset}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAsset ? 'Editar ativo' : 'Novo ativo'}</DialogTitle>
            <DialogDescription>Preencha os dados de patrimonio, responsavel, valores e condicao do ativo.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveAsset.mutate(assetForm);
            }}
            className="space-y-4"
          >
            <div>
              <Label>Nome</Label>
              <Input value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={assetForm.category} onValueChange={(value) => setAssetForm({ ...assetForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condicao</Label>
                <Select value={assetForm.condition} onValueChange={(value) => setAssetForm({ ...assetForm, condition: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor compra</Label>
                <Input
                  type="number"
                  value={assetForm.purchase_value}
                  onChange={(event) => setAssetForm({ ...assetForm, purchase_value: Number(event.target.value || 0) })}
                />
              </div>
              <div>
                <Label>Valor atual</Label>
                <Input
                  type="number"
                  value={assetForm.current_value}
                  onChange={(event) => setAssetForm({ ...assetForm, current_value: Number(event.target.value || 0) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsavel</Label>
                <Select
                  value={assetForm.responsible_partner}
                  onValueChange={(value) => setAssetForm({ ...assetForm, responsible_partner: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((partner) => (
                      <SelectItem key={partner} value={partner}>
                        {partner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>N. serie</Label>
                <Input
                  value={assetForm.serial_number}
                  onChange={(event) => setAssetForm({ ...assetForm, serial_number: event.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Descricao</Label>
              <Textarea
                value={assetForm.description}
                onChange={(event) => setAssetForm({ ...assetForm, description: event.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAsset(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMaintenance} onOpenChange={setShowMaintenance}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova manutencao</DialogTitle>
            <DialogDescription>Registre tipo, custo e descricao da manutencao do ativo selecionado.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveMaintenance.mutate(maintenanceForm);
            }}
            className="space-y-4"
          >
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
              <p className="text-xs text-orange-700 font-bold">ATIVO</p>
              <p className="font-black text-slate-800 break-words">{maintenanceForm.asset_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={maintenanceForm.type} onValueChange={(value) => setMaintenanceForm({ ...maintenanceForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custo</Label>
                <Input
                  type="number"
                  value={maintenanceForm.cost}
                  onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: Number(event.target.value || 0) })}
                />
              </div>
            </div>
            <div>
              <Label>Descricao</Label>
              <Textarea
                value={maintenanceForm.description}
                onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowMaintenance(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
