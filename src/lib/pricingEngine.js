import { formatCurrency, parseDecimal, roundCurrency } from '@/lib/numberFormat';

export const DEFAULT_PRICING_SETTINGS = {
  target_margin_pct: 35,
  minimum_margin_pct: 20,
  tax_pct: 6,
  card_fee_pct: 0,
  commission_pct: 0,
  material_waste_pct: 12,
  monthly_productive_machine_minutes: 7200,
  monthly_productive_labor_hours: 176,
};

export const DEFAULT_LABOR_PROFILE = {
  id: 'labor-default',
  name: 'Operacao padrao',
  role: 'operador',
  internal_hour_cost: 25,
  sale_hour_price: 55,
  active: true,
};

export const DEFAULT_MACHINE_PROFILE = {
  id: 'machine-default',
  name: 'Laser / bancada padrao',
  machine_type: 'laser',
  internal_minute_cost: 0.65,
  sale_minute_price: 1.5,
  setup_fee: 0,
  active: true,
};

export const DEFAULT_SERVICE_PROFILES = [
  {
    id: 'service-cut-simple',
    name: 'Corte simples',
    service_type: 'corte',
    default_machine_minutes: 10,
    default_labor_minutes: 5,
    setup_fee: 5,
    sale_price: 0,
    active: true,
  },
  {
    id: 'service-engraving-medium',
    name: 'Gravacao media',
    service_type: 'gravacao',
    default_machine_minutes: 15,
    default_labor_minutes: 5,
    setup_fee: 8,
    sale_price: 0,
    active: true,
  },
  {
    id: 'service-art-logo',
    name: 'Criacao ou ajuste de logo',
    service_type: 'arte',
    default_machine_minutes: 0,
    default_labor_minutes: 45,
    setup_fee: 0,
    sale_price: 80,
    active: true,
  },
];

export function money(value) {
  return formatCurrency(value);
}

export function calcAreaM2(width, height) {
  const w = parseDecimal(width);
  const h = parseDecimal(height);
  if (!w || !h) return 0;
  return (w * h) / 1000000;
}

function normalizeSheetDimension(value) {
  const dimension = parseDecimal(value);
  return dimension > 0 && dimension < 100 ? dimension * 10 : dimension;
}

export function calcSheetAreaM2(width, height) {
  return calcAreaM2(normalizeSheetDimension(width), normalizeSheetDimension(height));
}

