export function isSafeImageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:', 'data:'].includes(parsed.protocol) || String(url).startsWith('/');
  } catch {
    return String(url).startsWith('/') || String(url).startsWith('data:image/');
  }
}

export function getCompanyLogoUrl(company, context = 'app') {
  const candidates = context === 'pdf'
    ? [company?.pdf_logo_url, company?.logo_url, company?.app_logo_url]
    : context === 'favicon'
      ? [company?.favicon_url, company?.app_logo_url, company?.logo_url, company?.pdf_logo_url]
      : [company?.app_logo_url, company?.logo_url, company?.pdf_logo_url];
  return candidates.find(isSafeImageUrl) || '';
}

export function applyFavicon(url) {
  if (typeof document === 'undefined' || !isSafeImageUrl(url)) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;

  let apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.href = url;
}
