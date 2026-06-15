import { localSqliteClient } from '@/api/localSqliteClient';

// Cliente unico de dados do ERP.
// Todas as entidades, funcoes locais e uploads passam pela API SQLite em server/local_api.py.
// Se a API local estiver indisponivel, a operacao falha de forma explicita para evitar dados duplicados fora do banco.
export const erp = localSqliteClient;
