"use client";

import { useState } from "react";
import type { Barra } from "../lib/tipos";

const fmt = new Intl.NumberFormat("es-MX");

export function Vacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-borde p-6 text-center text-sm text-muted">
      <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18" />
        <path d="M7 15h2M11 11h2M15 7h2" strokeLinecap="round" />
      </svg>
      {mensaje}
    </div>
  );
}

/** Barras horizontales con etiqueta y valor directo; clic opcional para filtrar. */
export function BarrasHorizontales({
  datos,
  seleccion,
  onSeleccion,
  unidad,
  vacio,
}: {
  datos: Barra[];
  seleccion?: string | null;
  onSeleccion?: (etiqueta: string) => void;
  unidad: string;
  vacio: string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  if (datos.length === 0 || datos.every((d) => d.valor === 0)) return <Vacio mensaje={vacio} />;

  return (
    <ul className="flex flex-col gap-1">
      {datos.map((d) => {
        const activo = seleccion === d.etiqueta;
        const atenuado = seleccion != null && !activo;
        const contenido = (
          <>
            <span className="w-28 shrink-0 truncate text-left text-sm text-muted sm:w-36">{d.etiqueta}</span>
            <span className="relative h-5 flex-1">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width,opacity] duration-500 ease-out"
                style={{
                  width: `${(d.valor / max) * 100}%`,
                  minWidth: d.valor > 0 ? 3 : 0,
                  background: d.color ?? "var(--series-1)",
                  opacity: atenuado ? 0.3 : 1,
                }}
              />
            </span>
            <span className="w-10 shrink-0 text-right text-sm tabular-nums">{fmt.format(d.valor)}</span>
          </>
        );
        const titulo = `${d.etiqueta}: ${fmt.format(d.valor)} ${unidad}${d.grupo ? ` · ${d.grupo}` : ""}`;
        return (
          <li key={d.etiqueta}>
            {onSeleccion ? (
              <button
                type="button"
                title={titulo}
                aria-pressed={activo}
                onClick={() => onSeleccion(d.etiqueta)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {contenido}
              </button>
            ) : (
              <div title={titulo} className="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-surface-2">
                {contenido}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Serie por página con área + línea, cruz y tooltip al pasar el cursor. */
export function LineaPaginas({
  puntos,
  etiquetaSerie,
}: {
  puntos: { pagina: number; valor: number; parte: string }[];
  etiquetaSerie: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (puntos.length === 0) return <Vacio mensaje="No hay páginas en el rango seleccionado." />;

  const W = 720;
  const H = 220;
  const m = { t: 12, r: 12, b: 28, l: 32 };
  const max = Math.max(1, ...puntos.map((p) => p.valor));
  const techo = Math.ceil(max / 2) * 2 || 2;
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const x = (i: number) => m.l + (puntos.length === 1 ? iw / 2 : (i / (puntos.length - 1)) * iw);
  const y = (v: number) => m.t + ih - (v / techo) * ih;
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join("");
  const area = `${linea}L${x(puntos.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, techo / 2, techo];
  const paso = Math.max(1, Math.ceil(puntos.length / 8));
  const p = hover != null ? puntos[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={`${etiquetaSerie} por página`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - m.l) / iw) * (puntos.length - 1));
          setHover(Math.min(puntos.length - 1, Math.max(0, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={m.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--faint)">
              {t}
            </text>
          </g>
        ))}
        {puntos.map((pt, i) =>
          i % paso === 0 ? (
            <text key={pt.pagina} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--faint)">
              {pt.pagina}
            </text>
          ) : null,
        )}
        <path d={area} fill="var(--series-1)" opacity="0.12" />
        <path d={linea} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
        {p && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke="var(--muted)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(p.valor)} r="5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {p && hover != null && (
        <div
          className="pointer-events-none absolute top-1 rounded-md border border-borde bg-surface px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: hover > puntos.length / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
          }}
        >
          <div className="font-medium">Página {p.pagina}</div>
          <div className="text-muted">
            {etiquetaSerie}: <span className="tabular-nums text-foreground">{p.valor}</span>
          </div>
          <div className="text-faint">Parte {p.parte}</div>
        </div>
      )}
    </div>
  );
}
