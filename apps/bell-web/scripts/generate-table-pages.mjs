import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getActiveTables } from "@game-master-bell/shared";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

const indexHtml = await readFile(join(distDir, "index.html"), "utf8");
const tables = getActiveTables();

for (const table of tables) {
  const tableDir = join(distDir, "t", table.code);
  await mkdir(tableDir, { recursive: true });
  await writeFile(join(tableDir, "index.html"), indexHtml);
}

// GitHub Pages serves this for any path that doesn't match a generated file
// (e.g. an unknown/retired table code); the same app shell renders the 404 UI.
await writeFile(join(distDir, "404.html"), indexHtml);

console.log(`Generated ${tables.length} table page(s) and 404.html in ${distDir}`);
