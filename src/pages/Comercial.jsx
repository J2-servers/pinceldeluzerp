import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from
'@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from
'@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Percent, DollarSign, Users, Truck, Plus, Trash2 } from 'lucide-react';
import moment from 'moment';

export default function Comercial() {
  const queryClient = useQueryClient();
  const [showMarkupForm, setShowMarkupForm] = useState(false);
  const [markupForm, setMarkupForm] = useState({ material_type: '', markup_percent: 0, min_markup_percent: 0, active: true });
  const [showFreightForm, setShowFreightForm] = useState(false);
  const [freightForm, setFreightForm] = useState({ zone_name: '', base_cost: 0, cost_per_kg: 0, cost_per_m3: 0, min_value: 0, active: true });

  const createMarkup = useMutation({
    mutationFn: (data) => erp.entities.MarkupRule.create(data),
    onSuccess: () => {queryClient.invalidateQueries(['markupRules']);setShowMarkupForm(false);setMarkupForm({ material_type: '', markup_percent: 0, min_markup_percent: 0, active: true });}
  });

  const deleteMarkup = useMutation({
    mutationFn: (id) => erp.entities.MarkupRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['markupRules'])
  });

  const createFreight = useMutation({
    mutationFn: (data) => erp.entities.FreightConfig.create(data),
    onSuccess: () => {queryClient.invalidateQueries(['freightConfig']);setShowFreightForm(false);setFreightForm({ zone_name: '', base_cost: 0, cost_per_kg: 0, cost_per_m3: 0, min_value: 0, active: true });}
  });

  const deleteFreight = useMutation({
    mutationFn: (id) => erp.entities.FreightConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['freightConfig'])
  });

  const completeCrm = useMutation({
    mutationFn: (id) => erp.entities.CrmReminder.update(id, { completed: true }),
    onSuccess: () => queryClient.invalidateQueries(['crmReminders'])
  });

  const { data: markupRules = [] } = useQuery({
    queryKey: ['markupRules'],
    queryFn: () => erp.entities.MarkupRule.list('material_type')
  });

  const { data: volumePricing = [] } = useQuery({
    queryKey: ['volumePricing'],
    queryFn: () => erp.entities.VolumePricing.list('product_name')
  });

  const { data: priceHistory = [] } = useQuery({
    queryKey: ['clientPriceHistory'],
    queryFn: () => erp.entities.ClientPriceHistory.list('-date', 50)
  });

  const { data: crmReminders = [] } = useQuery({
    queryKey: ['crmReminders'],
    queryFn: () => erp.entities.CrmReminder.filter({ completed: false }, 'reminder_date')
  });

  const { data: freightConfig = [] } = useQuery({
    queryKey: ['freightConfig'],
    queryFn: () => erp.entities.FreightConfig.list('zone_name')
  });

  return (
    <div className="space-y-6">
      <Header title="Comercial e Orçamentação" subtitle="Configurações comerciais" />

      <Tabs defaultValue="markup" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap">
          <TabsTrigger value="markup">Markup</TabsTrigger>
          <TabsTrigger value="escalonamento">Escalonamento</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="frete">Frete</TabsTrigger>
        </TabsList>

        <TabsContent value="markup" className="mt-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-pink-400" />
                <h3 className="text-slate-700 text-lg font-semibold">Regras de Markup</h3>
              </div>
              <Button size="sm" onClick={() => setShowMarkupForm(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Material</TableHead>
                    <TableHead className="text-gray-400">Markup %</TableHead>
                    <TableHead className="text-gray-400">Markup Mín %</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {markupRules.map((rule) =>
                  <TableRow key={rule.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{rule.material_type}</TableCell>
                      <TableCell className="text-green-400">{rule.markup_percent}%</TableCell>
                      <TableCell className="text-gray-400">{rule.min_markup_percent}%</TableCell>
                      <TableCell>
                        <Badge className={rule.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {rule.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteMarkup.mutate(rule.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {markupRules.length === 0 &&
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        Nenhuma regra cadastrada
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="escalonamento" className="mt-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Preços Escalonados</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Produto</TableHead>
                    <TableHead className="text-gray-400">Qtd Mín</TableHead>
                    <TableHead className="text-gray-400">Qtd Máx</TableHead>
                    <TableHead className="text-gray-400">Preço Unit.</TableHead>
                    <TableHead className="text-gray-400">Desconto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumePricing.map((v) =>
                  <TableRow key={v.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{v.product_name}</TableCell>
                      <TableCell className="text-gray-400">{v.min_quantity}</TableCell>
                      <TableCell className="text-gray-400">{v.max_quantity || '-'}</TableCell>
                      <TableCell className="text-green-400">R$ {(v.unit_price || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-pink-400">{v.discount_percent || 0}%</TableCell>
                    </TableRow>
                  )}
                  {volumePricing.length === 0 &&
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        Nenhum escalonamento cadastrado
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Histórico de Preços</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Cliente</TableHead>
                    <TableHead className="text-gray-400">Item</TableHead>
                    <TableHead className="text-gray-400">Qtd</TableHead>
                    <TableHead className="text-gray-400">Preço Unit.</TableHead>
                    <TableHead className="text-gray-400">Total</TableHead>
                    <TableHead className="text-gray-400">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((h) =>
                  <TableRow key={h.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{h.client_name}</TableCell>
                      <TableCell className="text-gray-400">{h.item_name}</TableCell>
                      <TableCell className="text-gray-400">{h.quantity}</TableCell>
                      <TableCell className="text-gray-400">R$ {(h.unit_price || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-green-400">R$ {(h.total || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-400">{moment(h.date).format('DD/MM/YYYY')}</TableCell>
                    </TableRow>
                  )}
                  {priceHistory.length === 0 &&
                  <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        Nenhum histórico
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="crm" className="mt-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Lembretes CRM</h3>
            </div>
            <div className="space-y-3">
              {crmReminders.map((r) =>
              <div key={r.id} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{r.title}</p>
                      <p className="text-sm text-gray-400">{r.client_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Badge className="bg-blue-500/20 text-blue-400">{r.type}</Badge>
                      <p className="text-xs text-gray-400">{moment(r.reminder_date).format('DD/MM/YYYY')}</p>
                      <Button size="sm" variant="outline" onClick={() => completeCrm.mutate(r.id)} className="text-xs">
                        Concluir
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {crmReminders.length === 0 &&
              <p className="text-gray-400 text-center py-8">Nenhum lembrete pendente</p>
              }
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="frete" className="mt-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">Configuração de Frete</h3>
              </div>
              <Button size="sm" onClick={() => setShowFreightForm(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Zona</TableHead>
                    <TableHead className="text-gray-400">Custo Base</TableHead>
                    <TableHead className="text-gray-400">R$/kg</TableHead>
                    <TableHead className="text-gray-400">R$/m³</TableHead>
                    <TableHead className="text-gray-400">Valor Mín</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freightConfig.map((f) =>
                  <TableRow key={f.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{f.zone_name}</TableCell>
                      <TableCell className="text-gray-400">R$ {(f.base_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-400">R$ {(f.cost_per_kg || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-400">R$ {(f.cost_per_m3 || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-400">R$ {(f.min_value || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={f.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {f.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteFreight.mutate(f.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {freightConfig.length === 0 &&
                  <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        Nenhuma zona configurada
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Markup Form Dialog */}
      <Dialog open={showMarkupForm} onOpenChange={setShowMarkupForm}>
        <DialogContent className="glass border-pink-500/40" style={{ boxShadow: '0 0 40px rgba(236,72,153,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Nova Regra de Markup</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {e.preventDefault();createMarkup.mutate(markupForm);}} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Material</Label>
              <Input value={markupForm.material_type} onChange={(e) => setMarkupForm({ ...markupForm, material_type: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Markup (%)</Label>
                <Input type="number" value={markupForm.markup_percent} onChange={(e) => setMarkupForm({ ...markupForm, markup_percent: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Markup Mínimo (%)</Label>
                <Input type="number" value={markupForm.min_markup_percent} onChange={(e) => setMarkupForm({ ...markupForm, min_markup_percent: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={markupForm.active} onCheckedChange={(v) => setMarkupForm({ ...markupForm, active: v })} />
              <Label>Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowMarkupForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Freight Form Dialog */}
      <Dialog open={showFreightForm} onOpenChange={setShowFreightForm}>
        <DialogContent className="glass border-pink-500/40" style={{ boxShadow: '0 0 40px rgba(236,72,153,0.15)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Nova Zona de Frete</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {e.preventDefault();createFreight.mutate(freightForm);}} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Zona</Label>
              <Input value={freightForm.zone_name} onChange={(e) => setFreightForm({ ...freightForm, zone_name: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo Base (R$)</Label>
                <Input type="number" step="0.01" value={freightForm.base_cost} onChange={(e) => setFreightForm({ ...freightForm, base_cost: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>R$/kg</Label>
                <Input type="number" step="0.01" value={freightForm.cost_per_kg} onChange={(e) => setFreightForm({ ...freightForm, cost_per_kg: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>R$/m³</Label>
                <Input type="number" step="0.01" value={freightForm.cost_per_m3} onChange={(e) => setFreightForm({ ...freightForm, cost_per_m3: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Valor Mínimo (R$)</Label>
                <Input type="number" step="0.01" value={freightForm.min_value} onChange={(e) => setFreightForm({ ...freightForm, min_value: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFreightForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>);

}