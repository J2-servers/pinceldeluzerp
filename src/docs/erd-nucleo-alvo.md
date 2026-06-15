# ERD alvo — núcleo ERP

## Catálogo
- `ProductCategory`
- `ProductUnit`
- `ProductAttribute`
- `ProductAttributeValue`
- `ProductMaster`
- `ProductVariant`
- `ProductBarcode`
- `ProductAlternative`
- `ProductBundle`
- `ProductPriceList`
- `ProductPriceRule`

## Estoque
- `Warehouse`
- `StockLocation`
- `StockBalanceSnapshot`
- `StockMovementItem`
- `StockReservation`
- `StockAdjustment`
- `StockCountSession`
- `StockCountItem`
- `LotBatch`
- `SerialNumber`

## Comercial
- `Customer`
- `Quotation`
- `QuotationItem`
- `SalesOrder`
- `SalesOrderItem`
- `SaleReturn`
- `SaleReturnItem`

## Governança
- `Role`
- `PermissionRule`
- `AuditLog`
- `Attachment`
- `IntegrationEvent`
- `IntegrationFailureLog`

## Princípios
1. saldo nasce de movimento
2. produto pai separado de variante vendável
3. preço separado por lista e regra
4. orçamento e venda separados por cabeçalho e item
5. auditoria transversal sobre estoque, preço, desconto e cancelamento