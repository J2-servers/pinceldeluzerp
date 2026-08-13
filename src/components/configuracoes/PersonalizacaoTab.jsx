import { erp } from '@/api/erpClient';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Palette,
  Building2,
  Image as ImageIcon,
  Upload,
  Save,
  Eye,
} from 'lucide-react';
import { isSafeImageUrl } from '@/lib/brandingAssets';

export default function PersonalizacaoTab({
  brandingForm,
  setBrandingForm,
  brandingStatus,
  setBrandingStatus,
  brandingBusy,
  saveBranding,
  uploadingField,
  setUploadingField,
}) {
  const updateBranding = (field, value) => {
    setBrandingForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadBrandingImage = async (field, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBrandingStatus({ type: 'error', message: 'Envie apenas imagens PNG, JPG, WEBP, SVG ou ICO.' });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setBrandingStatus({ type: 'error', message: 'Imagem muito grande. Use arquivo de ate 4 MB.' });
      return;
    }
    setUploadingField(field);
    setBrandingStatus({ type: 'loading', message: 'Enviando imagem para a pasta local do ERP...' });
    try {
      const { file_url } = await erp.integrations.Core.UploadFile({ file });
      if (!isSafeImageUrl(file_url)) throw new Error('URL de imagem invalida retornada pelo servidor local.');
      updateBranding(field, file_url);
      setBrandingStatus({ type: 'success', message: 'Imagem enviada. Clique em Salvar personalizacao para aplicar.' });
    } catch (error) {
      setBrandingStatus({ type: 'error', message: error.message || 'Falha ao enviar imagem.' });
    } finally {
      setUploadingField('');
    }
  };

  const previewLogo = (field) => brandingForm[field] || (field !== 'app_logo_url' ? brandingForm.logo_url : '') || brandingForm.app_logo_url;

  const uploadCard = ({ field, title, description, recommendation, tone }) => {
    const currentUrl = previewLogo(field);
    const inputId = `upload-${field}`;
    return (
      <div className={`rounded-2xl border p-4 ${tone}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
            {isSafeImageUrl(currentUrl) ? (
              <img src={currentUrl} alt={title} className="h-full w-full object-contain p-2" />
            ) : (
              <ImageIcon className="h-9 w-9 text-slate-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-slate-950">{title}</h4>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-slate-600">{recommendation}</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Input
                value={brandingForm[field]}
                onChange={(event) => updateBranding(field, event.target.value)}
                placeholder="URL ou arquivo enviado"
                className="bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="rounded-xl !text-white [background:linear-gradient(135deg,#2563eb,#7c3aed)]" onClick={() => document.getElementById(inputId)?.click()} disabled={uploadingField === field}>
                  <Upload className="h-4 w-4" /> {uploadingField === field ? 'Enviando...' : 'Enviar imagem'}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl bg-white" onClick={() => updateBranding(field, '')}>
                  Limpar
                </Button>
              </div>
              <input
                id={inputId}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon"
                className="hidden"
                onChange={(event) => {
                  uploadBrandingImage(field, event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">Personalizacao visual do ERP</h3>
                <p className="text-sm text-slate-600">Controle a marca que aparece no sistema, no favicon e nos documentos PDF.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-black text-blue-900">Sistema</p>
                <p className="mt-1 text-sm text-blue-800">Logo do menu lateral, topo e atalhos internos.</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-black text-emerald-900">PDF</p>
                <p className="mt-1 text-sm text-emerald-800">Logo usada nos orcamentos e documentos gerados.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-black text-amber-900">Favicon</p>
                <p className="mt-1 text-sm text-amber-800">Icone da aba do navegador e atalho do app.</p>
              </div>
            </div>
          </div>
          <Button type="button" onClick={saveBranding} disabled={brandingBusy || uploadingField} className="min-h-12 rounded-2xl !text-white [background:linear-gradient(135deg,#2563eb,#7c3aed,#db2777)]">
            <Save className="h-4 w-4" /> {brandingBusy ? 'Salvando...' : 'Salvar personalizacao'}
          </Button>
        </div>

        {brandingStatus.message && (
          <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
            brandingStatus.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : brandingStatus.type === 'loading'
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            {brandingStatus.message}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <GlassCard>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">Dados da empresa nos documentos</h3>
                <p className="text-sm text-slate-600">Esses dados aparecem nos PDFs e ajudam o cliente a reconhecer a proposta.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome exibido</Label>
                <Input value={brandingForm.company_name} onChange={(event) => updateBranding('company_name', event.target.value)} placeholder="Pincel de Luz" />
              </div>
              <div className="space-y-1.5">
                <Label>Razao social</Label>
                <Input value={brandingForm.legal_name} onChange={(event) => updateBranding('legal_name', event.target.value)} placeholder="Razao social completa" />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={brandingForm.cnpj} onChange={(event) => updateBranding('cnpj', event.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp / Telefone</Label>
                <Input value={brandingForm.phone} onChange={(event) => updateBranding('phone', event.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={brandingForm.email} onChange={(event) => updateBranding('email', event.target.value)} placeholder="contato@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Site</Label>
                <Input value={brandingForm.website} onChange={(event) => updateBranding('website', event.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Cor principal</Label>
                <div className="flex gap-2">
                  <Input type="color" value={brandingForm.primary_color} onChange={(event) => updateBranding('primary_color', event.target.value)} className="h-11 w-16 p-1" />
                  <Input value={brandingForm.primary_color} onChange={(event) => updateBranding('primary_color', event.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Rodape dos PDFs</Label>
                <Input value={brandingForm.pdf_footer_text} onChange={(event) => updateBranding('pdf_footer_text', event.target.value)} placeholder="Documento gerado pelo ERP" />
              </div>
            </div>
          </GlassCard>

          {uploadCard({
            field: 'app_logo_url',
            title: 'Logo do sistema',
            description: 'Aparece no menu lateral, topo, cabecalho e identidade interna do ERP.',
            recommendation: 'Recomendado: PNG ou SVG quadrado, fundo transparente, 512x512 ou maior.',
            tone: 'border-sky-200 bg-sky-50',
          })}

          {uploadCard({
            field: 'pdf_logo_url',
            title: 'Logo dos PDFs',
            description: 'Aparece nos orcamentos e documentos enviados ao cliente.',
            recommendation: 'Recomendado: PNG horizontal ou quadrado com boa leitura em fundo escuro.',
            tone: 'border-emerald-200 bg-emerald-50',
          })}

          {uploadCard({
            field: 'favicon_url',
            title: 'Favicon e icone do app',
            description: 'Aparece na aba do navegador, atalhos e instalacao do app.',
            recommendation: 'Recomendado: PNG, SVG ou ICO quadrado, 128x128 a 512x512.',
            tone: 'border-amber-200 bg-amber-50',
          })}
        </div>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-black text-slate-950">Previa da marca</h3>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Topo do sistema</p>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white">
                  {isSafeImageUrl(previewLogo('app_logo_url')) ? <img src={previewLogo('app_logo_url')} alt="Logo do sistema" className="h-full w-full object-contain p-1" /> : <span className="font-black">PL</span>}
                </div>
                <div>
                  <p className="font-black text-slate-950">{brandingForm.company_name || 'Pincel de Luz'}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">ERP Sistema</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Cabecalho do PDF</p>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white">
                    {isSafeImageUrl(previewLogo('pdf_logo_url')) ? <img src={previewLogo('pdf_logo_url')} alt="Logo do PDF" className="h-full w-full object-contain p-1" /> : <span className="font-black text-slate-950">PL</span>}
                  </div>
                  <div>
                    <p className="font-black">{brandingForm.company_name || 'Pincel de Luz'}</p>
                    <p className="text-xs text-slate-300">{brandingForm.phone || brandingForm.email || 'Contato da empresa'}</p>
                  </div>
                </div>
                <p className="text-sm font-black" style={{ color: brandingForm.primary_color }}>ORCAMENTO</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Favicon</p>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {isSafeImageUrl(previewLogo('favicon_url')) ? <img src={previewLogo('favicon_url')} alt="Favicon" className="h-full w-full object-contain p-1" /> : <span className="text-xs font-black">PL</span>}
                </div>
                <p className="text-sm font-bold text-slate-600">Aplicado na aba do navegador apos salvar.</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
