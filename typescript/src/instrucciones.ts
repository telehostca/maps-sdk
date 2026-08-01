/**
 * Texto de los giros, en español.
 *
 * OSRM **no** devuelve instrucciones escritas: devuelve `maneuver.type` y
 * `maneuver.modifier`, y el texto lo arma el cliente (es lo mismo que hace
 * `osrm-text-instructions` en 30 idiomas). Sin esto, cada app termina
 * escribiendo su propia versión — y varias lo hacen mal.
 */
const GIROS: Record<string, string> = {
  "sharp right": "cerrada a la derecha",
  right: "a la derecha",
  "slight right": "leve a la derecha",
  "sharp left": "cerrada a la izquierda",
  left: "a la izquierda",
  "slight left": "leve a la izquierda",
  straight: "derecho",
  uturn: "en U",
};

/**
 * Arma la instrucción en español de un `step` de OSRM.
 *
 * Voseo ("Girá", "Seguí"), que es como habla el usuario de TeleHost. Si
 * necesitás tuteo, usá `paso.tipo` y `paso.modificador` y armá el texto vos.
 */
export function instruccionEnEspanol(paso: any): string {
  const m = paso?.maneuver ?? {};
  const mod = GIROS[m.modifier as string] ?? "";
  const nombre: string | undefined = paso?.name;
  const via = nombre ? ` por ${nombre}` : "";
  const limpio = (s: string) => s.replace(/\s{2,}/g, " ").trim();

  switch (m.type) {
    case "depart": return limpio(`Salí${via}`);
    case "arrive": return "Llegaste a destino";
    case "turn": return limpio(`Girá ${mod}${via}`);
    case "new name": return limpio(`Seguí${via}`);
    case "continue": return limpio(`Continuá ${mod}${via}`);
    case "merge": return limpio(`Incorporate ${mod}${via}`);
    case "on ramp": return limpio(`Tomá el acceso ${mod}${via}`);
    case "off ramp": return limpio(`Salí por la rampa ${mod}${via}`);
    case "fork": return limpio(`En la bifurcación, mantenete ${mod}${via}`);
    case "end of road": return limpio(`Al final de la calle, girá ${mod}${via}`);
    case "roundabout":
    case "rotary":
      return limpio(m.exit == null ? `En la rotonda, seguí${via}` : `En la rotonda, tomá la salida ${m.exit}${via}`);
    case "roundabout turn": return limpio(`En la rotonda, girá ${mod}${via}`);
    default: return limpio((mod ? `Girá ${mod}` : "Seguí") + via);
  }
}

/** Distancia legible: `"350 m"`, `"1,2 km"`, `"18 km"`. */
export function distanciaLegible(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  const km = metros / 1000;
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

/** Duración legible: `"9 min"`, `"1 h 20 min"`. */
export function duracionLegible(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Decodifica una geometría polyline5 de OSRM a puntos. */
export function decodificarPolyline(s: string, precision = 5): { lat: number; lon: number }[] {
  const factor = precision === 5 ? 1e5 : 1e6;
  const puntos: { lat: number; lon: number }[] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < s.length) {
    let shift = 0, resultado = 0, b: number;
    do { b = s.charCodeAt(i++) - 63; resultado |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
    shift = 0; resultado = 0;
    do { b = s.charCodeAt(i++) - 63; resultado |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
    puntos.push({ lat: lat / factor, lon: lon / factor });
  }
  return puntos;
}
