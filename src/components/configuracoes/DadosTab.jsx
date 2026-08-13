import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Database,
  Download,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

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

export default function DadosTab({
  backupDbPath,
  backupBusy,
  backupStatus,
  backups,
  selectedBackup,
  setSelectedBackup,
  restorePassword,
  setRestorePassword,
  createBackup,
  loadBackups,
  verifyBackup,
  downloadBackup,
  restoreBackup,
}) {
  return (
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
  );
}
