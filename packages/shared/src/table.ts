import { z } from "zod";

export const TableSchema = z.object({
  code: z.string().min(1),
  floor: z.number().int().positive(),
  number: z.string().min(1),
  displayName: z.string().min(1),
  active: z.boolean(),
});

export type Table = z.infer<typeof TableSchema>;

export const TablesSchema = z.array(TableSchema).superRefine((tables, ctx) => {
  const seenCodes = new Set<string>();
  tables.forEach((table, index) => {
    if (seenCodes.has(table.code)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate table code "${table.code}"`,
        path: [index, "code"],
      });
    }
    seenCodes.add(table.code);
  });
});
