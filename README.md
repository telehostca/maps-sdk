# TeleHost Maps — SDK y ejemplos de integración

<p align="center">
  <b>Mapas, geocoding, rutas, logística de delivery y cargo marítimo.</b><br/>
  Mapa con calles en <b>27 áreas</b> · rutas en <b>27 zonas</b> (EE.UU. incluido) · directorio de <b>30 M negocios</b> y <b>168 M direcciones</b>.<br/>
  Infraestructura propia en LATAM · datos OpenStreetMap · sin límites de Google · precios en USD.
</p>

🌐 **Demo en vivo:** https://maps.telehost.net · 🧑‍💻 **Portal de desarrolladores:** https://maps.telehost.net/dev/

---

## ¿Qué es TeleHost Maps?

Una plataforma de mapas y logística operada por [TeleHost C.A.](https://telehost.net) pensada para **apps de delivery, ride-hailing, e-commerce y logística de carga**:

| Capacidad | Reemplaza a |
|---|---|
| 🗺️ Mapas vectoriales — **27 áreas** con calles (LATAM, España, EE.UU.) + planeta | Google Maps SDK / Mapbox |
| 🔎 Búsqueda de negocios y direcciones **por ubicación** — 30 M lugares (Overture) | Google Places / Text Search |
| 🔎 Autocomplete tolerante a errores (VE+CO) | Google Places Autocomplete |
| 📍 Geocoding, reverse y detección de país (frontera real VE/CO) | Google Geocoding API |
| 🛣️ Rutas y matriz en **27 zonas** (22 países + 5 regiones de EE.UU.) — con **perfil MOTO** 🛵 | Directions / Distance Matrix |
| 🧭 Optimización de rutas multi-parada (hasta 50) | Route Optimization API |
| 🧵 Map matching: traza GPS sucia → calles reales | Map Matching API |
| 📌 Snap a la vía más cercana + nombre de calle | Directions (nearest) |
| ⏱️ Isócronas (zonas de cobertura por tiempo) | — (Google no lo ofrece) |
| 📦 Pedidos con **tracking en vivo para el cliente** + ETA dinámico | — (como Uber Eats, pero tuyo) |
| 🛵 Despacho al repartidor más cercano (matriz OSRM real) | — |
| ⛽ Costo de combustible por viaje | — |
| 💳 Cobro del delivery por distancia (USD, pago en Bs) | — |
| 🚢 **Cargo:** rutas marítimas reales, buques AIS en vivo, 3.804 puertos | MarineTraffic / Searates |
| 🤖 Servidor MCP para agentes de IA | — |

## Inicio en 30 segundos

**Mapa en tu web (widget):**
```html
<div id="mapa" style="height:400px"></div>
<script src="https://maps.telehost.net/embed.js"></script>
<script>
  TeleHostMap.create('mapa', { center: [-70.2072, 8.6231], zoom: 14, marker: true, popup: 'Mi tienda' });
</script>
```

**O por iframe (cero JavaScript):**
```html
<iframe src="https://maps.telehost.net/embed/?lat=8.6231&lng=-70.2072&z=15&marker=1"
        width="100%" height="380" style="border:0;border-radius:12px"></iframe>
```

**Buscar negocios o direcciones cerca del usuario (27 zonas):**
```
GET https://maps.telehost.net/api/biz/buscar?q=farmacia&lat=19.43&lon=-99.13&limit=5
```

**Autocomplete de direcciones (VE+CO):**
```
GET https://maps.telehost.net/autocomplete?q=farmac&lat=8.62&lon=-70.20&lang=es&limit=5
```

**Ruta real en moto (el ETA honesto para delivery):**
```
GET https://maps.telehost.net/route/ve-moto/route/v1/driving/-70.2072,8.6231;-70.1850,8.6450?overview=false
```

**Buques en vivo en el Caribe (para tu app de cargo):**
```
GET https://maps.telehost.net/ais/ships?bbox=-73,9,-59,13
```

## Contenido de este repo

```
docs/API.md            Referencia completa de la API (pública y con clave)
docs/DELIVERY.md       Guía de delivery: cotizar → pedido → despachar → trackear → cobrar
docs/CARGO.md          Guía de cargo marítimo: rutas, buques AIS, puertos, mapa náutico
embed/embed.js         Widget de mapa embebible (fuente)
examples/
  web-maplibre.html    Mapa interactivo con MapLibre GL JS
  autocomplete.html    Buscador con sugerencias (patrón debounce)
  cargo-tracker.html   Mapa náutico con buques en vivo y puertos (solo endpoints públicos)
  flota-viva.html      Moticos moviéndose y rotando en vivo (estilo ride-hailing)
  traza-y-paradas.md   Matriz, orden óptimo (TSP), map matching y snap — sin API key
  android-kotlin.md    Integración Android (MapLibre Native)
  ios-swift.md         Integración iOS (MapLibre Native)
  flutter.md           Integración Flutter (maplibre_gl)
  backend-api.md       Flujo completo de delivery desde tu backend (API key)
```

## Paquetes oficiales

| plataforma | paquete | registro |
|---|---|---|
| **Flutter / Dart** | [`telehost_maps`](https://pub.dev/packages/telehost_maps) | pub.dev |
| **React Native · web · Node** | [`@telehostnet/maps`](https://www.npmjs.com/package/@telehostnet/maps) | npm |

Los dos traen la misma API y **las mismas guardas** contra las trampas del ruteo
(distancia de *snap*, rutas que cruzan zonas, el `200 con HTML` del gateway) y el
giro a giro en español ya escrito.

```bash
npm i @telehostnet/maps          # React Native, web, Node ≥18
```

```ts
import { TeleHostMaps } from "@telehostnet/maps";
const maps = new TeleHostMaps();
const r = await maps.buscar("farmacia", { cerca: { lat: 10.4939, lon: -66.8772 } });
const [ruta] = await maps.ruta(yo, r.lugares[0].punto, { moto: true });
```

Código: [`typescript/`](typescript/) · [`flutter/`](flutter/)

## Flutter: paquete oficial

```yaml
dependencies:
  telehost_maps: ^0.1.0   # cliente de datos (rutas, búsqueda, giro a giro en español)
  maplibre_gl: ^0.20.0    # el mapa en pantalla
```

```dart
final maps = TeleHostMaps();
final r = await maps.buscar('farmacia', cerca: const Punto(10.4939, -66.8772));
final rutas = await maps.ruta(yo, r.lugares.first.punto, moto: true);
for (final p in rutas.first.pasos) print(p.instruccion);  // "Girá a la izquierda por…"
```

Trae incorporadas las guardas que evitan cobrar distancias inventadas. Código y
documentación en [`flutter/`](flutter/).

## Apps móviles sin SDK de Google

Tu app Android/iOS/Flutter usa **[MapLibre Native](https://maplibre.org/)** (open source) apuntando al estilo de TeleHost:

```
https://maps.telehost.net/styles/telehost/style.json    ← calles (estilo de la casa)
https://maps.telehost.net/styles/hybrid/style.json      ← satélite + etiquetas
https://maps.telehost.net/styles/cargo/style.json       ← náutico mundial (para cargo)
```

Sin API key de Google, sin billing, sin cuotas por carga de mapa. Ver [examples/](examples/).

## API Keys — portal de desarrolladores

Las funciones de producto (pedidos, despacho, cobro, optimización, isócronas, tracking GPS, rutas marítimas) requieren una **API key** con formato `thmk_…`, enviada como `x-api-key: thmk_…` o `Authorization: Bearer thmk_…`.

🧑‍💻 **Creá tu clave en https://maps.telehost.net/dev/** — las claves nuevas quedan *pendientes de aprobación* (te avisamos al aprobarla). También podés escribirnos: **info.telehost@gmail.com** — planes desde $0 para probar.

> ⚠️ La clave vive en **tu backend** (variable de entorno). Nunca la pongas en el frontend ni en la app móvil.

## Uso justo

Los endpoints públicos (mapa, geocoding, autocomplete, rutas, buques por zona, puertos) están abiertos para desarrollo y evaluación, con límites suaves por IP. Para producción con volumen, pedí tu clave — así mantenemos el servicio rápido para todos.

## Atribuciones

- Datos de mapa © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL). Muestra la atribución en tu mapa.
- Imágenes satelitales © Esri World Imagery (atribución requerida).
- Basemap mundial: [Natural Earth](https://www.naturalearthdata.com/) (dominio público).
- Puertos: World Port Index (NGA) + UN/LOCODE.
- Render: [MapLibre](https://maplibre.org/) (BSD-3). Rutas: [OSRM](http://project-osrm.org/). Geocoding: [Nominatim](https://nominatim.org/) / [Photon](https://photon.komoot.io/). Rutas marítimas: red MARNET vía [searoute](https://github.com/eurostat/searoute).

## Licencia

El código de este repositorio (widget y ejemplos) es [MIT](LICENSE) © TeleHost C.A.
El **servicio** TeleHost Maps y sus datos derivados son operados comercialmente por TeleHost C.A.

---

*Hecho en Venezuela 🇻🇪 con infraestructura propia.*
