import jsPDF from 'jspdf';
import moment from 'moment';
import { erp } from '@/api/erpClient';
import { openMailto } from '@/lib/shareFallbacks';
import { downloadBlob } from '@/lib/downloadUtils';
import { formatCurrency } from '@/lib/numberFormat';

const COLORS = {
  ink: [15, 23, 42],
  muted: [100, 116, 139],
  soft: [248, 250, 252],
  line: [226, 232, 240],
  blue: [37, 99, 235],
  green: [5, 150, 105],
  red: [220, 38, 38],
  white: [255, 255, 255],
};

const money = formatCurrency;
const text = (value, fallback = 'Nao informado') => String(value || fallback);

const getFileName = (quote) => {
  const code = quote.quote_number || `orcamento-${quote.id?.slice(-6) || 'novo'}`;
  return `${String(code).replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const getImageDataUrl = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return blobToDataUrl(blob);
};

const parseItemsFromQuote = (quote) => {
  if (Array.isArray(quote.items)) return quote.items;
  if (typeof quote.items === 'string') {
    try {
      const parsed = JSON.parse(quote.items);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
};

async function loadQuoteItems(quote) {
  if (quote?.id) {
    try {
      const stored = await erp.entities.QuotationItem.filter({ quotation_id: quote.id });
      if (stored?.length) return stored;
    } catch (error) {
      console.warn('Nao foi possivel carregar itens do orcamento para PDF.', error);
    }
  }
  const parsed = parseItemsFromQuote(quote);
  if (parsed.length) return parsed;
  return [{
    product_name: quote.product_name || 'Produto/servico personalizado',
    description: quote.description || quote.items_summary || 'Item conforme conversa comercial.',
    quantity: quote.quantity || 1,
    unit: quote.unit || 'un',
    unit_price: quote.unit_price || quote.final_price || quote.total_price || quote.total || 0,
    total: quote.final_price || quote.total_price || quote.total || 0,
  }];
}

function setText(doc, color = 'ink') {
  doc.setTextColor(...COLORS[color]);
}

function drawFooter(doc, company, pageNumber, pageCount) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...COLORS.line);
  doc.line(14, height - 16, width - 14, height - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, 'muted');
  doc.text(`${company?.company_name || 'Pincel de Luz'} | ${company?.pdf_footer_text || 'Documento gerado pelo ERP local'}`, 14, height - 10);
  doc.text(`Pagina ${pageNumber}/${pageCount}`, width - 14, height - 10, { align: 'right' });
}

function addPageIfNeeded(doc, y, needed, company) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed < pageHeight - 24) return y;
  doc.addPage();
  drawFooter(doc, company, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
  return 18;
}

function label(doc, value, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  setText(doc, 'muted');
  doc.text(String(value).toUpperCase(), x, y);
}

function sectionTitle(doc, title, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  setText(doc, 'ink');
  doc.text(title, x, y);
  doc.setDrawColor(...COLORS.line);
  doc.line(x, y + 4, 196, y + 4);
  return y + 10;
}

function infoCard(doc, x, y, w, h, title, lines) {
  doc.setFillColor(...COLORS.soft);
  doc.roundedRect(x, y, w, h, 4, 4, 'F');
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');
  label(doc, title, x + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  setText(doc, 'ink');
  doc.text(lines, x + 5, y + 13);
}

function drawStatusPill(doc, labelText, x, y, color = 'blue') {
  doc.setFillColor(...COLORS[color]);
  doc.roundedRect(x, y, 34, 8, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...COLORS.white);
  doc.text(String(labelText).toUpperCase(), x + 17, y + 5.4, { align: 'center' });
}

function drawItemsTable(doc, items, startY, company) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY;

  doc.setFillColor(...COLORS.ink);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLORS.white);
  doc.text('ITEM', margin + 4, y + 6);
  doc.text('QTD', margin + 124, y + 6, { align: 'right' });
  doc.text('UNIT.', margin + 158, y + 6, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 4, y + 6, { align: 'right' });
  y += 11;

  items.forEach((item, index) => {
    y = addPageIfNeeded(doc, y, 18, company);
    const title = item.product_name || item.name || item.description || `Item ${index + 1}`;
    const details = [
      item.width_mm && item.height_mm ? `${item.width_mm} x ${item.height_mm} mm` : null,
      item.art_description,
      item.item_notes,
    ].filter(Boolean).join(' | ');
    const lines = doc.splitTextToSize(`${index + 1}. ${title}${details ? ` - ${details}` : ''}`, 105);
    const rowHeight = Math.max(15, lines.length * 4.2 + 8);

    doc.setFillColor(index % 2 ? 255 : 248, index % 2 ? 255 : 250, index % 2 ? 255 : 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, rowHeight, 2.5, 2.5, 'F');
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(margin, y, pageWidth - margin * 2, rowHeight, 2.5, 2.5, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    setText(doc, 'ink');
    doc.text(lines, margin + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Number(item.quantity || 1).toLocaleString('pt-BR')} ${item.unit || ''}`.trim(), margin + 124, y + 6, { align: 'right' });
    doc.text(money(item.unit_price || item.base_price || 0), margin + 158, y + 6, { align: 'right' });
    doc.text(money(item.total || Number(item.quantity || 1) * Number(item.unit_price || item.base_price || 0)), pageWidth - margin - 4, y + 6, { align: 'right' });
    y += rowHeight + 2;
  });

  return y;
}

