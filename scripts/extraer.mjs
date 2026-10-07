// Convierte el PDF de ./fuente en data/datos.json.
// Uso: npm run extraer
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const RAIZ = process.cwd();
const DIR_FUENTE = path.join(RAIZ, "fuente");
const SALIDA = path.join(RAIZ, "data", "datos.json");

// Partes del libro según el índice (página 4 del PDF).
const PARTES = [
  { id: "P", nombre: "Preliminares", marcador: null },
  { id: "I", nombre: "Aquí empieza el Flow", marcador: /^\s*I\.\s*INTRODUCCI/m },
  { id: "II", nombre: "Dios siente contigo", marcador: /^\s*II\.\s*TEOLOG/m },
  { id: "III", nombre: "Cuando lo que sientes… te sacude", marcador: /^\s*III\.\s*EMOCIONES/m },
  // La parte IV no tiene encabezado de texto: el índice la describe como
  // "Respira. Ora. Entrega." y comienza en la página que contiene esos tres bloques.
  { id: "IV", nombre: "Dale Flow a tus emociones con Cristo", marcador: /Respira[\s\S]*Ora[\s\S]*Entrega/ },
];

const EMOCIONES = {
  Alegría: ["alegr[ií]a", "alegre", "alegres", "gozo", "gozarnos", "felicidad", "feliz"],
  Tristeza: ["tristeza", "triste", "tristes", "llanto", "llorar", "lloraba", "lloras", "lloran", "l[aá]grimas?"],
  Miedo: ["miedo", "miedos", "temor", "temores", "asustad[oa]", "terror", "espantos?"],
  Enojo: ["enojo", "enojad[oa]", "enojarte", "ira", "airado", "indignaci[oó]n", "coraje"],
  Ansiedad: ["ansiedad", "ansios[oa]", "angustia", "angustiad[oa]"],
  Amor: ["amor", "amas?", "amo", "ternura"],
  Paz: ["paz"],
  Culpa: ["culpa", "culpable", "verg[uü]enza"],
  Frustración: ["frustraci[oó]n", "frustrad[oa]"],
  Dolor: ["dolor", "dolores", "herida", "heridas", "herid[oa]"],
  Esperanza: ["esperanza"],
  Gratitud: ["gratitud", "agradecid[oa]"],
  Compasión: ["compasi[oó]n", "empat[ií]a"],
};

const PERSONAJES = {
  Jesús: ["Jes[uú]s", "Cristo"],
  David: ["David"],
  Jeremías: ["Jerem[ií]as"],
  Ana: ["Ana(?!\\s+Sotelo)"],
  Jonás: ["Jon[aá]s"],
  María: ["Mar[ií]a(?!\\s+Magdalena)"],
  "María Magdalena": ["Magdalena"],
  José: ["Jos[eé]"],
  Moisés: ["Mois[eé]s"],
  Job: ["Job"],
  Elí: ["El[ií](?=[\\s,.])"],
};

const LIBROS_AT = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué", "Jueces", "Rut",
  "Samuel", "Reyes", "Crónicas", "Esdras", "Nehemías", "Ester", "Job", "Salmos",
  "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones",
  "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas", "Nahúm",
  "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías",
];
const LIBROS_NT = [
  "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos", "Corintios", "Gálatas",
  "Efesios", "Filipenses", "Colosenses", "Tesalonicenses", "Timoteo", "Tito", "Filemón",
  "Hebreos", "Santiago", "Pedro", "Judas", "Apocalipsis",
];

const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Permite espacios espurios entre letras (el PDF parte palabras: "S amuel").
function patronLibro(nombre) {
  const base = nombre === "Salmos" ? "Salmo" : nombre;
  const letras = [...base].map((c) => {
    const plano = sinAcentos(c);
    const clase = plano !== c ? `[${c}${plano}${c.toUpperCase()}${plano.toUpperCase()}]` : c;
    return clase;
  });
  return letras.join("\\s?") + (nombre === "Salmos" ? "s?" : "");
}

const TODOS_LIBROS = [
  ...LIBROS_AT.map((l) => ({ libro: l, testamento: "Antiguo" })),
  ...LIBROS_NT.map((l) => ({ libro: l, testamento: "Nuevo" })),
];
const RE_CITA = new RegExp(
  "(?:\\b([123])\\s+)?(" +
    TODOS_LIBROS.map((l) => patronLibro(l.libro)).join("|") +
    ")\\s+(\\d{1,3})\\s*:\\s*(\\d{1,3}(?:\\s*[–-]\\s*\\d{1,3})?(?:\\s*,\\s*\\d{1,3})*)",
  "g",
);

function identificarLibro(texto) {
  const limpio = sinAcentos(texto.replace(/\s/g, "")).toLowerCase();
  return TODOS_LIBROS.find((l) => {
    const n = sinAcentos(l.libro).toLowerCase();
    return limpio === n || (l.libro === "Salmos" && limpio === "salmo");
  });
}

