import type { Message } from "firebase-admin/messaging";
import type { Table } from "@game-master-bell/shared";

export const GAME_MASTERS_TOPIC = "game-masters";

export function buildCallMessage(table: Table, calledAt: Date = new Date()): Message {
  return {
    topic: GAME_MASTERS_TOPIC,
    notification: {
      title: "Panggilan Game Master",
      body: `Meja ${table.number} · Lantai ${table.floor} memanggil game master`,
    },
    data: {
      tableCode: table.code,
      floor: String(table.floor),
      number: table.number,
      calledAt: calledAt.toISOString(),
    },
  };
}
