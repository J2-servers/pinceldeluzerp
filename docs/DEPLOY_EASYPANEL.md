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

O container roda frontend, Nginx e API SQLite no mesmo servico.

Importante: nao use `8787` como porta do servico no EasyPanel. A porta `8787` e somente da API Python interna, acessada pelo Nginx dentro do container. O EasyPanel deve apontar para `8080`.

## 3. Variaveis de ambiente

Configure no servico:

```env
PINCEL_LUZ_ADMIN_PASSWORD=troque-por-uma-senha-forte
PINCEL_LUZ_DB=/app/database/pincel-luz-erp.sqlite
PINCEL_LUZ_ALLOWED_ORIGINS=https://erp.seudominio.com
```

Opcional, somente se tambem configurar o mesmo token como build arg do Vite:

```env
PINCEL_LUZ_API_TOKEN=
```

Para o primeiro deploy, deixe `PINCEL_LUZ_API_TOKEN` vazio. A senha administrativa ja protege backups e restauracoes.

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

Na exportacao JSON do EasyPanel, o dominio precisa ficar com `"port": 8080`. Se aparecer `"port": 80`, o proxy vai tentar acessar a porta errada e o container pode ser encerrado mesmo com API e Nginx iniciando corretamente.

Ative HTTPS no proprio EasyPanel.

Se o container reiniciar com log `Sinal de encerramento recebido`, revise a porta interna do servico. Ela deve ser `8080`.

Depois atualize a variavel:

```env
PINCEL_LUZ_ALLOWED_ORIGINS=https://erp.seudominio.com
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
