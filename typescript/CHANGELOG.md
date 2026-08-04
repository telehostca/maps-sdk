# Cambios

## 0.2.0

- **`controlDeMarca()`** — el watermark de TeleHost Maps como control de MapLibre,
  listo para `map.addControl(marca, "bottom-left")`. Tema claro/oscuro en vivo con
  `marca.tema(true)`. El isotipo va inline: sin pedirlo a la red y sin depender de
  que el origen resuelva.
- **`MARCA`** — los valores de la marca (colores, texto, enlace, isotipo) para
  dibujarla a mano donde no hay DOM, como React Native.
- **`ATRIBUCION_OVERTURE`** — lo único que la página agrega sobre lo que ya dice
  el estilo. OSM y la marca viajan desde 2026-08-04 dentro del `style.json`:
  repetirlos acá los mostraría dos veces (MapLibre deduplica sólo por string exacta).

Por qué: el README pedía «mostrá © OpenStreetMap · TeleHost Maps en tu mapa», y
eso es una regla que depende de que alguien la lea y la escriba bien. Una app
salió a producción sin una sola mención. Lo que el paquete trae puesto se usa.

## 0.1.0

Primera versión: cliente de rutas, búsqueda, matriz y giro a giro en español.
