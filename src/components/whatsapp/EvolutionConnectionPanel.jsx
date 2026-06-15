import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, QrCode, RefreshCw, XCircle } from 'lucide-react';

export default function EvolutionConnectionPanel({
  apiUrl,
  apiKey,
  instanceName,
  connected,
  loading,
  qrCode,
  qrBase64,
  pairingCode,
  stateLabel,
  onApiUrlChange,
  onApiKeyChange,
  onInstanceNameChange,
  onConnect,
  onRefresh,
}) {
  const qrImageUrl = qrBase64 || (qrCode ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode)}` : '');

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Evolution API v2</p>
          <h3 className="text-lg font-bold text-slate-800">Conexão por QR Code</h3>
        </div>
        <Badge className={connected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}>
          {connected ? <><CheckCircle className="w-4 h-4 mr-1" /> Conectado</> : <><XCircle className="w-4 h-4 mr-1" /> Desconectado</>}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-5 space-y-4">
          <div className="space-y-1.5">
            <Label>URL da Evolution</Label>
            <Input value={apiUrl} onChange={(e) => onApiUrlChange(e.target.value)} placeholder="https://seu-dominio-evolution" />
          </div>
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey || ''}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="Chave da Evolution API"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome da instância</Label>
            <Input value={instanceName} onChange={(e) => onInstanceNameChange(e.target.value)} placeholder="pincel-de-luz" />
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Estado atual</p>
            <p className="font-semibold text-slate-800 mt-1">{stateLabel || 'aguardando configuração'}</p>
            {!!pairingCode && <p className="text-sm text-slate-600 mt-2">Código de pareamento: <span className="font-bold">{pairingCode}</span></p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" onClick={onConnect} disabled={loading || !apiUrl || !apiKey || !instanceName} className="sm:flex-1">
              <QrCode className="w-4 h-4 mr-2" /> {loading ? 'Gerando QR...' : 'Conectar WhatsApp'}
            </Button>
            <Button type="button" variant="outline" onClick={onRefresh} disabled={loading || !apiUrl || !apiKey || !instanceName} className="sm:flex-1">
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar status
            </Button>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 min-h-[360px] flex flex-col items-center justify-center text-center">
            {qrImageUrl ? (
              <>
                <img src={qrImageUrl} alt="QR Code da Evolution" className="w-64 h-64 rounded-2xl bg-white p-3 border border-slate-200" />
                <p className="text-sm text-slate-600 mt-4 max-w-md">Abra o WhatsApp no celular, toque em dispositivos conectados e escaneie o QR Code.</p>
              </>
            ) : (
              <>
                <QrCode className="w-12 h-12 text-slate-300" />
                <p className="text-sm text-slate-500 mt-4 max-w-md">Depois de criar ou localizar a instância, o QR Code aparecerá aqui.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
