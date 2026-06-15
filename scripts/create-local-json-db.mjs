import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const sourceDir = process.argv[2];

if (!sourceDir) {
  console.error("Uso: npm run db:local:json -- <pasta-do-backup-ERP local-data>");
  process.exit(1);
}

const resolvedSource = path.resolve(rootDir, sourceDir);
const outputDir = path.join(rootDir, "local-db");
const outputFile = path.join(outputDir, "ERP local-local.json");

const files = (await readdir(resolvedSource))
  .filter((file) => file.endsWith(".json") && file !== "manifest.json")
  .sort((a, b) => a.localeCompare(b));

const db = {
  createdAt: new Date().toISOString(),
  sourceBackup: resolvedSource,
  entities: {},
};

for (const file of files) {
  const entityName = path.basename(file, ".json");
  const content = await readFile(path.join(resolvedSource, file), "utf8");
  db.entities[entityName] = JSON.parse(content);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(db, null, 2)}\n`, "utf8");

console.log(`Banco local JSON criado em: ${outputFile}`);
