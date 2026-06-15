# Validação com dados reais do legado

## Amostra validada
- `Product`: 4 registros
- `StockMovement`: 0 registros
- `SalesOrder`: 0 registros
- `ProductQuote`: 4 registros
- `Quote`: 0 registros
- `Transaction`: 0 registros
- `Client`: 0 registros

## Leitura objetiva
1. O legado disponível hoje está concentrado em **catálogo simples** e **orçamento técnico**.
2. O domínio transacional exigido pelo PRD ainda está **fraco ou ausente** em pontos críticos:
   - não há trilha real de movimentação de estoque
   - não há pedidos de venda suficientes para validar conversão completa
   - não há base financeira suficiente para validar acoplamento operacional
   - não há clientes estruturados o bastante para suportar preço por contexto
3. Isso confirma que a ordem do PRD está correta: **não faz sentido expandir interface de operação antes de consolidar o núcleo transacional**.

## Achados críticos provados com dados reais
- saldo atual não pode ser tratado como verdade, porque não existe histórico de movimento correspondente
- orçamento existe, mas ainda sem cliente consistente em parte dos registros
- venda real ainda não oferece base suficiente para validar reserva, baixa e retorno
- financeiro legado ainda não sustenta reconciliação operacional séria

## Conclusão prática
O núcleo alvo foi modelado no momento certo: ele não está substituindo uma operação madura, e sim corrigindo um legado que ainda não possui separação de domínio suficiente.