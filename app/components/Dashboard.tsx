"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import type { Datos, Testamento } from "../lib/tipos";
import { BarrasHorizontales, LineaPaginas } from "./Graficas";
import TablaCitas from "./TablaCitas";

const fmt = new Intl.NumberFormat("es-MX");

interface Filtros {
  desde: number;
  hasta: number;
  partes: string[];
  testamento: "Todos" | Testamento;
  emocion: string | null;
}

function Tarjeta({ titulo, children, className = "", extra }: { titulo: string; children: ReactNode; className?: string; extra?: ReactNode }) {
  return (
    <section className={`aparecer rounded-xl border border-borde bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Indicador({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle: string }) {
  return (
    <div className="aparecer rounded-xl border border-borde bg-surface p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm text-muted">{etiqueta}</p>
      <p className="mt-1 truncate text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
      <p className="mt-1 truncate text-xs text-faint">{detalle}</p>
    </div>
  );
}

const campo =
  "w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm transition-shadow outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export default function Dashboard({ datos }: { datos: Datos }) {
  const total = datos.libro.totalPaginas;
  const inicial: Filtros = {
    desde: 1,
    hasta: total,
    partes: datos.partes.map((p) => p.id),
    testamento: "Todos",
    emocion: null,
  };
  const [filtros, setFiltros] = useState<Filtros>(inicial);
  const f = useDeferredValue(filtros);
  const recalculando = f !== filtros;

  const nombresPartes = useMemo(() => Object.fromEntries(datos.partes.map((p) => [p.id, p.nombre])), [datos.partes]);

  const r = useMemo(() => {
    const lo = Math.min(f.desde, f.hasta);
    const hi = Math.max(f.desde, f.hasta);
    const enRango = (pagina: number, parte: string) => pagina >= lo && pagina <= hi && f.partes.includes(parte);

    const paginas = datos.paginas.filter((p) => enRango(p.pagina, p.parte));
    const citas = datos.citas.filter(
      (c) => enRango(c.pagina, c.parte) && (f.testamento === "Todos" || c.testamento === f.testamento),
    );

    const sumar = (claves: string[], campoPag: "emociones" | "personajes") =>
      claves.map((k) => ({ etiqueta: k, valor: paginas.reduce((a, p) => a + (p[campoPag][k] ?? 0), 0) }));

    const emociones = sumar(datos.emociones, "emociones").sort((a, b) => b.valor - a.valor);
    const personajes = sumar(datos.personajes, "personajes")
      .filter((p) => p.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    const porLibro = new Map<string, { valor: number; testamento: Testamento }>();
    for (const c of citas) {
      const e = porLibro.get(c.libro) ?? { valor: 0, testamento: c.testamento };
      e.valor++;
      porLibro.set(c.libro, e);
    }
    const libros = [...porLibro.entries()]
      .map(([libro, e]) => ({
        etiqueta: libro,
        valor: e.valor,
        grupo: `${e.testamento} Testamento`,
        color: e.testamento === "Antiguo" ? "var(--series-1)" : "var(--series-2)",
      }))
      .sort((a, b) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, "es"));

    const serie = paginas.map((p) => ({
      pagina: p.pagina,
      parte: p.parte,
      valor: f.emocion ? (p.emociones[f.emocion] ?? 0) : Object.values(p.emociones).reduce((a, b) => a + b, 0),
    }));

    const totalMenciones = emociones.reduce((a, e) => a + e.valor, 0);
    return {
      paginas,
      citas,
      emociones,
      personajes,
      libros,
      serie,
      palabras: paginas.reduce((a, p) => a + p.palabras, 0),
      totalMenciones,
      mencionesSel: f.emocion ? (emociones.find((e) => e.etiqueta === f.emocion)?.valor ?? 0) : totalMenciones,
      antiguo: citas.filter((c) => c.testamento === "Antiguo").length,
    };
  }, [datos, f]);

  const dominante = r.emociones[0];
  const topPersonaje = r.personajes[0];
  const set = (parcial: Partial<Filtros>) => setFiltros((x) => ({ ...x, ...parcial }));
  const togglePartes = (id: string) =>
    set({ partes: filtros.partes.includes(id) ? filtros.partes.filter((p) => p !== id) : [...filtros.partes, id] });
  const toggleEmocion = (e: string) => set({ emocion: filtros.emocion === e ? null : e });
  const modificado = JSON.stringify(filtros) !== JSON.stringify(inicial);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="aparecer">
        <p className="text-sm font-medium text-accent">Dashboard del manuscrito</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{datos.libro.titulo}</h1>
        <p className="mt-2 text-sm text-muted">
          {datos.libro.autora} · {datos.libro.edicion} · ISBN {datos.libro.isbn} · {total} páginas
        </p>
      </header>

      {/* Filtros */}
      <section aria-label="Filtros" className="aparecer mt-6 rounded-xl border border-borde bg-surface p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium">Rango de páginas</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Desde la página"
                min={1}
                max={total}
                value={filtros.desde}
                onChange={(e) => set({ desde: Math.min(total, Math.max(1, Number(e.target.value) || 1)) })}
                className={campo}
              />
              <span className="text-muted">–</span>
              <input
                type="number"
                aria-label="Hasta la página"
                min={1}
                max={total}
                value={filtros.hasta}
                onChange={(e) => set({ hasta: Math.min(total, Math.max(1, Number(e.target.value) || total)) })}
                className={campo}
              />
            </div>
            <input
              type="range"
              aria-label="Página final"
              min={1}
              max={total}
              value={filtros.hasta}
              onChange={(e) => set({ hasta: Number(e.target.value) })}
              className="mt-3 w-full accent-[var(--accent)]"
            />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Emoción</span>
            <select value={filtros.emocion ?? ""} onChange={(e) => set({ emocion: e.target.value || null })} className={campo}>
              <option value="">Todas las emociones</option>
              {datos.emociones.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Testamento de las citas</span>
            <select value={filtros.testamento} onChange={(e) => set({ testamento: e.target.value as Filtros["testamento"] })} className={campo}>
              <option value="Todos">Ambos testamentos</option>
              <option value="Antiguo">Antiguo Testamento</option>
              <option value="Nuevo">Nuevo Testamento</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setFiltros(inicial)}
              disabled={!modificado}
              className="w-full rounded-lg border border-borde px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Restablecer filtros
            </button>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">Partes del libro</legend>
          <div className="flex flex-wrap gap-2">
            {datos.partes.map((p) => {
              const activa = filtros.partes.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => togglePartes(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    activa ? "border-accent bg-accent text-white" : "border-borde text-muted hover:border-accent hover:text-foreground"
                  }`}
                >
                  {p.id === "P" ? p.nombre : `${p.id}. ${p.nombre}`}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <div className={`transition-opacity duration-300 ${recalculando ? "opacity-60" : "opacity-100"}`} aria-busy={recalculando}>
        {/* Indicadores */}
        <section aria-label="Indicadores" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Indicador etiqueta="Páginas" valor={fmt.format(r.paginas.length)} detalle={`de ${total} del manuscrito`} />
          <Indicador etiqueta="Palabras" valor={fmt.format(r.palabras)} detalle={r.paginas.length ? `${fmt.format(Math.round(r.palabras / r.paginas.length))} por página` : "sin páginas"} />
          <Indicador
            etiqueta="Citas bíblicas"
            valor={fmt.format(r.citas.length)}
            detalle={`${r.libros.length} libros · ${r.antiguo} AT / ${r.citas.length - r.antiguo} NT`}
          />
          <Indicador
            etiqueta={filtros.emocion ? `Menciones de ${filtros.emocion.toLowerCase()}` : "Emoción dominante"}
            valor={filtros.emocion ? fmt.format(r.mencionesSel) : dominante && dominante.valor > 0 ? dominante.etiqueta : "—"}
            detalle={
              filtros.emocion
                ? `${r.totalMenciones ? Math.round((r.mencionesSel / r.totalMenciones) * 100) : 0}% de ${fmt.format(r.totalMenciones)} menciones`
                : dominante && dominante.valor > 0
                  ? `${fmt.format(dominante.valor)} menciones`
                  : "sin menciones"
            }
          />
          <Indicador
            etiqueta="Personaje más citado"
            valor={topPersonaje ? topPersonaje.etiqueta : "—"}
            detalle={topPersonaje ? `${fmt.format(topPersonaje.valor)} menciones` : "sin menciones"}
          />
        </section>

        {/* Gráficas */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Tarjeta titulo="Menciones de emociones" extra={<span className="text-xs text-faint">Clic en una barra para filtrar</span>}>
            <BarrasHorizontales
              datos={r.emociones}
              seleccion={filtros.emocion}
              onSeleccion={toggleEmocion}
              unidad="menciones"
              vacio="No se mencionan emociones en esta selección."
            />
          </Tarjeta>

          <Tarjeta
            titulo="Citas por libro bíblico"
            extra={
              <div className="flex gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm bg-serie1" />
                  Antiguo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-sm bg-serie2" />
                  Nuevo
                </span>
              </div>
            }
          >
            <BarrasHorizontales datos={r.libros.slice(0, 13)} unidad="citas" vacio="No hay citas bíblicas con estos filtros." />
            {r.libros.length > 13 && <p className="mt-3 text-xs text-faint">Se muestran los 13 libros más citados de {r.libros.length}.</p>}
          </Tarjeta>

          <Tarjeta
            titulo={filtros.emocion ? `«${filtros.emocion}» a lo largo del libro` : "Intensidad emocional a lo largo del libro"}
            className="lg:col-span-2"
            extra={<span className="text-xs text-faint">Menciones por página</span>}
          >
            <LineaPaginas puntos={r.serie} etiquetaSerie={filtros.emocion ?? "Emociones"} />
          </Tarjeta>

          <Tarjeta titulo="Personajes bíblicos mencionados" className="lg:col-span-2">
            <div className="max-w-3xl">
              <BarrasHorizontales datos={r.personajes} unidad="menciones" vacio="Ningún personaje mencionado en esta selección." />
            </div>
          </Tarjeta>
        </div>

        {/* Tabla */}
        <Tarjeta titulo="Citas bíblicas" className="mt-6">
          <TablaCitas citas={r.citas} nombresPartes={nombresPartes} />
        </Tarjeta>
      </div>

      <footer className="mt-8 text-xs text-faint">
        Fuente: {datos.fuente}. Datos extraídos automáticamente con <code className="font-mono">npm run extraer</code>.
      </footer>
    </main>
  );
}
