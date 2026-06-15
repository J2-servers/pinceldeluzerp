import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sparkles, Send, Loader2, Instagram, Youtube, Copy, Check,
  Image as ImageIcon, Video, Star, MessageSquare,
  RefreshCw, Zap, Globe, Package, Camera, Film,
  Lightbulb, BarChart2, Hash
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SITE_URL = 'https://pinceldeluz.store';
const SITE_INFO = `
Site: pinceldeluz.store
Empresa: Pincel de Luz - Especializada em corte e gravação a laser
Diferenciais: 4.9★ (2.847 avaliações), 12.500+ clientes, 28.000+ produtos entregues, frete grátis +R$159, até 12x sem juros, entrega em até 7 dias, 30 dias de garantia, produção rápida
Nicho: Presentes personalizados, placas, quadros, brindes corporativos, porta-retratos, decoração a laser
`;

const REDES = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'tiktok', label: 'TikTok', icon: Film, color: 'from-black to-gray-700' },
  { id: 'facebook', label: 'Facebook', icon: Globe, color: 'from-blue-600 to-blue-800' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-700' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'from-green-500 to-green-700' },
];

const CONTENT_TYPES = {
  instagram: ['Post Feed', 'Stories', 'Reels (roteiro)', 'Carrossel', 'Legenda + Hashtags'],
  tiktok: ['Roteiro de Vídeo', 'Hook (abertura)', 'Tendência + produto', 'Tutorial'],
  facebook: ['Post patrocinado', 'Post orgânico', 'Evento', 'Stories'],
  youtube: ['Roteiro de Short', 'Roteiro de Vídeo longo', 'Título + Descrição + Tags'],
  whatsapp: ['Mensagem de oferta', 'Catálogo', 'Status', 'Abordagem cliente'],
};

