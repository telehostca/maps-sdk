import {
  ErrorDeRed,
  PuntoFueraDelGrafo,
  RutaCruzaZonas,
  SinCobertura,
  TeleHostError,
} from "./errores.js";
import { decodificarPolyline, instruccionEnEspanol } from "./instrucciones.js";
import type {
  Direccion,
  FilaMatriz,
  Lugar,
  Paso,
  Punto,
  Resultados,
  Ruta,
  TipoBusqueda,
  Zona,
} from "./tipos.js";

export interface Opciones {
  /** Base del servidor. Por defecto `https://maps.telehost.net`. */
  base?: string;
  /**
   * `thmk_…` — solo para endpoints de producto (tracking, despacho, combustible).
   * **Va únicamente en tu backend**, nunca compilada en la app.
   */
  apiKey?: string;
  /**
   * Tolerancia de *snap*: si OSRM tuvo que pegar un punto más lejos que esto, la
   * ruta se considera inventada y se lanza {@link PuntoFueraDelGrafo}.
   *
   * 10 km es generoso a propósito: una dirección rural legítima puede estar a
   * cientos de metros de la vía mapeada. Bajarlo de ~2 km empieza a rechazar
   * direcciones reales.
   */
  snapMaximoMetros?: number;
  /** `fetch` alternativo (para tests o entornos sin fetch global). */
  fetch?: typeof globalThis.fetch;
}

/**
 * Cliente de TeleHost Maps.
 *
 * Funciona igual en **React Native**, navegador y **Node ≥18**: solo usa `fetch`.
 * Casi todo es público — buscar, rutear y consultar cobertura no necesitan llave.
 *
 * ```ts
 * const maps = new TeleHostMaps();
 * const r = await maps.buscar("farmacia", { cerca: { lat: 10.4939, lon: -66.8772 } });
 * ```
 */
export class TeleHostMaps {
  readonly base: string;
  readonly snapMaximoMetros: number;
  #apiKey?: string;
  #fetch: typeof globalThis.fetch;
  #cacheZonas = new Map<string, Zona>();

