# Deploy no EasyPanel

Este projeto sobe no EasyPanel como um App Service usando o `Dockerfile` da raiz.

## 1. Pre-requisitos

- VPS limpa com EasyPanel instalado.
- Dominio apontado para o IP da VPS.
- Repositorio GitHub: `https://github.com/J2-servers/pinceldeluzerp.git`

## 2. Criar App

No EasyPanel:

1. Crie um projeto: `pincel-luz-erp`.
2. Adicione um servico do tipo `App`.
3. Source: `GitHub Repository`.
4. Repository: `J2-servers/pinceldeluzerp`.
5. Branch: `main`.
6. Build: usar `Dockerfile` da raiz.
7. Internal Port: `8080`.

O container roda frontend, Nginx e API SQLite no mesmo servico. O Nginx escuta nas portas internas `80` e `8080` para tolerar diferentes padroes do EasyPanel.

Importante: nao use `8787` como porta do servico no EasyPanel. A porta `8787` e somente da API Python interna, acessada pelo Nginx dentro do container. O EasyPanel pode apontar para `8080` ou `80`; recomendamos `8080`, mas o container aceita as duas.

## 3. Variaveis de ambiente

Configure no servico:

```env
PINCEL_LUZ_ADMIN_PASSWORD=troque-por-uma-senha-forte
PINCEL_LUZ_DB=/app/database/pincel-luz-erp.sqlite
PINCEL_LUZ_ALLOWED_ORIGINS=https://erp.seudominio.com
```

`PINCEL_LUZ_ADMIN_PASSWORD` **precisa** ser trocada antes do deploy — ela protege backup/restauracao e limpeza de historico do WhatsApp. Se a variavel nao for definida, o container sobe com a senha padrao insegura (e avisa isso no log).

O acesso ao sistema em si (login, CRUD de clientes/vendas/financeiro etc.) e protegido por sessao: o primeiro acesso cria o administrador (tela de bootstrap), e toda chamada a API exige login valido. Isso e automatico, nao precisa de configuracao.

Opcional, camada adicional (defesa em profundidade) se quiser um segredo compartilhado entre o Nginx/API e o frontend, alem da sessao:

```env
PINCEL_LUZ_API_TOKEN=um-segredo-qualquer
```

Se definir `PINCEL_LUZ_API_TOKEN`, tambem defina o mesmo valor no build arg `VITE_LOCAL_API_TOKEN` (ver `docker-compose.yml`) — caso contrario o frontend nao vai conseguir falar com a API. Lembre-se de que esse token fica embutido no JavaScript enviado ao navegador (nao e um segredo real do ponto de vista do usuario logado); ele so serve para bloquear clientes que nao sao o proprio frontend do sistema.

## 4. Volumes persistentes

Crie mounts persistentes antes do primeiro deploy:

```text
/app/database
/app/storage
```

Sem esses volumes, banco SQLite, uploads e backups podem ser perdidos em rebuilds.

## 5. Dominio

No EasyPanel, vincule:

```text
erp.seudominio.com -> porta interna 8080
```

Na exportacao JSON do EasyPanel, recomendamos `"port": 8080`. O container tambem escuta `"port": 80` como fallback.

Ative HTTPS no proprio EasyPanel.

Se o container reiniciar com log `Sinal de encerramento recebido`, revise a porta interna do servico. Use `8080`; se o EasyPanel insistir no padrao, `80` tambem funciona a partir desta versao.

Depois atualize a variavel:

```env
PINCEL_LUZ_ALLOWED_ORIGINS=https://erp.seudominio.com
```

## 5.1. Corrigir JSON exportado automaticamente

Se voce exportar a configuracao do EasyPanel para um arquivo JSON, rode:

```bash
npm run easypanel:fix -- easypanel.json --domain pincel-luz-erp-pincel-luz-erp.rea8zf.easypanel.host --out easypanel.fixed.json
```

O script ajusta automaticamente:

- `domains[].port` para `8080`;
- `PINCEL_LUZ_ALLOWED_ORIGINS` para o dominio correto, sem barra final;
- `PINCEL_LUZ_DB` para `/app/database/pincel-luz-erp.sqlite`;
- build Dockerfile, branch `main` e `source.path` `/`;
- preenche `PINCEL_LUZ_ADMIN_PASSWORD` com um placeholder se estiver vazia (troque antes de implantar).

Ele **preserva** `PINCEL_LUZ_API_TOKEN`/`VITE_LOCAL_API_TOKEN` se voce ja tiver configurado — o script nao apaga esses valores.

Depois importe/copiar a configuracao corrigida e confira os volumes no painel:

```text
/app/database
/app/storage
```

## 6. Primeiro acesso

Depois do deploy:

1. Abra `https://erp.seudominio.com`.
2. Cadastre ou acesse o usuario administrador.
3. Va em `Configuracoes > Dados locais`.
4. Crie um backup manual.
5. Va em `Configuracoes > Personalizacao` e configure logos/favicon.

## 7. Checklist de validacao

- Dashboard abre sem erro.
- Clientes carregam e salvam.
- Orcamento salva.
- PDF de orcamento gera.
- Venda salva.
- PDF de venda gera.
- Upload de logo funciona.
- Backup cria com integridade OK.
- Download de backup pede senha administrativa.
- Ao reiniciar o container, os dados continuam no sistema.

## 8. Restaurar banco atual da maquina local

Para levar o banco real atual para a VPS:

1. No sistema local, crie um backup em `Configuracoes > Dados locais`.
2. Baixe o `.sqlite`.
3. No EasyPanel, use o volume `/app/database` para enviar/substituir o arquivo:

```text
/app/database/pincel-luz-erp.sqlite
```

4. Reinicie o app.
5. Abra o sistema e rode o painel de integridade.

Nunca envie o banco real pelo GitHub.
