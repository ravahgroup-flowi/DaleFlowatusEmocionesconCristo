# Dashboard · Dale Flow a tus Emociones con Cristo

Dashboard en Next.js construido a partir del manuscrito PDF ubicado en `./fuente` (única fuente de datos).

## Comandos

```bash
npm install
npm run extraer   # convierte el PDF de ./fuente en data/datos.json
npm run dev       # http://localhost:3000
npm run build
npm run lint
```

## Datos (`data/datos.json`)

- `libro`: título, autora, ISBN, edición y total de páginas.
- `partes`: las 4 partes del índice (más preliminares) con su página de inicio.
- `paginas`: por cada página, su parte, palabras, citas y menciones de cada emoción y personaje bíblico.
- `citas`: cada cita bíblica detectada (referencia, libro, testamento, capítulo, versículos, página y parte).

## Dashboard

- Filtros: rango de páginas, partes del libro, emoción y testamento; todo se recalcula al instante.
- Indicadores: páginas, palabras, citas bíblicas, emoción dominante y personaje más citado.
- Gráficas: menciones por emoción (clic para filtrar), citas por libro bíblico, intensidad emocional por página y personajes.
- Tabla de citas con búsqueda y ordenamiento por columna.
