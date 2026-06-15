# Plano de saneamento de dados

## 1. Catálogo
- consolidar SKUs duplicados
- consolidar nomes semanticamente equivalentes
- preencher categoria obrigatória
- preencher preço principal obrigatório para item vendável
- separar itens inativos/obsoletos
- identificar itens que devem virar template e variante

## 2. Estoque
- separar saldo confiável de saldo sem trilha
- revisar produtos com saldo negativo
- revisar produtos com saldo positivo sem movimento suficiente
- classificar ajustes necessários antes da migração piloto

## 3. Comercial
- revisar pedidos sem vínculo consistente com item
- revisar pedidos sem forma de pagamento
- revisar orçamentos sem cliente
- revisar orçamentos sem preço final confiável

## 4. Financeiro
- revisar movimentações sem categoria
- revisar movimentações sem método de pagamento
- preparar reconciliação com pedidos e recebimentos

## 5. Classificação operacional
- reaproveitável
- corrigível
- duplicado
- obsoleto
- inválido
- inconciliável

## 6. Regra de execução
1. limpar catálogo
2. reconciliar estoque
3. limpar comercial
4. ajustar financeiro
5. rodar carga piloto
6. comparar com base legado