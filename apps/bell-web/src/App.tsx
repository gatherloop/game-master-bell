import { resolveRoute } from "./lib/route";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { TablePage } from "./pages/TablePage";

export function App() {
  const route = resolveRoute(window.location.pathname, import.meta.env.BASE_URL);

  switch (route.kind) {
    case "table":
      return <TablePage table={route.table} />;
    case "home":
      return <HomePage />;
    case "not-found":
      return <NotFoundPage />;
  }
}
