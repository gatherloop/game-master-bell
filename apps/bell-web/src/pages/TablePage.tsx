import type { Table } from "@game-master-bell/shared";
import { BellStage } from "../components/BellStage";
import { type BellCallState, useBellCall } from "../hooks/useBellCall";
import "./TablePage.css";

function statusMessage(state: BellCallState): string {
  switch (state.status) {
    case "idle":
      return "Tekan bel untuk memanggil game master";
    case "calling":
      return "Memanggil game master...";
    case "cooldown":
      return `Game master akan segera datang membantumu (${state.secondsRemaining}s)`;
    case "error":
      return "Panggilan gagal, coba lagi";
  }
}

export function TablePage({ table }: { table: Table }) {
  const { state, call } = useBellCall(table.code);
  const disabled = state.status === "calling" || state.status === "cooldown";

  return (
    <main className="table-page">
      <p className="table-page__floor">Lantai {table.floor}</p>
      <h1 className="table-page__name">{table.displayName}</h1>
      <BellStage onTap={call} disabled={disabled} />
      <p
        className={
          state.status === "error"
            ? "table-page__message table-page__message--error"
            : "table-page__message"
        }
        role="status"
      >
        {statusMessage(state)}
      </p>
    </main>
  );
}
