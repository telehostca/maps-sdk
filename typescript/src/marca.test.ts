import assert from "node:assert/strict";
import { test } from "node:test";
import { controlDeMarca, MARCA, ATRIBUCION_OVERTURE } from "./marca.js";

/** DOM mínimo: el control sólo crea un div y le mete HTML. */
function conDom() {
  const nodo: any = { className: "", innerHTML: "", parentNode: null };
  (globalThis as any).document = { createElement: () => nodo };
  return nodo;
}

test("el control se monta abajo a la izquierda (la atribución va a la derecha)", () => {
  conDom();
  assert.equal(controlDeMarca().getDefaultPosition?.(), "bottom-left");
});

test("la píldora lleva el texto, el enlace y el isotipo dibujado", () => {
  const nodo = conDom();
  controlDeMarca().onAdd();
  assert.ok(nodo.innerHTML.includes("TeleHost"), "falta el wordmark");
  assert.ok(nodo.innerHTML.includes('href="https://maps.telehost.net"'), "tiene que enlazar al producto, no a telehost.net");
  assert.ok(nodo.innerHTML.includes("<svg"), "el isotipo va inline: sin red y sin depender del origen");
  assert.ok(!nodo.innerHTML.includes("<img"), "nada de <img>: un repartidor sin señal igual tiene que ver la marca");
});

test("el tema oscuro cambia el fondo y el isotipo (blanco sobre satélite)", () => {
  const nodo = conDom();
  const c = controlDeMarca({ oscuro: true });
  c.onAdd();
  assert.ok(nodo.innerHTML.includes(MARCA.oscuro.fondo), "fondo oscuro");
  const oscuro = nodo.innerHTML;
  c.tema(false);
  assert.ok(nodo.innerHTML.includes(MARCA.claro.fondo), "vuelve al claro en vivo");
  assert.notEqual(nodo.innerHTML, oscuro);
});

test("la atribución del paquete NO repite lo que ya trae el estilo", () => {
  // OSM y la marca viajan en sources[].attribution desde 2026-08-04. Si vuelven
  // acá, MapLibre las muestra dos veces: deduplica sólo por string exacta.
  assert.ok(ATRIBUCION_OVERTURE.includes("Overture"));
  assert.ok(!ATRIBUCION_OVERTURE.includes("OpenStreetMap"));
  assert.ok(!ATRIBUCION_OVERTURE.includes("TeleHost Maps"));
});

test("MARCA expone lo necesario para dibujarla a mano (React Native)", () => {
  assert.equal(MARCA.texto, "TeleHost Maps");
  assert.equal(MARCA.enlace, "https://maps.telehost.net");
  assert.ok(MARCA.isotipo(true).includes("#fff"), "variante blanca para fondo oscuro");
  assert.ok(MARCA.isotipo(false).includes("ED3237"), "variante a color con el rojo de la casa");
});
