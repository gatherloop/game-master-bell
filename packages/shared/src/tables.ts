import tablesData from "./tables.json" with { type: "json" };
import { TablesSchema, type Table } from "./table.js";

export const tables: Table[] = TablesSchema.parse(tablesData);

export function getActiveTables(): Table[] {
  return tables.filter((table) => table.active);
}

export function findTableByCode(code: string): Table | undefined {
  return tables.find((table) => table.code === code && table.active);
}
