import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/app-toast';
import { normalizePhoneBR } from '@/lib/numberFormat';
import { sendWhatsAppMessage, whatsappResultMessage } from '@/lib/whatsappSender';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
} from 'recharts';
import {
  Activity, AlertTriangle, BarChart3, BookOpen,
  CheckCircle2, Clipboard, Clock, Copy,
  Database, Eye, EyeOff, FileDown, FileText, Filter,
  Gauge, History, KeyRound, Link2, Loader2, Lock,
  MessageCircle, Megaphone, Phone, PlugZap,
  QrCode, RefreshCw, RotateCcw, Save, Search, Send, Settings,
  ShieldCheck, ShieldOff, Smartphone, Star, Trash2, TrendingUp,
  Unplug, Users, Wifi, WifiOff, X, XCircle, Zap,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://whatsapp-evolution-api.rea8zf.easypanel.host';
const DEFAULT_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const DEFAULT_INSTANCE = 'pincel-de-luz';
const MAX_MSG_CHARS = 1024;

const ALL_TEMPLATES = [
  { id: 'orcamento', name: 'Orçamento enviado', tag: 'Comercial', emoji: '📋', message: 'Olá {nome}! 😊 Segue seu orçamento personalizado. Valor total: R$ {valor}. Posso confirmar a produção para você?' },
  { id: 'cobranca_amigavel', name: 'Cobrança amigável', tag: 'Financeiro', emoji: '💰', message: 'Olá {nome}, tudo bem? Notamos um valor em aberto de R$ {valor}. Posso te ajudar a resolver da melhor forma possível?' },
  { id: 'cobranca_urgente', name: 'Cobrança urgente', tag: 'Financeiro', emoji: '⚠️', message: 'Olá {nome}, seu débito de R$ {valor} está vencido. Por favor, entre em contato para regularizarmos sua situação.' },
  { id: 'pedido_pronto', name: 'Pedido pronto', tag: 'Produção', emoji: '✅', message: 'Olá {nome}! 🎉 Seu pedido está pronto para retirada ou entrega. Valor: R$ {valor}. Quando você pode retirar?' },
  { id: 'pedido_andamento', name: 'Pedido em andamento', tag: 'Produção', emoji: '⚙️', message: 'Olá {nome}! Seu pedido está em produção e deve ficar pronto em breve. Qualquer dúvida, fale conosco!' },
  { id: 'retorno_proposta', name: 'Retorno de proposta', tag: 'Follow-up', emoji: '🔄', message: 'Olá {nome}, passando para saber se ficou alguma dúvida sobre a proposta. Estou à disposição para qualquer esclarecimento! 😊' },
  { id: 'pos_venda', name: 'Pós-venda', tag: 'Relacionamento', emoji: '⭐', message: 'Olá {nome}! Queremos saber se ficou tudo certo com seu pedido. Sua opinião é muito importante para nós!' },
  { id: 'agendamento', name: 'Confirmação de agendamento', tag: 'Atendimento', emoji: '📅', message: 'Olá {nome}, confirmando nosso atendimento agendado. Caso precise alterar o horário, me avise com antecedência. Obrigado!' },
  { id: 'boas_vindas', name: 'Boas-vindas', tag: 'Relacionamento', emoji: '🤝', message: 'Olá {nome}, seja bem-vindo(a) à Pincel de Luz! Ficamos felizes em ter você como cliente. Qualquer dúvida, estamos aqui!' },
  { id: 'promocao', name: 'Promoção especial', tag: 'Marketing', emoji: '🎁', message: 'Olá {nome}! 🎁 Temos uma oferta especial para você. Entre em contato para saber mais sobre nossas condições exclusivas!' },
  { id: 'lembrete_pagamento', name: 'Lembrete de pagamento', tag: 'Financeiro', emoji: '🔔', message: 'Olá {nome}, lembrando que seu pagamento de R$ {valor} vence amanhã. Para facilitar, aceitamos PIX e cartão!' },
  { id: 'entrega_realizada', name: 'Entrega realizada', tag: 'Produção', emoji: '📦', message: 'Olá {nome}! Sua entrega foi realizada com sucesso. Obrigado pela preferência! Qualquer problema, fale conosco.' },
  { id: 'nova_colecao', name: 'Nova coleção', tag: 'Marketing', emoji: '✨', message: 'Olá {nome}! Acabamos de lançar novidades incríveis. Venha conferir nossa nova coleção e aproveite as condições especiais!' },
  { id: 'aniversario', name: 'Aniversário do cliente', tag: 'Relacionamento', emoji: '🎂', message: 'Olá {nome}! 🎉 A Pincel de Luz deseja um feliz aniversário! Como presente, temos uma condição especial esperando por você.' },
  { id: 'pesquisa_satisfacao', name: 'Pesquisa de satisfação', tag: 'Relacionamento', emoji: '📊', message: 'Olá {nome}, tudo bem? Como foi sua experiência conosco? Sua avaliação nos ajuda a melhorar cada dia mais. Obrigado!' },
];

const TEMPLATE_TAGS = ['Todos', 'Comercial', 'Financeiro', 'Produção', 'Follow-up', 'Relacionamento', 'Atendimento', 'Marketing'];
const SEGMENT_OPTIONS = [
  { id: 'todos', label: 'Todos os clientes com telefone' },
  { id: 'devedores', label: 'Clientes com dívida em aberto' },
  { id: 'sem_contato', label: 'Clientes sem contato recente' },
  { id: 'orcamento_pendente', label: 'Orçamentos sem resposta' },
];
const PIE_COLORS = ['#10b981', '#3b82f6', '#f43f5e'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const maskSecret = (value = '') => value ? `${value.slice(0, 4)}${'*'.repeat(Math.max(8, value.length - 8))}${value.slice(-4)}` : 'não configurada';
const money = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const cleanUrl = (value) => String(value || '').replace(/\/+$/, '');
const stateToLabel = (state) => ({ open: 'Conectado', close: 'Desconectado', connecting: 'Conectando…' }[state] || state || 'Desconhecido');
const fmtDT = (value) => value ? new Date(value).toLocaleString('pt-BR') : '--';
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '--';
const fmtTime = (value) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--';

function extractQrPayload(data) {
  const qr = data?.qr || data || {};
  const base64 = qr.base64 || qr.qrcode?.base64 || qr.code?.base64 || '';
  const code = qr.code || qr.qrcode?.code || qr.qr || qr.qrcode || '';
  const pairingCode = qr.pairingCode || qr.pairing_code || qr.pairing || '';
  return { base64, code: typeof code === 'string' ? code : '', pairingCode };
}

function fillTemplate(tpl, client) {
  const name = client?.name || 'cliente';
  const value = Number(client?.total_debt || client?.debt || 0).toFixed(2);
  return tpl.replaceAll('{nome}', name).replaceAll('{valor}', value);
}

function buildDailyChart(logs) {
  const map = {};
  logs.forEach((log) => {
    const d = fmtDate(log.created_date);
    if (!map[d]) map[d] = { date: d, enviadas: 0, preparadas: 0, falhas: 0 };
    if (log.status === 'sent') map[d].enviadas++;
    else if (log.status === 'prepared') map[d].preparadas++;
    else map[d].falhas++;
  });
  return Object.values(map).slice(-14);
}

function buildHourChart(logs) {
  const map = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}h`, qtd: 0 }));
  logs.forEach((log) => {
    if (!log.created_date) return;
    const h = new Date(log.created_date).getHours();
    map[h].qtd++;
  });
  return map;
}

function buildTemplateChart(logs) {
  const map = {};
  logs.forEach((log) => {
    const k = log.template || 'Sem template';
    if (!map[k]) map[k] = { name: k, total: 0 };
    map[k].total++;
  });
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text || ''); return true; } catch { return false; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ active }) {
  return (
    <span className="relative flex h-3 w-3">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    </span>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = 'text-cyan-300', dark = true }) {
  const bg = dark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white shadow-sm';
  const labelColor = dark ? 'text-slate-400' : 'text-slate-500';
  const hintColor = dark ? 'text-slate-500' : 'text-slate-400';
  const iconBg = dark ? 'bg-white/8 text-slate-200' : 'bg-slate-100 text-slate-600';
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.14em] ${labelColor}`}>{label}</p>
          <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
        </div>
        <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint && <p className={`mt-2 text-xs ${hintColor}`}>{hint}</p>}
    </div>
  );
}

