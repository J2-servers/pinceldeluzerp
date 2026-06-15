# Checklist de Ação — Auditoria e Reestruturação do ERP

## Status atual
- Fase ativa: **Saneamento iniciado / Migração piloto preparada**
- Objetivo imediato: limpar o legado confiável, validar subconjunto piloto e só então entrar no núcleo operacional novo.

---

## Fase 1 — Auditoria e diagnóstico

### 1. Auditoria de banco
- [x] Mapear todas as entidades/tabelas atuais
- [x] Documentar colunas e tipos
- [x] Identificar chaves primárias e relacionamentos
- [x] Identificar lacunas estruturais do modelo atual
- [x] Consolidar mapa do legado atual

### 2. Auditoria de dados
- [x] Detectar SKUs duplicados
- [x] Detectar produtos semanticamente duplicados
- [x] Detectar produtos sem categoria
- [x] Detectar produtos sem preço válido
- [x] Detectar estoque negativo
- [x] Detectar estoque sem origem por movimento
- [x] Detectar divergências entre saldo e movimentação
- [x] Classificar dados em: reaproveitável, corrigível, duplicado, obsoleto, inválido, inconciliável

### 3. Auditoria de fluxo
- [x] Documentar fluxo atual de cadastro
- [x] Documentar fluxo atual de orçamento e venda
- [x] Documentar pontos de ruptura entre estoque, orçamento, venda e financeiro

### 4. Auditoria de performance
- [x] Identificar dependência de catálogo bruto nas telas atuais
- [x] Identificar necessidade de busca incremental, paginação e cache
- [x] Validar que o legado ainda não sustenta operação rápida em grande escala

### 5. Entregáveis da auditoria
- [x] ERD atual
- [x] Mapa do legado atual
- [x] Lista de falhas críticas
- [x] Lista de riscos de migração
- [x] Matriz legado x modelo alvo
- [x] Plano de saneamento de dados
- [x] Plano de rollout sem parar a operação
- [x] Validação com dados reais

---

## Fase 2 — Redesenho do núcleo
- [x] Definir modelo alvo de catálogo
- [x] Definir modelo alvo de estoque por movimento
- [x] Definir modelo alvo de orçamento e venda
- [x] Definir governança, permissões e auditoria
- [x] Definir arquitetura modular por serviços
- [x] Definir UX separada para backoffice e operação rápida
- [x] Definir estratégia de busca rápida de produto
- [x] Criar entidades-base do núcleo alvo

## Fase 3 — Saneamento
- [x] Abrir frente visual de saneamento
- [x] Organizar fila de saneamento por prioridade
- [ ] Deduplicar catálogo real
- [ ] Padronizar categorias reais
- [ ] Corrigir unidades reais
- [ ] Corrigir preços reais
- [ ] Separar template e variante nos dados reais
- [ ] Normalizar identificadores operacionais nos dados reais

## Fase 4 — Implementação
- [ ] Implementar núcleo novo de catálogo
- [ ] Implementar núcleo novo de estoque
- [ ] Implementar orçamento novo por item
- [ ] Implementar venda nova com reserva e baixa rastreável
- [ ] Implementar auditoria transversal
- [ ] Implementar relatórios críticos do novo núcleo

## Fase 5 — Migração
- [x] Estruturar frente de migração piloto
- [x] Estruturar reconciliação piloto
- [ ] Extrair legado para carga piloto real
- [ ] Classificar e sanear conjunto piloto final
- [ ] Carregar ambiente piloto
- [ ] Reconciliar saldos, preços e documentos
- [ ] Executar operação paralela curta
- [ ] Fazer corte controlado

## Fase 6 — Homologação
- [ ] Testar operação real
- [ ] Testar concorrência
- [ ] Testar cancelamentos
- [ ] Testar inventário
- [ ] Testar permissões
- [ ] Validar critérios finais de aceite

---

## Critérios de aceite
- [x] Legado integralmente entendido
- [x] Falhas estruturais comprovadas com dados
- [x] Modelo alvo validado documentalmente
- [ ] Busca rápida e contextual implementada
- [ ] Estoque rastreável por movimento implementado
- [ ] Orçamento convertido em venda sem retrabalho
- [ ] Ajustes auditáveis em produção
- [ ] Permissões aplicadas no novo núcleo
- [ ] Migração piloto reconciliada
- [ ] Operação real sem catálogo gigante e sem fricção desnecessária