  constructor(op: Opciones = {}) {
    this.base = (op.base ?? "https://maps.telehost.net").replace(/\/$/, "");
    this.snapMaximoMetros = op.snapMaximoMetros ?? 10_000;
    this.#apiKey = op.apiKey;
    const f = op.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error(
        "no hay fetch disponible: usá Node ≥18, un navegador, React Native, o pasá { fetch } en las opciones",
      );
    }
    this.#fetch = f.bind(globalThis);
  }

  async #get(ruta: string, q?: Record<string, string | number | boolean | undefined>): Promise<any> {
    const url = new URL(this.base + ruta);
    for (const [k, v] of Object.entries(q ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    let r: Response;
    try {
      r = await this.#fetch(url.toString(), {
        headers: { accept: "application/json", ...(this.#apiKey ? { "x-api-key": this.#apiKey } : {}) },
      });
    } catch (e) {
      throw new ErrorDeRed(`no se pudo conectar: ${(e as Error).message}`);
    }
    // OJO: el gateway devuelve 200 con HTML para rutas inexistentes
    // (`try_files … /index.html`). Mirar solo el código de estado no alcanza.
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      throw new ErrorDeRed(
        `la respuesta no es JSON (${r.status}, ${ct}) — revisá la URL: una ruta inexistente devuelve HTML con código 200`,
        r.status,
      );
    }
    const cuerpo = await r.json();
    if (r.status === 422) throw this.#traducir422(cuerpo);
    if (!r.ok) throw new ErrorDeRed(cuerpo?.error ?? r.statusText, r.status);
    return cuerpo;
  }

  #traducir422(d: any): TeleHostError {
    switch (d?.error) {
      case "ruta-cruza-cobertura":
        return new RutaCruzaZonas(d.paises ?? []);
      case "punto-fuera-del-grafo":
        return new PuntoFueraDelGrafo(d.indice ?? 0, d.pegado_a_m ?? 0, d.via ?? undefined);
      default:
        return new SinCobertura(d?.punto?.lat, d?.punto?.lon, d?.pais ?? null);
    }
  }

  // ───────────────────────────── directorio ─────────────────────────────

  /**
   * Busca negocios, barrios y direcciones **cerca del usuario**.
   *
   * La ubicación manda: parte de `cerca` y abre anillos de 25, 100 y 400 km hasta
   * encontrar. Por eso quien está en Barinas ve Barinas y quien está en Ciudad de
   * México ve México — sin filtrar por país, así el de la frontera sigue viendo
   * el otro lado.
   *
   * Revisá `radioKm`: si es grande, no había nada cerca.
   */
  async buscar(
    texto: string,
    op: {
      cerca?: Punto;
      limite?: number;
      tipo?: TipoBusqueda;
      /**
       * Descarta direcciones más lejanas que esto (por defecto 150 km). En
       * Venezuela conviene dejarlo: como no hay catastro, el anillo de
       * direcciones se abre muy lejos. `null` para no filtrar.
       */
      maxKmDirecciones?: number | null;
    } = {},
  ): Promise<Resultados> {
    const { cerca, limite = 8, tipo = "ambos", maxKmDirecciones = 150 } = op;
    const j = await this.#get("/api/biz/buscar", {
      q: texto,
      lat: cerca?.lat,
      lon: cerca?.lon,
      limit: limite,
      tipo,
    });

    const lugares: Lugar[] = (j.negocios ?? []).map((n: any) => ({
      nombre: n.nombre,
      punto: { lat: n.lat, lon: n.lon },
      categoria: n.categoria ?? undefined,
      direccion: n.direccion ?? undefined,
      ciudad: n.ciudad ?? undefined,
      pais: n.pais ?? undefined,
      km: n.km ?? undefined,
      confianza: n.confianza ?? undefined,
      esBarrio: n.categoria === "barrio" || n.categoria === "localidad",
    }));

    const direcciones: Direccion[] = (j.direcciones ?? [])
      .map((d: any) => ({
        etiqueta: d.etiqueta,
        punto: { lat: d.lat, lon: d.lon },
        calle: d.calle ?? undefined,
        numero: d.numero ?? undefined,
        ciudad: d.ciudad ?? undefined,
        estado: d.estado ?? undefined,
        cp: d.cp ?? undefined,
        pais: d.pais ?? undefined,
        km: d.km ?? undefined,
      }))
      .filter((d: Direccion) => maxKmDirecciones == null || (d.km ?? 0) <= maxKmDirecciones);

    const radioKm = j.radio_km ?? null;
    return {
      lugares,
      direcciones,
      radioKm,
      lejos: (radioKm ?? 0) > 100,
      vacio: lugares.length === 0 && direcciones.length === 0,
    };
  }

  /** Qué hay alrededor de un punto, sin que el usuario escriba nada. */
  async cerca(punto: Punto, op: { km?: number; limite?: number } = {}): Promise<Lugar[]> {
    const j = await this.#get("/api/biz/cerca", {
      lat: punto.lat,
      lon: punto.lon,
      km: op.km ?? 3,
      limit: op.limite ?? 10,
    });
    return (j.lugares ?? []).map((n: any) => ({
      nombre: n.nombre,
      punto: { lat: n.lat, lon: n.lon },
      categoria: n.categoria ?? undefined,
      direccion: n.direccion ?? undefined,
      ciudad: n.ciudad ?? undefined,
      pais: n.pais ?? undefined,
      km: n.km ?? undefined,
      esBarrio: n.categoria === "barrio" || n.categoria === "localidad",
    }));
  }

  // ───────────────────────────── cobertura ─────────────────────────────

  /**
   * Zona de ruteo de un punto. **Nunca cablees `ve`/`co` en tu código**: la
   * cobertura crece y este endpoint es la única fuente de verdad.
   *
   * Se cachea en memoria (el servidor lo marca cacheable por 1 h).
   */
  async zonaDe(p: Punto): Promise<Zona> {
    const clave = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
    const guardada = this.#cacheZonas.get(clave);
    if (guardada) return guardada;
    const j = await this.#get("/api/biz/config/country", { lat: p.lat, lon: p.lon });
    const z: Zona = { cc: j.cc ?? null, ruteable: j.ruteable === true, nombre: j.nombre ?? undefined };
    this.#cacheZonas.set(clave, z);
    return z;
  }

  // ─────────────────────────────── rutas ───────────────────────────────

  /**
   * Calcula la ruta entre dos puntos, con giro a giro en español.
   *
   * Resuelve la zona sola (o pasale `zona` si ya la sabés) y **valida el snap**:
   * si OSRM tuvo que pegar un punto a más de `snapMaximoMetros`, lanza
   * {@link PuntoFueraDelGrafo} en vez de devolver una distancia inventada.
   *
   * Con `moto: true` pide el perfil de moto donde exista (hoy solo Venezuela).
   * Ojo con el ETA: la moto gana 21-27 % en vías de superficie pero 0-1 % cuando
   * la ruta usa autopista — no prometas un porcentaje fijo.
   *
   * @throws {RutaCruzaZonas} si origen y destino están en zonas distintas —
   * pasa entre países y también entre regiones de EE.UU.
   */
  async ruta(
    origen: Punto,
    destino: Punto,
    op: { zona?: string; moto?: boolean; alternativas?: boolean; pasos?: boolean } = {},
  ): Promise<Ruta[]> {
    let z = op.zona;
    if (!z) {
      const zo = await this.zonaDe(origen);
      if (!zo.ruteable) throw new SinCobertura(origen.lat, origen.lon, zo.cc);
      const zd = await this.zonaDe(destino);
      if (!zd.ruteable) throw new SinCobertura(destino.lat, destino.lon, zd.cc);
      if (zo.cc !== zd.cc) throw new RutaCruzaZonas([zo.cc!, zd.cc!]);
      z = zo.cc!;
    }
    const perfil = op.moto && z === "ve" ? "ve-moto" : z;

    const j = await this.#get(
      `/route/${perfil}/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}`,
      {
        overview: "full",
        geometries: "polyline",
        steps: op.pasos ?? true,
        alternatives: op.alternativas ?? true,
      },
    );
    if (j.code !== "Ok") throw new ErrorDeRed(`OSRM: ${j.code}`);

    // La guarda que evita cobrar kilómetros que no existen.
    const wps: any[] = j.waypoints ?? [];
    for (let i = 0; i < wps.length; i++) {
      const d = Number(wps[i]?.distance ?? 0);
      if (d > this.snapMaximoMetros) {
        throw new PuntoFueraDelGrafo(i, Math.round(d), wps[i]?.name || undefined);
      }
    }

    return (j.routes ?? []).map((r: any): Ruta => {
      const steps: any[] = r.legs?.[0]?.steps ?? [];
      const pasos: Paso[] = steps.map((s) => ({
        instruccion: instruccionEnEspanol(s),
        metros: s.distance ?? 0,
        segundos: s.duration ?? 0,
        calle: s.name || undefined,
        tipo: s.maneuver?.type,
        modificador: s.maneuver?.modifier,
      }));
      return {
        metros: r.distance ?? 0,
        segundos: r.duration ?? 0,
        km: (r.distance ?? 0) / 1000,
        minutos: Math.round((r.duration ?? 0) / 60),
        pasos,
        geometria: typeof r.geometry === "string" ? decodificarPolyline(r.geometry) : [],
        zona: perfil!,
        polyline: typeof r.geometry === "string" ? r.geometry : undefined,
      };
    });
  }

  /**
   * Tiempos y distancias reales entre varios orígenes y un destino.
   *
   * Es lo que hay que usar para elegir el repartidor más cercano: ordena por
   * **minutos de manejo**, no por línea recta — el que está "cerca" cruzando el
   * río pero a 15 min por el puente deja de ganar el pedido.
   *
   * Los orígenes cuyo punto quede pegado a más de `snapMaximoMetros` vuelven con
   * `null`: son GPS basura o de otra zona, y no deben ganar el ranking.
   */
  async matriz(
    origenes: Punto[],
    destino: Punto,
    op: { zona?: string; moto?: boolean } = {},
  ): Promise<FilaMatriz[]> {
    if (origenes.length === 0) return [];
    let z = op.zona;
    if (!z) {
      const zd = await this.zonaDe(destino);
      if (!zd.ruteable) throw new SinCobertura(destino.lat, destino.lon, zd.cc);
      z = zd.cc!;
    }
    const perfil = op.moto && z === "ve" ? "ve-moto" : z;
    const coords = [...origenes.map((p) => `${p.lon},${p.lat}`), `${destino.lon},${destino.lat}`].join(";");

    const j = await this.#get(`/route/${perfil}/table/v1/driving/${coords}`, {
      sources: origenes.map((_, i) => i).join(";"),
      destinations: origenes.length,
      annotations: "duration,distance",
    });
    if (j.code !== "Ok") throw new ErrorDeRed(`OSRM: ${j.code}`);

    return origenes.map((_, i): FilaMatriz => {
      const snap = Number(j.sources?.[i]?.distance ?? 0);
      if (snap > this.snapMaximoMetros) return { minutos: null, km: null };
      const s = j.durations?.[i]?.[0];
      const m = j.distances?.[i]?.[0];
      return {
        minutos: typeof s === "number" ? s / 60 : null,
        km: typeof m === "number" ? m / 1000 : null,
      };
    });
  }

  // ───────────────────────── mapa estático ─────────────────────────

  /**
   * URL de un PNG con la ruta dibujada — para mandar por WhatsApp.
   *
   * Pesa poco y se ve sin abrir nada, que en Venezuela importa. Pasale
   * `ruta.polyline`.
   *
   * Los parámetros de estilo son `stroke`/`width` (tileserver). Con
   * `weight`/`color` (sintaxis de Google) el servidor responde 400.
   */
  urlMapaEstatico(
    polyline: string,
    op: { ancho?: number; alto?: number; color?: string; grosor?: number; estilo?: string } = {},
  ): string {
    const { ancho = 600, alto = 400, color = "#ED3237", grosor = 5, estilo = "telehost" } = op;
    const path = `stroke:${encodeURIComponent(color)}|width:${grosor}|enc:${polyline}`;
    return `${this.base}/styles/${estilo}/static/auto/${ancho}x${alto}.png?path=${encodeURIComponent(path)}`;
  }

  /** URL del estilo para MapLibre (React Native o web). */
  urlEstilo(estilo = "telehost"): string {
    return `${this.base}/styles/${estilo}/style.json`;
  }
}
