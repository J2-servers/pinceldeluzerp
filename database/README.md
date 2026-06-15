# Banco SQLite local

Este diretorio contem a reconstrucao local do backup Base44 em SQLite.

Arquivos gerados:

- `pincel-luz-erp.sqlite`: banco SQLite pronto para uso.
- `schema.sql`: DDL completo gerado a partir de `base44/entities/*.jsonc` e campos encontrados em `dados-json`.
- `sqlite-manifest.json`: contagem de tabelas, registros importados e origem de cada tabela.

Fonte usada:

- Schemas originais: `base44/entities/*.jsonc`
- Dados exportados: `dados-json/*.data.json`
- Manifesto do backup: `manifesto-backup.json`

Para recriar tudo novamente:

```bash
npm run db:sqlite
```

Para usar outro caminho de saida:

```bash
python scripts/create-sqlite-db.py --output database/outro-banco.sqlite
```

Observacoes:

- Campos `object` e `array` sao preservados como JSON em colunas `TEXT`.
- Campos booleanos sao salvos como `0` ou `1`.
- Cada tabela recebe `id` como chave primaria quando o campo existe.
- Tabelas `_meta_tables` e `_schema_columns` guardam metadados da geracao.
