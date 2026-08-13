import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Badge } from '@/components/ui/badge';
import { Package, Ruler, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Seletor de material do estoque para uso no formulário de orçamentos.
 * Quando o usuário seleciona um material + informa as dimensões da peça,
 * calcula automaticamente o custo proporcional.
 *
 * Props:
 *  - pieceWidth: número (mm)
 *  - pieceHeight: número (mm)
 *  - onMaterialSelect: (product, calculatedCost) => void
 *  - selectedProductId: string | null
 */
export default function MaterialEstoqueSelector({ pieceWidth, pieceHeight, onMaterialSelect, selectedProductId }) {
  const [searchMat, setSearchMat] = useState('');
  const [expanded, setExpanded] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'list', 'name'],
    queryFn: () => erp.entities.Product.list('name')
  });

  // Apenas materiais com dimensões cadastradas
  const materials = products.filter((p) => p.sheet_width_mm && p.sheet_height_mm && p.cost_price > 0);
  const filtered = materials.filter((p) =>
  p.name?.toLowerCase().includes(searchMat.toLowerCase()) ||
  p.category?.toLowerCase().includes(searchMat.toLowerCase()) ||
  p.color?.toLowerCase().includes(searchMat.toLowerCase())
  );

  function calcProportionalCost(product, pw, ph) {
    const sw = parseFloat(product.sheet_width_mm) || 0;
    const sh = parseFloat(product.sheet_height_mm) || 0;
    const pw_ = parseFloat(pw) || 0;
    const ph_ = parseFloat(ph) || 0;
    if (!sw || !sh || !pw_ || !ph_) return null;
    const ratioArea = pw_ * ph_ / (sw * sh);
    return (product.cost_price || 0) * ratioArea;
  }

  function checkFits(product, pw, ph) {
    const sw = parseFloat(product.sheet_width_mm) || 0;
    const sh = parseFloat(product.sheet_height_mm) || 0;
    const pw_ = parseFloat(pw) || 0;
    const ph_ = parseFloat(ph) || 0;
    if (!sw || !sh || !pw_ || !ph_) return null;
    return pw_ <= sw && ph_ <= sh;
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const pieceW = parseFloat(pieceWidth) || 0;
  const pieceH = parseFloat(pieceHeight) || 0;
  const hasPieceDimensions = pieceW > 0 && pieceH > 0;

  return (
    <div className="space-y-3">
      {/* Header toggle */}
      <div
        className="flex items-center justify-between cursor-pointer rounded-xl px-4 py-3"
        style={{ background: 'var(--accent-muted)', boxShadow: 'var(--shadow-flat)' }}
        onClick={() => setExpanded(!expanded)}>

        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {selectedProduct ? `✓ ${selectedProduct.name}` : 'Selecionar Material do Estoque'}
          </span>
          {selectedProduct && hasPieceDimensions && (() => {
            const cost = calcProportionalCost(selectedProduct, pieceW, pieceH);
            return cost != null ?
            <span className="text-sm font-bold ml-2" style={{ color: 'var(--green)' }}>→ R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> :
            null;
          })()}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{expanded ? '▲ fechar' : '▼ abrir'}</span>
      </div>

      {expanded &&
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
          {/* Info sobre dimensões da peça */}
          {!hasPieceDimensions &&
        <div className="px-4 py-3 flex items-center gap-2 text-sm"
        style={{ background: 'var(--yellow-muted)' }}>
              <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--yellow)' }} />
              <span style={{ color: 'var(--yellow)' }}>Preencha a Largura e Altura da peça (campos acima) para ver o custo calculado automaticamente.</span>
            </div>
        }

          {hasPieceDimensions &&
        <div className="px-4 py-2.5 flex items-center gap-2 text-sm"
        style={{ background: 'var(--accent-muted)' }}>
              <Ruler className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--accent)' }}>Peça: <strong style={{ color: 'var(--text-primary)' }}>{pieceW} × {pieceH} mm</strong> — custo proporcional calculado por área</span>
            </div>
        }

          {/* Search */}
          <div className="px-3 py-2">
            <input
            type="text"
            placeholder="Buscar por nome, categoria, cor..."
            value={searchMat}
            onChange={(e) => setSearchMat(e.target.value)}
            className="w-full text-sm outline-none" />

          </div>

          {/* Material list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 &&
          <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {materials.length === 0 ?
            'Nenhum material com dimensões cadastradas no estoque. Cadastre em Estoque → Novo Material com Largura e Comprimento.' :
            'Nenhum material encontrado com esse filtro.'}
              </div>
          }
            {filtered.map((p) => {
            const proportionalCost = calcProportionalCost(p, pieceW, pieceH);
            const fits = checkFits(p, pieceW, pieceH);
            const isSelected = p.id === selectedProductId;
            const isLow = (p.quantity || 0) <= (p.min_quantity || 1);

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onMaterialSelect(p, proportionalCost);
                  setExpanded(false);
                }}
                className="w-full px-4 py-3 text-left transition-colors flex items-start justify-between gap-3"
                style={isSelected ? { background: 'var(--accent-muted)' } : {}}>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      {p.color && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>• {p.color}</span>}
                      {isSelected && <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
                      {isLow && <AlertTriangle className="w-3 h-3" style={{ color: 'var(--orange)' }} title="Estoque baixo" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge className="text-[10px] capitalize border-0" style={{ background: 'var(--purple-muted)', color: 'var(--purple)' }}>{p.category}</Badge>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <Ruler className="w-3 h-3 inline mr-0.5" />{p.sheet_width_mm} × {p.sheet_height_mm} mm
                        {p.thickness_mm ? ` · ${p.thickness_mm}mm` : ''}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        📦 {p.quantity || 0} chapas em estoque
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--accent)' }}>
                        Custo/m²: R$ {(p.cost_price_m2 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Chapa: R$ {(p.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {hasPieceDimensions && proportionalCost != null ?
                  <div>
                        <p className="text-sm font-bold" style={{ color: fits ? 'var(--green)' : 'var(--red)' }}>
                          R$ {proportionalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>custo proporcional</p>
                        {fits === false &&
                    <p className="text-[10px] font-bold" style={{ color: 'var(--red)' }}>⚠ Peça não cabe na chapa</p>
                    }
                        {fits === true &&
                    <p className="text-[10px]" style={{ color: 'var(--green)' }}>✓ Cabe na chapa</p>
                    }
                      </div> :

                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                  }
                  </div>
                </button>);

          })}
          </div>
        </div>
      }
    </div>);

}