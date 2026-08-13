export const fmtDT = (value) => value ? new Date(value).toLocaleString('pt-BR') : '--';
export const fmtDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '--';
export const fmtTime = (value) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--';

export const maskSecret = (value = '') => value ? `${value.slice(0, 4)}${'*'.repeat(Math.max(8, value.length - 8))}${value.slice(-4)}` : 'não configurada';
export const cleanUrl = (value) => String(value || '').replace(/\/+$/, '');
export const stateToLabel = (state) => ({ open: 'Conectado', close: 'Desconectado', connecting: 'Conectando…' }[state] || state || 'Desconhecido');

export function extractQrPayload(data) {
  const qr = data?.qr || data || {};
  const base64 = qr.base64 || qr.qrcode?.base64 || qr.code?.base64 || '';
  const code = qr.code || qr.qrcode?.code || qr.qr || qr.qrcode || '';
  const pairingCode = qr.pairingCode || qr.pairing_code || qr.pairing || '';
  return { base64, code: typeof code === 'string' ? code : '', pairingCode };
}

export function fillTemplate(tpl, client) {
  const name = client?.name || 'cliente';
  const value = Number(client?.total_debt || client?.debt || 0).toFixed(2);
  return tpl.replaceAll('{nome}', name).replaceAll('{valor}', value);
}

export function buildDailyChart(logs) {
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

export function buildHourChart(logs) {
  const map = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}h`, qtd: 0 }));
  logs.forEach((log) => {
    if (!log.created_date) return;
    const h = new Date(log.created_date).getHours();
    map[h].qtd++;
  });
  return map;
}

export function buildTemplateChart(logs) {
  const map = {};
  logs.forEach((log) => {
    const k = log.template || 'Sem template';
    if (!map[k]) map[k] = { name: k, total: 0 };
    map[k].total++;
  });
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
}

export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text || ''); return true; } catch { return false; }
}
