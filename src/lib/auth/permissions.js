/**
 * permissions.js — RBAC do ERP.
 *
 * Permissões no formato `modulo:acao`. Cada perfil (role) tem um conjunto.
 * `*` é coringa: `admin` tem `*` (tudo); `vendas:*` libera todas as ações de vendas.
 *
 * Use `can(user, 'vendas:create')` na lógica e o componente <Can perm="..."> na UI.
 */

// ── Catálogo de módulos e ações (fonte da verdade para a tela de perfis) ──
export const MODULES = {
  dashboard:   { label: 'Dashboard',        actions: ['read'] },
  orcamentos:  { label: 'Orçamentos',       actions: ['read', 'create', 'edit', 'delete', 'approve', 'convert'] },
  vendas:      { label: 'Vendas',           actions: ['read', 'create', 'edit', 'delete', 'discount', 'cancel'] },
  clientes:    { label: 'Clientes',         actions: ['read', 'create', 'edit', 'delete'] },
  producao:    { label: 'Produção',         actions: ['read', 'edit', 'advance'] },
  ordens:      { label: 'Ordens de Serviço', actions: ['read', 'create', 'edit', 'delete'] },
  estoque:     { label: 'Estoque',          actions: ['read', 'movement', 'adjust', 'count', 'transfer'] },
  compras:     { label: 'Compras',          actions: ['read', 'create', 'edit', 'receive', 'approve'] },
  financeiro:  { label: 'Financeiro',       actions: ['read', 'create', 'edit', 'delete', 'reconcile', 'close'] },
  fiscal:      { label: 'Notas Fiscais',    actions: ['read', 'emit', 'cancel'] },
  relatorios:  { label: 'Relatórios',       actions: ['read', 'export'] },
  precificacao:{ label: 'Precificação',     actions: ['read', 'edit'] },
  patrimonio:  { label: 'Patrimônio',       actions: ['read', 'edit'] },
  metas:       { label: 'Metas',            actions: ['read', 'edit'] },
  whatsapp:    { label: 'WhatsApp',         actions: ['read', 'send', 'config'] },
  usuarios:    { label: 'Usuários',         actions: ['read', 'create', 'edit', 'delete'] },
  config:      { label: 'Configurações',    actions: ['read', 'edit'] },
  auditoria:   { label: 'Auditoria',        actions: ['read'] },
};

// ── Perfis pré-definidos ──
export const ROLES = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema, incluindo usuários e configurações.',
    color: 'var(--red)',
    permissions: ['*'],
  },
  gestor: {
    label: 'Gestor',
    description: 'Gerencia operação, comercial e financeiro. Sem gestão de usuários.',
    color: 'var(--purple)',
    permissions: [
      'dashboard:*', 'orcamentos:*', 'vendas:*', 'clientes:*', 'producao:*',
      'ordens:*', 'estoque:*', 'compras:*', 'financeiro:*', 'fiscal:*',
      'relatorios:*', 'precificacao:*', 'patrimonio:*', 'metas:*', 'whatsapp:*',
      'auditoria:read', 'config:read',
    ],
  },
  comercial: {
    label: 'Comercial',
    description: 'Vendas, orçamentos e clientes. Sem acesso ao financeiro.',
    color: 'var(--accent)',
    permissions: [
      'dashboard:read', 'orcamentos:*', 'vendas:read', 'vendas:create', 'vendas:edit',
      'clientes:*', 'precificacao:read', 'relatorios:read', 'whatsapp:read', 'whatsapp:send',
      'metas:read',
    ],
  },
  financeiro: {
    label: 'Financeiro',
    description: 'Contas, fluxo de caixa, conciliação e notas fiscais.',
    color: 'var(--green)',
    permissions: [
      'dashboard:read', 'financeiro:*', 'fiscal:*', 'compras:read', 'compras:receive',
      'clientes:read', 'vendas:read', 'relatorios:*', 'patrimonio:*', 'auditoria:read',
    ],
  },
  operacao: {
    label: 'Operação',
    description: 'Produção, ordens de serviço e estoque.',
    color: 'var(--orange)',
    permissions: [
      'dashboard:read', 'producao:*', 'ordens:*', 'estoque:*', 'compras:read',
      'compras:create', 'compras:receive', 'clientes:read', 'vendas:read',
    ],
  },
  leitura: {
    label: 'Somente leitura',
    description: 'Visualiza tudo, não altera nada. Ideal para auditoria externa ou consulta.',
    color: 'var(--text-tertiary)',
    permissions: [
      'dashboard:read', 'orcamentos:read', 'vendas:read', 'clientes:read', 'producao:read',
      'ordens:read', 'estoque:read', 'compras:read', 'financeiro:read', 'fiscal:read',
      'relatorios:read', 'precificacao:read', 'patrimonio:read', 'metas:read', 'auditoria:read',
    ],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);

/** Expande coringas de um conjunto de permissões para um Set rápido de checagem. */
function buildPermSet(permissions = []) {
  return new Set(permissions);
}

/** Resolve as permissões efetivas de um usuário (role + overrides individuais). */
export function resolvePermissions(user) {
  if (!user) return new Set();
  const role = ROLES[user.role];
  const base = role ? [...role.permissions] : [];
  const extra = Array.isArray(user.extra_permissions) ? user.extra_permissions : [];
  const denied = new Set(Array.isArray(user.denied_permissions) ? user.denied_permissions : []);
  const set = buildPermSet([...base, ...extra]);
  denied.forEach((d) => set.delete(d));
  return set;
}

/** Verifica se o usuário pode executar `modulo:acao`. */
export function can(user, permission) {
  if (!user || !permission) return false;
  if (user.role === 'admin') return true; // atalho
  const set = resolvePermissions(user);
  if (set.has('*')) return true;
  const [mod, action] = permission.split(':');
  return set.has(permission) || set.has(`${mod}:*`) || set.has(`${mod}:manage`);
}

/** Verifica se pode acessar (ler) um módulo inteiro. */
export function canAccessModule(user, moduleKey) {
  return can(user, `${moduleKey}:read`);
}

/** Mapa página → permissão de leitura exigida (para o guard de rota). */
export const PAGE_PERMISSION = {
  Dashboard: 'dashboard:read',
  Orcamentos: 'orcamentos:read',
  Vendas: 'vendas:read',
  Clientes: 'clientes:read',
  Producao: 'producao:read',
  OrdensServico: 'ordens:read',
  Estoque: 'estoque:read',
  Compras: 'compras:read',
  Fornecedores: 'compras:read',
  Financeiro: 'financeiro:read',
  Relatorios: 'relatorios:read',
  Precificacao: 'precificacao:read',
  Patrimonio: 'patrimonio:read',
  Metas: 'metas:read',
  WhatsApp: 'whatsapp:read',
  NotasFiscais: 'fiscal:read',
  Usuarios: 'usuarios:read',
  Configuracoes: 'config:read',
  Auditoria: 'auditoria:read',
  LogAtividades: 'auditoria:read',
};