export default function MarketingIA() {
  const [activeTab, setActiveTab] = useState('conteudo');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRede, setSelectedRede] = useState('instagram');
  const [selectedType, setSelectedType] = useState('Post Feed');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatingContent, setGeneratingContent] = useState(false);
  const [siteAnalysis, setSiteAnalysis] = useState('');
  const [analyzingSite, setAnalyzingSite] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => erp.entities.Product.list('-created_date', 50),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => erp.entities.Quote.list('-created_date', 20),
  });

  const buildContext = () => {
    const topProducts = products.slice(0, 10).map(p => `${p.name} (R$ ${(p.sale_price || p.price || 0).toFixed(2)})`).join(', ');
    return `
${SITE_INFO}
PRODUTOS MAIS RECENTES: ${topProducts || 'Produtos personalizados a laser'}
TOTAL DE ORÇAMENTOS: ${quotes.length}
`;
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ── GERADOR DE CONTEÚDO ──────────────────────────────────
  const generateContent = async () => {
    setGeneratingContent(true);
    setGeneratedContent('');
    try {
      const productCtx = selectedProduct ? `Produto em destaque: ${selectedProduct}` : 'Produto: produtos personalizados a laser da Pincel de Luz';
      const result = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é especialista em marketing digital para e-commerce brasileiro.
Crie conteúdo profissional de ${selectedType} para ${selectedRede.charAt(0).toUpperCase() + selectedRede.slice(1)}.

${buildContext()}
${productCtx}

REQUISITOS:
- Tom envolvente, autêntico e persuasivo em português brasileiro
- Use emojis estrategicamente
- CTA (chamada para ação) clara
- Para Instagram: inclua bloco de hashtags relevantes (30 tags)
- Para TikTok: inclua hook forte nos primeiros 3 segundos, estrutura de roteiro
- Para YouTube: inclua título SEO, descrição e tags
- Para WhatsApp: tom próximo e pessoal
- Destaque os diferenciais: qualidade premium, personalização, entrega rápida

Formato da resposta:
**📝 CONTEÚDO PRINCIPAL:**
[conteúdo aqui]

**💡 DICAS DE PUBLICAÇÃO:**
[quando publicar, como otimizar engajamento]

**🎯 VARIAÇÃO EXTRA:**
[versão alternativa curta]`,
        add_context_from_internet: false,
      });
      setGeneratedContent(result);
    } catch (e) {
      setGeneratedContent('❌ Erro ao gerar conteúdo. Tente novamente.');
    } finally {
      setGeneratingContent(false);
    }
  };

  // ── ANÁLISE DE IMAGEM/FOTO ────────────────────────────────
  const analyzeImage = async () => {
    if (!imageUrl) return;
    setAnalyzingImage(true);
    setImageAnalysis('');
    try {
      const result = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em fotografia de produto e marketing visual para e-commerce brasileiro.
Analise esta foto de produto da empresa Pincel de Luz (produtos personalizados a laser).

${SITE_INFO}

Faça uma análise detalhada com:
1. **Pontos Fortes** da foto atual
2. **Problemas Identificados** (iluminação, ângulo, fundo, qualidade, composição)
3. **Melhorias Urgentes** (top 3 mais impactantes para vendas)
4. **Sugestões de Ângulos** adicionais para tirar
5. **Edição Recomendada** (ajustes de brilho, contraste, saturação, recorte)
6. **Adequação por Plataforma** (Instagram, TikTok, WhatsApp, site)
7. **Score** de 0-10 de potencial de conversão desta foto

Seja específico e prático. Foque em aumentar as vendas.`,
        file_urls: [imageUrl],
      });
      setImageAnalysis(result);
    } catch (e) {
      setImageAnalysis('❌ Erro ao analisar imagem. Verifique a URL e tente novamente.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // ── ANÁLISE DO SITE ───────────────────────────────────────
  const analyzeSite = async () => {
    setAnalyzingSite(true);
    setSiteAnalysis('');
    try {
      const result = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é especialista em CRO (Conversion Rate Optimization), SEO e marketing digital para e-commerce brasileiro.

Analise o site da empresa Pincel de Luz: ${SITE_URL}

Dados conhecidos do site:
${SITE_INFO}

Com base nesses dados, forneça uma análise estratégica COMPLETA:

## 🔍 ANÁLISE GERAL DO SITE
Avalie UX, design, confiança, velocidade e mobile

## 📈 OPORTUNIDADES DE MELHORIA (priorizadas por impacto)
Liste pelo menos 10 melhorias concretas e acionáveis

## 🎯 ESTRATÉGIA DE CONTEÚDO PARA REDES SOCIAIS
- Calendário editorial sugerido (1 semana)
- Tipos de conteúdo que mais convertem no nicho
- Tendências do TikTok/Instagram para produtos personalizados

## 🔑 SEO E TRÁFEGO ORGÂNICO
- Palavras-chave estratégicas para o nicho
- Melhorias de SEO no site

## 💰 ESTRATÉGIAS DE AUMENTO DE RECEITA
- Upsell e cross-sell
- Programas de fidelidade
- Datas comemorativas para explorar

## 📱 PLANO DE AÇÃO (próximos 30 dias)
Ações concretas com prioridade alta/média/baixa`,
        add_context_from_internet: true,
      });
      setSiteAnalysis(result);
    } catch (e) {
      setSiteAnalysis('❌ Erro ao analisar o site. Tente novamente.');
    } finally {
      setAnalyzingSite(false);
    }
  };

  // ── CHAT ──────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await erp.integrations.Core.InvokeLLM({
        prompt: `Você é a LUNA, especialista em marketing digital, criação de conteúdo e estratégia de vendas da empresa Pincel de Luz.
Responda em português, de forma prática, criativa e orientada a resultados.
Use emojis quando pertinente.

${buildContext()}

HISTÓRICO DA CONVERSA:
${messages.slice(-6).map(m => `${m.role === 'user' ? 'Usuário' : 'Luna'}: ${m.content}`).join('\n')}

PERGUNTA ATUAL: ${text}

Forneça respostas concretas, com exemplos práticos e acionáveis para aumentar as vendas e divulgação da Pincel de Luz.`,
        add_context_from_internet: true,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao processar. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: '📅 Calendário Editorial', prompt: 'Crie um calendário editorial completo para esta semana com posts para Instagram, TikTok e WhatsApp' },
    { label: '🎬 Roteiro de Vídeo', prompt: 'Crie um roteiro viral de 60 segundos para TikTok mostrando o processo de gravação a laser' },
    { label: '📊 Estratégia de Crescimento', prompt: 'Analise o perfil da Pincel de Luz e sugira estratégia para dobrar o alcance nas redes sociais em 30 dias' },
    { label: '🏷️ Ofertas e Promoções', prompt: 'Quais promoções devo criar para as próximas datas comemorativas? Monte um plano completo' },
    { label: '⭐ Gestão de Reviews', prompt: 'Como usar as 2.847 avaliações 4.9★ para gerar mais vendas e conteúdo nas redes sociais?' },
    { label: '🤝 Marketing B2B', prompt: 'Estratégia para atrair mais clientes corporativos para brindes e presentes personalizados' },
  ];

  return (
    <div className="space-y-6">
      <Header
        title="IA de Marketing"
        subtitle="Divulgação, conteúdo e estratégias para a Pincel de Luz"
      />

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
          <Globe className="w-3 h-3" /> pinceldeluz.store
        </Badge>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
          <Star className="w-3 h-3" /> 4.9★ · 2.847 avaliações
        </Badge>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
          <Package className="w-3 h-3" /> {products.length} produtos cadastrados
        </Badge>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> IA conectada ao site
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="conteudo" className="flex items-center gap-1">
            <Hash className="w-4 h-4" /> Conteúdo
          </TabsTrigger>
          <TabsTrigger value="foto" className="flex items-center gap-1">
            <Camera className="w-4 h-4" /> Fotos
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-1">
            <Video className="w-4 h-4" /> Vídeos
          </TabsTrigger>
          <TabsTrigger value="site" className="flex items-center gap-1">
            <BarChart2 className="w-4 h-4" /> Análise do Site
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> Chat IA
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: GERADOR DE CONTEÚDO ── */}
        <TabsContent value="conteudo" className="mt-4 space-y-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <Hash className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Gerador de Conteúdo para Redes Sociais</h3>
            </div>

            {/* Seleção de rede */}
            <div className="mb-5">
              <p className="text-gray-400 text-sm mb-3">Selecione a rede social:</p>
              <div className="flex flex-wrap gap-2">
                {REDES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRede(r.id); setSelectedType(CONTENT_TYPES[r.id][0]); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                      selectedRede === r.id
                        ? 'border-pink-500 bg-pink-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    <r.icon className="w-4 h-4" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-gray-400 text-sm mb-2">Tipo de conteúdo:</p>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(CONTENT_TYPES[selectedRede] || []).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Produto em destaque (opcional):</p>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Produtos em geral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Produtos em geral</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                    <SelectItem value="Placa personalizada a laser">Placa personalizada a laser</SelectItem>
                    <SelectItem value="Presente personalizado">Presente personalizado</SelectItem>
                    <SelectItem value="Brindes corporativos">Brindes corporativos</SelectItem>
                    <SelectItem value="Quadro decorativo">Quadro decorativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={generateContent}
              disabled={generatingContent}
              className="gradient-primary w-full mb-6"
            >
              {generatingContent ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando conteúdo...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Gerar Conteúdo com IA</>
              )}
            </Button>

            {generatedContent && (
              <div className="relative bg-white/5 rounded-xl p-5 border border-white/10">
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-3 right-3"
                  onClick={() => copyText(generatedContent, 'gen')}
                >
                  {copiedIndex === 'gen' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </Button>
                <ReactMarkdown className="prose prose-invert prose-sm max-w-none text-gray-200">
                  {generatedContent}
                </ReactMarkdown>
              </div>
            )}
          </GlassCard>

          {/* Quick prompts */}
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Ações Rápidas de Marketing</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveTab('chat'); setTimeout(() => sendMessage(qp.prompt), 100); }}
                  className="text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/50 hover:bg-white/10 transition-all"
                >
                  <span className="text-sm text-gray-300">{qp.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── TAB: ANÁLISE DE FOTOS ── */}
        <TabsContent value="foto" className="mt-4 space-y-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <Camera className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Análise e Melhoria de Fotos de Produto</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Cole a URL de uma foto do produto para receber análise detalhada e sugestões de melhoria para aumentar as vendas.
            </p>
            <div className="flex gap-3 mb-4">
              <Input
                placeholder="https://... (URL da foto do produto)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-white/5 border-white/10"
              />
              <Button onClick={analyzeImage} disabled={analyzingImage || !imageUrl} className="gradient-primary whitespace-nowrap">
                {analyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4 mr-2" /> Analisar</>}
              </Button>
            </div>

            {imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 max-h-64 flex items-center justify-center bg-white/5">
                <img src={imageUrl} alt="Produto" className="max-h-64 object-contain" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}

            {imageAnalysis && (
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <ReactMarkdown className="prose prose-invert prose-sm max-w-none text-gray-200">
                  {imageAnalysis}
                </ReactMarkdown>
              </div>
            )}

            {!imageAnalysis && !analyzingImage && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 font-medium">💡 O que a IA analisa nas suas fotos:</p>
                {[
                  '🔆 Qualidade de iluminação e sombras',
                  '📐 Composição, ângulo e enquadramento',
                  '🎨 Cores, contraste e fundo',
                  '📱 Adequação para Instagram, TikTok e WhatsApp',
                  '💰 Score de potencial de conversão em vendas',
                  '✏️ Sugestões específicas de edição (brilho, saturação)',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 rounded-lg px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── TAB: VÍDEOS ── */}
        <TabsContent value="video" className="mt-4 space-y-4">
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <Video className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Estratégia de Vídeos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                {
                  platform: 'TikTok / Reels',
                  icon: Film,
                  color: 'from-pink-500 to-purple-600',
                  formats: [
                    { name: 'Processo de Gravação a Laser', duration: '15-30s', hook: 'Mostra o laser em ação - hipnótico e viral' },
                    { name: 'Antes e Depois do Produto', duration: '15s', hook: 'Transformação impactante' },
                    { name: 'Unboxing do Cliente', duration: '30-60s', hook: 'Reação emocional = confiança' },
                    { name: 'Produto + Texto de Gratidão', duration: '15s', hook: 'Apelo emocional forte' },
                  ]
                },
                {
                  platform: 'YouTube Shorts',
                  icon: Youtube,
                  color: 'from-red-500 to-red-700',
                  formats: [
                    { name: 'Tutorial de Como Personalizar', duration: '60s', hook: 'Educativo + mostra processo' },
                    { name: 'Top 5 Presentes Personalizados', duration: '60s', hook: 'Conteúdo de valor' },
                    { name: 'Bastidores da Produção', duration: '60s', hook: 'Transparência e confiança' },
                    { name: 'Dicas de Presente para Datas', duration: '60s', hook: 'Sazonal e relevante' },
                  ]
                }
              ].map((section, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <section.icon className="w-5 h-5 text-pink-400" />
                    <h4 className="text-white font-medium">{section.platform}</h4>
                  </div>
                  <div className="space-y-3">
                    {section.formats.map((f, j) => (
                      <div key={j} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{f.name}</span>
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">{f.duration}</Badge>
                        </div>
                        <p className="text-gray-500 text-xs">{f.hook}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-xs text-pink-400 hover:text-pink-300 p-0 h-auto"
                          onClick={() => {
                            setActiveTab('chat');
                            setTimeout(() => sendMessage(`Crie um roteiro completo e detalhado de ${f.duration} para ${section.platform} sobre: "${f.name}". Inclua hook, desenvolvimento, CTA e legendas sugeridas.`), 100);
                          }}
                        >
                          <Sparkles className="w-3 h-3 mr-1" /> Gerar roteiro com IA
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Dicas de produção */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h4 className="text-yellow-400 font-medium">Dicas de Produção de Vídeo</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  '🎬 Grave o laser em funcionamento de perto — é hipnotizante',
                  '💡 Use boa iluminação: anel de luz ou luz natural',
                  '📱 Grave vertical (9:16) para TikTok/Reels',
                  '🎵 Use músicas em alta no TikTok para mais alcance',
                  '⚡ Primeiros 3 segundos são críticos — comece com o resultado',
                  '📝 Adicione texto/legenda — 80% assiste sem som',
                  '🔁 Grave múltiplos ângulos do mesmo produto',
                  '⭐ Mostre avaliações reais de clientes nos vídeos',
                ].map((tip, i) => (
                  <p key={i} className="text-sm text-gray-300">{tip}</p>
                ))}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* ── TAB: ANÁLISE DO SITE ── */}
        <TabsContent value="site" className="mt-4 space-y-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-pink-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Análise Estratégica do Site</h3>
                  <p className="text-sm text-gray-400">{SITE_URL}</p>
                </div>
              </div>
              <Button onClick={analyzeSite} disabled={analyzingSite} className="gradient-primary">
                {analyzingSite ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Analisar Site</>
                )}
              </Button>
            </div>

            {/* Dados já conhecidos do site */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Avaliação', value: '4.9 ★', sub: '2.847 avaliações', color: 'text-yellow-400' },
                { label: 'Clientes', value: '12.500+', sub: 'Satisfeitos', color: 'text-green-400' },
                { label: 'Produtos', value: '28.000+', sub: 'Entregues', color: 'text-blue-400' },
                { label: 'Recomendação', value: '99%', sub: 'Recomendam', color: 'text-pink-400' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-gray-400 text-xs">{kpi.label}</div>
                  <div className="text-gray-500 text-xs">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {siteAnalysis ? (
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <ReactMarkdown className="prose prose-invert prose-sm max-w-none text-gray-200">
                  {siteAnalysis}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Globe className="w-12 h-12 mx-auto mb-4 text-pink-400 opacity-50" />
                <p className="text-lg font-medium text-white mb-2">Análise com IA + Internet</p>
                <p className="text-sm max-w-md mx-auto">Clique em "Analisar Site" para receber um relatório completo com oportunidades de melhoria, estratégia de conteúdo e plano de ação dos próximos 30 dias.</p>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── TAB: CHAT ── */}
        <TabsContent value="chat" className="mt-4">
          <GlassCard className="flex flex-col" style={{ height: '65vh' }}>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Luna — IA de Marketing</h3>
                <p className="text-xs text-gray-400">Especialista em divulgação da Pincel de Luz · Conectada à internet</p>
              </div>
              <Badge className="ml-auto bg-green-500/20 text-green-400 text-xs">Online</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <Sparkles className="w-12 h-12 text-pink-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Olá! Sou a Luna 🌙</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    Sua IA especialista em marketing digital. Posso criar conteúdo, roteiros, estratégias e muito mais para a Pincel de Luz.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-6 max-w-lg mx-auto">
                    {quickPrompts.slice(0, 4).map((qp, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(qp.prompt)}
                        className="text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all text-sm text-gray-300"
                      >
                        {qp.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user' ? 'bg-pink-500/20 text-white' : 'bg-white/5 text-gray-200'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="relative group">
                        <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                          {msg.content}
                        </ReactMarkdown>
                        <button
                          onClick={() => copyText(msg.content, i)}
                          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          {copiedIndex === i ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
                        </button>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                    <span className="text-gray-400 text-sm">Luna está pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); if (input.trim() && !loading) sendMessage(input.trim()); }}
              className="pt-4 border-t border-white/10 flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre marketing, conteúdo, estratégias..."
                className="flex-1 bg-white/5 border-white/10"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !input.trim()} className="gradient-primary">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}