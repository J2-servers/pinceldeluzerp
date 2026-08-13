// Helpers puros (sem React) para montar a arvore de categorias de produto.
//
// Uma ProductCategory tem o formato { id, name, code, parent_category_id, active, sort_order }.
// O restante do app grava `product.category` como STRING (o nome da categoria), entao estes
// helpers cuidam apenas de ORDENAR e INDENTAR a lista para exibicao; o value dos selects
// continua sendo o nome. Ids sao sempre comparados via String(...) para tolerar id numerico ou texto.

const numericOrder = (cat) => {
  const raw = cat && cat.sort_order;
  const num = Number(raw);
  return raw !== undefined && raw !== null && raw !== '' && Number.isFinite(num) ? num : null;
};

const compareCategories = (a, b) => {
  const orderA = numericOrder(a);
  const orderB = numericOrder(b);
  if (orderA !== null && orderB !== null && orderA !== orderB) return orderA - orderB;
  if (orderA !== null && orderB === null) return -1;
  if (orderA === null && orderB !== null) return 1;
  return String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'pt-BR', { sensitivity: 'base' });
};

const idKey = (cat) => (cat && cat.id !== undefined && cat.id !== null ? String(cat.id) : null);

const parentKey = (cat) => (cat && cat.parent_category_id !== undefined && cat.parent_category_id !== null
  ? String(cat.parent_category_id)
  : null);

// Evita ciclos: um filho nunca pode ser ligado a um pai que ja o tenha como ancestral.
const wouldCreateCycle = (childId, parentId, byId) => {
  let current = parentId;
  const seen = new Set();
  while (current) {
    if (current === childId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    const parent = byId.get(current);
    current = parentKey(parent);
  }
  return false;
};

/**
 * Monta a arvore de categorias.
 * @param {Array} categories lista plana de ProductCategory.
 * @returns {Array} raizes no formato { category, children: [...] }, ordenadas pai->filhos.
 */
export function buildCategoryTree(categories = []) {
  const list = (Array.isArray(categories) ? categories : []).filter(Boolean);
  const byId = new Map();
  list.forEach((cat) => {
    const key = idKey(cat);
    if (key && !byId.has(key)) byId.set(key, cat);
  });

  const nodes = new Map();
  const nodeFor = (cat) => {
    const key = idKey(cat) || `name:${cat.name}`;
    if (!nodes.has(key)) nodes.set(key, { category: cat, children: [] });
    return nodes.get(key);
  };

  const roots = [];
  list.forEach((cat) => {
    const node = nodeFor(cat);
    const childId = idKey(cat);
    const pid = parentKey(cat);
    if (pid && childId && pid !== childId && byId.has(pid) && !wouldCreateCycle(childId, pid, byId)) {
      nodeFor(byId.get(pid)).children.push(node);
    } else {
      // Categoria raiz (ou orfa, com pai inexistente na lista carregada).
      roots.push(node);
    }
  });

  const sortNodes = (arr) => {
    arr.sort((a, b) => compareCategories(a.category, b.category));
    arr.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

/**
 * Achata a arvore em uma lista ordenada para uso em <Select>.
 * @param {Array} categories lista plana de ProductCategory.
 * @returns {Array<{category: object, depth: number}>} pai (depth 0) seguido dos filhos indentados.
 */
export function flattenTreeForSelect(categories = []) {
  const roots = buildCategoryTree(categories);
  const out = [];
  const walk = (node, depth) => {
    out.push({ category: node.category, depth });
    node.children.forEach((child) => walk(child, depth + 1));
  };
  roots.forEach((node) => walk(node, 0));
  return out;
}

/**
 * Rotulo indentado para exibir hierarquia dentro de um SelectItem (usa espacos rigidos + seta).
 * @param {string} name nome da categoria.
 * @param {number} depth profundidade na arvore (0 = raiz).
 */
export function indentedLabel(name, depth = 0) {
  const label = String(name === undefined || name === null ? '' : name);
  if (!depth || depth < 0) return label;
  return `${'  '.repeat(depth)}↳ ${label}`;
}

/**
 * Combina duas listas de categorias dando prioridade a `extra` (mesmo id => versao de extra vence).
 * Itens de `extra` com id novo sao anexados ao final. Serve para refletir criacoes/edicoes locais
 * antes do refetch do React Query do componente pai.
 */
export function mergeCategories(base = [], extra = []) {
  const overrides = new Map();
  (Array.isArray(extra) ? extra : []).forEach((cat) => {
    const key = idKey(cat);
    if (key) overrides.set(key, cat);
  });
  const seen = new Set();
  const result = [];
  (Array.isArray(base) ? base : []).forEach((cat) => {
    if (!cat) return;
    const key = idKey(cat);
    if (key) {
      if (seen.has(key)) return;
      seen.add(key);
      result.push(overrides.has(key) ? overrides.get(key) : cat);
    } else {
      result.push(cat);
    }
  });
  (Array.isArray(extra) ? extra : []).forEach((cat) => {
    const key = idKey(cat);
    if (!key) {
      if (cat) result.push(cat);
      return;
    }
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cat);
    }
  });
  return result;
}

/**
 * Ids de todos os descendentes de uma categoria (para impedir reparent em ciclo).
 * @returns {Set<string>} conjunto de ids (string) dos descendentes; nao inclui a propria categoria.
 */
export function getDescendantIds(categories = [], id) {
  const roots = buildCategoryTree(categories);
  const target = String(id);
  const result = new Set();
  const findNode = (arr) => {
    for (const node of arr) {
      if (String(node.category.id) === target) return node;
      const found = findNode(node.children);
      if (found) return found;
    }
    return null;
  };
  const node = findNode(roots);
  if (!node) return result;
  const walk = (n) => n.children.forEach((child) => {
    const key = idKey(child.category);
    if (key) result.add(key);
    walk(child);
  });
  walk(node);
  return result;
}
