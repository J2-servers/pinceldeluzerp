# Arquitetura modular ERP

## Serviços lógicos
- `Catalog Service`
  - cadastro estrutural de produto, variante, categoria, unidade, código de barras, kit e substitutos
- `Inventory Service`
  - depósitos, localizações, movimentos, reservas, ajustes, contagens e snapshots
- `Pricing Service`
  - listas de preço, regras por cliente/canal/volume e políticas comerciais
- `Quotation Service`
  - criação, versionamento leve, itens, validade e conversão para venda
- `Sales Service`
  - pedido, itens, reserva/baixa, retorno e integração com financeiro
- `Audit Service`
  - logs operacionais, aprovação, rastreio de falhas e observabilidade
- `Reporting Service`
  - relatórios críticos, consolidações e materializações quando necessário

## Regra de composição
- monólito modular com separação clara por domínio
- UI de retaguarda separada da UI de venda rápida
- nada de lógica comercial espalhada no front
- integrações e reconciliação fora do fluxo visual principal