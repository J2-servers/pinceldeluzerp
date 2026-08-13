import { useState, useEffect } from 'react';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, FileText, Database } from 'lucide-react';
import { applyFavicon, getCompanyLogoUrl } from '@/lib/brandingAssets';
import { useSession } from '@/lib/auth/useAuth';
import GeralTab from '@/components/configuracoes/GeralTab';
import PersonalizacaoTab from '@/components/configuracoes/PersonalizacaoTab';
import FiscalTab from '@/components/configuracoes/FiscalTab';
import DadosTab from '@/components/configuracoes/DadosTab';

export default function Configuracoes() {
  const { user, logout } = useSession();
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

  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'geral';

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
          <GeralTab
            user={user}
            logout={logout}
            whatsappConfig={whatsappConfig}
            setWhatsappConfig={setWhatsappConfig}
            testingConnection={testingConnection}
            testConnection={testConnection}
            saveStatus={saveStatus}
            saveWhatsappConfig={saveWhatsappConfig}
            connectionStatus={connectionStatus}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        </TabsContent>

        <TabsContent value="personalizacao" className="mt-4">
          <PersonalizacaoTab
            brandingForm={brandingForm}
            setBrandingForm={setBrandingForm}
            brandingStatus={brandingStatus}
            setBrandingStatus={setBrandingStatus}
            brandingBusy={brandingBusy}
            saveBranding={saveBranding}
            uploadingField={uploadingField}
            setUploadingField={setUploadingField}
          />
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <FiscalTab />
        </TabsContent>

        <TabsContent value="dados" className="mt-4">
          <DadosTab
            backupDbPath={backupDbPath}
            backupBusy={backupBusy}
            backupStatus={backupStatus}
            backups={backups}
            selectedBackup={selectedBackup}
            setSelectedBackup={setSelectedBackup}
            restorePassword={restorePassword}
            setRestorePassword={setRestorePassword}
            createBackup={createBackup}
            loadBackups={loadBackups}
            verifyBackup={verifyBackup}
            downloadBackup={downloadBackup}
            restoreBackup={restoreBackup}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
