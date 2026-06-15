import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { downloadQuotePdf } from '@/components/orcamentos/quotePdfUtils';

export default function PDFOrcamentoButton({ quote, client }) {
  const [loading, setLoading] = useState(false);

  const gerarPDF = async () => {
    setLoading(true);
    const configs = await erp.entities.CompanyConfig.list('-created_date', 1);
    await downloadQuotePdf({ quote, client, company: configs[0] || {} });
    setLoading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={gerarPDF} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
      PDF Orçamento
    </Button>
  );
}