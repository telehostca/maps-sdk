## 0.2.0

- **`MarcaTeleHost`** — el watermark de TeleHost Maps como widget, listo para poner
  sobre el mapa con un `Stack`. Tema claro y oscuro (una píldora blanca sobre
  satélite no se lee). El isotipo se DIBUJA con `CustomPainter`: sin red, sin
  `flutter_svg`, y por lo tanto se ve igual con el teléfono sin señal.
- La atribución legal ya no hay que dibujarla: desde 2026-08-04 viaja dentro del
  `style.json` y MapLibre nativo la muestra sola. Lo único que hay que hacer es
  no esconder el botón de atribución del mapa — es la licencia ODbL de
  OpenStreetMap, no una preferencia nuestra.
- El paquete pasa a depender de Flutter (antes era Dart puro): el widget es un
  Widget. El cliente HTTP en sí no cambió.

Por qué: el README pedía «mostrá © OpenStreetMap · TeleHost Maps en tu mapa», y
eso es una regla que depende de que alguien la lea y la escriba bien. Una app
salió a producción sin una sola mención. Lo que el paquete trae puesto se usa.

## 0.1.0

Primera versión.

- `buscar()` — negocios, barrios y direcciones cerca del usuario (búsqueda por anillos).
- `cerca()` — qué hay alrededor de un punto.
- `zonaDe()` — zona de ruteo de un punto, con caché en memoria.
- `ruta()` — ruta con alternativas y giro a giro **en español**.
- `matriz()` — tiempos y distancias reales entre varios puntos (despacho).
- `urlMapaEstatico()` — PNG de la ruta para compartir por WhatsApp.
- Guardas incorporadas contra las trampas conocidas: distancia de *snap*, rutas
  que cruzan zonas y puntos fuera de cobertura.
