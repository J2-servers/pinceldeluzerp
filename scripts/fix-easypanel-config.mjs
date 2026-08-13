#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function usage() {
  console.log(`Uso:
  node scripts/fix-easypanel-config.mjs <arquivo-json> --domain <dominio> [--port 8080] [--out <saida-json>]

Exemplo:
  node scripts/fix-easypanel-config.mjs easypanel.json --domain pincel-luz-erp-pincel-luz-erp.rea8zf.easypanel.host --out easypanel.fixed.json

O script corrige:
  - dominio/proxy para porta interna 8080
  - PINCEL_LUZ_ALLOWED_ORIGINS com o dominio correto, sem barra final
  - PINCEL_LUZ_DB para /app/database/pincel-luz-erp.sqlite
  - build Dockerfile e branch main
  - source.path para /

Depois confira no EasyPanel os volumes:
  /app/database
  /app/storage
`);
}

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return '';
  return args[index + 1] || '';
}

const inputPath = args.find((arg) => !arg.startsWith('--'));
const domainArg = argValue('--domain');
const outPath = argValue('--out');
const portArg = Number(argValue('--port') || 8080);

if (!inputPath || !domainArg || args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(inputPath && domainArg ? 0 : 1);
}

const absoluteInput = path.resolve(inputPath);
if (!fs.existsSync(absoluteInput)) {
  console.error(`Arquivo nao encontrado: ${absoluteInput}`);
  process.exit(1);
}

const normalizeHost = (value) => String(value || '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/g, '');

const host = normalizeHost(domainArg);
if (!host) {
  console.error('Informe um dominio valido em --domain.');
  process.exit(1);
}
if (![80, 8080].includes(portArg)) {
  console.error('Use --port 8080 ou --port 80. A API interna 8787 nao deve ser exposta no EasyPanel.');
  process.exit(1);
}

function parseEnv(envText = '') {
  const env = new Map();
  String(envText).split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    env.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  });
  return env;
}

function stringifyEnv(env) {
  return Array.from(env.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('\r\n');
}

function fixService(service) {
  if (!service || service.type !== 'app' || !service.data) return [];
  const notes = [];
  const data = service.data;

  data.source = {
    type: 'github',
    owner: data.source?.owner || 'J2-servers',
    repo: data.source?.repo || 'pinceldeluzerp',
    ref: data.source?.ref || 'main',
    path: '/',
    autoDeploy: Boolean(data.source?.autoDeploy),
  };

  data.build = { ...(data.build || {}), type: 'dockerfile' };
  data.deploy = {
    replicas: Number(data.deploy?.replicas || 1),
    command: null,
    zeroDowntime: data.deploy?.zeroDowntime !== false,
  };

  const env = parseEnv(data.env);
  if (!env.get('PINCEL_LUZ_ADMIN_PASSWORD')) {
    env.set('PINCEL_LUZ_ADMIN_PASSWORD', 'troque-por-uma-senha-forte');
    notes.push('Defina uma senha forte em PINCEL_LUZ_ADMIN_PASSWORD antes de implantar.');
  }
  env.set('PINCEL_LUZ_DB', '/app/database/pincel-luz-erp.sqlite');
  env.set('PINCEL_LUZ_ALLOWED_ORIGINS', `https://${host}`);
  data.env = stringifyEnv(env);

  data.domains = Array.isArray(data.domains) && data.domains.length
    ? data.domains
    : [{ host, https: true, path: '/', middlewares: [], certificateResolver: '', wildcard: false, internalProtocol: 'http' }];

  data.domains = data.domains.map((domain) => ({
    ...domain,
    host: normalizeHost(domain.host) || host,
    https: domain.https !== false,
    port: portArg,
    path: domain.path || '/',
    middlewares: Array.isArray(domain.middlewares) ? domain.middlewares : [],
    certificateResolver: domain.certificateResolver || '',
    wildcard: Boolean(domain.wildcard),
    internalProtocol: 'http',
  }));

  const hasDatabaseMount = JSON.stringify(data).includes('/app/database');
  const hasStorageMount = JSON.stringify(data).includes('/app/storage');
  if (!hasDatabaseMount || !hasStorageMount) {
    notes.push('Confira/crie mounts persistentes no EasyPanel: /app/database e /app/storage.');
  }

  return notes;
}

let config;
try {
  config = JSON.parse(fs.readFileSync(absoluteInput, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(`JSON invalido: ${error.message}`);
  process.exit(1);
}

const services = Array.isArray(config.services) ? config.services : [];
const allNotes = services.flatMap(fixService);
if (!services.length) {
  console.error('JSON nao contem services[].');
  process.exit(1);
}

const destination = path.resolve(outPath || inputPath.replace(/\.json$/i, '') + '.fixed.json');
fs.writeFileSync(destination, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log(`Configuracao corrigida salva em: ${destination}`);
console.log(`Dominio configurado: https://${host}`);
console.log(`Porta interna dos dominios: ${portArg}`);
if (allNotes.length) {
  console.log('\nPendencias para conferir no EasyPanel:');
  [...new Set(allNotes)].forEach((note) => console.log(`- ${note}`));
}