function limpiarTexto(t) {
  return t
    .replace(/\/g[0-9A-F]{2,4}/g, " ") // glifos sin mapear
    .replace(/(\S{3,}?(?:\s\S+){0,3}?)\1/g, "$1") // texto duplicado por sombras de Canva
    .replace(/[ \t]+/g, " ");
}

function contar(texto, formas) {
  const re = new RegExp(`(?<![\\p{L}])(?:${formas.join("|")})(?![\\p{L}])`, "giu");
  return (texto.match(re) || []).length;
}

async function leerPaginas(archivo) {
  const datos = new Uint8Array(await readFile(archivo));
  const doc = await getDocument({ data: datos, useSystemFonts: true, verbosity: 0 }).promise;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const contenido = await pagina.getTextContent();
    let texto = "";
    for (const item of contenido.items) {
      if (!("str" in item)) continue;
      texto += item.str + (item.hasEOL ? "\n" : "");
    }
    paginas.push(texto);
  }
  const meta = await doc.getMetadata().catch(() => ({ info: {} }));
  return { paginas, info: meta.info ?? {} };
}

async function main() {
  const archivos = (await readdir(DIR_FUENTE)).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (archivos.length === 0) throw new Error("No se encontró ningún PDF en ./fuente");
  const archivo = path.join(DIR_FUENTE, archivos[0]);
  console.log(`Leyendo ${archivos[0]}…`);

  const { paginas, info } = await leerPaginas(archivo);
  const textos = paginas.map(limpiarTexto);

  // Asignar parte a cada página según el primer marcador encontrado.
  // Cada búsqueda empieza después de la parte anterior para no confundirse con el índice.
  const inicioParte = [];
  PARTES.forEach((p, i) => {
    if (!p.marcador) return inicioParte.push(1);
    const desde = Math.max(inicioParte[i - 1] ?? 1, 5);
    const idx = textos.findIndex((t, n) => n + 1 > desde && p.marcador.test(t));
    inicioParte.push(idx + 1);
  });
  const parteDe = (n) => {
    let actual = PARTES[0];
    PARTES.forEach((p, i) => {
      if (inicioParte[i] > 0 && n >= inicioParte[i]) actual = p;
    });
    return actual;
  };

  const citas = [];
  const filasPaginas = textos.map((texto, idx) => {
    const numero = idx + 1;
    const parte = parteDe(numero);
    const plano = texto.replace(/\s*\n\s*/g, " ");
    const palabras = (plano.match(/\p{L}+/gu) || []).length;

    const emociones = {};
    for (const [emocion, formas] of Object.entries(EMOCIONES)) {
      emociones[emocion] = contar(plano, formas);
    }
    const personajes = {};
    for (const [nombre, formas] of Object.entries(PERSONAJES)) {
      personajes[nombre] = contar(plano, formas);
    }

    let citasPagina = 0;
    for (const m of plano.matchAll(RE_CITA)) {
      const libro = identificarLibro(m[2]);
      if (!libro) continue;
      const prefijo = m[1] && ["Samuel", "Reyes", "Crónicas", "Corintios", "Tesalonicenses", "Timoteo", "Pedro", "Juan"].includes(libro.libro) ? `${m[1]} ` : "";
      const versiculos = m[4].replace(/\s+/g, "").replace(/-/g, "–").replace(/,/g, ", ");
      citas.push({
        id: citas.length + 1,
        referencia: `${prefijo}${libro.libro} ${m[3]}:${versiculos}`,
        libro: `${prefijo}${libro.libro}`,
        testamento: libro.testamento,
        capitulo: Number(m[3]),
        versiculos,
        pagina: numero,
        parte: parte.id,
      });
      citasPagina++;
    }

    return { pagina: numero, parte: parte.id, palabras, citas: citasPagina, emociones, personajes };
  });

  const texto2 = textos[1] ?? "";
  const isbn = texto2.match(/ISBN:\s*([\d-]+)/)?.[1] ?? null;
  const edicion = texto2.match(/(Primera|Segunda|Tercera) edición,?\s*(\d{4})/);

  const salida = {
    generado: new Date().toISOString(),
    fuente: archivos[0],
    libro: {
      titulo: "Dale Flow a tus Emociones con Cristo",
      autora: info.Author ?? null,
      isbn,
      edicion: edicion ? `${edicion[1]} edición, ${edicion[2]}` : null,
      totalPaginas: paginas.length,
    },
    partes: PARTES.map((p, i) => ({
      id: p.id,
      nombre: p.nombre,
      paginaInicio: inicioParte[i] || null,
    })),
    emociones: Object.keys(EMOCIONES),
    personajes: Object.keys(PERSONAJES),
    paginas: filasPaginas,
    citas,
  };

  await mkdir(path.dirname(SALIDA), { recursive: true });
  await writeFile(SALIDA, JSON.stringify(salida, null, 2), "utf8");
  console.log(
    `Listo: ${filasPaginas.length} páginas, ${citas.length} citas bíblicas → ${path.relative(RAIZ, SALIDA)}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
