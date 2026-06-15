# Backlog de implementação por fases

## Fase 2 — redesenho concluído
- modelo alvo documentado
- arquitetura modular definida
- contratos de serviço definidos
- UX alvo definida
- estratégia de busca definida

## Fase 3 — saneamento
1. deduplicar catálogo atual
2. padronizar categoria e unidade
3. preencher SKU interno
4. classificar item por tipo
5. separar registros obsoletos/inválidos
6. travar itens sem reconciliação de estoque

## Fase 4 — implementação do núcleo
1. catálogo novo (`ProductMaster`, `ProductVariant`, atributos e preços)
2. estoque novo (`Warehouse`, `Location`, `MovementItem`, `Reservation`, `Snapshot`)
3. orçamento novo (`Quotation`, `QuotationItem`)
4. venda nova (`SalesOrderItem`, reserva, baixa, retorno)
5. auditoria (`AuditLog`, `PermissionRule`)
6. relatórios críticos

## Fase 5 — migração piloto
1. migrar categorias, unidades e catálogo base
2. migrar subconjunto de clientes
3. migrar subset de orçamentos
4. reconciliar estoques confiáveis
5. validar conversão orçamento→pedido

## Fase 6 — homologação
1. teste de busca rápida
2. teste de reserva e baixa
3. teste de cancelamento com trilha
4. teste de inventário e ajuste
5. teste de permissão e aprovação