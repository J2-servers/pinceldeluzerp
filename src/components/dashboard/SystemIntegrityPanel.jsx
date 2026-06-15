import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { erp } from '@/api/erpClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, RefreshCw, ShieldCheck, ShoppingCart, Wrench } from 'lucide-react';
import { toast } from '@/components/ui/app-toast';

const severityColor = {
  critica: 'bg-red-100 text-red-800 border-red-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  media: 'bg-blue-100 text-blue-800 border-blue-200',
};

const codeLabels = {
  SALE_NO_CLIENT: 'Venda sem cliente',
  SALE_NO_ITEMS: 'Venda sem itens',
  SALE_NO_SERVICE_ORDER: 'Falta OS',
  SALE_NO_FINANCIAL_ENTRY: 'Falta financeiro',
  DUPLICATE_SERVICE_ORDER: 'OS duplicada',
  ORPHAN_SALE_ITEM: 'Item solto',
  QUOTE_NO_ITEMS: 'Orcamento sem itens',
  QUOTE_NEGATIVE_MARGIN: 'Margem negativa',
  NEGATIVE_STOCK: 'Estoque negativo',
  STOCK_MOVEMENT_NO_PRODUCT: 'Movimento sem produto',
};

const getFindingTarget = (finding) => {
  const code = finding?.code || '';
  const id = finding?.entity_id || '';
  const text = finding?.message || id;
  const match = text.match(/\b(ORC|PV)-\d+\b/i);
  const search = encodeURIComponent(match?.[0] || id || text);

  if (code.startsWith('QUOTE_') || finding?.entity === 'ProductQuote') {
    return { to: `${createPageUrl('Orcamentos')}?search=${search}&view=table`, label: 'Abrir orcamento' };
  }
  if (code.startsWith('SALE_') || finding?.entity === 'SalesOrder') {
    return { to: `${createPageUrl('Vendas')}?search=${search}&view=table`, label: 'Abrir venda' };
  }
  if (code.includes('STOCK') || finding?.entity === 'Product') {
    return { to: `${createPageUrl('Estoque')}?search=${search}`, label: 'Abrir estoque' };
  }
  if (code.includes('SERVICE_ORDER')) {
    return { to: `${createPageUrl('Producao')}?search=${search}&view=list`, label: 'Abrir producao' };
  }
  return null;
};

export default function SystemIntegrityPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['systemIntegrityAudit'],
    queryFn: async () => {
      const response = await erp.functions.invoke('runSystemIntegrityAudit');
      return response.data;
    },
    refetchInterval: false,
  });

  const repair = useMutation({
    mutationFn: async () => {
      const response = await erp.functions.invoke('repairSystemIntegrity');
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['systemIntegrityAudit'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${result.fixed?.length || 0} ajuste(s) seguro(s) aplicado(s).`);
    },
    onError: (error) => toast.error(error.message || 'Nao foi possivel reparar a integridade.'),
  });

  const findings = data?.findings || [];
  const summary = data?.summary || {};
  const score = Number(data?.score || 0);
  const topFindings = findings.slice(0, 5);
  const scoreTone = score >= 90 ? 'var(--green)' : score >= 70 ? 'var(--orange)' : 'var(--red)';

  return (
    <section className="card" style={{ padding: '20px', overflow: 'hidden' }}>
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-muted)', boxShadow: 'var(--shadow-flat)' }}>
              <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Integridade do ERP</p>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Garante que vendas, estoque, financeiro e OS contem a mesma historia.</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Verifica dados cruzados de verdade: venda sem itens, pedido em producao sem OS, venda paga sem entrada financeira, estoque negativo e orcamento abaixo do custo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-black uppercase text-blue-800">Para que serve</p>
              <p className="text-sm text-blue-900 mt-1">Evita que uma pagina mostre uma coisa e outra pagina mostre outra.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-black uppercase text-emerald-800">Impacto</p>
              <p className="text-sm text-emerald-900 mt-1">Menos retrabalho, menos venda esquecida, menos dinheiro fora do caixa.</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <p className="text-xs font-black uppercase text-orange-800">Como usar</p>
              <p className="text-sm text-orange-900 mt-1">Crie venda, orcamento ou OS normalmente. Depois acompanhe aqui se ficou tudo amarrado.</p>
            </div>
          </div>
        </div>

        <div className="xl:w-[320px] rounded-2xl p-4" style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-pressed)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Score</span>
            {findings.length === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-orange-500" />}
          </div>
          <p className="text-4xl font-black mt-1" style={{ color: scoreTone }}>{isLoading ? '--' : score}</p>
          <Progress value={score} className="mt-2 h-2" />
          <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            {findings.length === 0 ? 'Tudo coerente nos cruzamentos principais.' : `${findings.length} ponto(s) para revisar. ${summary.auto_fixable || 0} podem ser corrigidos com seguranca.`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading || repair.isPending}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
            <Button size="sm" onClick={() => repair.mutate()} disabled={repair.isPending || !summary.auto_fixable}>
              <ShieldCheck className="w-4 h-4" />
              Corrigir seguro
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-5">
        <div className="space-y-2">
          {topFindings.length === 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-emerald-900">Nenhuma falha cruzada encontrada.</p>
                <p className="text-sm text-emerald-800">Os principais vinculos entre vendas, orcamentos, financeiro, estoque e OS estao consistentes.</p>
              </div>
            </div>
          )}
          {topFindings.map((finding) => {
            const target = getFindingTarget(finding);
            return (
              <div key={`${finding.code}-${finding.entity_id}`} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col md:flex-row md:items-center gap-3">
                <span className={`px-2 py-1 rounded-full border text-xs font-black shrink-0 ${severityColor[finding.severity] || severityColor.media}`}>
                  {finding.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900">{codeLabels[finding.code] || finding.code}</p>
                  <p className="text-sm text-slate-600">{finding.message}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {finding.auto_fix && <span className="text-xs font-black text-emerald-700 bg-emerald-100 rounded-full px-2 py-1">correcao segura</span>}
                  {target && (
                    <Link to={target.to} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700">
                      {target.label}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-3">Atalhos simples</p>
          <div className="grid grid-cols-1 gap-2">
            <Link to={`${createPageUrl('Orcamentos')}?novo=1`} className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-black text-slate-800">
              <FileText className="w-4 h-4 text-blue-600" />
              Fazer orcamento guiado
            </Link>
            <Link to={`${createPageUrl('Vendas')}?novo=1`} className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-black text-slate-800">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              Lançar venda completa
            </Link>
            <Link to={createPageUrl('OrdensServico')} className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-black text-slate-800">
              <Wrench className="w-4 h-4 text-orange-600" />
              Ver ordens de serviço
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
