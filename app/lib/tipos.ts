export type Testamento = "Antiguo" | "Nuevo";

export interface Parte {
  id: string;
  nombre: string;
  paginaInicio: number | null;
}

export interface Pagina {
  pagina: number;
  parte: string;
  palabras: number;
  citas: number;
  emociones: Record<string, number>;
  personajes: Record<string, number>;
}

export interface Cita {
  id: number;
  referencia: string;
  libro: string;
  testamento: Testamento;
  capitulo: number;
  versiculos: string;
  pagina: number;
  parte: string;
}

export interface Datos {
  generado: string;
  fuente: string;
  libro: {
    titulo: string;
    autora: string | null;
    isbn: string | null;
    edicion: string | null;
    totalPaginas: number;
  };
  partes: Parte[];
  emociones: string[];
  personajes: string[];
  paginas: Pagina[];
  citas: Cita[];
}

export interface Barra {
  etiqueta: string;
  valor: number;
  color?: string;
  grupo?: string;
}
