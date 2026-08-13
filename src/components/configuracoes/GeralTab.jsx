import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  MessageCircle,
  Link2,
  Bell,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const sectionCard = (icon, iconColor, iconBg, title, children) => (
  <GlassCard>
    <div className="flex items-center gap-3 mb-5">
      <div className={`p-2.5 rounded-xl ${iconBg}`} style={{ boxShadow: 'var(--shadow-flat)' }}>{React.createElement(icon, { className: `w-5 h-5 ${iconColor}` })}</div>
      <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    </div>
    {children}
  </GlassCard>
);

export default function GeralTab({
  user,
  logout,
  whatsappConfig,
  setWhatsappConfig,
  testingConnection,
  testConnection,
  saveStatus,
  saveWhatsappConfig,
  connectionStatus,
  notifications,
  setNotifications,
}) {
  return (
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
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Carregando...'}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
            <div className="mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: 'var(--accent-muted)' }}>
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--accent)' }}>{user?.role || 'admin'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="outline">🔑 Alterar Senha</Button>
            <button onClick={() => logout()} className="btn-red">
              <LogOut className="w-4 h-4" /> Sair do Sistema
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