function EventLine({ item }) {
  const colors = { success: 'bg-emerald-400', error: 'bg-rose-400', warn: 'bg-amber-400' };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${colors[item.type] || 'bg-cyan-400'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
        {item.detail && <p className="mt-0.5 text-xs text-slate-400 break-words">{item.detail}</p>}
      </div>
      <span className="text-[11px] text-slate-500 flex-shrink-0">{item.time}</span>
    </div>
  );
}

function PhoneMockup({ message, clientName }) {
  const text = message || 'Sua mensagem aparecerá aqui…';
  const now = fmtTime(new Date().toISOString());
  return (
    <div className="mx-auto flex w-64 flex-col rounded-[2.5rem] border-4 border-slate-700 bg-slate-800 shadow-2xl">
      <div className="flex flex-col rounded-t-[2rem] bg-emerald-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 grid place-items-center text-white font-bold text-sm">
            {(clientName || 'C')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{clientName || 'Cliente'}</p>
            <p className="text-[10px] text-emerald-200">online</p>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#0d1117] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjAuNSIgZmlsbD0iIzIyMjgzYSIvPjwvc3ZnPg==')] px-3 py-4 min-h-[160px]">
        <div className="ml-auto max-w-[85%] rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl bg-emerald-700 p-3 shadow">
          <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{text.slice(0, 320)}{text.length > 320 ? '…' : ''}</p>
          <p className="mt-1 text-right text-[10px] text-emerald-200">{now} ✓✓</p>
        </div>
      </div>
      <div className="rounded-b-[2rem] bg-slate-900 px-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-slate-700 px-3 py-1.5">
          <p className="flex-1 text-xs text-slate-500">Mensagem</p>
          <MessageCircle className="h-4 w-4 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}

function MessageDetailModal({ log, onClose }) {
  if (!log) return null;
  const sent = log.status === 'sent';
  const prepared = log.status === 'prepared';
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-600" />
            Detalhe da Mensagem
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Cliente</p>
              <p className="font-semibold">{log.client_name || 'Sem nome'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Telefone</p>
              <p className="font-semibold">{log.phone || '--'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Status</p>
              <Badge className={sent ? 'bg-emerald-100 text-emerald-700' : prepared ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}>
                {sent ? 'Enviada' : prepared ? 'Preparada' : 'Falhou'}
              </Badge>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Canal</p>
              <Badge variant="outline">{log.channel || 'desconhecido'}</Badge>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Fonte</p>
              <p className="font-medium">{log.source || 'sistema'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Template</p>
              <p className="font-medium">{log.template || 'avulsa'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Data/Hora</p>
              <p className="font-medium">{fmtDT(log.created_date)}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Conteúdo da mensagem</p>
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-800 whitespace-pre-wrap">{log.message || 'sem conteúdo'}</div>
          </div>
          {log.reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <strong>Motivo da falha:</strong> {log.reason}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => { await copyToClipboard(log.message); toast.success('Mensagem copiada'); }}>
              <Copy className="h-4 w-4" /> Copiar texto
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { await copyToClipboard(log.phone); toast.success('Telefone copiado'); }}>
              <Phone className="h-4 w-4" /> Copiar telefone
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageLogRow({ log, onDetail }) {
  const sent = log.status === 'sent';
  const prepared = log.status === 'prepared';
  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
      <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${sent ? 'bg-emerald-400' : prepared ? 'bg-blue-400' : 'bg-rose-400'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="font-bold text-slate-900 text-sm">{log.client_name || 'Contato sem nome'}</p>
          <Badge className={`text-[11px] ${sent ? 'bg-emerald-100 text-emerald-700' : prepared ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
            {sent ? 'enviada' : prepared ? 'preparada' : 'falhou'}
          </Badge>
          <Badge variant="outline" className="text-[11px]">{log.channel || 'canal indefinido'}</Badge>
          {log.template && <Badge variant="outline" className="text-[11px]">{log.template}</Badge>}
        </div>
        <p className="text-xs text-slate-500 mb-2">{log.phone || 'sem telefone'} · {fmtDT(log.created_date)} · {log.source || 'sistema'}</p>
        <p className="line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{log.message || 'sem conteúdo'}</p>
        {log.reason && <p className="mt-1.5 text-xs text-rose-600">⚠ {log.reason}</p>}
      </div>
      <Button size="sm" variant="ghost" onClick={() => onDetail(log)} className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WhatsApp() {
  const queryClient = useQueryClient();

  // Config state
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [instanceName, setInstanceName] = useState(DEFAULT_INSTANCE);
  const [showApiKey, setShowApiKey] = useState(false);

  // Envio state
  const [selectedTemplate, setSelectedTemplate] = useState('orcamento');
  const [selectedClient, setSelectedClient] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // QR state
  const [qrData, setQrData] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [qrCountdown, setQrCountdown] = useState(0);

  // Search/filter state
  const [clientSearch, setClientSearch] = useState('');
  const [templateTagFilter, setTemplateTagFilter] = useState('Todos');
  const [msgSearch, setMsgSearch] = useState('');
  const [msgStatus, setMsgStatus] = useState('todos');
  const [msgChannel, setMsgChannel] = useState('todos');
  const [msgDateFrom, setMsgDateFrom] = useState('');
  const [msgDateTo, setMsgDateTo] = useState('');
  const [msgPage, setMsgPage] = useState(1);
  const MSG_PER_PAGE = 20;

  // Bulk send state
  const [bulkSegment, setBulkSegment] = useState('todos');
  const [bulkTemplate, setBulkTemplate] = useState('orcamento');
  const [bulkDelay, setBulkDelay] = useState(3);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [customTemplates, setCustomTemplates] = useState([]);

  // Automation state
  const [autoQuote, setAutoQuote] = useState(false);
  const [autoOverdue, setAutoOverdue] = useState(false);
  const [autoReady, setAutoReady] = useState(false);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [businessStart, setBusinessStart] = useState('08:00');
  const [businessEnd, setBusinessEnd] = useState('18:00');
  const [rateLimit, setRateLimit] = useState(30);
  const [blacklist, setBlacklist] = useState('');

  // UI state
  const [logs, setLogs] = useState([]);
  const [latency, setLatency] = useState(null);
  const [confirmDanger, setConfirmDanger] = useState('');
  const [purgePassword, setPurgePassword] = useState('');
  const [showPurge, setShowPurge] = useState(false);
  const [purgeUnlocked, setPurgeUnlocked] = useState(false);
  const [detailLog, setDetailLog] = useState(null);

  const addLog = (type, title, detail = '') =>
    setLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, type, title, detail, time: fmtTime(new Date().toISOString()) }, ...prev].slice(0, 50));

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: clients = [] } = useQuery({ queryKey: ['clients-whatsapp'], queryFn: () => erp.entities.Client.list('name', 500) });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes-whatsapp'], queryFn: () => erp.entities.ProductQuote.list('-created_date', 300) });
  const { data: receivables = [] } = useQuery({ queryKey: ['receivables-whatsapp'], queryFn: () => erp.entities.AccountReceivable.list('-due_date', 300) });
  const { data: configs = [] } = useQuery({ queryKey: ['whatsappConfig'], queryFn: () => erp.entities.WhatsAppConfig.list('-created_date', 1) });
  const { data: messageLogs = [] } = useQuery({ queryKey: ['whatsapp-message-logs'], queryFn: () => erp.entities.WhatsAppMessageLog.list('-created_date', 2000) });

  const configRecord = configs[0] || null;

  const allTemplates = useMemo(() => [...ALL_TEMPLATES, ...customTemplates], [customTemplates]);
  const selectedTemplateData = allTemplates.find((t) => t.id === selectedTemplate) || allTemplates[0];
  const selectedClientData = clients.find((c) => c.id === selectedClient);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!configRecord) return;
    setApiUrl(configRecord.api_url || DEFAULT_API_URL);
    setApiKey(configRecord.api_key || DEFAULT_API_KEY);
    setInstanceName(configRecord.instance_name || DEFAULT_INSTANCE);
  }, [configRecord]);

  useEffect(() => {
    if (!selectedClientData) return;
    setCustomPhone(selectedClientData.whatsapp || selectedClientData.phone || '');
    setCustomMessage(fillTemplate(selectedTemplateData?.message || '', selectedClientData));
  }, [selectedClientData, selectedTemplateData]);

  useEffect(() => {
    const build = async () => {
      const p = extractQrPayload(qrData);
      if (p.base64) { setQrImage(p.base64.startsWith('data:') ? p.base64 : `data:image/png;base64,${p.base64}`); return; }
      if (p.code) { setQrImage(await QRCode.toDataURL(p.code, { width: 300, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })); return; }
      setQrImage('');
    };
    build().catch(() => setQrImage(''));
  }, [qrData]);

  // QR countdown
  useEffect(() => {
    if (!qrImage) return;
    setQrCountdown(60);
    const interval = setInterval(() => setQrCountdown((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(interval);
  }, [qrImage]);

  // ─── Mutations / API ────────────────────────────────────────────────────────

  const saveConfig = async (updates = {}) => {
    const payload = { api_url: cleanUrl(apiUrl), api_key: apiKey, instance_name: instanceName, last_check: new Date().toISOString(), ...updates };
    if (configRecord?.id) await erp.entities.WhatsAppConfig.update(configRecord.id, payload);
    else await erp.entities.WhatsAppConfig.create(payload);
    queryClient.invalidateQueries({ queryKey: ['whatsappConfig'] });
    addLog('success', 'Configuração salva', `Instância: ${payload.instance_name}`);
  };

  const callEvolution = async (action) => {
    const t0 = performance.now();
    const resp = await erp.functions.invoke('evolutionQrConnection', { action, apiUrl: cleanUrl(apiUrl), apiKey, instanceName });
    setLatency(Math.round(performance.now() - t0));
    return resp.data;
  };

  const statusQuery = useQuery({
    queryKey: ['evolution-status', apiUrl, apiKey ? 'ok' : 'miss', instanceName],
    enabled: !!apiUrl && !!apiKey && !!instanceName,
    refetchInterval: 20000,
    queryFn: async () => {
      const data = await callEvolution('status');
      await saveConfig({ connected: data.state === 'open' });
      return data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: (action) => callEvolution(action),
    onSuccess: async (data, action) => {
      if (data.qr) setQrData(data);
      await saveConfig({ connected: data.state === 'open' });
      queryClient.invalidateQueries({ queryKey: ['evolution-status'] });
      addLog('success', `Ação: ${action}`, `Estado: ${stateToLabel(data.state)}`);
      toast.success(action === 'setup' || action === 'refreshQr' ? 'QR Code atualizado' : 'Comando enviado');
    },
    onError: (err) => { addLog('error', 'Falha na Evolution API', err.message); toast.error(err.message || 'Falha ao conectar'); },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!customMessage.trim()) throw new Error('Mensagem vazia');
      return sendWhatsAppMessage({ phone: normalizePhoneBR(customPhone) || customPhone, message: customMessage, clientName: selectedClientData?.name || '', source: 'pagina_whatsapp', template: selectedTemplateData?.name || '', context: selectedTemplateData?.tag || '' });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-message-logs'] });
      addLog(result.sent ? 'success' : 'warn', whatsappResultMessage(result), customPhone);
      if (result.sent || result.copied) toast.success(whatsappResultMessage(result)); else toast.error(whatsappResultMessage(result));
    },
    onError: (err) => { addLog('error', 'Envio bloqueado', err.message); toast.error(err.message); },
  });

  const purgeMutation = useMutation({
    mutationFn: async () => {
      const resp = await erp.functions.invoke('purgeWhatsAppMessageLogs', { password: purgePassword });
      return resp.data;
    },
    onSuccess: (data) => {
      setPurgePassword(''); setPurgeUnlocked(false); setShowPurge(false);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-message-logs'] });
      addLog('success', 'Histórico limpo com senha', `${data.deleted || 0} registros removidos`);
      toast.success('Histórico limpo com autenticação');
    },
    onError: (err) => { addLog('error', 'Limpeza negada', err.message); toast.error(err.message || 'Senha inválida'); },
  });

  // ─── Derived data ────────────────────────────────────────────────────────────

  const isConnected = statusQuery.data?.state === 'open' || configRecord?.connected || false;
  const stateLabel = stateToLabel(statusQuery.data?.state || (configRecord?.connected ? 'open' : 'close'));
  const qrPayload = extractQrPayload(qrData);

  const clientsWithPhone = useMemo(() => clients.filter((c) => normalizePhoneBR(c.whatsapp || c.phone || '')).length, [clients]);
  const missingPhone = useMemo(() => clients.filter((c) => !normalizePhoneBR(c.whatsapp || c.phone || '')), [clients]);
  const pendingClients = useMemo(() => clients.filter((c) => Number(c.total_debt || c.debt || 0) > 0), [clients]);

  const filteredClients = useMemo(() =>
    clients.filter((c) => `${c.name || ''} ${c.phone || ''} ${c.whatsapp || ''}`.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 100),
    [clients, clientSearch]);

  const filteredTemplates = useMemo(() =>
    allTemplates.filter((t) => templateTagFilter === 'Todos' || t.tag === templateTagFilter),
    [allTemplates, templateTagFilter]);

  const channels = useMemo(() => [...new Set(messageLogs.map((l) => l.channel).filter(Boolean))], [messageLogs]);
  const sources = useMemo(() => [...new Set(messageLogs.map((l) => l.source).filter(Boolean))], [messageLogs]);

  const filteredLogs = useMemo(() => {
    return messageLogs.filter((log) => {
      const hay = `${log.client_name || ''} ${log.phone || ''} ${log.message || ''} ${log.channel || ''} ${log.source || ''} ${log.template || ''}`.toLowerCase();
      const statusOk = msgStatus === 'todos' || log.status === msgStatus;
      const channelOk = msgChannel === 'todos' || log.channel === msgChannel;
      const searchOk = hay.includes(msgSearch.toLowerCase());
      const dateFromOk = !msgDateFrom || (log.created_date && new Date(log.created_date) >= new Date(msgDateFrom));
      const dateToOk = !msgDateTo || (log.created_date && new Date(log.created_date) <= new Date(msgDateTo + 'T23:59:59'));
      return statusOk && channelOk && searchOk && dateFromOk && dateToOk;
    });
  }, [messageLogs, msgStatus, msgChannel, msgSearch, msgDateFrom, msgDateTo]);

  const pagedLogs = useMemo(() => filteredLogs.slice((msgPage - 1) * MSG_PER_PAGE, msgPage * MSG_PER_PAGE), [filteredLogs, msgPage]);
  const totalPages = Math.ceil(filteredLogs.length / MSG_PER_PAGE);

  const sentCount = useMemo(() => messageLogs.filter((l) => l.status === 'sent').length, [messageLogs]);
  const preparedCount = useMemo(() => messageLogs.filter((l) => l.status === 'prepared').length, [messageLogs]);
  const failedCount = useMemo(() => messageLogs.filter((l) => l.status === 'failed').length, [messageLogs]);
  const todayLogs = useMemo(() => messageLogs.filter((l) => l.created_date && new Date(l.created_date).toDateString() === new Date().toDateString()), [messageLogs]);
  const successRate = messageLogs.length > 0 ? Math.round((sentCount / messageLogs.length) * 100) : 0;

  const readiness = [!!apiUrl, !!apiKey, !!instanceName, statusQuery.isSuccess || isConnected, clientsWithPhone > 0, allTemplates.length >= 5, !statusQuery.isError, !!cleanUrl(apiUrl).startsWith('https://')].filter(Boolean).length;
  const readinessPct = Math.round((readiness / 8) * 100);
  const lastCheck = configRecord?.last_check ? fmtDT(configRecord.last_check) : 'sem verificação';

  const dailyChart = useMemo(() => buildDailyChart(messageLogs), [messageLogs]);
  const hourChart = useMemo(() => buildHourChart(messageLogs), [messageLogs]);
  const templateChart = useMemo(() => buildTemplateChart(messageLogs), [messageLogs]);
  const pieData = [{ name: 'Enviadas', value: sentCount }, { name: 'Preparadas', value: preparedCount }, { name: 'Falhas', value: failedCount }].filter((d) => d.value > 0);

  // Bulk send targets
  const bulkTargets = useMemo(() => {
    const withPhone = clients.filter((c) => normalizePhoneBR(c.whatsapp || c.phone || ''));
    if (bulkSegment === 'todos') return withPhone;
    if (bulkSegment === 'devedores') return withPhone.filter((c) => Number(c.total_debt || c.debt || 0) > 0);
    if (bulkSegment === 'orcamento_pendente') return withPhone.slice(0, Math.min(withPhone.length, quotes.length));
    return withPhone;
  }, [clients, quotes, bulkSegment]);

  const exportLogsCSV = () => {
    const header = 'Data,Cliente,Telefone,Status,Canal,Template,Fonte,Mensagem';
    const rows = filteredLogs.map((l) => [fmtDT(l.created_date), l.client_name || '', l.phone || '', l.status || '', l.channel || '', l.template || '', l.source || '', `"${(l.message || '').replace(/"/g, '""')}"`].join(','));
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `whatsapp_historico_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso');
  };

  const handleBulkSend = async () => {
    if (bulkTargets.length === 0) { toast.error('Nenhum cliente no segmento'); return; }
    setBulkSending(true);
    setBulkProgress({ sent: 0, failed: 0, total: bulkTargets.length, current: '' });
    const tpl = allTemplates.find((t) => t.id === bulkTemplate);
    for (let i = 0; i < bulkTargets.length; i++) {
      const client = bulkTargets[i];
      setBulkProgress((prev) => ({ ...prev, current: client.name || client.phone || '', index: i + 1 }));
      try {
        const msg = fillTemplate(tpl?.message || '', client);
        const result = await sendWhatsAppMessage({ phone: normalizePhoneBR(client.whatsapp || client.phone || '') || client.phone, message: msg, clientName: client.name || '', source: 'disparo_em_massa', template: tpl?.name || '', context: tpl?.tag || '' });
        setBulkProgress((prev) => ({ ...prev, sent: prev.sent + (result.sent ? 1 : 0), failed: prev.failed + (!result.sent ? 1 : 0) }));
      } catch {
        setBulkProgress((prev) => ({ ...prev, failed: prev.failed + 1 }));
      }
      if (i < bulkTargets.length - 1) await new Promise((r) => setTimeout(r, bulkDelay * 1000));
    }
    queryClient.invalidateQueries({ queryKey: ['whatsapp-message-logs'] });
    setBulkSending(false);
    addLog('success', `Disparo em massa concluído`, `${bulkTargets.length} clientes processados`);
    toast.success(`Disparo concluído — ${bulkTargets.length} clientes`);
  };

  const dangerAction = (action) => {
    if (confirmDanger !== instanceName) { toast.error('Digite o nome da instância para confirmar'); return; }
    actionMutation.mutate(action); setConfirmDanger('');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {detailLog && <MessageDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}

      <Header
        title="WhatsApp"
        subtitle="Central de automação e comunicação — Evolution API v2, disparos em massa, templates, analytics e histórico permanente"
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={isConnected ? Wifi : WifiOff} label="Conexão" value={stateLabel} hint={`Atualizado: ${lastCheck}`} tone={isConnected ? 'text-emerald-300' : 'text-rose-300'} />
        <StatCard icon={Gauge} label="Prontidão" value={`${readinessPct}%`} hint="Critérios operacionais" />
        <StatCard icon={Users} label="Contatos" value={`${clientsWithPhone}/${clients.length}`} hint={`${missingPhone.length} sem telefone`} />
        <StatCard icon={Send} label="Enviadas hoje" value={todayLogs.length} hint="Mensagens no dia" tone="text-cyan-300" />
        <StatCard icon={TrendingUp} label="Taxa sucesso" value={`${successRate}%`} hint={`${messageLogs.length} total`} tone={successRate > 70 ? 'text-emerald-300' : 'text-amber-300'} />
        <StatCard icon={Clock} label="Latência" value={latency ? `${latency}ms` : '--'} hint="Última chamada API" />
      </div>

      {/* ── Connection Hero (neumórfico) ── */}
      <div className="card p-5" style={{ borderRadius: 'var(--r-2xl)' }}>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center shrink-0" style={{ borderRadius: 'var(--r-lg)', background: 'var(--sistema)', boxShadow: '4px 4px 10px rgba(0,0,0,0.18), -2px -2px 6px var(--nm-light)' }}>
              <PlugZap className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] mb-0.5" style={{ color: 'var(--sistema)', fontWeight: 700 }}>Evolution API v2 · QR Code</p>
              <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Central de Conexão WhatsApp</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Instância local via proxy backend SQLite</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="chip">
              <PulsingDot active={isConnected} />
              <span style={{ color: isConnected ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{stateLabel}</span>
            </div>
            <span className="chip"><Database className="mr-1 h-3 w-3" style={{ color: 'var(--accent)' }} />SQLite local</span>
            <span className="chip"><ShieldCheck className="mr-1 h-3 w-3" style={{ color: 'var(--purple)' }} />Backend proxy</span>
            {statusQuery.isFetching && <span className="chip"><Loader2 className="mr-1 h-3 w-3 animate-spin" style={{ color: 'var(--orange)' }} />Verificando</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Credentials + Commands */}
          <div className="space-y-4 xl:col-span-5">
            <GlassCard variant="pressed" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}><KeyRound className="h-4 w-4" style={{ color: 'var(--sistema)' }} />Credenciais</h3>
                <Button size="sm" variant="outline" onClick={() => saveConfig({ connected: isConnected })} disabled={!apiUrl || !apiKey || !instanceName}>
                  <Save className="h-4 w-4" />Salvar
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">URL da Evolution API</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://..." />
                    <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={async () => { await copyToClipboard(cleanUrl(apiUrl)); toast.success('URL copiada'); }}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={apiKey} type={showApiKey ? 'text' : 'password'} onChange={(e) => setApiKey(e.target.value)} />
                    <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setShowApiKey((p) => !p)}>{showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                  <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{maskSecret(apiKey)}</p>
                </div>
                <div>
                  <Label className="text-xs">Nome da instância</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
                    <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={async () => { await copyToClipboard(instanceName); toast.success('Instância copiada'); }}><Clipboard className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="pressed" hover={false}>
              <h3 className="mb-4 flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}><Activity className="h-4 w-4" style={{ color: 'var(--green)' }} />Comandos da instância</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => actionMutation.mutate('setup')} disabled={actionMutation.isPending || !apiKey} style={{ background: 'var(--sistema)', color: '#fff' }}><QrCode className="h-4 w-4" />Gerar QR</Button>
                <Button variant="outline" onClick={() => actionMutation.mutate('status')} disabled={actionMutation.isPending || !apiKey}><RefreshCw className="h-4 w-4" />Status</Button>
                <Button variant="outline" onClick={() => actionMutation.mutate('refreshQr')} disabled={actionMutation.isPending || !apiKey}><RotateCcw className="h-4 w-4" />Renovar QR</Button>
                <Button variant="outline" onClick={() => actionMutation.mutate('restart')} disabled={actionMutation.isPending || !apiKey}><Zap className="h-4 w-4" />Reiniciar</Button>
                <Button variant="outline" style={{ color: 'var(--orange)' }} onClick={() => actionMutation.mutate('logout')} disabled={actionMutation.isPending || !apiKey}><Unplug className="h-4 w-4" />Desconectar</Button>
                <Button variant="destructive" onClick={() => dangerAction('delete')} disabled={actionMutation.isPending || !apiKey}><Trash2 className="h-4 w-4" />Excluir</Button>
              </div>
              <div className="mt-3 space-y-1">
                <Input value={confirmDanger} onChange={(e) => setConfirmDanger(e.target.value)} placeholder={`Digite "${instanceName}" para excluir`} className="text-sm" />
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Confirme o nome da instância para ações destrutivas</p>
              </div>
            </GlassCard>
          </div>

          {/* QR Code */}
          <div className="xl:col-span-7">
            <GlassCard variant="pressed" hover={false} className="h-full">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}><Smartphone className="h-4 w-4" style={{ color: 'var(--sistema)' }} />QR Code de conexão</h3>
                <div className="flex items-center gap-2">
                  {actionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--sistema)' }} />}
                  {qrImage && qrCountdown > 0 && (
                    <span className="chip"><Clock className="mr-1 h-3 w-3" style={{ color: 'var(--orange)' }} />{qrCountdown}s</span>
                  )}
                </div>
              </div>
              <div className="grid min-h-[340px] place-items-center p-6 text-center" style={{ borderRadius: 'var(--r-xl)', background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
                {qrImage ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img src={qrImage} alt="QR Code WhatsApp" className="mx-auto h-64 w-64 p-3" style={{ borderRadius: 'var(--r-lg)', background: '#fff', boxShadow: 'var(--shadow-raised)' }} />
                      {qrCountdown === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ borderRadius: 'var(--r-lg)', background: 'rgba(0,0,0,0.78)' }}>
                          <div className="text-center">
                            <XCircle className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--red)' }} />
                            <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>QR Code expirado</p>
                            <Button size="sm" className="mt-3" onClick={() => actionMutation.mutate('refreshQr')}><RotateCcw className="h-4 w-4" />Renovar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo → Escaneie este código</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {!!qrPayload.code && <Button size="sm" variant="outline" onClick={async () => { await copyToClipboard(qrPayload.code); toast.success('QR copiado'); }}><Copy className="h-4 w-4" />Copiar QR</Button>}
                      {!!qrPayload.pairingCode && <span className="chip">Pareamento: {qrPayload.pairingCode}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto h-20 w-20 grid place-items-center" style={{ borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', boxShadow: 'var(--shadow-flat)' }}>
                      <QrCode className="h-10 w-10" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Nenhum QR Code ativo</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Clique em Gerar QR para criar ou recuperar a instância.</p>
                    </div>
                    <Button onClick={() => actionMutation.mutate('setup')} disabled={actionMutation.isPending || !apiKey} style={{ background: 'var(--sistema)', color: '#fff' }}>
                      {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      Gerar QR Code
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="envio" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1 justify-start border border-white/10 bg-slate-950/70 p-1.5 rounded-2xl">
          {[
            ['envio', Send, 'Envio'],
            ['disparos', Megaphone, 'Disparos'],
            ['templates', BookOpen, 'Templates'],
            ['clientes', Users, 'Clientes'],
            ['analytics', BarChart3, 'Analytics'],
            ['automacoes', Zap, 'Automações'],
            ['historico', History, 'Histórico'],
            ['configuracao', Settings, 'Config'],
            ['logs', Activity, 'Logs'],
          ].map(([value, Icon, label]) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-300">
              <Icon className="h-4 w-4" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Envio ── */}
        <TabsContent value="envio" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <GlassCard className="xl:col-span-5">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900"><Send className="h-5 w-5 text-cyan-600" />Envio controlado</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.phone || c.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.emoji} {t.name} · {t.tag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone / WhatsApp</Label>
                  <Input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} placeholder="5511999999999" className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">Normalizado: {normalizePhoneBR(customPhone) || 'inválido'}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-medium">Mensagem</Label>
                    <span className={`text-xs ${customMessage.length > MAX_MSG_CHARS * 0.9 ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>{customMessage.length}/{MAX_MSG_CHARS}</span>
                  </div>
                  <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="min-h-36 resize-none" maxLength={MAX_MSG_CHARS} />
                  {customMessage.length > MAX_MSG_CHARS * 0.9 && <p className="mt-1 text-xs text-amber-600">⚠ Aproximando do limite do WhatsApp</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-500">Agendamento (opcional)</Label>
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1 text-sm" />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !customPhone || !customMessage} className="bg-emerald-600 hover:bg-emerald-500">
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar agora
                  </Button>
                  <Button variant="outline" onClick={async () => { await copyToClipboard(customMessage); toast.success('Mensagem copiada'); }}><Copy className="h-4 w-4" />Copiar</Button>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4 xl:col-span-7">
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900"><Smartphone className="h-5 w-5 text-emerald-600" />Preview no celular</h3>
                <PhoneMockup message={customMessage} clientName={selectedClientData?.name || ''} />
              </GlassCard>

              <GlassCard>
                <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><FileText className="h-4 w-4 text-violet-600" />Templates rápidos</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {allTemplates.slice(0, 6).map((t) => (
                    <button key={t.id} type="button" onClick={() => setSelectedTemplate(t.id)}
                      className={`rounded-xl border p-3 text-left transition ${selectedTemplate === t.id ? 'border-cyan-400 bg-cyan-50 shadow-sm' : 'border-slate-200 bg-white hover:border-cyan-200'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-slate-900 text-sm">{t.emoji} {t.name}</p>
                        <Badge variant="outline" className="text-[10px]">{t.tag}</Badge>
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-500">{t.message}</p>
                    </button>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Disparos em Massa ── */}
        <TabsContent value="disparos" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <GlassCard className="xl:col-span-2">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900"><Megaphone className="h-5 w-5 text-rose-600" />Disparo em massa</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Segmento alvo</Label>
                  <Select value={bulkSegment} onValueChange={setBulkSegment}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEGMENT_OPTIONS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Template da campanha</Label>
                  <Select value={bulkTemplate} onValueChange={setBulkTemplate}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.emoji} {t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Intervalo entre envios (s)</Label>
                  <Input type="number" min={1} max={60} value={bulkDelay} onChange={(e) => setBulkDelay(Number(e.target.value))} className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">Mínimo 1s para não ser bloqueado</p>
                </div>
                <div className="flex items-end pb-1">
                  <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Clientes no segmento</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{bulkTargets.length}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tempo estimado: ~{Math.round(bulkTargets.length * bulkDelay / 60)} min</p>
                  </div>
                </div>
              </div>

              {bulkProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">Enviando para: {bulkProgress.current}</span>
                    <span className="text-slate-500">{bulkProgress.index || 0}/{bulkProgress.total}</span>
                  </div>
                  <Progress value={((bulkProgress.index || 0) / bulkProgress.total) * 100} className="h-2" />
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-600 font-semibold">✓ {bulkProgress.sent} enviadas</span>
                    <span className="text-rose-600 font-semibold">✗ {bulkProgress.failed} falhas</span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <Button onClick={handleBulkSend} disabled={bulkSending || bulkTargets.length === 0} className="bg-rose-600 hover:bg-rose-500">
                  {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                  {bulkSending ? 'Enviando…' : `Disparar para ${bulkTargets.length} clientes`}
                </Button>
                {bulkProgress && !bulkSending && (
                  <Button variant="outline" onClick={() => setBulkProgress(null)}>Limpar resultado</Button>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-600" />Boas práticas</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Intervalo mínimo', 'Use 3-5 segundos entre envios para evitar bloqueios'],
                  ['Horário comercial', 'Envie apenas entre 8h e 20h'],
                  ['Segmentação', 'Envie mensagens relevantes para cada segmento'],
                  ['Opt-out', 'Respeite clientes que pedirem para não receber mensagens'],
                  ['Volume diário', 'Limite 100-200 mensagens por dia em instâncias novas'],
                  ['Personalização', 'Use o nome do cliente para maior taxa de resposta'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">{title}</p>
                      <p className="text-slate-600 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ── Templates ── */}
        <TabsContent value="templates" className="mt-4">
          <GlassCard>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><BookOpen className="h-5 w-5 text-violet-600" />Biblioteca de templates</h3>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_TAGS.map((tag) => (
                  <button key={tag} onClick={() => setTemplateTagFilter(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${templateTagFilter === tag ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((t) => {
                const usageCount = messageLogs.filter((l) => l.template === t.name).length;
                return (
                  <div key={t.id} className={`rounded-2xl border p-4 transition cursor-pointer ${selectedTemplate === t.id ? 'border-violet-400 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-sm'}`}
                    onClick={() => setSelectedTemplate(t.id)}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{t.emoji}</span>
                        <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{t.tag}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-3 mb-3">{t.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{usageCount} usos registrados</span>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedTemplate(t.id); }}>
                        <Send className="h-3 w-3" />Usar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Preview do template selecionado</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedTemplateData?.message}</p>
              <p className="mt-2 text-xs text-slate-400">{selectedTemplateData?.message?.length} caracteres · Variáveis: {'{nome}'} {'{valor}'}</p>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── Clientes ── */}
        <TabsContent value="clientes" className="mt-4">
          <GlassCard>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Users className="h-5 w-5 text-cyan-600" />Clientes e oportunidades</h3>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard dark={false} icon={Phone} label="Com telefone" value={clientsWithPhone} hint="Prontos para envio" tone="text-cyan-700" />
              <StatCard dark={false} icon={AlertTriangle} label="Sem telefone" value={missingPhone.length} hint="Cadastro incompleto" tone="text-amber-600" />
              <StatCard dark={false} icon={BarChart3} label="Com dívida" value={pendingClients.length} hint="Cobrança ativa" tone="text-rose-600" />
              <StatCard dark={false} icon={FileText} label="Orçamentos" value={quotes.length} hint="Base follow-up" tone="text-violet-600" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map((client) => {
                const phone = client.whatsapp || client.phone || '';
                const debt = Number(client.total_debt || client.debt || 0);
                const hasPhone = !!normalizePhoneBR(phone);
                return (
                  <div key={client.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-cyan-300 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-8 w-8 rounded-full bg-cyan-100 grid place-items-center text-cyan-700 font-bold text-sm flex-shrink-0">
                            {(client.name || 'C')[0].toUpperCase()}
                          </div>
                          <p className="truncate font-bold text-slate-900">{client.name || 'Cliente sem nome'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-10">
                          {hasPhone ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                          <p className="text-xs text-slate-500">{phone || 'Sem telefone'}</p>
                        </div>
                      </div>
                      <Badge className={`flex-shrink-0 ${debt > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {debt > 0 ? money(debt) : '✓ ok'}
                      </Badge>
                    </div>
                    {hasPhone && (
                      <Button size="sm" variant="outline" className="w-full mt-3 opacity-0 group-hover:opacity-100 transition" onClick={() => { setSelectedClient(client.id); toast.success(`${client.name} selecionado`); }}>
                        <Send className="h-3.5 w-3.5" />Selecionar para envio
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredClients.length === 0 && (
              <div className="py-12 text-center text-slate-500">Nenhum cliente encontrado para a busca.</div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Analytics ── */}
        <TabsContent value="analytics" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard dark={false} icon={Send} label="Total enviadas" value={sentCount} hint="API confirmou" tone="text-emerald-700" />
              <StatCard dark={false} icon={Clipboard} label="Preparadas" value={preparedCount} hint="Link/clipboard" tone="text-blue-700" />
              <StatCard dark={false} icon={AlertTriangle} label="Falhas" value={failedCount} hint="Revisar logs" tone="text-rose-700" />
              <StatCard dark={false} icon={TrendingUp} label="Taxa sucesso" value={`${successRate}%`} hint={`${messageLogs.length} total`} tone={successRate > 70 ? 'text-emerald-700' : 'text-amber-700'} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><BarChart3 className="h-5 w-5 text-cyan-600" />Volume por dia (14 dias)</h3>
                {dailyChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyChart} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="enviadas" fill="#10b981" radius={[4, 4, 0, 0]} name="Enviadas" />
                      <Bar dataKey="preparadas" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Preparadas" />
                      <Bar dataKey="falhas" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Falhas" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[220px] grid place-items-center text-slate-400 text-sm">Sem dados suficientes</div>}
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><BarChart3 className="h-5 w-5 text-violet-600" />Distribuição por status</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[220px] grid place-items-center text-slate-400 text-sm">Sem mensagens registradas</div>}
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Clock className="h-5 w-5 text-amber-600" />Horário de pico</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourChart} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hora" tick={{ fontSize: 9 }} interval={3} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="qtd" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Mensagens" />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Star className="h-5 w-5 text-rose-600" />Templates mais usados</h3>
                {templateChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={templateChart} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Usos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[200px] grid place-items-center text-slate-400 text-sm">Sem dados de templates</div>}
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Automações ── */}
        <TabsContent value="automacoes" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <GlassCard>
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900"><Zap className="h-5 w-5 text-amber-600" />Gatilhos automáticos</h3>
              <div className="space-y-4">
                {[
                  [autoQuote, setAutoQuote, 'Novo orçamento criado', 'Envia template de orçamento automaticamente ao criar', 'Comercial'],
                  [autoOverdue, setAutoOverdue, 'Pagamento em atraso', 'Notifica cliente quando parcela vencer sem pagamento', 'Financeiro'],
                  [autoReady, setAutoReady, 'Pedido pronto', 'Avisa cliente quando produção marcar como concluída', 'Produção'],
                ].map(([value, setter, title, desc, tag]) => (
                  <div key={title} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-slate-900">{title}</p>
                        <Badge variant="outline" className="text-[10px]">{tag}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    <Switch checked={value} onCheckedChange={setter} />
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Clock className="h-4 w-4 text-cyan-600" />Horário de funcionamento</h3>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-sm text-slate-600">Enviar apenas no horário comercial</p>
                  <Switch checked={businessHoursEnabled} onCheckedChange={setBusinessHoursEnabled} />
                </div>
                {businessHoursEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Início</Label>
                      <Input type="time" value={businessStart} onChange={(e) => setBusinessStart(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Fim</Label>
                      <Input type="time" value={businessEnd} onChange={(e) => setBusinessEnd(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Gauge className="h-4 w-4 text-violet-600" />Limite de velocidade</h3>
                <div>
                  <Label className="text-sm">Máximo de mensagens por hora</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Input type="number" min={1} max={200} value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))} className="w-24" />
                    <p className="text-xs text-slate-500">Recomendado: 30-60/hora para instâncias novas</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><ShieldOff className="h-4 w-4 text-rose-600" />Bloqueio de contatos</h3>
                <Textarea value={blacklist} onChange={(e) => setBlacklist(e.target.value)} placeholder="5511999999999&#10;5521888888888&#10;(um número por linha)" className="min-h-24 text-sm font-mono" />
                <p className="mt-2 text-xs text-slate-500">{blacklist.split('\n').filter((l) => l.trim()).length} número(s) na lista de bloqueio</p>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Histórico Permanente ── */}
        <TabsContent value="historico" className="mt-4">
          <div className="space-y-4">
            {/* Header com proteção */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 grid place-items-center flex-shrink-0">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      Histórico Permanente de Mensagens
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">🔒 Protegido</Badge>
                    </h3>
                    <p className="text-sm text-slate-600 mt-0.5">Todas as mensagens enviadas pelo sistema ficam salvas permanentemente. A exclusão só é permitida com senha de administrador.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={exportLogsCSV}>
                    <FileDown className="h-4 w-4" />Exportar CSV
                  </Button>
                  <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setShowPurge((p) => !p)}>
                    <Lock className="h-4 w-4" />Área protegida
                  </Button>
                </div>
              </div>

              {showPurge && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
                  <p className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Exclusão permanente — ação irreversível</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="password"
                      value={purgePassword}
                      onChange={(e) => { setPurgePassword(e.target.value); setPurgeUnlocked(Boolean(e.target.value)); }}
                      placeholder="Senha de administrador"
                      className="sm:w-64 border-rose-200"
                    />
                    <Button
                      variant="destructive"
                      onClick={() => purgeMutation.mutate()}
                      disabled={!purgeUnlocked || purgeMutation.isPending}
                    >
                      {purgeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {purgeUnlocked ? `Limpar ${filteredLogs.length} registros` : 'Senha incorreta'}
                    </Button>
                  </div>
                  {purgeUnlocked && <p className="mt-2 text-xs text-emerald-700 font-semibold">✓ Senha correta — autorizado para exclusão</p>}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard dark={false} icon={History} label="Total registros" value={messageLogs.length} hint="Histórico completo" tone="text-slate-800" />
              <StatCard dark={false} icon={CheckCircle2} label="Enviadas" value={sentCount} hint="API confirmou" tone="text-emerald-700" />
              <StatCard dark={false} icon={Clipboard} label="Preparadas" value={preparedCount} hint="Link/clipboard" tone="text-blue-700" />
              <StatCard dark={false} icon={AlertTriangle} label="Falhas" value={failedCount} hint="Revisar" tone="text-rose-700" />
            </div>

            {/* Filtros avançados */}
            <GlassCard>
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <h4 className="font-semibold text-slate-800">Filtros avançados</h4>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="relative xl:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={msgSearch} onChange={(e) => { setMsgSearch(e.target.value); setMsgPage(1); }} placeholder="Buscar cliente, telefone, texto…" className="pl-9" />
                </div>
                <Select value={msgStatus} onValueChange={(v) => { setMsgStatus(v); setMsgPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="sent">✓ Enviadas</SelectItem>
                    <SelectItem value="prepared">● Preparadas</SelectItem>
                    <SelectItem value="failed">✗ Falhas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={msgChannel} onValueChange={(v) => { setMsgChannel(v); setMsgPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os canais</SelectItem>
                    {channels.map((ch) => <SelectItem key={ch} value={ch}>{ch}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div>
                  <Input type="date" value={msgDateFrom} onChange={(e) => { setMsgDateFrom(e.target.value); setMsgPage(1); }} placeholder="De" className="text-sm" />
                </div>
                <div>
                  <Input type="date" value={msgDateTo} onChange={(e) => { setMsgDateTo(e.target.value); setMsgPage(1); }} placeholder="Até" className="text-sm" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">{filteredLogs.length} resultado(s) encontrado(s)</p>
                <Button variant="ghost" size="sm" onClick={() => { setMsgSearch(''); setMsgStatus('todos'); setMsgChannel('todos'); setMsgDateFrom(''); setMsgDateTo(''); setMsgPage(1); }}>
                  <X className="h-4 w-4" />Limpar filtros
                </Button>
              </div>
            </GlassCard>

            {/* Lista */}
            <div className="space-y-2">
              {pagedLogs.length === 0
                ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center text-slate-500">Nenhuma mensagem encontrada para os filtros selecionados.</div>
                : pagedLogs.map((log) => <MessageLogRow key={log.id} log={log} onDetail={setDetailLog} />)
              }
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={msgPage <= 1} onClick={() => setMsgPage((p) => p - 1)}>Anterior</Button>
                <span className="text-sm text-slate-600 px-3">{msgPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={msgPage >= totalPages} onClick={() => setMsgPage((p) => p + 1)}>Próximo</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Configuração ── */}
        <TabsContent value="configuracao" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Gauge className="h-5 w-5 text-cyan-600" />Prontidão do sistema</h3>
              <Progress value={readinessPct} className="h-3 mb-3" />
              <p className="text-lg font-black text-slate-900">{readinessPct}%</p>
              <p className="text-sm text-slate-500 mt-1">{readiness}/8 critérios operacionais atendidos</p>
              <div className="mt-4 space-y-2 text-sm">
                {[
                  [!!apiUrl, 'URL da API configurada'],
                  [!!apiKey, 'API Key configurada'],
                  [!!instanceName, 'Nome da instância configurado'],
                  [statusQuery.isSuccess || isConnected, 'API respondeu com sucesso'],
                  [clientsWithPhone > 0, 'Clientes com telefone cadastrado'],
                  [allTemplates.length >= 5, 'Templates suficientes'],
                  [!statusQuery.isError, 'Sem erros de conexão'],
                  [cleanUrl(apiUrl).startsWith('https://'), 'Conexão segura (HTTPS)'],
                ].map(([ok, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                    <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Link2 className="h-5 w-5 text-violet-600" />Endpoint ativo</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">URL base</p>
                  <p className="break-all text-sm font-mono text-slate-800 bg-slate-50 rounded-lg p-2">{cleanUrl(apiUrl) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Instância</p>
                  <p className="text-sm font-mono text-slate-800 bg-slate-50 rounded-lg p-2">{instanceName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">API Key (mascarada)</p>
                  <p className="text-sm font-mono text-slate-500 bg-slate-50 rounded-lg p-2">{maskSecret(apiKey)}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => actionMutation.mutate('status')} disabled={actionMutation.isPending}>
                  {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Testar conexão agora
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600" />Segurança e auditoria</h3>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="font-semibold text-emerald-800">✓ Dados 100% locais</p>
                  <p className="text-emerald-700 text-xs mt-0.5">Todas as credenciais ficam no SQLite local, sem envio para servidores externos.</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <p className="font-semibold text-blue-800">✓ Histórico imutável</p>
                  <p className="text-blue-700 text-xs mt-0.5">Mensagens enviadas ficam salvas permanentemente. Exclusão requer senha administrativa.</p>
                </div>
                <div className="rounded-xl bg-violet-50 border border-violet-200 p-3">
                  <p className="font-semibold text-violet-800">✓ Proxy backend</p>
                  <p className="text-violet-700 text-xs mt-0.5">Chamadas à Evolution API passam pelo backend local, nunca pelo navegador diretamente.</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Última verificação</p>
                  <p className="font-medium text-slate-700">{lastCheck}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Latência medida</p>
                  <p className="font-medium text-slate-700">{latency ? `${latency} ms` : '—'}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ── Logs de sessão ── */}
        <TabsContent value="logs" className="mt-4">
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Activity className="h-5 w-5 text-cyan-600" />Eventos da sessão</h3>
              <div className="flex gap-2">
                <Badge variant="outline">{logs.length} evento(s)</Badge>
                <Button variant="outline" size="sm" onClick={() => setLogs([])}>Limpar</Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-950/90 p-3">
              {logs.length === 0
                ? <p className="py-12 text-center text-sm text-slate-500">Nenhum evento registrado nesta sessão.</p>
                : logs.map((item) => <EventLine key={item.id} item={item} />)}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
