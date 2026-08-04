/**
 * La marca de TeleHost Maps, lista para montar.
 *
 * POR QUÉ ESTÁ EN EL PAQUETE Y NO EN EL README (2026-08-04): el README decía
 * «mostrá © OpenStreetMap · TeleHost Maps en tu mapa» y eso es una regla que
 * depende de que alguien la lea y la escriba bien. La app de repartidor salió a
 * producción sin una sola mención — ni la marca ni la atribución legal. Lo que
 * el paquete trae puesto se usa; lo que hay que acordarse, no.
 *
 * La atribución LEGAL ya no hace falta pedirla: desde 2026-08-04 viaja dentro
 * del style.json y MapLibre la muestra sola, en web y en nativo. Lo que sigue
 * necesitando código es el WATERMARK visible, que es lo que hay acá.
 */

/** El isotipo, dibujado inline: sin pedirlo a la red y sin depender del origen. */
function isotipoSvg(blanco: boolean): string {
  const relleno = blanco
    ? '#fff'
    : 'url(#thm-g)';
  const defs = blanco
    ? ""
    : '<defs><linearGradient id="thm-g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ED3237"/><stop offset="1" stop-color="#F30"/>' +
      "</linearGradient></defs>";
  // Fracciones tomadas del brand/icon.svg original (viewBox 14000, círculo r=47,5 %).
  const barras = [
    { x: 0.297, y: 0.265, w: 0.413, h: 0.104 },
    { x: 0.278, y: 0.415, w: 0.452, h: 0.176 },
    { x: 0.289, y: 0.635, w: 0.431, h: 0.101 },
  ]
    .map(b => `<rect x="${b.x * 100}" y="${b.y * 100}" width="${b.w * 100}" height="${b.h * 100}" rx="${(b.h * 100) / 2}" fill="${blanco ? "#ED3237" : "#fff"}"/>`)
    .join("");
  return (
    `<svg viewBox="0 0 100 100" width="15" height="15" aria-hidden="true">${defs}` +
    `<circle cx="50" cy="50" r="47.5" fill="${relleno}"/>${barras}</svg>`
  );
}

/** Los valores de la marca, por si tenés que dibujarla vos (React Native, canvas…). */
export const MARCA = {
  texto: "TeleHost Maps",
  enlace: "https://maps.telehost.net",
  rojo: "#ED3237",
  claro: { fondo: "rgba(255,255,255,.8)", tinta: "#1f2937" },
  oscuro: { fondo: "rgba(12,12,15,.55)", tinta: "#f4f4f5" },
  /** El isotipo como SVG inline. `blanco:true` para satélite y temas oscuros. */
  isotipo: isotipoSvg,
} as const;

/**
 * Atribución que agrega la PÁGINA sobre lo que ya dice el estilo.
 * OSM y la marca ya vienen en `sources[].attribution`: repetirlos acá los
 * muestra dos veces (MapLibre deduplica sólo por string exacta).
 * Overture sí va, y sólo si mostrás resultados de búsqueda: son sus datos.
 */
export const ATRIBUCION_OVERTURE =
  '<a href="https://overturemaps.org" target="_blank" rel="noopener">Overture Maps</a>';

export interface OpcionesMarca {
  /** Tema oscuro: para satélite, híbrido y dark-matter. */
  oscuro?: boolean;
}

/** Lo mínimo de un control de MapLibre, sin depender del tipo de la librería. */
interface ControlMapa {
  onAdd(): HTMLElement;
  onRemove(): void;
  getDefaultPosition?(): string;
}

/**
 * Watermark de TeleHost Maps para **maplibre-gl en web**.
 *
 * ```ts
 * import { controlDeMarca } from "@telehostnet/maps";
 * const marca = controlDeMarca();
 * map.addControl(marca, "bottom-left");
 * marca.tema(true);            // al pasar a satélite
 * ```
 *
 * En React Native el mapa es nativo y no hay DOM: usá `MARCA` para armar la
 * misma píldora con un `View` (mismos colores, mismo texto, mismo enlace).
 */
export function controlDeMarca(opc: OpcionesMarca = {}): ControlMapa & { tema(oscuro: boolean): void } {
  let oscuro = !!opc.oscuro;
  let raiz: HTMLElement | null = null;

  const pintar = () => {
    if (!raiz) return;
    const t = oscuro ? MARCA.oscuro : MARCA.claro;
    raiz.innerHTML =
      `<a href="${MARCA.enlace}" target="_blank" rel="noopener" title="${MARCA.texto}" ` +
      `style="display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:9px;` +
      `text-decoration:none;background:${t.fondo};color:${t.tinta};` +
      `font:600 12px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;` +
      `box-shadow:0 1px 4px rgba(15,23,42,.18);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)">` +
      MARCA.isotipo(oscuro) +
      `<span>TeleHost&nbsp;<b style="font-weight:800">Maps</b></span></a>`;
  };

  return {
    onAdd() {
      raiz = document.createElement("div");
      raiz.className = "maplibregl-ctrl thm-marca";
      pintar();
      return raiz;
    },
    onRemove() {
      raiz?.parentNode?.removeChild(raiz);
      raiz = null;
    },
    getDefaultPosition: () => "bottom-left",
    /** Cambia el tema en vivo, al alternar de basemap. */
    tema(o: boolean) {
      oscuro = !!o;
      pintar();
    },
  };
}
