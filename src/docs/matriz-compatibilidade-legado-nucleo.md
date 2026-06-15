# Matriz de compatibilidade — legado x núcleo alvo

| Domínio | Legado atual | Núcleo alvo | Compatibilidade | Ação |
|---|---|---|---|---|
| Catálogo | `Product` | `ProductMaster`, `ProductVariant`, `ProductCategory`, `ProductUnit` | Parcial | separar produto pai, variante, categoria e unidade |
| Estoque | `Product.quantity`, `StockMovement` vazio | `Warehouse`, `StockLocation`, `StockMovementItem`, `StockBalanceSnapshot`, `StockReservation` | Baixa | migrar para saldo por movimento e criar estrutura física |
| Orçamento | `ProductQuote` | `Quotation`, `QuotationItem` | Parcial | quebrar cabeçalho/item e ligar cliente, preço e estoque |
| Venda | `SalesOrder` vazio | `SalesOrder`, `SalesOrderItem`, `SaleReturn` | Muito baixa | estruturar processo real de pedido, baixa e devolução |
| Financeiro | `Transaction` vazio | integração por referência documental | Muito baixa | validar acoplamento só depois de base operacional mínima |
| Governança | sem núcleo consolidado | `Role`, `PermissionRule`, `AuditLog` | Baixa | centralizar permissões e trilha |

## Decisão
- reutilizar parcialmente catálogo
- reconstruir estoque e governança
- reestruturar orçamento
- implantar venda nova em cima do núcleo alvo