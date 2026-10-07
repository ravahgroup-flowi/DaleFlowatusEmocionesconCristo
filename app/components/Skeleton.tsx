export function Bloque({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export default function SkeletonDashboard() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-10" aria-busy="true" aria-label="Cargando dashboard">
      <Bloque className="h-8 w-2/3 max-w-md" />
      <Bloque className="mt-3 h-4 w-1/2 max-w-sm" />
      <Bloque className="mt-6 h-28 w-full" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Bloque key={i} className="h-28" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Bloque className="h-80" />
        <Bloque className="h-80" />
        <Bloque className="h-72 lg:col-span-2" />
      </div>
      <Bloque className="mt-6 h-96 w-full" />
    </div>
  );
}
