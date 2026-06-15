import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Search, AlertTriangle, Zap, TrendingUp } from 'lucide-react';

const allItems = [
  // DASHBOARD & KPIs (1-15)
  { id: 1, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: ROI por máquina (investimento vs receita gerada)' },
  { id: 2, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: Tempo médio de produção por pedido' },
  { id: 3, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: Taxa de conversão de orçamentos em pedidos (%)' },
  { id: 4, area: 'Dashboard', priority: 'media', status: 'pendente', desc: 'KPI: Ticket médio por categoria de cliente' },
  { id: 5, area: 'Dashboard', priority: 'media', status: 'pendente', desc: 'KPI: Velocidade de giro do estoque' },
  { id: 6, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'Gráfico de tendência de faturamento (rolling 12 meses)' },
  { id: 7, area: 'Dashboard', priority: 'media', status: 'pendente', desc: 'Widget de metas com progresso visual em tempo real' },
  { id: 8, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: Custo operacional por hora de máquina' },
  { id: 9, area: 'Dashboard', priority: 'media', status: 'pendente', desc: 'KPI: NPS (Net Promoter Score) dos clientes' },
  { id: 10, area: 'Dashboard', priority: 'baixa', status: 'pendente', desc: 'Dashboard personalizável (arrastar e soltar widgets)' },
  { id: 11, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: Percentual de pedidos entregues no prazo' },
  { id: 12, area: 'Dashboard', priority: 'media', status: 'pendente', desc: 'KPI: Margem de contribuição por produto' },
  { id: 13, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: Receita por sócio (comissões/responsabilidades)' },
  { id: 14, area: 'Dashboard', priority: 'media', status: 'pendente', desc: 'Mapa de calor de atividades por dia da semana' },
  { id: 15, area: 'Dashboard', priority: 'alta', status: 'pendente', desc: 'KPI: Índice de inadimplência (%) sobre faturamento total' },

  // FINANCEIRO (16-30)
  { id: 16, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Conciliação bancária automática (importar extrato OFX/CSV)' },
  { id: 17, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Calculadora de impostos: Simples Nacional por faixa' },
  { id: 18, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Gestão de comissões por vendedor/sócio com relatório' },
  { id: 19, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'ROI por máquina: investimento vs receita mensal gerada' },
  { id: 20, area: 'Financeiro', priority: 'media', status: 'pendente', desc: 'Criação de centros de custo por departamento' },
  { id: 21, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Controle de parcelas (compras e vendas parceladas)' },
  { id: 22, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Boleto bancário: geração e controle de vencimento' },
  { id: 23, area: 'Financeiro', priority: 'media', status: 'pendente', desc: 'Relatório de conciliação sócios (quem pagou o quê)' },
  { id: 24, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Alertas automáticos via WhatsApp para contas vencendo em 3 dias' },
  { id: 25, area: 'Financeiro', priority: 'media', status: 'pendente', desc: 'Comparativo mensal: planejado vs realizado' },
  { id: 26, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Orçamento anual com controle de execução mensal' },
  { id: 27, area: 'Financeiro', priority: 'media', status: 'pendente', desc: 'Histórico de alterações em transações (auditoria)' },
  { id: 28, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'Relatório de inadimplência com aging (0-30, 31-60, 61-90 dias)' },
  { id: 29, area: 'Financeiro', priority: 'media', status: 'pendente', desc: 'Integração com Pix: geração de QR Code para recebimento' },
  { id: 30, area: 'Financeiro', priority: 'alta', status: 'pendente', desc: 'IRPJ/CSLL: estimativa mensal baseada no lucro real' },

  // VENDAS E ORÇAMENTOS (31-45)
  { id: 31, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'PDF de pedido de venda com logo da empresa' },
  { id: 32, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'PDF de orçamento profissional com linha de itens' },
  { id: 33, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Cálculo automático de frete no orçamento' },
  { id: 34, area: 'Vendas', priority: 'media', status: 'pendente', desc: 'Histórico de versões do orçamento (v1, v2, v3...)' },
  { id: 35, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Aprovação digital de orçamento via link (sem login)' },
  { id: 36, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Pipeline de vendas visual (kanban) por status' },
  { id: 37, area: 'Vendas', priority: 'media', status: 'pendente', desc: 'Motivo de perda de orçamento recusado' },
  { id: 38, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Assinatura digital do cliente no pedido' },
  { id: 39, area: 'Vendas', priority: 'media', status: 'pendente', desc: 'Templates de orçamento por tipo de trabalho (gravação, corte...)' },
  { id: 40, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Alerta automático de orçamento prestes a expirar' },
  { id: 41, area: 'Vendas', priority: 'media', status: 'pendente', desc: 'Comissão automática ao fechar venda para vendedor' },
  { id: 42, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Preview de arte/design antes de aprovar produção' },
  { id: 43, area: 'Vendas', priority: 'baixa', status: 'pendente', desc: 'Carrinho de orçamento compartilhável com cliente' },
  { id: 44, area: 'Vendas', priority: 'alta', status: 'pendente', desc: 'Validação de CNPJ do cliente na criação de pedido' },
  { id: 45, area: 'Vendas', priority: 'media', status: 'pendente', desc: 'Relatório de conversão funil (orçamento → pedido → entrega)' },

  // PRODUÇÃO E ENGENHARIA (46-60)
  { id: 46, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Timer em tempo real para cada item na fila de produção' },
  { id: 47, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Painel operacional (TV mode) para chão de fábrica' },
  { id: 48, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Cálculo de custo real de produção (máquina + material + mão de obra)' },
  { id: 49, area: 'Produção', priority: 'media', status: 'pendente', desc: 'Comparativo tempo estimado vs real por operação' },
  { id: 50, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Consumo automático de estoque ao concluir produção' },
  { id: 51, area: 'Produção', priority: 'media', status: 'pendente', desc: 'Relatório de eficiência produtiva (output/hora)' },
  { id: 52, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Gestão de gases: consumo por operação e alerta de reposição' },
  { id: 53, area: 'Produção', priority: 'media', status: 'pendente', desc: 'Histórico de parâmetros por material e operador' },
  { id: 54, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Alerta automático de manutenção por horas de uso da máquina' },
  { id: 55, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Cálculo de aproveitamento de chapa (área usada/área total %)' },
  { id: 56, area: 'Produção', priority: 'media', status: 'pendente', desc: 'Integração de fila de produção com OS automaticamente' },
  { id: 57, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'Índice de retrabalho e qualidade por operador' },
  { id: 58, area: 'Produção', priority: 'media', status: 'pendente', desc: 'Biblioteca de arquivos DXF por trabalho realizado' },
  { id: 59, area: 'Produção', priority: 'alta', status: 'pendente', desc: 'MTBF (Mean Time Between Failures) por máquina' },
  { id: 60, area: 'Produção', priority: 'media', status: 'pendente', desc: 'Relatório de ociosidade de máquina por período' },

  // ESTOQUE E COMPRAS (61-70)
  { id: 61, area: 'Estoque', priority: 'alta', status: 'pendente', desc: 'Sugestão automática de compra baseada no consumo médio' },
  { id: 62, area: 'Estoque', priority: 'alta', status: 'pendente', desc: 'Integração com fornecedor: cotação automática via e-mail/WhatsApp' },
  { id: 63, area: 'Estoque', priority: 'media', status: 'pendente', desc: 'Código de barras/QR Code para identificação de produto' },
  { id: 64, area: 'Estoque', priority: 'alta', status: 'pendente', desc: 'Inventário periódico com ajuste de diferença' },
  { id: 65, area: 'Estoque', priority: 'media', status: 'pendente', desc: 'FIFO/LIFO automático no controle de custo de estoque' },
  { id: 66, area: 'Estoque', priority: 'alta', status: 'pendente', desc: 'Relatório ABC de estoque (A=mais crítico, C=menos)' },
  { id: 67, area: 'Estoque', priority: 'media', status: 'pendente', desc: 'Controle de lote e validade de insumos químicos' },
  { id: 68, area: 'Estoque', priority: 'alta', status: 'pendente', desc: 'Reserva automática de material ao criar OS de produção' },
  { id: 69, area: 'Estoque', priority: 'media', status: 'pendente', desc: 'Etiqueta de identificação de retalho com QR Code' },
  { id: 70, area: 'Estoque', priority: 'alta', status: 'pendente', desc: 'Ponto de reposição automático com lead time do fornecedor' },

  // CLIENTES E RELACIONAMENTO (71-80)
  { id: 71, area: 'Clientes', priority: 'alta', status: 'pendente', desc: 'Segmentação de clientes por frequência de compra (RFM)' },
  { id: 72, area: 'Clientes', priority: 'alta', status: 'pendente', desc: 'Envio automático de pesquisa de satisfação pós-entrega' },
  { id: 73, area: 'Clientes', priority: 'media', status: 'pendente', desc: 'Linha do tempo completa por cliente (pedidos, pagamentos, contatos)' },
  { id: 74, area: 'Clientes', priority: 'alta', status: 'pendente', desc: 'Programa de fidelidade: pontos por compra e resgate' },
  { id: 75, area: 'Clientes', priority: 'media', status: 'pendente', desc: 'Portal do cliente: ver pedidos e orçamentos sem login ERP' },
  { id: 76, area: 'Clientes', priority: 'alta', status: 'pendente', desc: 'Campanha de reativação: lista de clientes inativos há N dias' },
  { id: 77, area: 'Clientes', priority: 'media', status: 'pendente', desc: 'Upload de contrato/arquivo vinculado ao cliente' },
  { id: 78, area: 'Clientes', priority: 'alta', status: 'pendente', desc: 'Alerta de aniversário do cliente para promoção' },
  { id: 79, area: 'Clientes', priority: 'media', status: 'pendente', desc: 'Cálculo de CLV (Customer Lifetime Value)' },
  { id: 80, area: 'Clientes', priority: 'alta', status: 'pendente', desc: 'Integração de leads: formulário web → CRM automático' },

  // PESSOAS E RH (81-90)
  { id: 81, area: 'Pessoas', priority: 'alta', status: 'pendente', desc: 'Controle de ponto eletrônico integrado' },
  { id: 82, area: 'Pessoas', priority: 'alta', status: 'pendente', desc: 'Cálculo de horas extras e adicional noturno' },
  { id: 83, area: 'Pessoas', priority: 'media', status: 'pendente', desc: 'Folha de pagamento simplificada com 13°/férias' },
  { id: 84, area: 'Pessoas', priority: 'alta', status: 'pendente', desc: 'Controle de treinamentos e certificações por funcionário' },
  { id: 85, area: 'Pessoas', priority: 'media', status: 'pendente', desc: 'Ficha técnica do operador (máquinas habilitadas)' },
  { id: 86, area: 'Pessoas', priority: 'alta', status: 'pendente', desc: 'Escala de trabalho semanal por função' },
  { id: 87, area: 'Pessoas', priority: 'media', status: 'pendente', desc: 'Relatório de produtividade por funcionário (OS concluídas)' },
  { id: 88, area: 'Pessoas', priority: 'alta', status: 'pendente', desc: 'Gestão de vale-transporte e benefícios' },
  { id: 89, area: 'Pessoas', priority: 'media', status: 'pendente', desc: 'Avaliação de desempenho semestral' },
  { id: 90, area: 'Pessoas', priority: 'alta', status: 'pendente', desc: 'Banco de horas: saldo de horas trabalhadas vs contratadas' },

  // INTEGRAÇÕES E AUTOMAÇÕES (91-105)
  { id: 91, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'Notificação push no browser para alertas críticos' },
  { id: 92, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'E-mail automático de confirmação de pedido para cliente' },
  { id: 93, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'E-mail automático de NF/recibo ao confirmar pagamento' },
  { id: 94, area: 'Integrações', priority: 'media', status: 'pendente', desc: 'Webhook de saída para sistema do cliente (ERP externo)' },
  { id: 95, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'Integração com Mercado Livre / Shopify para pedidos online' },
  { id: 96, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'API REST pública documentada para integrações externas' },
  { id: 97, area: 'Integrações', priority: 'media', status: 'pendente', desc: 'Integração Google Calendar para sincronizar eventos da Agenda' },
  { id: 98, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'Importação de nota fiscal XML (NF-e) para lançamento automático' },
  { id: 99, area: 'Integrações', priority: 'media', status: 'pendente', desc: 'Envio automático de lembrete de pagamento D-3, D-1, D0' },
  { id: 100, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'Integração com transportadora para rastreio de entrega' },
  { id: 101, area: 'Integrações', priority: 'media', status: 'pendente', desc: 'Backup automático diário dos dados para Google Drive' },
  { id: 102, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'Automação: ao estoque baixo → criar ordem de compra automaticamente' },
  { id: 103, area: 'Integrações', priority: 'media', status: 'pendente', desc: 'Automação: orçamento expirado → enviar lembrete WhatsApp' },
  { id: 104, area: 'Integrações', priority: 'alta', status: 'pendente', desc: 'Emissor de NF-e integrado (SEFAZ) para nota fiscal eletrônica' },
  { id: 105, area: 'Integrações', priority: 'media', status: 'pendente', desc: 'Integração contábil: exportar lançamentos para sistema de contabilidade' },

  // SEGURANÇA E CONFIGURAÇÕES (106-115)
  { id: 106, area: 'Configurações', priority: 'alta', status: 'pendente', desc: 'Permissões por usuário: definir acesso por módulo (ex: vendedor só vê vendas)' },
  { id: 107, area: 'Configurações', priority: 'alta', status: 'pendente', desc: 'Log de auditoria: registrar toda alteração de dados com usuário e timestamp' },
  { id: 108, area: 'Configurações', priority: 'alta', status: 'pendente', desc: '2FA (autenticação dois fatores) via e-mail ou app' },
  { id: 109, area: 'Configurações', priority: 'media', status: 'pendente', desc: 'Perfis de acesso: Admin, Gerente, Vendedor, Operador, Financeiro' },
  { id: 110, area: 'Configurações', priority: 'media', status: 'pendente', desc: 'Configuração de logo, cores e dados da empresa para documentos' },
  { id: 111, area: 'Configurações', priority: 'alta', status: 'pendente', desc: 'Export completo dos dados em JSON (LGPD)' },
  { id: 112, area: 'Configurações', priority: 'media', status: 'pendente', desc: 'Configuração de horário de funcionamento (para agenda)' },
  { id: 113, area: 'Configurações', priority: 'alta', status: 'pendente', desc: 'Modo multi-unidade: controle de filiais distintas' },
  { id: 114, area: 'Configurações', priority: 'media', status: 'pendente', desc: 'Configuração de numeração automática de pedidos/OS' },
  { id: 115, area: 'Configurações', priority: 'alta', status: 'pendente', desc: 'Regras de cobrança automática configuráveis por tipo de cliente' },

  // UX E INTERFACE (116-125)
  { id: 116, area: 'UX', priority: 'alta', status: 'pendente', desc: 'Modo mobile responsivo otimizado (PWA instalável no celular)' },
  { id: 117, area: 'UX', priority: 'media', status: 'pendente', desc: 'Atalhos de teclado para operações frequentes (Ctrl+N novo pedido etc)' },
  { id: 118, area: 'UX', priority: 'alta', status: 'pendente', desc: 'Notificações in-app com centro de notificações' },
  { id: 119, area: 'UX', priority: 'alta', status: 'pendente', desc: 'Tour guiado (onboarding) para novos usuários' },
  { id: 120, area: 'UX', priority: 'media', status: 'pendente', desc: 'Busca global: encontrar qualquer registro do sistema' },
  { id: 121, area: 'UX', priority: 'alta', status: 'pendente', desc: 'Modo escuro/claro alternável pelo usuário' },
  { id: 122, area: 'UX', priority: 'media', status: 'pendente', desc: 'Favoritos: fixar páginas mais usadas no topo da sidebar' },
  { id: 123, area: 'UX', priority: 'alta', status: 'pendente', desc: 'Drag-and-drop na fila de produção para reordenar prioridades' },
  { id: 124, area: 'UX', priority: 'media', status: 'pendente', desc: 'Filtros salvos: salvar combinações de filtros como preset' },
  { id: 125, area: 'UX', priority: 'alta', status: 'pendente', desc: 'Confirmação visual (toast) em todas as ações críticas' },

  // MÉTRICAS AVANÇADAS (126-150)
  { id: 126, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: OEE (Overall Equipment Effectiveness) por máquina' },
  { id: 127, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Taxa de rejeição/retrabalho por operador e material' },
  { id: 128, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Churn rate de clientes (% que pararam de comprar)' },
  { id: 129, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: CAC (Custo de Aquisição de Cliente)' },
  { id: 130, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: LTV:CAC ratio para avaliar rentabilidade do cliente' },
  { id: 131, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Dias de Estoque (estoque / consumo médio diário)' },
  { id: 132, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: EBITDA mensal e anual' },
  { id: 133, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Payback de novos equipamentos adquiridos' },
  { id: 134, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: % de pedidos entregues com atraso' },
  { id: 135, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Tempo médio de fechamento de orçamento (lead time comercial)' },
  { id: 136, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Receita por m² de material processado' },
  { id: 137, area: 'Métricas', priority: 'media', status: 'pendente', desc: 'Métrica: Aproveitamento de material (área usada / área comprada)' },
  { id: 138, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Receita por hora produtiva da máquina laser' },
  { id: 139, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Índice de crescimento mensal (MoM) e anual (YoY)' },
  { id: 140, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Nível de serviço (% atendimento no prazo prometido)' },
  { id: 141, area: 'Métricas', priority: 'media', status: 'pendente', desc: 'Métrica: Retorno sobre patrimônio (ROE)' },
  { id: 142, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Métrica: Liquidez corrente (ativo circulante / passivo circulante)' },
  { id: 143, area: 'Métricas', priority: 'media', status: 'pendente', desc: 'Métrica: Ciclo operacional e ciclo financeiro' },
  { id: 144, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Scorecard mensal de KPIs com semáforo (verde/amarelo/vermelho)' },
  { id: 145, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Benchmark: comparativo com médias do setor de corte a laser' },
  { id: 146, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Projeção de receita baseada em histórico + sazonalidade' },
  { id: 147, area: 'Métricas', priority: 'media', status: 'pendente', desc: 'Análise de sazonalidade: meses de pico vs meses baixos' },
  { id: 148, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Meta SMART automática baseada em histórico (sugestão da IA)' },
  { id: 149, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Dashboard executivo: resumo 1 página para decisões rápidas' },
  { id: 150, area: 'Métricas', priority: 'alta', status: 'pendente', desc: 'Análise preditiva: previsão de estoque crítico com ML simples' },
];

const areas = ['Todos', 'Dashboard', 'Financeiro', 'Vendas', 'Produção', 'Estoque', 'Clientes', 'Pessoas', 'Integrações', 'Configurações', 'UX', 'Métricas'];
const priorities = ['Todas', 'alta', 'media', 'baixa'];

const priorityColors = {
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baixa: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function Checklist() {
  const [areaFilter, setAreaFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = allItems.filter(item => {
    const matchArea = areaFilter === 'Todos' || item.area === areaFilter;
    const matchPriority = priorityFilter === 'Todas' || item.priority === priorityFilter;
    const matchSearch = item.desc.toLowerCase().includes(searchQuery.toLowerCase()) || item.area.toLowerCase().includes(searchQuery.toLowerCase());
    return matchArea && matchPriority && matchSearch;
  });

  const altaCount = allItems.filter(i => i.priority === 'alta').length;
  const mediaCount = allItems.filter(i => i.priority === 'media').length;
  const baixaCount = allItems.filter(i => i.priority === 'baixa').length;

  return (
    <div className="space-y-6">
      <Header title="Checklist de Melhorias" subtitle="150 melhorias e métricas identificadas para o sistema" />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard delay={0}>
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-pink-400" />
            <div>
              <p className="text-2xl font-bold text-white">150</p>
              <p className="text-xs text-gray-400">Total de melhorias</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{altaCount}</p>
              <p className="text-xs text-gray-400">Alta prioridade</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.2}>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-yellow-400">{mediaCount}</p>
              <p className="text-xs text-gray-400">Média prioridade</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard delay={0.3}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-gray-400">{baixaCount}</p>
              <p className="text-xs text-gray-400">Baixa prioridade</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar melhoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-44 bg-white/5 border-white/10">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 bg-white/5 border-white/10">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-gray-400 text-sm self-center">
            Exibindo {filtered.length} de {allItems.length}
          </span>
        </div>
      </GlassCard>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((item, i) => (
          <GlassCard key={item.id} delay={i * 0.01} hover={false} className="py-3">
            <div className="flex items-start gap-4">
              <span className="text-gray-500 text-sm font-mono w-8 flex-shrink-0">{String(item.id).padStart(3, '0')}</span>
              <div className="flex-1">
                <p className="text-white text-sm">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {item.area}
                </Badge>
                <Badge className={`text-xs ${priorityColors[item.priority]}`}>
                  {item.priority}
                </Badge>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}