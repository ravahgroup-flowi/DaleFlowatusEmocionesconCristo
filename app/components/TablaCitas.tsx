"use client";

import { useMemo, useState } from "react";
import type { Cita } from "../lib/tipos";
import { Vacio } from "./Graficas";

type Columna = "referencia" | "libro" | "testamento" | "pagina" | "parte";

const COLUMNAS: { id: Columna; titulo: string; clase?: string }[] = [
  { id: "referencia", titulo: "Referencia" },
  { id: "libro", titulo: "Libro", clase: "hidden sm:table-cell" },
  { id: "testamento", titulo: "Testamento" },
  { id: "pagina", titulo: "Página", clase: "text-right" },
  { id: "parte", titulo: "Parte", clase: "hidden md:table-cell" },
];

const ORDEN_PARTES = ["P", "I", "II", "III", "IV"];

export default function TablaCitas({ citas, nombresPartes }: { citas: Cita[]; nombresPartes: Record<string, string> }) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<{ col: Columna; asc: boolean }>({ col: "pagina", asc: true });

  const filas = useMemo(() => {
    const q = busqueda
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const filtradas = q
      ? citas.filter((c) =>
          `${c.referencia} ${c.testamento} ${nombresPartes[c.parte] ?? ""}`
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .includes(q),
        )
      : citas;
    const dir = orden.asc ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      let r: number;
      if (orden.col === "pagina") r = a.pagina - b.pagina;
      else if (orden.col === "parte") r = ORDEN_PARTES.indexOf(a.parte) - ORDEN_PARTES.indexOf(b.parte);
      else if (orden.col === "referencia")
        r = a.libro.localeCompare(b.libro, "es") || a.capitulo - b.capitulo || a.versiculos.localeCompare(b.versiculos, "es", { numeric: true });
      else r = String(a[orden.col]).localeCompare(String(b[orden.col]), "es");
      return r * dir || a.id - b.id;
    });
  }, [citas, busqueda, orden, nombresPartes]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar cita</span>
          <svg aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar libro, referencia o parte…"
            className="w-full rounded-lg border border-borde bg-surface py-2 pr-3 pl-9 text-sm transition-shadow outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <p className="text-sm text-muted" aria-live="polite">
          {filas.length} de {citas.length} citas
        </p>
      </div>

      {filas.length === 0 ? (
        <div className="mt-4">
          <Vacio mensaje={citas.length === 0 ? "No hay citas con los filtros actuales." : `Sin resultados para «${busqueda}».`} />
        </div>
      ) : (
        <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-borde">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2 text-left">
              <tr>
                {COLUMNAS.map((c) => {
                  const activa = orden.col === c.id;
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      className={`px-3 py-2 font-medium ${c.clase ?? ""}`}
                      aria-sort={activa ? (orden.asc ? "ascending" : "descending") : "none"}
                    >
                      <button
                        type="button"
                        onClick={() => setOrden((o) => ({ col: c.id, asc: o.col === c.id ? !o.asc : true }))}
                        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent ${activa ? "text-foreground" : "text-muted"}`}
                      >
                        {c.titulo}
                        <span aria-hidden className={`text-xs transition-transform ${activa ? "opacity-100" : "opacity-30"} ${activa && !orden.asc ? "rotate-180" : ""}`}>
                          ▲
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr key={c.id} className="border-t border-borde transition-colors hover:bg-surface-2">
                  <td className="px-3 py-2 font-medium">{c.referencia}</td>
                  <td className="hidden px-3 py-2 text-muted sm:table-cell">{c.libro}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: c.testamento === "Antiguo" ? "var(--series-1)" : "var(--series-2)" }} />
                      {c.testamento}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.pagina}</td>
                  <td className="hidden px-3 py-2 text-muted md:table-cell">
                    {c.parte} · {nombresPartes[c.parte]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
