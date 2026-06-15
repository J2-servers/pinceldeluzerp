// Melhoria #31 — PDF de pedido de venda com logo e dados completos
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import moment from 'moment';
import { erp } from '@/api/erpClient';

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

export default function PDFPedidoButton({ order, client }) {
  const [loading, setLoading] = useState(false);

  const gerarPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ format: 'a4', unit: 'mm' });
      const W = 210;
      const margin = 15;
      let y = 15;
      const configs = await erp.entities.CompanyConfig.list('-created_date', 1);
      const company = configs[0] || {};
      const companyName = company.company_name || 'Pincel de Luz';
      const logoUrl = company.pdf_logo_url || company.logo_url || company.app_logo_url;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, W, 40, 'F');
      doc.setTextColor(236, 72, 153);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      let textX = margin;
      if (logoUrl) {
        try {
          const logoData = await getImageDataUrl(logoUrl);
          doc.addImage(logoData, 'PNG', margin, 9, 18, 18, undefined, 'FAST');
          textX = margin + 24;
        } catch {}
      }
      doc.text(companyName, textX, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text(company.legal_name || company.pdf_footer_text || 'Corte e Gravacao a Laser', textX, 28);

      // Order number top-right
      doc.setTextColor(236, 72, 153);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`PEDIDO #${order.id?.slice(-6).toUpperCase() || '------'}`, W - margin, 18, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text(moment(order.created_date).format('DD/MM/YYYY'), W - margin, 26, { align: 'right' });

      y = 50;
      doc.setTextColor(30, 30, 30);

      // Client info
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 120);
      doc.text('CLIENTE', margin + 4, y + 7);
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(order.client_name || '-', margin + 4, y + 15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 100);
      if (client?.phone) doc.text(`Tel: ${client.phone}`, margin + 4, y + 22);
      if (client?.email) doc.text(`Email: ${client.email}`, margin + 80, y + 22);

      y += 38;

      // Items table header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, W - margin * 2, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEM', margin + 2, y + 5.5);
      doc.text('QTD', margin + 80, y + 5.5);
      doc.text('UNIT.', margin + 100, y + 5.5);
      doc.text('TOTAL', margin + 130, y + 5.5);
      y += 8;

      // Items
      const items = order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : [];
      doc.setFont('helvetica', 'normal');
      items.forEach((item, i) => {
        const bg = i % 2 === 0 ? [250, 250, 255] : [240, 240, 252];
        doc.setFillColor(...bg);
        doc.rect(margin, y, W - margin * 2, 8, 'F');
        doc.setTextColor(30, 30, 60);
        doc.setFontSize(9);
        doc.text(String(item.description || item.name || ''), margin + 2, y + 5.5);
        doc.text(String(item.quantity || 1), margin + 82, y + 5.5);
        doc.text(`R$ ${(item.unit_price || 0).toFixed(2)}`, margin + 100, y + 5.5);
        doc.text(`R$ ${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}`, margin + 130, y + 5.5);
        y += 8;
      });

      // Totals
      y += 4;
      doc.setDrawColor(200, 200, 220);
      doc.line(margin, y, W - margin, y);
      y += 6;

      const totalsX = W - margin - 50;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 120);
      doc.text('Subtotal:', totalsX - 20, y);
      doc.text(`R$ ${(order.subtotal || order.total || 0).toFixed(2)}`, totalsX + 30, y, { align: 'right' });

      if (order.discount && order.discount > 0) {
        y += 6;
        doc.setTextColor(200, 60, 60);
        doc.text('Desconto:', totalsX - 20, y);
        doc.text(`- R$ ${order.discount.toFixed(2)}`, totalsX + 30, y, { align: 'right' });
      }

      y += 8;
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(totalsX - 25, y - 5, 75, 12, 2, 2, 'F');
      doc.setTextColor(236, 72, 153);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', totalsX - 20, y + 3.5);
      doc.text(`R$ ${(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, totalsX + 30, y + 3.5, { align: 'right' });

      // Payment method
      y += 18;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 100);
      doc.text(`Pagamento: ${order.payment_method?.replace(/_/g, ' ') || '-'}`, margin, y);
      if (order.delivery_date) {
        doc.text(`Entrega prevista: ${moment(order.delivery_date).format('DD/MM/YYYY')}`, margin, y + 6);
      }

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 180);
      doc.text(company.pdf_footer_text || `Documento gerado automaticamente pelo Sistema ERP ${companyName}`, W / 2, 285, { align: 'center' });

      doc.save(`pedido-${order.id?.slice(-6) || 'novo'}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={gerarPDF} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileDown className="w-4 h-4 mr-1" />}
      PDF Pedido
    </Button>
  );
}

