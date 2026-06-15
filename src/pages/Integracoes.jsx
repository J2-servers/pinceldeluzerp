import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import ModuleHero from '@/components/system/ModuleHero';
import MetricCard from '@/components/system/MetricCard';
import SmartPanel from '@/components/system/SmartPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Download, Link2, MessageCircle, RefreshCw, Settings, Upload } from 'lucide-react';
import moment from 'moment';

const integrations = [
  { key: 'whatsapp', name: 'WhatsApp Evolution', icon: MessageCircle, color: '#16a34a', description: 'Envio e atendimento via Evolution API', status: 'Configurável' },
  { key: 'fiscal', name: 'Notas Fiscais', icon: Upload, color: '#2563eb', description: 'Emissão, consulta e eventos fiscais', status: 'Operacional' },
  { key: 'crm', name: 'CRM / Webhooks', icon: Link2, color: '#7c3aed', description: 'Eventos de venda, estoque e pagamento', status: 'Interno' },
  { key: 'relatorios', name: 'Exportações', icon: Download, color: '#ea580c', description: 'CSV gerencial e relatórios de apoio', status: 'Ativo' },
];

export default function Integracoes() {
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  const { data: whatsappConfigs = [] } = useQuery({ queryKey: ['whatsappConfig'], queryFn: () => erp.entities.WhatsAppConfig.list('-created_date', 1) });
  const { data: integrationEvents = [] } = useQuery({ queryKey: ['integrationEvents'], queryFn: () => erp.entities.IntegrationEvent.list('-created_date', 50) });
  const { data: failures = [] } = useQuery({ queryKey: ['integrationFailures'], queryFn: () => erp.entities.IntegrationFailureLog.list('-created_date', 50) });

  const whatsappConnected = whatsappConfigs[0]?.connected;
  const stats = useMemo(() => ({ total: integrations.length, connected: integrations.filter((item) => item.key !== 'whatsapp' || whatsappConnected).length, events: integrationEvents.length, failures: failures.length }), [integrationEvents, failures, whatsappConnected]);

  const addLog = (message, type = 'info') => setLogs((prev) => [{ id: Date.now(), message, type, timestamp: new Date().toISOString() }, ...prev].slice(0, 30));
  const simulateSync = async (label) => { setSyncing(true); addLog(`Iniciando ${label}...`); await new Promise((resolve) => setTimeout(resolve, 900)); addLog(`${label} finalizado com sucesso.`, 'success'); setLastSync(new Date()); setSyncing(false); };

  return (
    <div className="space-y-6 page-neu">
      <Header title="Integrações" subtitle="Painel de conexões, sincronizações e eventos externos" />
      <ModuleHero eyebrow="Hub de integrações" icon={Link2} tone="#2563eb" title="Integrações organizadas para conectar vendas, fiscal, WhatsApp e dados." subtitle="Monitore conexões, simule sincronizações, acompanhe eventos, falhas e acesse rapidamente as configurações críticas do sistema." actions={<Button onClick={() => simulateSync('sincronização geral')} disabled={syncing}><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar tudo</Button>}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><MetricCard icon={Link2} label="Conectores" value={stats.total} color="#2563eb" /><MetricCard icon={CheckCircle} label="Ativos" value={stats.connected} color="#16a34a" /><MetricCard icon={Clock} label="Eventos" value={stats.events} color="#7c3aed" /><MetricCard icon={AlertCircle} label="Falhas" value={stats.failures} color="#dc2626" /></div>
      </ModuleHero>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{integrations.map((item) => {
        const Icon = item.icon;
        const active = item.key !== 'whatsapp' || whatsappConnected;
        return <SmartPanel key={item.key} title={item.name} icon={Icon} tone={item.color} action={<Badge className={active ? 'badge-success' : 'badge-warning'}>{active ? 'Ativo' : item.status}</Badge>}><p className="text-sm text-slate-600 mb-4">{item.description}</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => simulateSync(item.name)} disabled={syncing}><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Testar sync</Button><Button variant="outline"><Settings className="w-4 h-4" /> Configurar</Button></div></SmartPanel>;
      })}</div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SmartPanel title="Log local de sincronização" icon={Clock} tone="#7c3aed">
          {lastSync && <p className="text-xs text-slate-500 mb-3">Última sincronização: {moment(lastSync).format('DD/MM/YYYY HH:mm')}</p>}
          <div className="space-y-2 max-h-[320px] overflow-y-auto">{logs.map((log) => <div key={log.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3"><span>{log.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <RefreshCw className="w-4 h-4 text-blue-600" />}</span><span className="text-sm text-slate-700 flex-1">{log.message}</span><span className="text-xs text-slate-400">{moment(log.timestamp).format('HH:mm:ss')}</span></div>)}{logs.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Nenhuma sincronização nesta sessão.</p>}</div>
        </SmartPanel>
        <SmartPanel title="Eventos recebidos" icon={Link2} tone="#2563eb">
          <div className="space-y-2 max-h-[320px] overflow-y-auto">{integrationEvents.slice(0, 10).map((event) => <div key={event.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-3"><p className="font-black text-slate-800">{event.event_type || event.type || 'Evento'}</p><p className="text-xs text-slate-500">{event.source || event.integration || 'Sistema'} • {moment(event.created_date).format('DD/MM HH:mm')}</p></div>)}{integrationEvents.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Nenhum evento registrado.</p>}</div>
        </SmartPanel>
      </div>
    </div>
  );
}