function firstPositive(...values) {
  for (const value of values) {
    const parsed = parseDecimal(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function activeRows(rows = []) {
  return rows.filter((row) => row && row.active !== false);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function sameText(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  return !!left && !!right && left === right;
}

export function buildPricingContext(config = {}) {
  const settings = {
    ...DEFAULT_PRICING_SETTINGS,
    ...(config.settings || {}),
  };

  const fixedExpenses = activeRows(config.fixedExpenses);
  const monthlyFixedCost = fixedExpenses.reduce((sum, item) => sum + parseDecimal(item.amount || item.monthly_amount || item.value), 0);

  const laborProfiles = activeRows(config.laborProfiles).length ? activeRows(config.laborProfiles) : [DEFAULT_LABOR_PROFILE];
  const machineProfiles = activeRows(config.machineCosts).length ? activeRows(config.machineCosts) : [DEFAULT_MACHINE_PROFILE];
  const serviceProfiles = activeRows(config.serviceProfiles).length ? activeRows(config.serviceProfiles) : DEFAULT_SERVICE_PROFILES;
  const markupRules = activeRows(config.markupRules);
  const materialParameters = activeRows(config.materialParameters);
  const priceRules = Array.isArray(config.priceRules) ? config.priceRules : [];
  const volumePricing = Array.isArray(config.volumePricing) ? config.volumePricing : [];

  const overheadPerMachineMinute = monthlyFixedCost / Math.max(1, parseDecimal(settings.monthly_productive_machine_minutes));
  const overheadPerLaborHour = monthlyFixedCost / Math.max(1, parseDecimal(settings.monthly_productive_labor_hours));

  return {
    settings,
    fixedExpenses,
    monthlyFixedCost: roundCurrency(monthlyFixedCost),
    overheadPerMachineMinute,
    overheadPerLaborHour,
    laborProfiles,
    machineProfiles,
    serviceProfiles,
    markupRules,
    materialParameters,
    priceRules,
    volumePricing,
    nowIso: config.nowIso || '',
  };
}

export function getLaborRate(profile = DEFAULT_LABOR_PROFILE, context = buildPricingContext()) {
  const internal = firstPositive(
    profile.internal_hour_cost,
    profile.cost_per_hour,
    profile.hour_cost,
    profile.salary_with_charges && profile.monthly_hours ? parseDecimal(profile.salary_with_charges) / parseDecimal(profile.monthly_hours) : 0,
    DEFAULT_LABOR_PROFILE.internal_hour_cost,
  );
  const sale = firstPositive(profile.sale_hour_price, profile.price_per_hour, profile.billable_hour_price, internal * 2.2);
  return {
    id: profile.id,
    name: profile.name || profile.role || 'Mao de obra',
    internal_hour_cost: roundCurrency(internal),
    sale_hour_price: roundCurrency(sale),
    overhead_hour: roundCurrency(context.overheadPerLaborHour),
  };
}

export function getMachineRate(profile = DEFAULT_MACHINE_PROFILE, context = buildPricingContext()) {
  const productiveMinutes = firstPositive(
    profile.productive_minutes_month,
    profile.monthly_productive_minutes,
    profile.productive_hours_month ? parseDecimal(profile.productive_hours_month) * 60 : 0,
    context.settings.monthly_productive_machine_minutes,
  );
  const monthlyCost = firstPositive(
    profile.monthly_total_cost,
    profile.monthly_cost,
    parseDecimal(profile.depreciation_monthly) + parseDecimal(profile.maintenance_monthly) + parseDecimal(profile.energy_monthly) + parseDecimal(profile.consumables_monthly),
  );
  const internal = firstPositive(
    profile.internal_minute_cost,
    profile.total_cost_minute,
    profile.cost_per_minute,
    monthlyCost / Math.max(1, productiveMinutes),
    DEFAULT_MACHINE_PROFILE.internal_minute_cost,
  );
  const sale = firstPositive(profile.sale_minute_price, profile.price_per_minute, profile.billable_minute_price, internal * 2.3);
  return {
    id: profile.id,
    name: profile.name || profile.machine_name || 'Maquina',
    machine_type: profile.machine_type || profile.type || 'operacao',
    internal_minute_cost: roundCurrency(internal),
    sale_minute_price: roundCurrency(sale),
    setup_fee: roundCurrency(profile.setup_fee || 0),
    overhead_minute: roundCurrency(context.overheadPerMachineMinute),
  };
}

export function findBestMarkup(product = {}, context = buildPricingContext()) {
  const group = product.product_group || product.category || 'outros';
  // So um match real por grupo/categoria conta. Sem match, caimos no default
  // global de margem (context.settings) — nunca no markupRules[0], que era a
  // regra alfabeticamente primeira e podia contaminar uma categoria nao mapeada
  // com margem de outra sem relacao.
  const rule = context.markupRules.find((item) => {
    const target = item.product_group || item.material_type || item.category || item.name;
    return String(target || '').toLowerCase() === String(group || '').toLowerCase();
  }) || null;
  return {
    target_margin_pct: firstPositive(rule?.target_margin_pct, rule?.margin_pct, context.settings.target_margin_pct),
    minimum_margin_pct: firstPositive(rule?.minimum_margin_pct, rule?.min_margin_pct, context.settings.minimum_margin_pct),
    markup_pct: parseDecimal(rule?.markup_pct || rule?.value),
  };
}

// ── Preco por cliente e por volume (regras comerciais aplicadas no calculo) ──

function ruleMatchesProduct(rule, product) {
  if (!rule || !product) return false;
  const variantId = product.id;
  const groupId = product.variant_group_id || product.id;
  if (rule.product_variant_id && String(rule.product_variant_id) === String(variantId)) return true;
  if (rule.product_master_id && String(rule.product_master_id) === String(groupId)) return true;
  if (rule.product_id && String(rule.product_id) === String(variantId)) return true;
  if (rule.product_name && sameText(rule.product_name, product.name)) return true;
  return false;
}

function ruleIsInWindow(rule, nowIso) {
  if (rule.active === false) return false;
  if (rule.starts_at && String(rule.starts_at) > nowIso) return false;
  if (rule.ends_at && String(rule.ends_at) < nowIso) return false;
  return true;
}

/**
 * Regra de preco negociada para um cliente especifico. Retorna
 * { price?, discount_pct?, source } ou null. Prioriza a regra de maior
 * quantidade minima aplicavel (mais especifica), depois a mais recente.
 */
export function findClientPriceRule(product = {}, clientId, quantity, context = buildPricingContext()) {
  if (!clientId) return null;
  const nowIso = context.nowIso || '';
  const candidates = (context.priceRules || []).filter((rule) =>
    rule
    && String(rule.customer_id || '') === String(clientId)
    && ruleIsInWindow(rule, nowIso)
    && (parseDecimal(rule.minimum_quantity) || 1) <= (parseDecimal(quantity) || 1)
    && ruleMatchesProduct(rule, product)
    && (parseDecimal(rule.price) > 0 || parseDecimal(rule.discount_pct) > 0),
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => (parseDecimal(b.minimum_quantity) || 1) - (parseDecimal(a.minimum_quantity) || 1));
  const rule = candidates[0];
  return {
    price: parseDecimal(rule.price),
    discount_pct: parseDecimal(rule.discount_pct),
    source: 'client_price_rule',
    rule_id: rule.id || null,
  };
}

/**
 * Faixa de desconto por volume para o produto na quantidade pedida. Retorna
 * { unit_price?, discount_percent?, source } ou null. Escolhe a faixa de maior
 * min_quantity que ainda cobre a quantidade (o melhor desconto aplicavel).
 */
export function findVolumePrice(product = {}, quantity, context = buildPricingContext()) {
  const qty = parseDecimal(quantity) || 1;
  const candidates = (context.volumePricing || []).filter((rule) => {
    if (!rule || rule.active === false) return false;
    if (!ruleMatchesProduct(rule, product)) return false;
    const min = parseDecimal(rule.min_quantity) || 0;
    const max = parseDecimal(rule.max_quantity) || Infinity;
    return qty >= min && qty <= max && (parseDecimal(rule.unit_price) > 0 || parseDecimal(rule.discount_percent) > 0);
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => (parseDecimal(b.min_quantity) || 0) - (parseDecimal(a.min_quantity) || 0));
  const rule = candidates[0];
  return {
    unit_price: parseDecimal(rule.unit_price),
    discount_percent: parseDecimal(rule.discount_percent),
    source: 'volume_pricing',
    rule_id: rule.id || null,
  };
}

export function findMaterialParameter(product = {}, context = buildPricingContext()) {
  const rows = context.materialParameters || [];
  if (!rows.length) return null;

  return rows.find((item) => item.product_id && product.id && String(item.product_id) === String(product.id))
    || rows.find((item) => sameText(item.product_name, product.name))
    || rows.find((item) => sameText(item.name, product.name))
    || rows.find((item) => sameText(item.sku, product.sku))
    || rows.find((item) => sameText(item.material_type, product.product_group || product.category))
    || rows.find((item) => sameText(item.category, product.category))
    || null;
}

function materialCostBasis(product = {}, material = {}) {
  const sheetArea = calcSheetAreaM2(
    material.sheet_width_mm || product.sheet_width_mm,
    material.sheet_height_mm || product.sheet_height_mm,
  );
  const costPerM2 = firstPositive(
    material.cost_per_m2,
    material.material_cost_m2,
    sheetArea > 0 ? parseDecimal(material.sheet_cost || material.cost_price) / sheetArea : 0,
    product.cost_per_m2,
    product.material_cost_m2,
    sheetArea > 0 ? parseDecimal(product.cost_price) / sheetArea : 0,
  );
  const salePricePerM2 = firstPositive(material.sale_price_per_m2, material.price_per_m2, product.price_per_m2);
  const unitCost = firstPositive(material.unit_cost, material.cost_price, product.cost_price);
  const unitSalePrice = firstPositive(material.sale_price, material.unit_sale_price, product.sale_price);

  return {
    sheet_area_m2: sheetArea,
    cost_per_m2: roundCurrency(costPerM2),
    sale_price_per_m2: roundCurrency(salePricePerM2),
    unit_cost: roundCurrency(unitCost),
    unit_sale_price: roundCurrency(unitSalePrice),
  };
}

export function materialCostForProduct(product = {}, line = {}, pricingMode = 'unitario', context = buildPricingContext()) {
  const quantity = parseDecimal(line.quantity) || 1;
  const matchedMaterial = findMaterialParameter(product, context);
  const basis = materialCostBasis(product, matchedMaterial || {});
  const wastePct = firstPositive(line.waste_pct, matchedMaterial?.waste_pct, product.waste_pct, product.loss_pct, context.settings.material_waste_pct);

  if (pricingMode === 'area_m2') {
    const area = calcAreaM2(line.width_mm, line.height_mm);
    const direct = area * basis.cost_per_m2 * quantity;
    return {
      direct: roundCurrency(direct),
      waste: roundCurrency(direct * wastePct / 100),
      area_m2: area,
      cost_per_m2: roundCurrency(basis.cost_per_m2),
      sale_price_per_m2: roundCurrency(basis.sale_price_per_m2),
      waste_pct: wastePct,
      source: matchedMaterial ? 'material_parameter' : 'product',
      material_parameter_id: matchedMaterial?.id || null,
      material_parameter_name: matchedMaterial?.name || matchedMaterial?.product_name || null,
      sheet_area_m2: roundCurrency(basis.sheet_area_m2),
      missing_cost: basis.cost_per_m2 <= 0,
      missing_sale_price: basis.sale_price_per_m2 <= 0,
    };
  }

  const direct = basis.unit_cost * quantity;
  return {
    direct: roundCurrency(direct),
    waste: roundCurrency(direct * wastePct / 100),
    area_m2: 0,
    cost_per_m2: 0,
    sale_price_per_m2: 0,
    unit_cost: roundCurrency(basis.unit_cost),
    unit_sale_price: roundCurrency(basis.unit_sale_price),
    waste_pct: wastePct,
    source: matchedMaterial ? 'material_parameter' : 'product',
    material_parameter_id: matchedMaterial?.id || null,
    material_parameter_name: matchedMaterial?.name || matchedMaterial?.product_name || null,
    missing_cost: basis.unit_cost <= 0,
    missing_sale_price: basis.unit_sale_price <= 0,
  };
}

export function createPricingSnapshot({ product = {}, line = {}, context = buildPricingContext(), pricingMode = 'unitario' }) {
  const laborProfile = context.laborProfiles.find((item) => item.id === line.labor_profile_id)
    || context.laborProfiles.find((item) => String(item.role || item.name || '').toLowerCase().includes('operador'))
    || context.laborProfiles[0]
    || DEFAULT_LABOR_PROFILE;
  const machineProfile = context.machineProfiles.find((item) => item.id === line.machine_profile_id) || context.machineProfiles[0] || DEFAULT_MACHINE_PROFILE;
  const serviceProfile = context.serviceProfiles.find((item) => item.id === line.service_profile_id) || context.serviceProfiles[0] || null;
  const labor = getLaborRate(laborProfile, context);
  const machine = getMachineRate(machineProfile, context);
  const markup = findBestMarkup(product, context);

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    product: {
      id: product.id,
      name: product.name,
      group: product.product_group || product.category || 'outros',
      pricing_mode: pricingMode,
    },
    service: serviceProfile ? {
      id: serviceProfile.id,
      name: serviceProfile.name,
      type: serviceProfile.service_type || 'servico',
      default_machine_minutes: parseDecimal(serviceProfile.default_machine_minutes),
      default_labor_minutes: parseDecimal(serviceProfile.default_labor_minutes),
      setup_fee: roundCurrency(serviceProfile.setup_fee || 0),
      sale_price: roundCurrency(serviceProfile.sale_price || 0),
    } : null,
    labor,
    machine,
    company: {
      monthly_fixed_cost: context.monthlyFixedCost,
      overhead_per_machine_minute: roundCurrency(context.overheadPerMachineMinute),
      overhead_per_labor_hour: roundCurrency(context.overheadPerLaborHour),
    },
    rules: {
      target_margin_pct: markup.target_margin_pct,
      minimum_margin_pct: markup.minimum_margin_pct,
      tax_pct: parseDecimal(context.settings.tax_pct),
      card_fee_pct: parseDecimal(context.settings.card_fee_pct),
      commission_pct: parseDecimal(context.settings.commission_pct),
    },
  };
}

export function computeCommercialLine(product = {}, line = {}, config = {}) {
  const context = buildPricingContext(config);
  const quantity = parseDecimal(line.quantity) || 1;
  const pricingMode = product.dimensions_required ? 'area_m2' : (product.pricing_mode || line.pricing_mode || 'unitario');
  const snapshot = line.pricing_snapshot || createPricingSnapshot({ product, line, context, pricingMode });
  const service = snapshot.service;
  const laborMinutes = firstPositive(line.labor_minutes, parseDecimal(line.labor_hours) * 60, service?.default_labor_minutes);
  const laborHours = laborMinutes / 60;
  const machineMinutes = firstPositive(line.machine_time_min, service?.default_machine_minutes);
  const material = materialCostForProduct(product, line, pricingMode, context);

  // Materiais extras itemizados na linha (mini-ficha da peca): cada um com
  // quantidade por unidade do produto, perda e custo/preco do estoque. Somam
  // ao custo e ao preco, por unidade x quantidade da linha.
  const extraMaterials = Array.isArray(line.materials) ? line.materials : [];
  const materialsUnitCost = extraMaterials.reduce((sum, item) => {
    const q = parseDecimal(item.quantity);
    const waste = parseDecimal(item.waste_pct);
    return sum + parseDecimal(item.unit_cost) * q * (1 + waste / 100);
  }, 0);
  const materialsUnitSale = extraMaterials.reduce((sum, item) => {
    const q = parseDecimal(item.quantity);
    const waste = parseDecimal(item.waste_pct);
    const cost = parseDecimal(item.unit_cost) * q * (1 + waste / 100);
    const sale = parseDecimal(item.sale_price) > 0
      ? parseDecimal(item.sale_price) * q
      : cost / Math.max(0.01, 1 - snapshot.rules.target_margin_pct / 100);
    return sum + sale;
  }, 0);
  const materialsListCost = materialsUnitCost * quantity;
  const materialsListSale = materialsUnitSale * quantity;

  const markupFactor = 1 / Math.max(0.01, 1 - snapshot.rules.target_margin_pct / 100);

  // Etapas de mao-de-obra itemizadas (preparo/corte/acabamento/montagem), cada
  // uma com tempo e custo/hora proprios. is_setup = tempo fixo (nao multiplica
  // pela quantidade da linha).
  const laborSteps = Array.isArray(line.labor_steps) ? line.labor_steps : [];
  const laborStepsCost = laborSteps.reduce((sum, step) => {
    const minutes = parseDecimal(step.minutes);
    const rate = parseDecimal(step.cost_per_hour) || parseDecimal(snapshot.labor.internal_hour_cost);
    const base = (minutes / 60) * rate;
    return sum + base * (step.is_setup ? 1 : quantity);
  }, 0);
  const laborStepsSale = laborStepsCost * markupFactor;

  // Operacoes de maquina itemizadas (corte laser + gravacao + CNC), por tempo,
  // comprimento de corte (m) ou area de gravacao (m2). is_setup = tempo fixo.
  const machineOps = Array.isArray(line.machine_ops) ? line.machine_ops : [];
  const machineOpsCost = machineOps.reduce((sum, op) => {
    const byTime = parseDecimal(op.minutes) * (parseDecimal(op.cost_per_min) || parseDecimal(snapshot.machine.internal_minute_cost));
    const byLength = parseDecimal(op.length_m) * parseDecimal(op.rate_per_m);
    const byArea = parseDecimal(op.area_m2) * parseDecimal(op.rate_per_m2);
    const base = byTime + byLength + byArea;
    return sum + base * (op.is_setup ? 1 : quantity);
  }, 0);
  const machineOpsSale = machineOpsCost * markupFactor;

  // Adicionais nomeados de servico (ex.: "Taxa de urgencia", "Embalagem especial").
  const additionals = Array.isArray(line.additionals) ? line.additionals : [];
  const additionalsSum = additionals.reduce((sum, extra) => sum + parseDecimal(extra?.value), 0);

  // Regras comerciais aplicadas automaticamente (preco por cliente e por volume),
  // exceto quando a linha esta com preco travado (valor combinado congelado).
  const priceLocked = !!line.price_locked;
  const clientId = line.client_id || product.client_id || context.clientId || '';
  const clientRule = priceLocked ? null : findClientPriceRule(product, clientId, quantity, context);
  const volumeRule = priceLocked ? null : findVolumePrice(product, quantity, context);

  let materialSale = 0;
  let appliedBasePrice = 0;
  let priceSource = 'formula';
  let fixedPriceFromRule = false;

  const formulaBase = (mode) => (mode === 'area_m2'
    ? firstPositive(material.sale_price_per_m2, product.price_per_m2, line.base_price, material.cost_per_m2 / Math.max(0.01, 1 - snapshot.rules.target_margin_pct / 100))
    : firstPositive(material.unit_sale_price, product.sale_price, line.base_price, (parseDecimal(product.cost_price) / Math.max(0.01, 1 - snapshot.rules.target_margin_pct / 100))));

  if (priceLocked && parseDecimal(line.base_price) > 0) {
    appliedBasePrice = parseDecimal(line.base_price);
    priceSource = 'locked';
  } else if (clientRule && clientRule.price > 0) {
    appliedBasePrice = clientRule.price;
    priceSource = clientRule.source;
    fixedPriceFromRule = true;
  } else if (volumeRule && volumeRule.unit_price > 0) {
    appliedBasePrice = volumeRule.unit_price;
    priceSource = volumeRule.source;
    fixedPriceFromRule = true;
  } else {
    appliedBasePrice = formulaBase(pricingMode);
  }
  materialSale = pricingMode === 'area_m2'
    ? material.area_m2 * appliedBasePrice * quantity
    : appliedBasePrice * quantity;

  // Desconto automatico de regra comercial, so quando a regra nao ja fixou o preco.
  let ruleDiscountPct = 0;
  if (!priceLocked && !fixedPriceFromRule) {
    if (clientRule && clientRule.discount_pct > 0) ruleDiscountPct = clientRule.discount_pct;
    else if (volumeRule && volumeRule.discount_percent > 0) ruleDiscountPct = volumeRule.discount_percent;
  }

  const materialTotalCost = material.direct + material.waste + materialsListCost;
  const laborCostTotal = laborHours * parseDecimal(snapshot.labor.internal_hour_cost);
  const machineCostTotal = machineMinutes * parseDecimal(snapshot.machine.internal_minute_cost);
  const laborSaleTotal = laborHours * parseDecimal(snapshot.labor.sale_hour_price);
  const machineSaleTotal = machineMinutes * parseDecimal(snapshot.machine.sale_minute_price);
  const setupSale = parseDecimal(snapshot.machine.setup_fee) + parseDecimal(service?.setup_fee);
  const designSale = firstPositive(line.art_price, line.design_price, service?.type === 'arte' ? service?.sale_price : 0, line.art_cost);
  const overheadCostTotal = (machineMinutes * parseDecimal(snapshot.machine.overhead_minute)) + (laborHours * parseDecimal(snapshot.labor.overhead_hour));
  const serviceSaleTotal = laborSaleTotal + machineSaleTotal + setupSale + designSale + laborStepsSale + machineOpsSale;
  const subtotal = materialSale + materialsListSale + serviceSaleTotal + additionalsSum;

  // Desconto da linha: percentual manual + percentual de regra (somados), mais um
  // desconto em R$ opcional. Nunca deixa o total negativo.
  const manualDiscountPct = parseDecimal(line.discount_pct);
  const effectiveDiscountPct = Math.min(100, manualDiscountPct + ruleDiscountPct);
  const pctDiscountValue = subtotal * (effectiveDiscountPct / 100);
  const rawValueDiscount = parseDecimal(line.discount_value);
  const valueDiscount = Math.max(0, Math.min(rawValueDiscount, subtotal - pctDiscountValue));
  const discountApplied = pctDiscountValue + valueDiscount;
  const total = Math.max(0, subtotal - discountApplied);
  const totalCost = materialTotalCost + laborCostTotal + machineCostTotal + overheadCostTotal + laborStepsCost + machineOpsCost;
  const profit = total - totalCost;
  const margin = total > 0 ? (profit / total) * 100 : 0;
  const minPrice = totalCost;
  const targetPrice = totalCost / Math.max(0.01, 1 - snapshot.rules.target_margin_pct / 100);
  const minimumMarginPrice = totalCost / Math.max(0.01, 1 - snapshot.rules.minimum_margin_pct / 100);

  const descriptionParts = [product.name, `Qtd: ${quantity} ${line.unit || product.unit || 'un'}`];
  if (line.width_mm && line.height_mm) descriptionParts.push(`Medidas: ${line.width_mm}x${line.height_mm}mm`);
  if (service?.name) descriptionParts.push(`Servico: ${service.name}`);
  if (line.art_description) descriptionParts.push(`Arte: ${line.art_description}`);
  if (line.item_notes) descriptionParts.push(`Obs: ${line.item_notes}`);

  return {
    ...line,
    product_name: product.name,
    product_group: product.product_group || product.category || 'outros',
    pricing_mode: pricingMode,
    pricing_snapshot: snapshot,
    quantity,
    labor_minutes: roundCurrency(laborMinutes),
    labor_hours: roundCurrency(laborHours),
    machine_time_min: roundCurrency(machineMinutes),
    labor_cost_hour: roundCurrency(snapshot.labor.internal_hour_cost),
    machine_cost_per_min: roundCurrency(snapshot.machine.internal_minute_cost),
    labor_sale_hour: roundCurrency(snapshot.labor.sale_hour_price),
    machine_sale_minute: roundCurrency(snapshot.machine.sale_minute_price),
    base_subtotal: roundCurrency(materialSale + materialsListSale),
    materials: extraMaterials,
    materials_list_cost: roundCurrency(materialsListCost),
    materials_list_sale: roundCurrency(materialsListSale),
    services_total: roundCurrency(serviceSaleTotal),
    material_cost_direct: roundCurrency(material.direct),
    material_waste_cost: roundCurrency(material.waste),
    material_cost: roundCurrency(materialTotalCost),
    material_source: material.source,
    material_parameter_id: material.material_parameter_id,
    material_parameter_name: material.material_parameter_name,
    material_cost_per_m2: material.cost_per_m2,
    material_sale_price_per_m2: material.sale_price_per_m2,
    material_unit_cost: material.unit_cost,
    material_unit_sale_price: material.unit_sale_price,
    material_sheet_area_m2: material.sheet_area_m2,
    material_waste_pct: material.waste_pct,
    material_pricing_warning: material.missing_cost
      ? 'Material sem custo confiavel. Cadastre custo por m2, custo da chapa ou custo unitario em Precificacao > Materiais.'
      : material.missing_sale_price
        ? 'Material sem preco comercial cadastrado. O sistema estimou pelo custo e margem alvo.'
        : '',
    labor_cost_total: roundCurrency(laborCostTotal + laborStepsCost),
    machine_cost_total: roundCurrency(machineCostTotal + machineOpsCost),
    overhead_cost_total: roundCurrency(overheadCostTotal),
    labor_sale_total: roundCurrency(laborSaleTotal + laborStepsSale),
    machine_sale_total: roundCurrency(machineSaleTotal + machineOpsSale),
    labor_steps: laborSteps,
    machine_ops: machineOps,
    labor_steps_cost: roundCurrency(laborStepsCost),
    machine_ops_cost: roundCurrency(machineOpsCost),
    setup_sale_total: roundCurrency(setupSale),
    art_price: roundCurrency(designSale),
    art_cost: roundCurrency(designSale),
    total_cost: roundCurrency(totalCost),
    total: roundCurrency(total),
    unit_price: roundCurrency(quantity > 0 ? total / quantity : total),
    base_price: roundCurrency(appliedBasePrice),
    additionals,
    additionals_total: roundCurrency(additionalsSum),
    discount_pct: manualDiscountPct,
    rule_discount_pct: roundCurrency(ruleDiscountPct),
    discount_value: roundCurrency(valueDiscount),
    discount_applied: roundCurrency(discountApplied),
    price_source: priceSource,
    price_locked: priceLocked,
    profit: roundCurrency(profit),
    margin_pct: roundCurrency(margin),
    min_price: roundCurrency(minPrice),
    target_margin_pct: roundCurrency(snapshot.rules.target_margin_pct),
    min_margin_pct: roundCurrency(snapshot.rules.minimum_margin_pct),
    recommended_price: roundCurrency(targetPrice),
    minimum_margin_price: roundCurrency(minimumMarginPrice),
    description: descriptionParts.join(' | '),
  };
}

export function summarizePricingDocument(lines, config = {}) {
  const discountPct = parseDecimal(config.discountPct);
  const generalArtCost = parseDecimal(config.generalArtCost);
  const additionalCharge = parseDecimal(config.additionalCharge);
  // Adicionais nomeados do documento (ex.: frete, taxa de projeto) somam ao total.
  const documentAdditionals = Array.isArray(config.additionals) ? config.additionals : [];
  const additionalsSum = documentAdditionals.reduce((sum, extra) => sum + parseDecimal(extra?.value), 0);
  const subtotalProducts = lines.reduce((sum, line) => sum + parseDecimal(line.base_subtotal), 0);
  const subtotalServices = lines.reduce((sum, line) => sum + parseDecimal(line.services_total), 0);
  // Quebra granular dos servicos para o resumo ao vivo do documento.
  const subtotalMachine = lines.reduce((sum, line) => sum + parseDecimal(line.machine_sale_total), 0);
  const subtotalLabor = lines.reduce((sum, line) => sum + parseDecimal(line.labor_sale_total), 0);
  const subtotalSetup = lines.reduce((sum, line) => sum + parseDecimal(line.setup_sale_total), 0);
  const subtotalArt = lines.reduce((sum, line) => sum + parseDecimal(line.art_price), 0);
  const subtotalLineAdditionals = lines.reduce((sum, line) => sum + parseDecimal(line.additionals_total), 0);
  const subtotalBeforeDiscount = lines.reduce((sum, line) => sum + parseDecimal(line.total), 0) + generalArtCost + additionalCharge + additionalsSum;
  const totalCost = lines.reduce((sum, line) => sum + parseDecimal(line.total_cost), 0);
  // Desconto do documento: percentual + valor fixo em R$, sem deixar negativo.
  const pctDiscount = subtotalBeforeDiscount * (discountPct / 100);
  const rawValueDiscount = parseDecimal(config.discountValue);
  const valueDiscount = Math.max(0, Math.min(rawValueDiscount, subtotalBeforeDiscount - pctDiscount));
  const discountValue = pctDiscount + valueDiscount;
  const totalFinal = Math.max(0, subtotalBeforeDiscount - discountValue);
  const profit = totalFinal - totalCost;
  const margin = totalFinal > 0 ? (profit / totalFinal) * 100 : 0;

  return {
    subtotalProducts: roundCurrency(subtotalProducts),
    subtotalServices: roundCurrency(subtotalServices),
    subtotalMachine: roundCurrency(subtotalMachine),
    subtotalLabor: roundCurrency(subtotalLabor),
    subtotalSetup: roundCurrency(subtotalSetup),
    subtotalArt: roundCurrency(subtotalArt),
    subtotalLineAdditionals: roundCurrency(subtotalLineAdditionals),
    subtotalBeforeDiscount: roundCurrency(subtotalBeforeDiscount),
    generalArtCost: roundCurrency(generalArtCost),
    additionalCharge: roundCurrency(additionalCharge),
    additionalsTotal: roundCurrency(additionalsSum),
    discountPct,
    discountValueInput: roundCurrency(rawValueDiscount),
    discountValue: roundCurrency(discountValue),
    totalCost: roundCurrency(totalCost),
    totalFinal: roundCurrency(totalFinal),
    profit: roundCurrency(profit),
    margin_pct: roundCurrency(margin),
    itemsText: lines.map((line) => `${line.product_name} | ${line.quantity} ${line.unit || 'un'} | ${money(line.total)}`).join('\n'),
    title: lines.length <= 1 ? (lines[0]?.product_name || '') : `${lines[0]?.product_name || 'Itens'} + ${lines.length - 1} item(ns)`,
  };
}
