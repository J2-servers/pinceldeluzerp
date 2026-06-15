# Plano de migração e rollout

## Etapa 1 — extração
- congelar fotografia do legado
- exportar dados por domínio
- manter backup integral

## Etapa 2 — profiling e classificação
- medir volume por entidade
- marcar registros por classe de saneamento
- separar fila de decisão manual

## Etapa 3 — carga piloto
- migrar subconjunto de produtos
- migrar subconjunto de clientes
- migrar subconjunto de pedidos e orçamentos
- validar reconciliação de estoque e preços

## Etapa 4 — operação paralela curta
- comparar consulta de catálogo
- comparar pedido, orçamento e saldo
- validar divergências

## Etapa 5 — corte controlado
- travar escrita no legado no momento do corte
- rodar reconciliação final
- publicar núcleo novo
- monitorar erros e divergências críticas

## Critérios de corte
- duplicidade crítica tratada
- saldos reconciliados
- pedidos e orçamentos com vínculo consistente
- financeiro mínimo compatível com operação