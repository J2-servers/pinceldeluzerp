import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { erp } from '@/api/erpClient';
import { isSafeImageUrl } from '@/lib/brandingAssets';

/**
 * Campo de imagem reutilizavel: envia um arquivo para a pasta local do ERP
 * (erp.integrations.Core.UploadFile) ou aceita uma URL colada, com previa e
 * botao de remover. Usado para foto de produto e de variacao.
 */
export default function ImageUploadField({ value, onChange, size = 96, label = 'Imagem', compact = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Envie uma imagem (PNG, JPG, WEBP...).'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Imagem muito grande (max 4MB).'); return; }
    setError('');
    setUploading(true);
    try {
      const { file_url } = await erp.integrations.Core.UploadFile({ file });
      if (!isSafeImageUrl(file_url)) throw new Error('URL de imagem invalida.');
      onChange(file_url);
    } catch (err) {
      setError(err.message || 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const showImage = isSafeImageUrl(value);

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-300 hover:text-blue-500"
          style={{ width: size, height: size }}
          title={value ? 'Trocar imagem' : 'Adicionar imagem'}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" />
            : showImage ? <img src={value} alt={label} className="h-full w-full object-cover" />
              : <ImagePlus className="h-4 w-4" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-300 hover:text-blue-500"
        style={{ width: size, height: size }}
        title={label}
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" />
          : showImage ? <img src={value} alt={label} className="h-full w-full object-cover" />
            : <ImagePlus className="h-6 w-6" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <input
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole uma URL ou envie um arquivo"
        />
        <div className="flex items-center gap-2 text-[11px]">
          <button type="button" className="font-bold text-blue-700 hover:underline" onClick={() => inputRef.current?.click()}>Enviar arquivo</button>
          {value && <button type="button" className="inline-flex items-center gap-0.5 font-bold text-red-600 hover:underline" onClick={() => onChange('')}><X className="h-3 w-3" /> Remover</button>}
        </div>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}
