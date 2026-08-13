import { parseDecimal, roundCurrency } from '@/lib/numberFormat';

/**
 * Ficha técnica (BOM) de um produto fabricado: materiais consumidos +
 * operações executadas, por 1 unidade do produto. Rola o custo real de
 * fabricação (matéria-prima + máquina + mão-de-obra) e sabe explodir os
 * materiais para dar baixa de estoque na venda/produção.
 */

export const componentCost = (product) =>
  parseDecimal(product?.cost_price ?? product?.custo ?? product?.cost ?? 0);

/** Custo de uma linha de material por 1 unidade do produto fabricado. */
export function materialLineCost(line, componentProduct) {
  const qty = parseDecimal(line.quantity) || 0;
  const waste = parseDecimal(line.waste_pct) || 0;
  const unit = componentProduct ? componentCost(componentProduct) : parseDecimal(line.unit_cost);
  return roundCurrency(unit * qty * (1 + waste / 100));
}

/** Custo de uma linha de operação (máquina + mão-de-obra) por unidade. */
export function operationLineCost(line) {
  const machine = (parseDecimal(line.machine_minutes) || 0) * (parseDecimal(line.machine_cost_per_min) || 0);
  const labor = ((parseDecimal(line.labor_minutes) || 0) / 60) * (parseDecimal(line.labor_cost_per_hour) || 0);
  return roundCurrency(machine + labor);
}

const findProduct = (products, id) => (products || []).find((p) => p.id === id) || null;

/** Custo de uma linha qualquer (dispatch por tipo). */
export function bomLineCost(line, products = []) {
  if (line.line_type === 'operation') return operationLineCost(line);
  return materialLineCost(line, findProduct(products, line.component_product_id));
}

/**
 * Resume a ficha técnica: custo de material, de operação e total por unidade.
 */
export function summarizeBom(lines = [], products = []) {
  let materialCost = 0;
  let operationCost = 0;
  (lines || []).forEach((line) => {
    if (line.line_type === 'operation') operationCost += operationLineCost(line);
    else materialCost += materialLineCost(line, findProduct(products, line.component_product_id));
  });
  materialCost = roundCurrency(materialCost);
  operationCost = roundCurrency(operationCost);
  return {
    materialCost,
    operationCost,
    totalCost: roundCurrency(materialCost + operationCost),
    materialLines: (lines || []).filter((l) => l.line_type !== 'operation').length,
    operationLines: (lines || []).filter((l) => l.line_type === 'operation').length,
  };
}

/**
 * Explode os materiais da ficha para dar baixa de estoque ao fabricar/vender
 * `producedQty` unidades. Retorna Map(component_product_id -> quantidade
 * consumida, já com perda). Ignora operações (não têm estoque).
 */
export function bomMaterialDeltas(lines = [], producedQty = 1) {
  const deltas = new Map();
  const qty = parseDecimal(producedQty) || 0;
  (lines || []).forEach((line) => {
    if (line.line_type === 'operation') return;
    const id = line.component_product_id;
    if (!id) return;
    const waste = parseDecimal(line.waste_pct) || 0;
    const consumed = (parseDecimal(line.quantity) || 0) * (1 + waste / 100) * qty;
    if (consumed > 0) deltas.set(id, roundCurrency((deltas.get(id) || 0) + consumed));
  });
  return deltas;
}

/**
 * Monta o payload de persistência de uma linha, com snapshot de custo unitário
 * do material e o custo rolado da linha.
 */
export function bomLinePayload(productId, line, products = []) {
  const isOperation = line.line_type === 'operation';
  const component = isOperation ? null : findProduct(products, line.component_product_id);
  const unitCost = component ? componentCost(component) : parseDecimal(line.unit_cost);
  return {
    product_id: productId,
    line_type: isOperation ? 'operation' : 'material',
    component_product_id: isOperation ? '' : (line.component_product_id || ''),
    component_name: isOperation ? (line.operation_name || line.component_name || 'Operação') : (component?.name || line.component_name || ''),
    quantity: parseDecimal(line.quantity) || (isOperation ? 1 : 0),
    unit: line.unit || (component?.unit || 'un'),
    waste_pct: parseDecimal(line.waste_pct) || 0,
    operation_name: isOperation ? (line.operation_name || '') : '',
    machine_minutes: isOperation ? (parseDecimal(line.machine_minutes) || 0) : 0,
    machine_cost_per_min: isOperation ? (parseDecimal(line.machine_cost_per_min) || 0) : 0,
    labor_minutes: isOperation ? (parseDecimal(line.labor_minutes) || 0) : 0,
    labor_cost_per_hour: isOperation ? (parseDecimal(line.labor_cost_per_hour) || 0) : 0,
    unit_cost: roundCurrency(unitCost),
    line_cost: bomLineCost(line, products),
    notes: line.notes || '',
    sort_order: Number(line.sort_order || 0),
  };
}
