export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  }
}

export async function openUrlWithClipboardFallback(url, fallbackText) {
  const copied = fallbackText ? await copyText(fallbackText).catch(() => false) : false;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) return { opened: true, copied };
  if (copied) return { opened: false, copied };
  return { opened: false, copied: await copyText(url).catch(() => false) };
}

export function buildWhatsAppUrl(phone, message) {
  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function openMailto({ email, subject, body }) {
  const url = `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.href = url;
  }
}
