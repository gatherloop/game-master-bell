import type { Table } from "@game-master-bell/shared";
import { BellPlaceholder } from "../components/BellPlaceholder";
import "./TablePage.css";

export function TablePage({ table }: { table: Table }) {
  return (
    <main className="table-page">
      <p className="table-page__floor">Lantai {table.floor}</p>
      <h1 className="table-page__name">{table.displayName}</h1>
      <BellPlaceholder />
      <p className="table-page__hint">Tekan bel untuk memanggil game master</p>
    </main>
  );
}
