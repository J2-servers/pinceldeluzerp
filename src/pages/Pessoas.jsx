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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield, MessageSquare, Calendar, Plus, Trash2, Send } from 'lucide-react';
import moment from 'moment';

export default function Pessoas() {
  const queryClient = useQueryClient();

  // Horas
  const [showHorasForm, setShowHorasForm] = useState(false);
  const [horasForm, setHorasForm] = useState({ employee_name: '', date: moment().format('YYYY-MM-DD'), hours: 0, hourly_rate: 0, total_cost: 0, task_description: '' });

  // EPIs
  const [showEpiForm, setShowEpiForm] = useState(false);
  const [epiForm, setEpiForm] = useState({ employee_name: '', epi_type: 'oculos_protecao', quantity: 1, delivery_date: moment().format('YYYY-MM-DD'), expiry_date: '' });

  // Feriados
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', recurring: false, affects_deadline: true });

  // Chat
  const [chatMessage, setChatMessage] = useState('');
  const [chatAuthor, setChatAuthor] = useState('');

  const { data: timeEntries = [] } = useQuery({ queryKey: ['timeEntries'], queryFn: () => erp.entities.TimeEntry.list('-date', 50) });
  const { data: epiRecords = [] } = useQuery({ queryKey: ['epiRecords'], queryFn: () => erp.entities.EpiRecord.list('-delivery_date', 50) });
  const { data: orderMessages = [] } = useQuery({ queryKey: ['orderMessages'], queryFn: () => erp.entities.OrderMessage.list('-created_date', 50) });
  const { data: holidays = [] } = useQuery({ queryKey: ['holidays'], queryFn: () => erp.entities.HolidayConfig.list('date') });

  const createTimeEntry = useMutation({
    mutationFn: (data) => erp.entities.TimeEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['timeEntries']); setShowHorasForm(false); setHorasForm({ employee_name: '', date: moment().format('YYYY-MM-DD'), hours: 0, hourly_rate: 0, total_cost: 0, task_description: '' }); }
  });

  const deleteTimeEntry = useMutation({
    mutationFn: (id) => erp.entities.TimeEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['timeEntries'])
  });

  const createEpi = useMutation({
    mutationFn: (data) => erp.entities.EpiRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['epiRecords']); setShowEpiForm(false); setEpiForm({ employee_name: '', epi_type: 'oculos_protecao', quantity: 1, delivery_date: moment().format('YYYY-MM-DD'), expiry_date: '' }); }
  });

  const deleteEpi = useMutation({
    mutationFn: (id) => erp.entities.EpiRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['epiRecords'])
  });

  const createHoliday = useMutation({
    mutationFn: (data) => erp.entities.HolidayConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['holidays']); setShowHolidayForm(false); setHolidayForm({ name: '', date: '', recurring: false, affects_deadline: true }); }
  });

  const deleteHoliday = useMutation({
    mutationFn: (id) => erp.entities.HolidayConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['holidays'])
  });

  const sendMessage = useMutation({
    mutationFn: (data) => erp.entities.OrderMessage.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['orderMessages']); setChatMessage(''); }
  });

  const totalHoras = timeEntries.reduce((a, t) => a + (t.hours || 0), 0);
  const totalCusto = timeEntries.reduce((a, t) => a + (t.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      <Header title="Gestão de Pessoas" subtitle="Horas, EPIs e comunicação" />

      <Tabs defaultValue="horas" className="w-full">
        <TabsList className="bg-white/5 border border-pink-500/30" className="bg-white/5 border border-white/10">
          <TabsTrigger value="horas">Horas</TabsTrigger>
          <TabsTrigger value="epis">EPIs</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="feriados">Feriados</TabsTrigger>
        </TabsList>

        <TabsContent value="horas" className="mt-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">Registro de Horas</h3>
                <span className="text-sm text-gray-400">Total: {totalHoras}h · R$ {totalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <Button size="sm" onClick={() => setShowHorasForm(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" /> Registrar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Funcionário</TableHead>
                    <TableHead className="text-gray-400">Data</TableHead>
                    <TableHead className="text-gray-400">Horas</TableHead>
                    <TableHead className="text-gray-400">Custo/Hora</TableHead>
                    <TableHead className="text-gray-400">Custo Total</TableHead>
                    <TableHead className="text-gray-400">Tarefa</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map(t => (
                    <TableRow key={t.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{t.employee_name}</TableCell>
                      <TableCell className="text-gray-400">{moment(t.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell className="text-gray-400">{t.hours}h</TableCell>
                      <TableCell className="text-gray-400">R$ {(t.hourly_rate || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-green-400">R$ {(t.total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-gray-400 max-w-[200px] truncate">{t.task_description}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteTimeEntry.mutate(t.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {timeEntries.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Nenhum registro de horas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="epis" className="mt-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">Gestão de EPIs</h3>
              </div>
              <Button size="sm" onClick={() => setShowEpiForm(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" /> Registrar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Funcionário</TableHead>
                    <TableHead className="text-gray-400">Tipo EPI</TableHead>
                    <TableHead className="text-gray-400">Qtd</TableHead>
                    <TableHead className="text-gray-400">Entrega</TableHead>
                    <TableHead className="text-gray-400">Validade</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {epiRecords.map(e => {
                    const isExpired = e.expiry_date && moment(e.expiry_date).isBefore(moment());
                    return (
                      <TableRow key={e.id} className={`border-white/10 hover:bg-white/5 ${isExpired ? 'bg-red-500/10' : ''}`}>
                        <TableCell className="text-white">{e.employee_name}</TableCell>
                        <TableCell className="text-gray-400 capitalize">{e.epi_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-gray-400">{e.quantity}</TableCell>
                        <TableCell className="text-gray-400">{moment(e.delivery_date).format('DD/MM/YYYY')}</TableCell>
                        <TableCell className={isExpired ? 'text-red-400' : 'text-gray-400'}>
                          {e.expiry_date ? moment(e.expiry_date).format('DD/MM/YYYY') : '-'}
                          {isExpired && <Badge className="ml-2 bg-red-500/20 text-red-400 text-xs">Vencido</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteEpi.mutate(e.id)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {epiRecords.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">Nenhum registro de EPI</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Comunicação Interna</h3>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
              {orderMessages.map(m => (
                <div key={m.id} className="p-4 bg-white/5 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{m.author}</span>
                      {m.department && <Badge className="bg-blue-500/20 text-blue-400">{m.department}</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{moment(m.created_date).format('DD/MM HH:mm')}</span>
                  </div>
                  <p className="text-gray-300">{m.message}</p>
                </div>
              ))}
              {orderMessages.length === 0 && <p className="text-gray-400 text-center py-8">Nenhuma mensagem</p>}
            </div>
            <div className="border-t border-white/10 pt-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Seu nome..."
                  value={chatAuthor}
                  onChange={(e) => setChatAuthor(e.target.value)}
                  className="w-36 bg-white/5 border-white/10"
                />
                <Input
                  placeholder="Digite sua mensagem..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 bg-white/5 border-white/10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatMessage && chatAuthor) {
                      sendMessage.mutate({ author: chatAuthor, message: chatMessage, department: 'Geral' });
                    }
                  }}
                />
                <Button
                  onClick={() => { if (chatMessage && chatAuthor) sendMessage.mutate({ author: chatAuthor, message: chatMessage, department: 'Geral' }); }}
                  className="gradient-primary"
                  disabled={!chatMessage || !chatAuthor}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="feriados" className="mt-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">Configuração de Feriados</h3>
              </div>
              <Button size="sm" onClick={() => setShowHolidayForm(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">Nome</TableHead>
                    <TableHead className="text-gray-400">Data</TableHead>
                    <TableHead className="text-gray-400">Recorrente</TableHead>
                    <TableHead className="text-gray-400">Afeta Prazo</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map(h => (
                    <TableRow key={h.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{h.name}</TableCell>
                      <TableCell className="text-gray-400">{moment(h.date).format('DD/MM/YYYY')}</TableCell>
                      <TableCell>
                        <Badge className={h.recurring ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {h.recurring ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={h.affects_deadline ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'}>
                          {h.affects_deadline ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteHoliday.mutate(h.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {holidays.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">Nenhum feriado configurado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Horas Form */}
      <Dialog open={showHorasForm} onOpenChange={setShowHorasForm}>
        <DialogContent className="glass border-pink-500/40" style={{boxShadow:'0 0 40px rgba(236,72,153,0.15)'}}>
          <DialogHeader><DialogTitle className="text-white">Registrar Horas</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const total = (horasForm.hours || 0) * (horasForm.hourly_rate || 0); createTimeEntry.mutate({ ...horasForm, total_cost: total }); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Input value={horasForm.employee_name} onChange={(e) => setHorasForm({ ...horasForm, employee_name: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={horasForm.date} onChange={(e) => setHorasForm({ ...horasForm, date: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Horas</Label>
                <Input type="number" step="0.5" value={horasForm.hours} onChange={(e) => setHorasForm({ ...horasForm, hours: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Custo/Hora (R$)</Label>
                <Input type="number" step="0.01" value={horasForm.hourly_rate} onChange={(e) => setHorasForm({ ...horasForm, hourly_rate: parseFloat(e.target.value) || 0 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Custo Total</Label>
                <Input disabled value={`R$ ${((horasForm.hours || 0) * (horasForm.hourly_rate || 0)).toFixed(2)}`} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Tarefa</Label>
              <Input value={horasForm.task_description} onChange={(e) => setHorasForm({ ...horasForm, task_description: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowHorasForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EPI Form */}
      <Dialog open={showEpiForm} onOpenChange={setShowEpiForm}>
        <DialogContent className="glass border-pink-500/40" style={{boxShadow:'0 0 40px rgba(236,72,153,0.15)'}}>
          <DialogHeader><DialogTitle className="text-white">Registrar EPI</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createEpi.mutate(epiForm); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Input value={epiForm.employee_name} onChange={(e) => setEpiForm({ ...epiForm, employee_name: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo de EPI</Label>
              <Select value={epiForm.epi_type} onValueChange={(v) => setEpiForm({ ...epiForm, epi_type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['oculos_protecao', 'luvas', 'mascara', 'bota_seguranca', 'capacete', 'protetor_auricular', 'avental', 'respirador'].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" value={epiForm.quantity} onChange={(e) => setEpiForm({ ...epiForm, quantity: parseInt(e.target.value) || 1 })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Data Entrega</Label>
                <Input type="date" value={epiForm.delivery_date} onChange={(e) => setEpiForm({ ...epiForm, delivery_date: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={epiForm.expiry_date} onChange={(e) => setEpiForm({ ...epiForm, expiry_date: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEpiForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Holiday Form */}
      <Dialog open={showHolidayForm} onOpenChange={setShowHolidayForm}>
        <DialogContent className="glass border-pink-500/40" style={{boxShadow:'0 0 40px rgba(236,72,153,0.15)'}}>
          <DialogHeader><DialogTitle className="text-white">Adicionar Feriado</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createHoliday.mutate(holidayForm); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Feriado</Label>
              <Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="bg-white/5 border-white/10" required />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={holidayForm.recurring} onCheckedChange={(v) => setHolidayForm({ ...holidayForm, recurring: v })} />
                <Label>Recorrente</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={holidayForm.affects_deadline} onCheckedChange={(v) => setHolidayForm({ ...holidayForm, affects_deadline: v })} />
                <Label>Afeta Prazo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowHolidayForm(false)}>Cancelar</Button>
              <Button type="submit" className="gradient-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}