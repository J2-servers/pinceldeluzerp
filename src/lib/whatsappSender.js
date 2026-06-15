import { erp } from '@/api/erpClient';
import { buildWhatsAppUrl, openUrlWithClipboardFallback } from '@/lib/shareFallbacks';
import { normalizePhoneBR } from '@/lib/numberFormat';

const trimSlash = (value) => String(value || '').replace(/\/+$/, '');

const readConfig = async () => {
  try {
    const configs = await erp.entities.WhatsAppConfig.list('-created_date', 1);
    return configs?.[0] || null;
  } catch {
    return null;
  }
};

const callEvolution = async ({ apiUrl, apiKey, instanceName, phone, message }) => {
  const response = await erp.functions.invoke('sendWhatsAppMessage', {
    apiUrl: trimSlash(apiUrl),
    apiKey,
    instanceName,
    phone,
    message,
  });
  return { sent: !!response.data?.sent, channel: 'api', response: response.data };
};

const logMessageAttempt = async ({ phone, message, result, clientName = '', source = 'sistema', template = '', context = '' }) => {
  try {
    await erp.entities.WhatsAppMessageLog.create({
      phone,
      client_name: clientName,
      source,
      template,
      context,
      message,
      status: result.sent ? 'sent' : result.copied ? 'prepared' : 'failed',
      channel: result.channel || 'unknown',
      reason: result.reason || '',
      copied: !!result.copied,
      response_summary: result.response ? JSON.stringify(result.response).slice(0, 900) : '',
    });
  } catch (error) {
    console.warn('[whatsapp] Nao foi possivel registrar historico local', error);
  }
};

export async function sendWhatsAppMessage({ phone, message, preferApi = true, clientName = '', source = 'sistema', template = '', context = '' }) {
  const normalizedPhone = normalizePhoneBR(phone);
  if (!normalizedPhone) {
    const result = { sent: false, channel: 'none', reason: 'missing_phone' };
    await logMessageAttempt({ phone, message, result, clientName, source, template, context });
    return result;
  }

  const config = preferApi ? await readConfig() : null;
  const apiReady = !!(config?.api_url && config?.api_key && config?.instance_name);

  if (apiReady) {
    try {
      const result = await callEvolution({
        apiUrl: config.api_url,
        apiKey: config.api_key,
        instanceName: config.instance_name,
        phone: normalizedPhone,
        message,
      });
      await logMessageAttempt({ phone: normalizedPhone, message, result, clientName, source, template, context });
      return result;
    } catch (error) {
      const fallback = await openUrlWithClipboardFallback(buildWhatsAppUrl(normalizedPhone, message), message);
      const result = {
        sent: fallback.opened,
        copied: fallback.copied,
        channel: fallback.opened ? 'link_after_api_error' : 'clipboard_after_api_error',
        reason: error?.message || 'api_error',
      };
      await logMessageAttempt({ phone: normalizedPhone, message, result, clientName, source, template, context });
      return result;
    }
  }

  const fallback = await openUrlWithClipboardFallback(buildWhatsAppUrl(normalizedPhone, message), message);
  const result = {
    sent: fallback.opened,
    copied: fallback.copied,
    channel: fallback.opened ? 'link' : 'clipboard',
    reason: apiReady ? undefined : 'api_not_configured',
  };
  await logMessageAttempt({ phone: normalizedPhone, message, result, clientName, source, template, context });
  return result;
}

export function whatsappResultMessage(result) {
  if (result.channel === 'api') return 'Mensagem enviada pela API do WhatsApp';
  if (result.channel === 'link_after_api_error') return 'API falhou; WhatsApp aberto com mensagem copiada';
  if (result.channel === 'clipboard_after_api_error') return 'API falhou; mensagem copiada para envio manual';
  if (result.channel === 'link') return result.copied ? 'WhatsApp aberto e mensagem copiada' : 'WhatsApp aberto';
  if (result.channel === 'clipboard') return 'Popup bloqueado; mensagem copiada';
  if (result.reason === 'missing_phone') return 'Cliente sem WhatsApp ou telefone';
  return 'Nao foi possivel enviar nem preparar a mensagem';
}
