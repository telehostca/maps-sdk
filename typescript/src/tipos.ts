/** Un punto geográfico. */
export interface Punto {
  lat: number;
  lon: number;
}

/** Un negocio, barrio o urbanización del directorio. */
export interface Lugar {
  nombre: string;
  punto: Punto;
  /** Categoría de Overture (`pharmacy`, `bakery`…) o **`barrio`/`localidad`**. */
  categoria?: string;
  direccion?: string;
  ciudad?: string;
  /** Zona de TeleHost en minúscula (`ve`, `co`, `us-south`…). */
  pais?: string;
  /**
   * Distancia en línea recta al punto de búsqueda. **Mostralo en la UI**: sin él,
   * un resultado a 300 km parece un error de la búsqueda y no lo es.
   */
  km?: number;
  /** 0..1 de Overture. Sirve para ordenar, no para filtrar duro. */
  confianza?: number;
  /** `true` si es un barrio o urbanización, no un comercio. */
  esBarrio: boolean;
}

/**
 * Una dirección de calle y número.
 *
 * Solo existe donde el catastro del país es público (Brasil, México, España,
 * Colombia, Chile, Uruguay, EE.UU.). **Venezuela no tiene ninguna**: ahí se
 * resuelve por {@link Lugar} — negocios y barrios.
 */
export interface Direccion {
  /** Texto listo para mostrar: `"28 CALLE GRAN VIA, Madrid, 28013"`. */
  etiqueta: string;
  punto: Punto;
  calle?: string;
  numero?: string;
  ciudad?: string;
  estado?: string;
  cp?: string;
  pais?: string;
  km?: number;
}

/** Resultado de `buscar()`. */
export interface Resultados {
  lugares: Lugar[];
  direcciones: Direccion[];
  /**
   * A qué anillo (en km) apareció el primer resultado: 25, 100, 400 o `null`.
   *
   * Es la señal de confianza: 25 significa "está en tu ciudad"; 400 significa
   * "no hay nada cerca con ese nombre" y conviene decírselo al usuario.
   */
  radioKm: number | null;
  /** `true` si hubo que buscar lejos. Útil para mostrar un aviso. */
  lejos: boolean;
  vacio: boolean;
}

/** Un giro del recorrido. */
export interface Paso {
  /** Texto en español, ya armado: `"Girá a la izquierda por Avenida Urdaneta"`. */
  instruccion: string;
  metros: number;
  segundos: number;
  calle?: string;
  /** `maneuver.type` crudo de OSRM, por si querés armar tu propio texto. */
  tipo?: string;
  /** `maneuver.modifier` crudo de OSRM (`left`, `slight right`…). */
  modificador?: string;
}

/** Una ruta calculada. */
export interface Ruta {
  metros: number;
  segundos: number;
  km: number;
  minutos: number;
  /** Giro a giro en español. Vacío si no se pidieron pasos. */
  pasos: Paso[];
  /** La línea de la ruta, para dibujarla en el mapa. */
  geometria: Punto[];
  /** Zona en la que se ruteó (`ve`, `ve-moto`, `us-south`…). */
  zona: string;
  /** Geometría codificada (polyline5), para el mapa estático de WhatsApp. */
  polyline?: string;
}

/** Cobertura de un punto, según el servidor. */
export interface Zona {
  /** Código de la zona: `ve`, `co`, `us-south`… `null` si está fuera de todo. */
  cc: string | null;
  /** `true` si hay grafo de rutas ahí. */
  ruteable: boolean;
  nombre?: string;
}

/** Una fila de la matriz de despacho. `null` = ese punto quedó fuera del grafo. */
export interface FilaMatriz {
  minutos: number | null;
  km: number | null;
}

export type TipoBusqueda = "negocios" | "direcciones" | "ambos";
