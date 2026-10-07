import datos from "@/data/datos.json";
import Dashboard from "./components/Dashboard";
import type { Datos } from "./lib/tipos";

export default function Home() {
  return <Dashboard datos={datos as Datos} />;
}
