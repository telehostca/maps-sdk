import assert from "node:assert/strict";
import { test } from "node:test";
import { TeleHostMaps } from "./cliente.js";
import { ErrorDeRed, PuntoFueraDelGrafo, RutaCruzaZonas } from "./errores.js";
import { distanciaLegible, duracionLegible, decodificarPolyline, instruccionEnEspanol } from "./instrucciones.js";

/** Cliente falso: responde lo que le digas, sin salir a la red. */
const conRespuesta = (cuerpo: unknown, status = 200, tipo = "application/json") =>
  new TeleHostMaps({
    fetch: (async () =>
      new Response(JSON.stringify(cuerpo), {
        status,
        headers: { "content-type": tipo },
      })) as typeof fetch,
  });

// ── instrucciones en español ──
test("instrucción: gira con nombre de calle", () => {
  assert.equal(
    instruccionEnEspanol({ maneuver: { type: "turn", modifier: "left" }, name: "Avenida Urdaneta" }),
    "Girá a la izquierda por Avenida Urdaneta",
  );
});
test("instrucción: salida y llegada", () => {
  assert.equal(instruccionEnEspanol({ maneuver: { type: "depart" }, name: "Calle 5" }), "Salí por Calle 5");
  assert.equal(instruccionEnEspanol({ maneuver: { type: "arrive" } }), "Llegaste a destino");
});
test("instrucción: rotonda con salida numerada", () => {
  assert.equal(
    instruccionEnEspanol({ maneuver: { type: "roundabout", exit: 2 }, name: "" }),
    "En la rotonda, tomá la salida 2",
  );
});
test("instrucción: sin nombre no deja espacios dobles", () => {
  const t = instruccionEnEspanol({ maneuver: { type: "turn", modifier: "right" }, name: "" });
  assert.equal(t, "Girá a la derecha");
});

// ── formato ──
test("distancia legible", () => {
  assert.equal(distanciaLegible(350), "350 m");
  assert.equal(distanciaLegible(1234), "1,2 km");
  assert.equal(distanciaLegible(18400), "18 km");
});
test("duración legible", () => {
  assert.equal(duracionLegible(540), "9 min");
  assert.equal(duracionLegible(4800), "1 h 20 min");
  assert.equal(duracionLegible(7200), "2 h");
});
test("polyline: ejemplo canónico de Google", () => {
  const p = decodificarPolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  assert.equal(p.length, 3);
  assert.ok(Math.abs(p[0]!.lat - 38.5) < 0.001);
  assert.ok(Math.abs(p[0]!.lon - -120.2) < 0.001);
});

// ── la guarda que evita cobrar de más (trampa #48) ──
test("snap: un punto pegado a 457 km hace fallar la ruta", async () => {
  const maps = conRespuesta({
    code: "Ok",
    waypoints: [{ distance: 12 }, { distance: 457796, name: "Carretera Nacional" }],
    routes: [{ distance: 991000, duration: 50000, geometry: "_p~iF~ps|U", legs: [] }],
  });
  await assert.rejects(
    () => maps.ruta({ lat: 4.711, lon: -74.072 }, { lat: 10.504, lon: -66.903 }, { zona: "co" }),
    (e: unknown) => e instanceof PuntoFueraDelGrafo && e.metros === 457796 && e.indice === 1,
  );
});

test("snap: distancias normales de una dirección real pasan", async () => {
  const maps = conRespuesta({
    code: "Ok",
    waypoints: [{ distance: 8 }, { distance: 312 }],
    routes: [
      {
        distance: 6900,
        duration: 540,
        geometry: "_p~iF~ps|U",
        legs: [
          {
            steps: [
              { maneuver: { type: "depart" }, name: "Calle Unión", distance: 172, duration: 30 },
              { maneuver: { type: "arrive" }, name: "", distance: 0, duration: 0 },
            ],
          },
        ],
      },
    ],
  });
  const [r] = await maps.ruta({ lat: 10.5, lon: -66.9 }, { lat: 10.49, lon: -66.85 }, { zona: "ve" });
  assert.ok(Math.abs(r!.km - 6.9) < 0.01);
  assert.equal(r!.minutos, 9);
  assert.equal(r!.pasos[0]!.instruccion, "Salí por Calle Unión");
});

