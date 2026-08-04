/**
 * Cliente TypeScript de **TeleHost Maps** — el mapa propio de TeleHost C.A.
 *
 * Rutas y giro a giro en español en 27 zonas (América Latina, España y las 5
 * regiones de EE.UU.), búsqueda de 30 M de negocios, 856 K barrios y 168 M de
 * direcciones. Datos de OpenStreetMap y Overture Maps. Sin billing.
 *
 * Funciona igual en **React Native**, navegador y **Node ≥18**: solo usa `fetch`.
 *
 * ```ts
 * import { TeleHostMaps } from "@telehostnet/maps";
 *
 * const maps = new TeleHostMaps();
 * const yo = { lat: 10.4939, lon: -66.8772 };          // Sabana Grande, Caracas
 *
 * const r = await maps.buscar("farmacia", { cerca: yo });
 * const [ruta] = await maps.ruta(yo, r.lugares[0]!.punto, { moto: true });
 * ruta.pasos.forEach(p => console.log(p.instruccion));  // "Girá a la izquierda por…"
 * ```
 *
 * @packageDocumentation
 */
export { TeleHostMaps, type Opciones } from "./cliente.js";
export {
  TeleHostError,
  SinCobertura,
  RutaCruzaZonas,
  PuntoFueraDelGrafo,
  ErrorDeRed,
} from "./errores.js";
export {
  instruccionEnEspanol,
  distanciaLegible,
  duracionLegible,
  decodificarPolyline,
} from "./instrucciones.js";
export type {
  Punto, Lugar, Direccion, Resultados, Paso, Ruta, Zona, FilaMatriz, TipoBusqueda,
} from "./tipos.js";
export { controlDeMarca, MARCA, ATRIBUCION_OVERTURE, type OpcionesMarca } from "./marca.js";
