# ERD legado atual — leitura operacional

## Núcleo comercial atual
- `Product`
  - mistura catálogo, precificação, saldo, atributos de material, dados de ativo e parte do comportamento operacional.
- `SalesOrder`
  - representa pedido/venda com campos agregados e vínculo parcial com produto.
- `ProductQuote`
  - representa orçamento técnico/comercial com muitos campos já voltados a cálculo.
- `Quote`
  - existe em paralelo ao `ProductQuote`, indicando sobreposição de responsabilidade.
- `Client`
  - cadastro de cliente com dívida e volume agregado.
- `Supplier`
  - fornecedor desacoplado do catálogo transacional.

## Núcleo de estoque atual
- `Product`
  - guarda saldo (`quantity`) diretamente no cadastro.
- `StockMovement`
  - trilha parcial de movimentação.
- Não existem hoje, como núcleo explícito:
  - depósito (`warehouse`)
  - localização (`stock_location`)
  - reserva (`stock_reservation`)
  - ajuste formal (`stock_adjustment`)
  - contagem (`stock_count_session` / `stock_count_item`)
  - snapshot materializado de saldo

## Núcleo financeiro atual
- `Transaction`
- `AccountPayable`
- `AccountReceivable`
- `FixedExpense`
- `PartnerCapital`

## Núcleo operacional complementar
- `ServiceOrder`
- `CalendarEvent`
- `CompanyAsset`
- `AssetMaintenance`
- `NotaFiscal`
- `FiscalConfig`

## Leitura estrutural
1. `Product` concentra responsabilidade demais.
2. O saldo ainda depende de campo derivado no produto, não de núcleo por movimento.
3. Orçamento e venda existem, mas ainda sem padronização por linha transacional forte.
4. Existe sobreposição entre `Quote` e `ProductQuote`.
5. O legado já possui matéria-prima suficiente para migrar, mas precisa separação de domínio.

## Relações observadas
- `SalesOrder.client_id -> Client.id`
- `SalesOrder.product_id -> Product.id`
- `SalesOrder.transaction_id -> Transaction.id` (parcial)
- `ServiceOrder.sales_order_id -> SalesOrder.id`
- `StockMovement.product_id -> Product.id`
- `Product.linked_asset_id -> CompanyAsset.id`
- `AccountReceivable.order_id -> SalesOrder.id`
- `AccountReceivable.client_id -> Client.id`

## Lacunas frente ao PRD
- ausência de template/variante
- ausência de múltiplos depósitos/localizações
- ausência de reserva nativa
- ausência de contagem física formal
- ausência de trilha unificada de auditoria
- ausência de regras de preço por lista/regra como núcleo separado