import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TablesSchema } from "../dist/table.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tablesPath = join(rootDir, "src", "tables.json");

const raw = await readFile(tablesPath, "utf8");
const result = TablesSchema.safeParse(JSON.parse(raw));

if (!result.success) {
  console.error(`tables.json failed schema validation (${tablesPath}):`);
  console.error(result.error.format());
  process.exit(1);
}

console.log(`tables.json is valid (${result.data.length} tables).`);