// ── errores del servidor ──
test("422 ruta-cruza-cobertura se traduce", async () => {
  const maps = conRespuesta({ error: "ruta-cruza-cobertura", paises: ["us-midwest", "us-northeast"] }, 422);
  await assert.rejects(
    () => maps.ruta({ lat: 41.87, lon: -87.63 }, { lat: 40.71, lon: -74.0 }, { zona: "us-midwest" }),
    (e: unknown) => e instanceof RutaCruzaZonas && e.zonas.length === 2,
  );
});

test("200 con HTML no se toma por bueno (el gateway hace try_files)", async () => {
  const maps = new TeleHostMaps({
    fetch: (async () =>
      new Response("<!doctype html><html>…", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch,
  });
  await assert.rejects(
    () => maps.buscar("farmacia", { cerca: { lat: 10.5, lon: -66.9 } }),
    (e: unknown) => e instanceof ErrorDeRed,
  );
});

// ── buscar ──
test("buscar: marca los barrios y expone el radio", async () => {
  const maps = conRespuesta({
    radio_km: 25,
    negocios: [
      { nombre: "Hotel Bristol", categoria: "hotel", ciudad: "Barinas", pais: "ve", lat: 8.62, lon: -70.22, km: 1.5 },
      { nombre: "Prados del Este", categoria: "barrio", pais: "ve", lat: 8.58, lon: -70.17, km: 5.2 },
    ],
    direcciones: [],
  });
  const r = await maps.buscar("bristol", { cerca: { lat: 8.6231, lon: -70.2072 } });
  assert.equal(r.radioKm, 25);
  assert.equal(r.lejos, false);
  assert.equal(r.lugares[0]!.esBarrio, false);
  assert.equal(r.lugares[1]!.esBarrio, true);
});

test("buscar: descarta direcciones lejanas (VE no tiene catastro)", async () => {
  const maps = conRespuesta({
    radio_km: 400,
    negocios: [],
    direcciones: [{ etiqueta: "2268 BRISTOL, DEL BIOBÍO", lat: -36.77, lon: -73.11, km: 5064.1 }],
  });
  const r = await maps.buscar("bristol", { cerca: { lat: 8.62, lon: -70.2 } });
  assert.equal(r.direcciones.length, 0, "una calle en Chile a 5.064 km no le sirve a nadie en Barinas");
  assert.equal(r.lejos, true);
});

// ── matriz (despacho) ──
test("matriz: null para el repartidor con GPS fuera del grafo", async () => {
  const maps = conRespuesta({
    code: "Ok",
    sources: [{ distance: 20 }, { distance: 480000 }, { distance: 35 }],
    durations: [[600], [99999], [420]],
    distances: [[3000], [900000], [2100]],
  });
  const m = await maps.matriz(
    [{ lat: 10.5, lon: -66.9 }, { lat: 4.71, lon: -74.07 }, { lat: 10.49, lon: -66.88 }],
    { lat: 10.4939, lon: -66.8772 },
    { zona: "ve" },
  );
  assert.equal(m[0]!.minutos, 10);
  assert.equal(m[1]!.minutos, null, "GPS de otra zona: no debe ganar el ranking");
  assert.equal(m[2]!.minutos, 7);
});

// ── mapa estático ──
test("estático: usa stroke/width, no weight/color (con esos da 400)", () => {
  const u = new TeleHostMaps().urlMapaEstatico("_p~iF~ps|U");
  assert.ok(u.includes("stroke"));
  assert.ok(u.includes("width"));
  assert.ok(!u.includes("weight"));
});

test("urlEstilo arma la URL de MapLibre", () => {
  assert.equal(new TeleHostMaps().urlEstilo(), "https://maps.telehost.net/styles/telehost/style.json");
  assert.equal(new TeleHostMaps().urlEstilo("hybrid"), "https://maps.telehost.net/styles/hybrid/style.json");
});
