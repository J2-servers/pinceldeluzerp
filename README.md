# Pincel de Luz ERP Local

ERP local com frontend React/Vite, API Python e banco SQLite persistido dentro da pasta do projeto.

## Rodar localmente

```bash
npm install
npm run db:sqlite
npm run dev:full
```

URLs locais:

- App: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787/api/local/health`

## Banco e arquivos importantes

- Banco principal: `database/pincel-luz-erp.sqlite`
- Backups: `storage/backups`
- Uploads: `storage/uploads`
- Esquemas das entidades: `erp-schema/entities`
- API local: `server/local_api.py`

O cliente do frontend fica em `src/api/erpClient.js` e fala somente com a API SQLite local.

## Integridade operacional

O Dashboard possui o painel `Integridade do ERP`, que cruza:

- vendas;
- itens de venda;
- orcamentos;
- itens de orcamento;
- ordens de servico;
- transacoes financeiras;
- estoque;
- movimentos de estoque.

Ele detecta inconsistencias e corrige automaticamente apenas casos seguros, como:

- venda em producao sem OS vinculada;
- venda entregue/paga sem entrada financeira.

## Backup e restauracao

Em `Configuracoes > Dados locais` o sistema cria backups reais do SQLite com:

- checksum SHA-256;
- `PRAGMA integrity_check`;
- download do arquivo `.sqlite`;
- restauracao protegida por senha;
- backup automatico antes de restaurar;
- auditoria em `AuditLog`.

Senha administrativa local vem da variavel `PINCEL_LUZ_ADMIN_PASSWORD`.
Em producao, ela deve ser forte e obrigatoriamente diferente do exemplo:

```bash
PINCEL_LUZ_ADMIN_PASSWORD=sua-senha-forte
```

Os downloads de backup sao protegidos por essa senha e nao ficam expostos por URL publica.

## Docker

Build e execucao:

```bash
PINCEL_LUZ_ADMIN_PASSWORD="sua-senha-forte" docker compose up -d --build
```

App:

```bash
http://SEU_IP:8080
```

Volumes persistentes:

```yaml
./database:/app/database
./storage:/app/storage
```

Nunca remova esses volumes sem backup.

Variaveis recomendadas para producao:

```env
PINCEL_LUZ_ADMIN_PASSWORD=sua-senha-forte
PINCEL_LUZ_DB=/app/database/pincel-luz-erp.sqlite
PINCEL_LUZ_ALLOWED_ORIGINS=https://erp.seudominio.com

# Opcional: se usar token, use o mesmo valor no build arg VITE_LOCAL_API_TOKEN.
PINCEL_LUZ_API_TOKEN=
```

## Deploy em VPS sem painel

1. Criar VPS Ubuntu 22.04 ou 24.04.
2. Apontar DNS do dominio para o IP da VPS.
3. Instalar Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

4. Enviar ou clonar o projeto:

```bash
git clone SEU_REPOSITORIO pincel-luz-erp
cd pincel-luz-erp
```

5. Configurar senha:

```bash
cp docker-compose.yml docker-compose.prod.yml
```

Edite `PINCEL_LUZ_ADMIN_PASSWORD`.

6. Subir:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

7. Colocar Nginx ou Caddy na frente com HTTPS, apontando para `http://127.0.0.1:8080`.

## Deploy em EasyPanel

Recomendado: App via Git com Dockerfile.

1. Instale EasyPanel em uma VPS limpa.
2. Crie um projeto.
3. Crie um App.
4. Source: GitHub ou Git custom.
5. Build: Dockerfile existente na raiz.
6. Porta interna: `8080`.
7. Environment:

```env
PINCEL_LUZ_ADMIN_PASSWORD=sua-senha-forte
PINCEL_LUZ_DB=/app/database/pincel-luz-erp.sqlite
PINCEL_LUZ_ALLOWED_ORIGINS=https://erp.seudominio.com
```

8. Volumes persistentes:

```text
/app/database
/app/storage
```

9. Vincule um dominio no EasyPanel e habilite HTTPS.
10. Depois do primeiro deploy, abra `https://erp.seudominio.com` e crie um backup em `Configuracoes > Dados locais`.
11. Teste o fluxo completo: cliente, orcamento, PDF, venda, upload de logo, backup e restauracao.

## Regra de ouro

O sistema deve operar com uma unica fonte de verdade: `database/pincel-luz-erp.sqlite`.
Se a API local cair, o frontend falha de forma explicita e nao grava dados em outro lugar.
