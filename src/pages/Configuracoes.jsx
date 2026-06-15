import React, { useState, useEffect } from 'react';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Building2,
  MessageCircle,
  Link2,
  Bell,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
  FileText,
  Database,
  Download,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  Palette,
  Image as ImageIcon,
  Upload,
  Save,
  Eye,
} from 'lucide-react';
import ConfiguracaoFiscal from '@/components/fiscal/ConfiguracaoFiscal';
import { applyFavicon, getCompanyLogoUrl, isSafeImageUrl } from '@/lib/brandingAssets';

export default function Configuracoes() {
  const [user, setUser] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState({ api_url: '', api_key: '', instance_name: '' });
  const [notifications, setNotifications] = useState({ estoque_baixo: true, caixa_baixo: true, cobrancas: true });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupDbPath, setBackupDbPath] = useState('');
  const [backupStatus, setBackupStatus] = useState({ type: 'idle', message: '' });
  const [backupBusy, setBackupBusy] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedBackup, setSelectedBackup] = useState('');
  const [companyConfigId, setCompanyConfigId] = useState(null);
  const [brandingForm, setBrandingForm] = useState({
    company_name: 'Pincel de Luz',
    legal_name: '',
    cnpj: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    app_logo_url: '',
    pdf_logo_url: '',
    favicon_url: '',
    primary_color: '#2563eb',
    pdf_footer_text: 'Documento gerado pelo ERP local',
  });
  const [brandingStatus, setBrandingStatus] = useState({ type: 'idle', message: '' });
  const [brandingBusy, setBrandingBusy] = useState(false);
  const [uploadingField, setUploadingField] = useState('');

  useEffect(() => {
    erp.auth.me().then(setUser).catch(() => {});
    erp.entities.WhatsAppConfig.list('-created_date', 1).then(configs => {
      if (configs.length > 0) setWhatsappConfig({ api_url: configs[0].api_url||'', api_key: configs[0].api_key||'', instance_name: configs[0].instance_name||'' });
    }).catch(() => {});
    loadCompanyConfig();
    loadBackups();
  }, []);

  const loadCompanyConfig = async () => {
    try {
      const configs = await erp.entities.CompanyConfig.list('-created_date', 1);
      const config = configs[0] || null;
      if (!config) return;
      setCompanyConfigId(config.id);
      setBrandingForm((prev) => ({
        ...prev,
        company_name: config.company_name || prev.company_name,
        legal_name: config.legal_name || '',
        cnpj: config.cnpj || '',
        phone: config.phone || '',
        email: config.email || '',
        website: config.website || '',
        logo_url: config.logo_url || '',
        app_logo_url: config.app_logo_url || '',
        pdf_logo_url: config.pdf_logo_url || '',
        favicon_url: config.favicon_url || '',
        primary_color: config.primary_color || prev.primary_color,
        pdf_footer_text: config.pdf_footer_text || prev.pdf_footer_text,
      }));
      applyFavicon(getCompanyLogoUrl(config, 'favicon'));
    } catch (error) {
      setBrandingStatus({ type: 'error', message: error.message || 'Nao foi possivel carregar a identidade visual.' });
    }
  };

  const updateBranding = (field, value) => {
    setBrandingForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadBrandingImage = async (field, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBrandingStatus({ type: 'error', message: 'Envie apenas imagens PNG, JPG, WEBP, SVG ou ICO.' });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setBrandingStatus({ type: 'error', message: 'Imagem muito grande. Use arquivo de ate 4 MB.' });
      return;
    }
    setUploadingField(field);
    setBrandingStatus({ type: 'loading', message: 'Enviando imagem para a pasta local do ERP...' });
    try {
      const { file_url } = await erp.integrations.Core.UploadFile({ file });
      if (!isSafeImageUrl(file_url)) throw new Error('URL de imagem invalida retornada pelo servidor local.');
      updateBranding(field, file_url);
      setBrandingStatus({ type: 'success', message: 'Imagem enviada. Clique em Salvar personalizacao para aplicar.' });
    } catch (error) {
      setBrandingStatus({ type: 'error', message: error.message || 'Falha ao enviar imagem.' });
    } finally {
      setUploadingField('');
    }
  };

  const saveBranding = async () => {
    if (!brandingForm.company_name.trim()) {
      setBrandingStatus({ type: 'error', message: 'Informe o nome da empresa.' });
      return;
    }
    setBrandingBusy(true);
    setBrandingStatus({ type: 'loading', message: 'Salvando identidade visual no banco local...' });
    try {
      const payload = {
        ...brandingForm,
        company_name: brandingForm.company_name.trim(),
        logo_url: brandingForm.app_logo_url || brandingForm.logo_url || brandingForm.pdf_logo_url,
      };
      let saved;
      if (companyConfigId) saved = await erp.entities.CompanyConfig.update(companyConfigId, payload);
      else saved = await erp.entities.CompanyConfig.create(payload);
      setCompanyConfigId(saved.id);
      applyFavicon(getCompanyLogoUrl(saved, 'favicon'));
      setBrandingStatus({ type: 'success', message: 'Personalizacao salva. Recarregue se algum logo antigo ainda estiver em cache.' });
    } catch (error) {
      setBrandingStatus({ type: 'error', message: error.message || 'Falha ao salvar personalizacao.' });
    } finally {
      setBrandingBusy(false);
    }
  };

  const loadBackups = async () => {
    setBackupBusy(true);
    try {
      const response = await erp.functions.invoke('listSqliteBackups');
      setBackups(response.data?.backups || []);
      setBackupDbPath(response.data?.database || '');
      setBackupStatus({ type: 'success', message: 'Lista de backups atualizada.' });
    } catch (error) {
      setBackupStatus({ type: 'error', message: error.message || 'Nao foi possivel listar os backups.' });
    } finally {
      setBackupBusy(false);
    }
  };

  const createBackup = async () => {
    setBackupBusy(true);
    setBackupStatus({ type: 'loading', message: 'Criando backup consistente do banco local...' });
    try {
      const response = await erp.functions.invoke('createSqliteBackup', { reason: 'manual-configuracoes' });
      await loadBackups();
      setSelectedBackup(response.data?.file_name || '');
      setBackupStatus({ type: 'success', message: `Backup criado e verificado: ${response.data?.file_name}` });
    } catch (error) {
      setBackupStatus({ type: 'error', message: error.message || 'Falha ao criar backup.' });
    } finally {
      setBackupBusy(false);
    }
  };

  const verifyBackup = async (fileName) => {
    if (!fileName) return;
    setBackupBusy(true);
    try {
      const response = await erp.functions.invoke('verifySqliteBackup', { file_name: fileName });
      const data = response.data;
      setBackupStatus({
        type: data?.integrity_ok ? 'success' : 'error',
        message: data?.integrity_ok
          ? `Backup verificado: ${data.file_name} | ${data.table_count} tabelas | ${data.row_count} registros | SHA-256 ${String(data.sha256 || '').slice(0, 12)}...`
          : `Backup reprovado: ${data?.integrity_message || 'integridade invalida'}`,
      });
      await loadBackups();
    } catch (error) {
      setBackupStatus({ type: 'error', message: error.message || 'Falha ao verificar backup.' });
    } finally {
      setBackupBusy(false);
    }
  };

  const downloadBackup = async (fileName) => {
    if (!fileName) return;
    const password = window.prompt('Informe a senha administrativa para baixar este backup.');
    if (!password) {
      setBackupStatus({ type: 'error', message: 'Download cancelado. A senha administrativa e obrigatoria.' });
      return;
    }
    setBackupBusy(true);
    setBackupStatus({ type: 'loading', message: 'Validando senha e preparando download protegido...' });
    try {
      const response = await erp.functions.invoke('downloadSqliteBackup', { file_name: fileName, password });
      const data = response.data || {};
      const binary = atob(data.base64 || '');
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mime_type || 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = data.file_name || fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setBackupStatus({ type: 'success', message: `Backup baixado com seguranca. SHA-256 ${String(data.sha256 || '').slice(0, 12)}...` });
    } catch (error) {
      setBackupStatus({ type: 'error', message: error.message || 'Falha ao baixar backup.' });
    } finally {
      setBackupBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!selectedBackup) {
      setBackupStatus({ type: 'error', message: 'Escolha um backup antes de restaurar.' });
      return;
    }
    if (!restorePassword) {
      setBackupStatus({ type: 'error', message: 'Informe a senha administrativa para restaurar.' });
      return;
    }
    setBackupBusy(true);
    setBackupStatus({ type: 'loading', message: 'Validando backup, criando copia de seguranca e restaurando banco...' });
    try {
      const response = await erp.functions.invoke('restoreSqliteBackup', { file_name: selectedBackup, password: restorePassword });
      setRestorePassword('');
      await loadBackups();
      setBackupStatus({
        type: 'success',
        message: `Banco restaurado de ${response.data?.restored_from}. Backup de seguranca criado: ${response.data?.safety_backup?.file_name}. Recarregue as paginas abertas para refletir os dados restaurados.`,
      });
    } catch (error) {
      setBackupStatus({ type: 'error', message: error.message || 'Falha ao restaurar backup.' });
    } finally {
      setBackupBusy(false);
    }
  };

  const formatBytes = (bytes = 0) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR');
  };

  const saveWhatsappConfig = async () => {
    setSaveStatus('saving');
    try {
      const configs = await erp.entities.WhatsAppConfig.list('-created_date', 1);
      if (configs.length > 0) await erp.entities.WhatsAppConfig.update(configs[0].id, whatsappConfig);
      else await erp.entities.WhatsAppConfig.create(whatsappConfig);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch { setSaveStatus('error'); }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      if (!whatsappConfig.api_url || !whatsappConfig.api_key || !whatsappConfig.instance_name) { setConnectionStatus('error'); return; }
      const response = await fetch(`${whatsappConfig.api_url}/instance/connectionState/${whatsappConfig.instance_name}`, { headers: { 'apikey': whatsappConfig.api_key } });
      setConnectionStatus(response.ok ? 'success' : 'error');
    } catch { setConnectionStatus('error'); }
    finally { setTestingConnection(false); }
  };

  const sectionCard = (icon, iconColor, iconBg, title, children) => (
    <GlassCard>
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2.5 rounded-xl ${iconBg}`} style={{ boxShadow: 'var(--shadow-flat)' }}>{React.createElement(icon, { className: `w-5 h-5 ${iconColor}` })}</div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </GlassCard>
  );

  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'geral';
  const previewLogo = (field) => brandingForm[field] || (field !== 'app_logo_url' ? brandingForm.logo_url : '') || brandingForm.app_logo_url;
  const uploadCard = ({ field, title, description, recommendation, tone }) => {
    const currentUrl = previewLogo(field);
    const inputId = `upload-${field}`;
    return (
      <div className={`rounded-2xl border p-4 ${tone}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
            {isSafeImageUrl(currentUrl) ? (
              <img src={currentUrl} alt={title} className="h-full w-full object-contain p-2" />
            ) : (
              <ImageIcon className="h-9 w-9 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-slate-950">{title}</h4>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600">{recommendation}</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Input
                value={brandingForm[field]}
                onChange={(event) => updateBranding(field, event.target.value)}
                placeholder="URL ou arquivo enviado"
                className="bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="rounded-xl !text-white [background:linear-gradient(135deg,#2563eb,#7c3aed)]" onClick={() => document.getElementById(inputId)?.click()} disabled={uploadingField === field}>
                  <Upload className="h-4 w-4" /> {uploadingField === field ? 'Enviando...' : 'Enviar imagem'}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl bg-white" onClick={() => updateBranding(field, '')}>
                  Limpar
                </Button>
              </div>
              <input
                id={inputId}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
                className="hidden"
                onChange={(event) => {
                  uploadBrandingImage(field, event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Header title="Configurações" subtitle="Configure seu sistema" />

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="geral"><Settings className="w-3.5 h-3.5 mr-1.5" /> Geral</TabsTrigger>
          <TabsTrigger value="personalizacao"><Palette className="w-3.5 h-3.5 mr-1.5" /> Personalizacao</TabsTrigger>
          <TabsTrigger value="fiscal"><FileText className="w-3.5 h-3.5 mr-1.5" /> Nota Fiscal</TabsTrigger>
          <TabsTrigger value="dados"><Database className="w-3.5 h-3.5 mr-1.5" /> Dados locais</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {sectionCard(Building2, 'text-pink-400', 'bg-pink-500/20', 'Dados da Empresa',
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-xs uppercase tracking-wide">Nome da Empresa</Label>
                  <Input value="Pincel de Luz" disabled className="clay-input opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-xs uppercase tracking-wide">CNPJ</Label>
                  <Input placeholder="00.000.000/0001-00" className="clay-input" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-xs uppercase tracking-wide">Email (Logado)</Label>
                  <Input value={user?.email || ''} disabled className="clay-input opacity-60" />
                </div>
              </div>
            )}

            {sectionCard(MessageCircle, 'text-green-400', 'bg-green-500/20', 'WhatsApp / Evolution API',
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-xs uppercase tracking-wide">URL da API</Label>
                  <Input value={whatsappConfig.api_url} onChange={e => setWhatsappConfig({...whatsappConfig, api_url: e.target.value})} placeholder="https://api.exemplo.com" className="clay-input" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-xs uppercase tracking-wide">API Key</Label>
                  <Input type="password" value={whatsappConfig.api_key} onChange={e => setWhatsappConfig({...whatsappConfig, api_key: e.target.value})} placeholder="••••••••" className="clay-input" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-xs uppercase tracking-wide">Nome da Instância</Label>
                  <Input value={whatsappConfig.instance_name} onChange={e => setWhatsappConfig({...whatsappConfig, instance_name: e.target.value})} placeholder="instancia-principal" className="clay-input" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={testConnection} disabled={testingConnection} className="btn-blue">
                    {testingConnection ? '⏳ Testando...' : '🔌 Testar Conexão'}
                  </button>
                  <button onClick={saveWhatsappConfig} disabled={saveStatus === 'saving'} className="btn-green">
                    {saveStatus === 'saving' ? '⏳ Salvando...' : saveStatus === 'success' ? '✅ Salvo!' : '💾 Salvar'}
                  </button>
                </div>
                {connectionStatus && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl ${connectionStatus === 'success' ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/15 border border-red-500/30'}`}>
                    {connectionStatus === 'success'
                      ? <><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-green-400 font-medium">Conexão estabelecida!</span></>
                      : <><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-400 font-medium">Erro na conexão. Verifique as configurações.</span></>}
                  </div>
                )}
              </div>
            )}

            {sectionCard(Link2, 'text-blue-400', 'bg-blue-500/20', 'Integrações CRM',
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
                  <p className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Webhook URL</p>
                  <code className="text-sm break-all" style={{ color: 'var(--accent)' }}>https://api.pincelde.luz/webhook/crm</code>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide font-bold" style={{ color: 'var(--text-tertiary)' }}>Eventos disponíveis:</p>
                  {['product.created','product.updated','order.created','stock.low'].map(ev => (
                    <div key={ev} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <code className="text-sm" style={{ color: 'var(--accent)' }}>{ev}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sectionCard(Bell, 'text-yellow-400', 'bg-yellow-500/20', 'Notificações',
              <div className="space-y-3">
                {[
                  { key: 'estoque_baixo', label: '📦 Estoque Baixo', desc: 'Alerta quando produtos atingem mínimo' },
                  { key: 'caixa_baixo', label: '💰 Caixa Baixo', desc: 'Alerta de saldo baixo' },
                  { key: 'cobrancas', label: '⏰ Cobranças Pendentes', desc: 'Lembrete de contas a receber vencidas' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-flat)' }}>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{n.label}</p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{n.desc}</p>
                    </div>
                    <Switch checked={notifications[n.key]} onCheckedChange={checked => setNotifications({...notifications, [n.key]: checked})} />
                  </div>
                ))}
              </div>
            )}

            <GlassCard className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl" style={{ background: 'var(--red-muted)', boxShadow: 'var(--shadow-flat)' }}><Shield className="w-5 h-5" style={{ color: 'var(--red)' }} /></div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Segurança & Conta</h3>
              </div>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 p-4 rounded-xl" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
                  <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>Usuário Atual</p>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{user?.full_name || 'Carregando...'}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
                  <div className="mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: 'var(--accent-muted)' }}>
                    <span className="text-xs font-bold uppercase" style={{ color: 'var(--accent)' }}>{user?.role || 'admin'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button variant="outline">🔑 Alterar Senha</Button>
                  <button onClick={() => erp.auth.logout()} className="btn-red">
                    <LogOut className="w-4 h-4" /> Sair do Sistema
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="personalizacao" className="mt-4">
          <div className="space-y-5">
            <GlassCard>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                      <Palette className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-950">Personalizacao visual do ERP</h3>
                      <p className="text-sm text-slate-600">Controle a marca que aparece no sistema, no favicon e nos documentos PDF.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <p className="font-black text-blue-900">Sistema</p>
                      <p className="mt-1 text-sm text-blue-800">Logo do menu lateral, topo e atalhos internos.</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-black text-emerald-900">PDF</p>
                      <p className="mt-1 text-sm text-emerald-800">Logo usada nos orcamentos e documentos gerados.</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-black text-amber-900">Favicon</p>
                      <p className="mt-1 text-sm text-amber-800">Icone da aba do navegador e atalho do app.</p>
                    </div>
                  </div>
                </div>
                <Button type="button" onClick={saveBranding} disabled={brandingBusy || uploadingField} className="min-h-12 rounded-2xl !text-white [background:linear-gradient(135deg,#2563eb,#7c3aed,#db2777)]">
                  <Save className="h-4 w-4" /> {brandingBusy ? 'Salvando...' : 'Salvar personalizacao'}
                </Button>
              </div>

              {brandingStatus.message && (
                <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
                  brandingStatus.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : brandingStatus.type === 'loading'
                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}>
                  {brandingStatus.message}
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <GlassCard>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-950">Dados da empresa nos documentos</h3>
                      <p className="text-sm text-slate-600">Esses dados aparecem nos PDFs e ajudam o cliente a reconhecer a proposta.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nome exibido</Label>
                      <Input value={brandingForm.company_name} onChange={(event) => updateBranding('company_name', event.target.value)} placeholder="Pincel de Luz" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Razao social</Label>
                      <Input value={brandingForm.legal_name} onChange={(event) => updateBranding('legal_name', event.target.value)} placeholder="Razao social completa" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CNPJ</Label>
                      <Input value={brandingForm.cnpj} onChange={(event) => updateBranding('cnpj', event.target.value)} placeholder="00.000.000/0001-00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp / Telefone</Label>
                      <Input value={brandingForm.phone} onChange={(event) => updateBranding('phone', event.target.value)} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input value={brandingForm.email} onChange={(event) => updateBranding('email', event.target.value)} placeholder="contato@empresa.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Site</Label>
                      <Input value={brandingForm.website} onChange={(event) => updateBranding('website', event.target.value)} placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cor principal</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={brandingForm.primary_color} onChange={(event) => updateBranding('primary_color', event.target.value)} className="h-11 w-16 p-1" />
                        <Input value={brandingForm.primary_color} onChange={(event) => updateBranding('primary_color', event.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rodape dos PDFs</Label>
                      <Input value={brandingForm.pdf_footer_text} onChange={(event) => updateBranding('pdf_footer_text', event.target.value)} placeholder="Documento gerado pelo ERP" />
                    </div>
                  </div>
                </GlassCard>

                {uploadCard({
                  field: 'app_logo_url',
                  title: 'Logo do sistema',
                  description: 'Aparece no menu lateral, topo, cabecalho e identidade interna do ERP.',
                  recommendation: 'Recomendado: PNG ou SVG quadrado, fundo transparente, 512x512 ou maior.',
                  tone: 'border-sky-200 bg-sky-50',
                })}

                {uploadCard({
                  field: 'pdf_logo_url',
                  title: 'Logo dos PDFs',
                  description: 'Aparece nos orcamentos e documentos enviados ao cliente.',
                  recommendation: 'Recomendado: PNG horizontal ou quadrado com boa leitura em fundo escuro.',
                  tone: 'border-emerald-200 bg-emerald-50',
                })}

                {uploadCard({
                  field: 'favicon_url',
                  title: 'Favicon e icone do app',
                  description: 'Aparece na aba do navegador, atalhos e instalacao do app.',
                  recommendation: 'Recomendado: PNG, SVG ou ICO quadrado, 128x128 a 512x512.',
                  tone: 'border-amber-200 bg-amber-50',
                })}
              </div>

              <GlassCard>
                <div className="mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-black text-slate-950">Previa da marca</h3>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Topo do sistema</p>
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3">
                      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white">
                        {isSafeImageUrl(previewLogo('app_logo_url')) ? <img src={previewLogo('app_logo_url')} alt="Logo do sistema" className="h-full w-full object-contain p-1" /> : <span className="font-black">PL</span>}
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{brandingForm.company_name || 'Pincel de Luz'}</p>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">ERP Sistema</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
                    <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Cabecalho do PDF</p>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white">
                          {isSafeImageUrl(previewLogo('pdf_logo_url')) ? <img src={previewLogo('pdf_logo_url')} alt="Logo do PDF" className="h-full w-full object-contain p-1" /> : <span className="font-black text-slate-950">PL</span>}
                        </div>
                        <div>
                          <p className="font-black">{brandingForm.company_name || 'Pincel de Luz'}</p>
                          <p className="text-xs text-slate-300">{brandingForm.phone || brandingForm.email || 'Contato da empresa'}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black" style={{ color: brandingForm.primary_color }}>ORCAMENTO</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Favicon</p>
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {isSafeImageUrl(previewLogo('favicon_url')) ? <img src={previewLogo('favicon_url')} alt="Favicon" className="h-full w-full object-contain p-1" /> : <span className="text-xs font-black">PL</span>}
                      </div>
                      <p className="text-sm font-bold text-slate-600">Aplicado na aba do navegador apos salvar.</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <GlassCard>
            <ConfiguracaoFiscal />
          </GlassCard>
        </TabsContent>

        <TabsContent value="dados" className="mt-4">
          <div className="space-y-5">
            <GlassCard>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/15" style={{ boxShadow: 'var(--shadow-flat)' }}>
                      <HardDrive className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Backup e restauração do SQLite</h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Protege o ERP contra perda de dados, erro humano e falha de máquina.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                      <p className="font-black text-blue-900">Para que serve</p>
                      <p className="text-sm text-blue-800 mt-1">Cria uma cópia real do banco local com verificação de integridade e checksum.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                      <p className="font-black text-emerald-900">Impacto</p>
                      <p className="text-sm text-emerald-800 mt-1">Permite recuperar vendas, estoque, clientes, financeiro e configurações usando apenas o banco local desta pasta.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                      <p className="font-black text-orange-900">Cuidado</p>
                      <p className="text-sm text-orange-800 mt-1">Restaurar substitui o banco atual, por isso o sistema cria uma cópia de segurança antes.</p>
                    </div>
                  </div>
                  {backupDbPath && (
                    <p className="text-xs mt-4 break-all" style={{ color: 'var(--text-tertiary)' }}>Banco ativo: {backupDbPath}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button onClick={createBackup} disabled={backupBusy}>
                    <Database className="w-4 h-4" />
                    Criar backup agora
                  </Button>
                  <Button variant="outline" onClick={loadBackups} disabled={backupBusy}>
                    <RefreshCw className={`w-4 h-4 ${backupBusy ? 'animate-spin' : ''}`} />
                    Atualizar lista
                  </Button>
                </div>
              </div>

              {backupStatus.message && (
                <div className={`mt-5 p-4 rounded-xl border flex items-start gap-3 ${
                  backupStatus.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : backupStatus.type === 'loading'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {backupStatus.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <ShieldCheck className="w-5 h-5 shrink-0" />}
                  <p className="text-sm font-semibold">{backupStatus.message}</p>
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
              <GlassCard>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Backups disponíveis</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cada arquivo é validado pelo SQLite e identificado por SHA-256.</p>
                  </div>
                  <span className="text-sm font-black px-3 py-1 rounded-full bg-slate-100 text-slate-700">{backups.length} arquivos</span>
                </div>
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div key={backup.file_name} className={`p-4 rounded-xl border ${selectedBackup === backup.file_name ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedBackup(backup.file_name)}
                          className="text-left min-w-0 flex-1"
                          aria-label={`Selecionar backup ${backup.file_name}`}
                        >
                          <p className="font-black text-slate-900 break-all">{backup.file_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDateTime(backup.created_at)} | {formatBytes(backup.size_bytes)} | {backup.table_count} tabelas | {backup.row_count} registros
                          </p>
                          <p className="text-xs text-slate-500 mt-1 break-all">SHA-256: {backup.sha256}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-black ${backup.integrity_ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {backup.integrity_ok ? 'Integridade OK' : 'Integridade falhou'}
                            </span>
                            {backup.reason && <span className="px-2 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">{backup.reason}</span>}
                          </div>
                        </button>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => verifyBackup(backup.file_name)} disabled={backupBusy}>
                            <ShieldCheck className="w-4 h-4" />
                            Verificar
                          </Button>
                          <button type="button" onClick={() => downloadBackup(backup.file_name)} disabled={backupBusy} className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-8 px-3 bg-white border border-slate-200 text-gray-700 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-50">
                            <Download className="w-4 h-4" />
                            Baixar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      <Database className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                      <p className="font-black text-slate-800">Nenhum backup criado ainda.</p>
                      <p className="text-sm text-slate-500">Crie o primeiro backup antes de mudanças grandes, importações ou restaurações.</p>
                    </div>
                  )}
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-red-500/15" style={{ boxShadow: 'var(--shadow-flat)' }}>
                    <RotateCcw className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Restaurar backup</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ação protegida por senha administrativa.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                    <p className="text-sm text-red-800 font-semibold">
                      Antes de restaurar, o sistema cria automaticamente um backup do banco atual. Se a restauração falhar na integridade, o banco anterior é recolocado.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Backup selecionado</Label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={selectedBackup}
                      onChange={(event) => setSelectedBackup(event.target.value)}
                    >
                      <option value="">Escolha um backup</option>
                      {backups.map((backup) => <option key={backup.file_name} value={backup.file_name}>{backup.file_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Senha administrativa</Label>
                    <Input
                      type="password"
                      value={restorePassword}
                      onChange={(event) => setRestorePassword(event.target.value)}
                      placeholder="Informe a senha para restaurar"
                      className="clay-input"
                    />
                  </div>
                  <Button variant="destructive" onClick={restoreBackup} disabled={backupBusy || !selectedBackup}>
                    <RotateCcw className="w-4 h-4" />
                    Restaurar banco selecionado
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
