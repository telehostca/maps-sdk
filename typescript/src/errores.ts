/**
 * Los errores que TeleHost Maps devuelve a propósito.
 *
 * Existen porque el ruteo tiene una trampa que cuesta dinero: OSRM **no falla**
 * cuando un punto está fuera de su grafo — lo pega a la vía conocida más cercana
 * y responde una distancia creíble e inventada. Medido en producción:
 * Bogotá→Caracas devolvía `"Ok" · 991 km` pegando Caracas a 457 km del punto.
 * Si cobrás por kilómetro, cobrás una distancia que no existe.
 *
 * Este cliente los convierte en excepciones tipadas. Atrapalas y mostrale algo
 * honesto al usuario; nunca las ignores para "seguir igual".
 */
export class TeleHostError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/**
 * El punto está fuera de las zonas con grafo de rutas.
 *
 * Hay mapa (tiles) en más lugares de los que hay ruteo: ver una ciudad en el
 * mapa **no** implica poder rutear ahí.
 */
export class SinCobertura extends TeleHostError {
  constructor(
    readonly lat?: number,
    readonly lon?: number,
    /** Zona detectada, si la hay (p. ej. `us-south` cuando aún no tiene grafo). */
    readonly zona?: string | null,
  ) {
    super("ese punto está fuera de la cobertura de rutas");
  }
}

/**
 * Origen y destino caen en zonas distintas: no existe una ruta entre ellas.
 *
 * Pasa entre países y **también dentro de EE.UU.**, donde cada región es un
 * grafo independiente: Chicago→Nueva York no se rutea.
 */
export class RutaCruzaZonas extends TeleHostError {
  constructor(readonly zonas: string[]) {
    super(`origen y destino están en zonas distintas (${zonas.join(" ↔ ")}): no hay ruta entre ellas`);
  }
}

/**
 * Un punto quedó pegado demasiado lejos de una vía: la ruta sería ficción.
 * Es la guarda contra el `code:"Ok"` con distancia inventada.
 */
export class PuntoFueraDelGrafo extends TeleHostError {
  constructor(
    /** Posición del punto en la lista que se pidió (0 = origen). */
    readonly indice: number,
    /** A cuántos metros de una vía quedó pegado. */
    readonly metros: number,
    /** Nombre de la vía a la que se pegó, si OSRM lo trae. */
    readonly via?: string,
  ) {
    super(`el punto no tiene calles cerca: quedó pegado a ${metros} m`);
  }
}

/** El servidor respondió algo inesperado (red caída, 5xx, JSON roto, HTML). */
export class ErrorDeRed extends TeleHostError {
  constructor(mensaje: string, readonly codigo?: number) {
    super(mensaje);
  }
}