export async function buildQuotePdfDoc({ quote, client, company }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const quoteCode = quote.quote_number || quote.id?.slice(-8)?.toUpperCase() || 'ORCAMENTO';
  const emissionDate = moment(quote.created_date || new Date());
  const validDays = Number(quote.valid_days || quote.validity_days || 7);
  const validUntil = moment(emissionDate).add(validDays, 'days');
  const items = await loadQuoteItems(quote);
  const subtotal = Number(quote.total_price || quote.subtotal || 0) || items.reduce((sum, item) => sum + Number(item.total || Number(item.quantity || 1) * Number(item.unit_price || item.base_price || 0)), 0);
  const discount = Number(quote.discount_value || quote.discount || 0);
  const finalPrice = Number(quote.final_price || quote.total_value || quote.total || subtotal - discount || 0);
  const logoUrl = company?.pdf_logo_url || company?.logo_url || company?.app_logo_url;

  doc.setFillColor(...COLORS.white);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

  doc.setFillColor(...COLORS.ink);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFillColor(...COLORS.blue);
  doc.rect(0, 40, pageWidth, 2, 'F');

  if (logoUrl) {
    try {
      const logoDataUrl = await getImageDataUrl(logoUrl);
      doc.addImage(logoDataUrl, 'PNG', margin, 10, 18, 18, undefined, 'FAST');
    } catch {}
  }

  const companyX = logoUrl ? 38 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text(company?.company_name || 'Pincel de Luz', companyX, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text([
    company?.cnpj ? `CNPJ: ${company.cnpj}` : null,
    company?.phone ? `WhatsApp: ${company.phone}` : null,
    company?.email ? `Email: ${company.email}` : null,
  ].filter(Boolean), companyX, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ORCAMENTO', pageWidth - margin, 16, { align: 'right' });
  doc.setFontSize(8.5);
  doc.text(quoteCode, pageWidth - margin, 23, { align: 'right' });
  drawStatusPill(doc, text(quote.status, 'rascunho'), pageWidth - margin - 34, 28, quote.status === 'aprovado' ? 'green' : 'blue');

  let y = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setText(doc, 'ink');
  doc.text(`Proposta para ${text(quote.client_name, 'cliente')}`, margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  setText(doc, 'muted');
  doc.text(doc.splitTextToSize('Documento objetivo com escopo, itens, valores, validade e proximos passos. Precos calculados pelas tabelas internas do ERP.', contentWidth), margin, y);
  y += 14;

  infoCard(doc, margin, y, 84, 30, 'Cliente', [
    text(quote.client_name),
    `Telefone: ${text(quote.client_phone || client?.phone || client?.whatsapp)}`,
    `Email: ${text(client?.email)}`,
  ]);
  infoCard(doc, margin + 90, y, contentWidth - 90, 30, 'Documento', [
    `Emitido em: ${emissionDate.format('DD/MM/YYYY')}`,
    `Valido ate: ${validUntil.format('DD/MM/YYYY')}`,
    `Prazo estimado: ${quote.deadline_days ? `${quote.deadline_days} dias uteis` : 'a confirmar'}`,
  ]);
  y += 42;

  y = sectionTitle(doc, '1. Escopo do pedido', margin, y);
  const scopeLines = doc.splitTextToSize(text(quote.description || quote.items_summary || quote.product_name, 'Itens conforme lista comercial abaixo.'), contentWidth);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, 'ink');
  doc.text(scopeLines, margin, y);
  y += Math.max(13, scopeLines.length * 4.5 + 4);

  y = sectionTitle(doc, '2. Itens e valores', margin, y);
  y = drawItemsTable(doc, items, y, company);

  y = addPageIfNeeded(doc, y, 56, company);
  y += 4;
  const totalsX = margin + 94;
  const totalsW = contentWidth - 94;
  infoCard(doc, margin, y, 86, 41, 'Condicoes', [
    text(quote.payment_conditions, 'A combinar'),
    quote.notes ? `Obs: ${quote.notes}` : 'Sem observacoes adicionais.',
    'Alteracoes de medida, arte, material ou quantidade podem recalcular o valor.',
  ]);

  doc.setFillColor(...COLORS.soft);
  doc.roundedRect(totalsX, y, totalsW, 41, 4, 4, 'F');
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(totalsX, y, totalsW, 41, 4, 4, 'S');
  label(doc, 'Resumo financeiro', totalsX + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  setText(doc, 'muted');
  doc.text('Subtotal', totalsX + 5, y + 16);
  doc.text(money(subtotal), totalsX + totalsW - 5, y + 16, { align: 'right' });
  if (discount > 0) {
    doc.text('Desconto', totalsX + 5, y + 23);
    setText(doc, 'red');
    doc.text(`- ${money(discount)}`, totalsX + totalsW - 5, y + 23, { align: 'right' });
  }
  doc.setFillColor(...COLORS.ink);
  doc.roundedRect(totalsX + 4, y + 27, totalsW - 8, 10, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.white);
  doc.text('Total', totalsX + 8, y + 34);
  doc.text(money(finalPrice), totalsX + totalsW - 8, y + 34, { align: 'right' });
  y += 54;

  y = addPageIfNeeded(doc, y, 40, company);
  y = sectionTitle(doc, '3. Proximos passos', margin, y);
  const steps = [
    'Conferir produto, quantidade, medidas, acabamento e valor final.',
    'Responder aprovando o orcamento dentro da validade informada.',
    'Apos aprovacao, alinhar pagamento, arte final e inicio da producao.',
  ];
  steps.forEach((item, index) => {
    doc.setFillColor(...COLORS.soft);
    doc.roundedRect(margin, y, contentWidth, 12, 4, 4, 'F');
    doc.setFillColor(...COLORS.blue);
    doc.circle(margin + 6, y + 6, 3.2, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(String(index + 1), margin + 6, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    setText(doc, 'ink');
    doc.text(item, margin + 14, y + 7.5);
    y += 15;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, company, i, pageCount);
  }

  return doc;
}

export async function downloadQuotePdf({ quote, client, company }) {
  const doc = await buildQuotePdfDoc({ quote, client, company });
  const fileName = getFileName(quote);
  try {
    doc.save(fileName);
  } catch {
    const blob = doc.output('blob');
    downloadBlob(blob, fileName);
  }
}

export async function emailQuotePdf({ quote, client, company }) {
  const doc = await buildQuotePdfDoc({ quote, client, company });
  const fileName = getFileName(quote);
  const subject = `Orcamento ${quote.quote_number || ''} - ${company?.company_name || 'Pincel de Luz'}`.trim();
  const body = [
    `Ola ${quote.client_name || ''},`,
    '',
    `Segue o orcamento ${quote.quote_number || ''}.`,
    `Valor: ${money(quote.final_price || quote.total_price || quote.total)}`,
    '',
    'Em modo local, o PDF foi baixado no navegador para ser anexado manualmente.',
  ].join('\n');

  try {
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const { file_url } = await erp.integrations.Core.UploadFile({ file });

    const response = await erp.functions.invoke('sendQuotePdfEmail', {
      email: client?.email,
      clientName: quote.client_name,
      productName: quote.product_name,
      quoteNumber: quote.quote_number,
      pdfUrl: file_url,
      companyName: company?.company_name,
    });

    return response.data;
  } catch (error) {
    console.warn('Envio automatico de PDF indisponivel; usando fallback local.', error);
    await downloadQuotePdf({ quote, client, company });
    openMailto({ email: client?.email, subject, body });
    return { success: true, fallback: 'download-and-mailto' };
  }
}
