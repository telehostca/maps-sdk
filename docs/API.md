# TeleHost Maps — Referencia de API

**Base:** `https://maps.telehost.net`

Dos niveles:
- 🟢 **Pública** — sin autenticación, CORS abierto: se llama directo desde el navegador o la app. Límites suaves por IP.
- 🔑 **Con clave** — requiere API key (`x-api-key: thmk_…` o `Authorization: Bearer thmk_…`). Vive en **tu backend**, nunca en el frontend. Creala en el [portal de desarrolladores](https://maps.telehost.net/dev/).

Convenciones: JSON; coordenadas `lat`/`lon` decimales (OSRM, estilos y `bbox` usan orden `{lon},{lat}`); país `ve`/`co` (auto-detectado por el origen si se omite — con la frontera real, no un rectángulo); montos siempre en **USD**.

---

## 🟢 Mapa (tiles y estilos)

### Estilos vectoriales (MapLibre)
```
GET /styles/{id}/style.json
```
| id | qué es |
|---|---|
| `telehost` | calles, el estilo de la casa (recomendado) — 27 áreas |
| `cargo` | náutico mundial: fondo marino, para apps de carga (ver [CARGO.md](CARGO.md)) |
| `hybrid` | satélite + etiquetas |
| `satellite` | satélite puro |
| `liberty` | calles, alternativo |
| `dark-matter` / `positron` | oscuro / claro minimalista (dashboards) |

### TileJSON (fuentes de datos)
```
GET /data/detalle.json  detalle de calles z14 — 27 áreas (ver cobertura abajo)
GET /data/world.json    planeta z0-7 (cubre la travesía China→VE completa)
```

### ⚠️ Cobertura: no es igual en todas las capas

| capa | dónde |
|---|---|
| **Mapa con calles** (tiles, estilos, estático, embed) | **27 áreas**: toda América Latina —Brasil incluido—, España y EE.UU. |
| Mapa mundial (menor detalle) | el planeta entero |
| Satélite | mundial. Detalle real hasta z18-z20 según el lugar (más profundo en grandes ciudades) |
| **Rutas, matriz, TSP, map matching, snap** | **27 zonas**: 🇻🇪 🇨🇴 🇪🇨 🇵🇪 🇧🇴 🇵🇾 🇺🇾 🇨🇱 🇦🇷 🇲🇽 🇬🇹 🇸🇻 🇭🇳 🇳🇮 🇨🇷 🇵🇦 🇧🇿 🇨🇺 🇩🇴 🇵🇷 🇪🇸 🇧🇷 + EE.UU. en 5 regiones (`us-northeast` `us-midwest` `us-south` `us-west` `us-pacific`). ⚠ En EE.UU. no se rutea de una región a otra |
| Optimización multiparada (VROOM) | **Venezuela y Colombia** — para el resto usá `trip/v1` (TSP público) |
| **Directorio: negocios y direcciones** | **todo el mapa** — 10,6 M negocios (Overture). Direcciones calle-y-número donde el catastro es público: 🇲🇽 30,7 M · 🇪🇸 15,1 M · 🇨🇴 7,8 M · 🇨🇱 4,1 M · 🇺🇾 1,1 M + EE.UU. y 🇧🇷 |
| Geocodificación clásica y autocompletar | **Venezuela y Colombia** (datos OSM; complementa al directorio) |

O sea: en México, Santiago o Madrid podés **mostrar el mapa Y rutear**; en São Paulo o Miami
podés mostrar el mapa pero **no** rutear. Para buscar direcciones, por ahora solo VE y CO.

### ⚠️ Preguntá antes de rutear

```
GET /api/biz/config/country?lat=&lon=
→ { "cc":"mx", "ruteable":true,  "ruta_osrm":"/route/mx/" }
→ { "cc":null, "ruteable":false, "ruta_osrm":null }        ← fuera de cobertura
```

Es **público y gratis**. Vale la pena porque los dos mundos fallan distinto:

- Los endpoints **con clave** responden **422 `sin-cobertura-de-ruteo`** — un error claro.
- Los endpoints **públicos de OSRM** devuelven **`code:"Ok"` con `distance: 0`**: pegan los dos
  puntos a la vía conocida más cercana y la ruta mide cero. **Comprobá siempre
  `routes[0].distance > 0`** antes de cobrar por esa distancia.

### Mapa estático PNG (ideal para WhatsApp)
```
GET /styles/{id}/static/{lon},{lat},{zoom}/{ancho}x{alto}.png
GET /styles/{id}/static/auto/{w}x{h}.png?path=stroke:%23ED3237|width:5|enc:{POLYLINE}
```
`auto` encuadra solo la ruta (`enc:` = polyline codificada, como la que devuelve `route/optimize`).

---

## 🟢 Geocodificación

### Autocomplete (sugerencias por tecla, tolerante a typos)
```
GET /autocomplete?q={parcial}&lat={sesgo}&lon={sesgo}&lang=es&limit=5
GET /autocomplete/reverse?lat=&lon=&lang=es
```
Respuesta: GeoJSON `FeatureCollection`; cada feature trae `properties.name/city/state` y `geometry.coordinates [lon,lat]`.
**Pasá siempre `lat`/`lon` del usuario** → resultados cercanos primero. Recomendado: debounce 250-300 ms, mínimo 3 caracteres.

### Búsqueda y reverse (Nominatim)
```
# ── Buscar en el directorio (10,6 M negocios + 82,7 M direcciones) ────────────
# La ubicación MANDA: la búsqueda parte de lat/lon y abre anillos (25→100→400 km).
# `radio_km` dice a qué distancia apareció el resultado. Público, con rate limit.
GET /api/biz/buscar?q=farmacia&lat=19.43&lon=-99.13&limit=5
    → { "radio_km":25, "negocios":[{ "nombre","categoria","ciudad","pais","lat","lon","km","confianza" }],
        "direcciones":[{ "etiqueta","calle","numero","cp","ciudad","lat","lon","km" }] }
GET /api/biz/buscar?q=gran+via+28&lat=40.42&lon=-3.70&tipo=direcciones
GET /api/biz/cerca?lat=&lon=&km=3&limit=10     # qué hay alrededor, para sugerir al abrir el mapa
GET /api/biz/config/cobertura                  # qué zonas rutean y qué países tienen catastro

# ── Geocodificación clásica (VE+CO, datos OSM) ────────────────────────────────
GET /geocode/search?q={texto}&format=jsonv2&countrycodes=ve,co&limit=5&accept-language=es
GET /geocode/reverse?lat=&lon=&format=jsonv2&zoom=18&accept-language=es
```

### País de un punto (frontera real VE/CO)
```
GET /api/biz/config/country?lat=7.89&lon=-72.50
→ { "cc":"ve", "nombre":"Venezuela", "osrm":"ve", "ruta_osrm":"/route/ve/" }
```
Resuelve bien Cúcuta vs San Cristóbal — usalo para elegir el grafo OSRM correcto en zona de frontera.

---

## 🟢 Rutas terrestres (OSRM)

```
GET /route/{perfil}/route/v1/driving/{lonA},{latA};{lonB},{latB}?overview=false
    → routes[0].distance (m) · routes[0].duration (s)
    &overview=full&geometries=geojson|polyline  → línea para dibujar
    &steps=true                                 → giro a giro
```
Perfiles: los **21 códigos de país** de la tabla de cobertura (carro) · **`ve-moto`** 🛵 — la moto filtra tráfico y usa callejones: su ETA urbano es ~15-30 % menor. Es el ETA honesto para delivery en moto.

### Matriz de distancias (N×M) — *Distance Matrix*
```
GET /route/{perfil}/table/v1/driving/{p1};{p2};...?sources=0;1&destinations=2&annotations=duration,distance
→ { "durations":[[s,…],…], "distances":[[m,…],…], "sources":[…], "destinations":[…] }
```
Tiempos y distancias **por vías reales** entre todos los pares. Sin límite de elementos por request.
> 💡 Si solo querés "¿quién está más cerca?", usá [`POST /api/biz/delivery/dispatch`](#-despacho-al-repartidor-más-cercano) — hace la matriz por vos contra tu flota real.

### Orden óptimo de paradas (TSP) — *Optimization*
```
GET /route/{perfil}/trip/v1/driving/{p1};{p2};{p3};...?overview=false
→ { "code":"Ok",
    "trips":[ { "distance":42385, "duration":3324, "geometry":… } ],
    "waypoints":[ { "waypoint_index":0, "trips_index":0, "name":"Calle 10. Camejo" }, … ] }
```
`waypoint_index` es **el orden en que hay que visitarlos** (los waypoints vuelven en el orden que los mandaste; el índice te dice el lugar en la ruta). Viaje cerrado por defecto: agregá `&roundtrip=false&source=first&destination=last` para dejarlo abierto.
> Diferencia con `route/optimize` (🔑): `trip` es un solo vehículo sin ventanas de tiempo ni tiempos de servicio. Para repartir entre **varias** motos con ETAs por parada, usá `route/optimize` (VROOM).

### Pegar una traza GPS a las calles (*map matching*)
```
GET /route/{perfil}/match/v1/driving/{p1};{p2};...?overview=full&geometries=geojson
    &timestamps={unix1};{unix2};…      ← recomendado
    &radiuses={m1};{m2};…              ← precisión del GPS en metros
→ { "matchings":[ { "confidence":0.98, "geometry":…, "distance":…, "duration":… } ],
    "tracepoints":[ { "matchings_index":0, "name":"Av. 18 Guárico", "distance":12.3 }, … ] }
```
Toma el rastro sucio del GPS del repartidor y devuelve **por qué calles pasó de verdad** — para auditar recorridos, cobrar por km reales o limpiar historiales. `tracepoints[i].distance` es cuánto se movió cada punto al pegarlo.
> ⚠️ **Mandá la traza COMPLETA, no una muestra.** Medido en este servidor: 3 puntos dispersos dan `confidence` ≈ 0 (`2.2e-16`) aunque mandes timestamps; 18 puntos (uno cada ~9 s) dan **0.73**, y con `timestamps`+`radiuses` suben a **0.90**. Máx 100 puntos por request.

### Punto exacto sobre la vía (*snap*)
```
GET /route/{perfil}/nearest/v1/driving/{lon},{lat}?number=1
→ { "waypoints":[ { "location":[-70.207151,8.623147],
                    "name":"Calle 10. Camejo", "distance":7.49 } ] }
```
`distance` = metros desde el punto que mandaste hasta la vía. Sirve para validar direcciones ("¿esto cae en una calle?"), corregir un pin arrastrado por el usuario, o sacar el nombre de la calle de una coordenada sin geocodificar.

---

## 🟢 Directorio y zonas

```
GET  /api/biz/pois?bbox=minLon,minLat,maxLon,maxLat&category=farmacia   GeoJSON de negocios
GET  /api/biz/categories                    categorías con ícono y color (chips del visor)
GET  /api/biz/places/public.geojson         negocios registrados (aprobados)
GET  /api/biz/places/search?q=pizza
POST /api/biz/geofences/check               {"lat":8.62,"lon":-70.21} → {"in_zone":true,…}
```
Sin clave `pois` devuelve hasta 1.000 filas por request; con clave, 4.000.

---

## 🟢🚢 Marítimo público

```
GET /ais/ships?bbox=minLon,minLat,maxLon,maxLat     buques AIS en vivo (GeoJSON)
GET /puertos/puertos.geojson                        3.804 puertos del mundo (WPI + UN/LOCODE)
```
`/ais/ships`: cada feature trae `mmsi, name, dest, sog` (nudos), `cog` (rumbo — usalo para rotar el ícono), `stale` (sin señal >30 min) y `visto`. Cache 10 s. Detalle en [CARGO.md](CARGO.md).

---

## 🔑 Delivery y pedidos

Guía completa con el flujo entero: **[DELIVERY.md](DELIVERY.md)**.

### Cotizar (distancia/tiempo reales → precio USD)
```
POST /api/biz/pay/quote
{ "origin":{"lat":8.6231,"lon":-70.2072}, "dest":{"lat":8.6350,"lon":-70.1950}, "vehiculo":"moto" }
→ { "ok":true, "country":"ve", "vehiculo":"moto", "perfil":"ve-moto",
    "km":3.2, "min":8, "usd":3.5, "moneda":"USD",
    "combustible": { "km":3.2, "litros":0.11, "usd":0.05, "precio_litro":0.5, "km_por_litro":30 },
    "tarifa": { "base":1, "per_km":0.5, "per_min":0.05, "minimo":1.5 } }
```

### Crear pedido con tracking en vivo
```
POST /api/biz/orders
{ "origin":{…}, "dest":{…}, "vehiculo":"moto", "cliente":"Ana", "telefono":"584121234567", "dest_dir":"Av. 23 de Enero" }
→ { "ok":true, "id":18, "token":"…", "tracking_url":"https://maps.telehost.net/t/…",
    "pin":"4831", "fee_usd":3.5, "km":3.2, "min":8, "vehiculo":"moto" }
```
El `tracking_url` es una **página lista** donde el cliente ve al repartidor moverse con ETA en vivo. El `pin` lo pide el repartidor al entregar (no se vuelve a mostrar).

### Gestionar el pedido
```
GET  /api/biz/orders?status=en_route              listar (operativo: sin token ni teléfono)
POST /api/biz/orders/{id}/assign                  { "device_id":"moto1" } → pasa a en_route
POST /api/biz/orders/{id}/status                  { "status":"preparing" } · delivered exige { "pin":"4831" }
```
Estados: `created → preparing → en_route → nearby → delivered` (+ `cancelled` desde created/preparing). `nearby` se dispara solo (a <250 m). El ETA se recalcula automáticamente con la posición real (~cada 30 s con hasta 5 repartos activos; con más, rota round-robin).

### Tracking público del pedido (para tu propia UI)
```
GET /api/biz/track/{token}          → { status, eta_min, driver:{lat,lon,course}|null, stale,
                                        negocio, origen, destino, km, vehiculo, … }
GET /api/biz/track/{token}/events   → [ { "status":"created", "created_at":"…" }, … ]
```
🟢 Público por diseño (el token es la autorización — 24 bytes random). Nunca expone teléfono ni PIN; la posición del repartidor se apaga al entregar.

### Despacho al repartidor más cercano
```
POST /api/biz/delivery/dispatch
{ "pickup":{"lat":8.622,"lon":-70.201}, "vehiculo":"moto", "top":3 }
→ { "ok":true, "perfil":"ve-moto", "evaluados":7,
    "candidatos":[ { "device_id":"moto1", "km":0.9, "min":3, "edad_s":4, … }, … ] }
```
Triangula tu flota (GPS fresco ≤5 min, configurable con `max_edad_min`) contra la matriz OSRM **por vías reales**, no línea recta.

### Tracking GPS de la flota
```
POST /api/biz/tracking/position          {"device_id":"moto1","lat":…,"lon":…,"speed":28}
     (también acepta ?id=&lat=&lon= estilo OsmAnd — apps GPS genéricas)
GET  /api/biz/tracking/position/{id}     última posición
GET  /api/biz/tracking/positions         todas las activas
GET  /api/biz/tracking/nearby?lat=&lon=&radius=3000   por distancia en línea recta (rápido)
GET  /api/biz/tracking/history/{id}      últimas 500 posiciones (retención 7 días)
```

### Combustible
```
GET /api/biz/delivery/combustible?km=12.4&ida_vuelta=true
→ { "ok":true, "km":24.8, "litros":0.83, "usd":0.41, "precio_litro":0.5, "km_por_litro":30 }
```

### Optimización multi-parada (VROOM)
```
POST /api/biz/route/optimize
{ "depot":{"lat":8.62,"lon":-70.20},
  "deliveries":[{"id":"p1","lat":8.625,"lon":-70.205,"service_min":5},{"id":"p2","lat":8.64,"lon":-70.23}],
  "return_to_depot": true }
→ { "order":[{"stop":1,"delivery_id":"p1","eta_min":2},…], "total_min":29, "total_km":16.3,
    "geometry":"polyline5", "unassigned":[] }
```
Máx 50 paradas. `geometry` va directo al mapa estático (`path=enc:`) o a MapLibre.

### Isócronas (cobertura por tiempo de conducción)
```
GET  /api/biz/isochrone?lat=&lon=&minutes=10           → polígono GeoJSON real (sigue las vías)
POST /api/biz/delivery-zones   {"origin":{…},"zones":[5,10,15,20]}  → zonas + tarifa sugerida
POST /api/biz/isochrone/check  {"origin":{…},"point":{…},"minutes":15} → {"inside":bool,…}
```

---

## 🔑 Pagos (el cliente paga en Bs, tu referencia queda en USD)

```
POST /api/biz/pay/delivery      { "origin":{…}, "dest":{…}, "cliente":"Pedido #1042" }
→ { "ok":true, "ref":"thm_…", "usd":3.5, "payment_url":"https://…", "qr":"data:image/png;base64,…" }

GET  /api/biz/pay/{ref}         → { "ref", "usd", "ves", "tasaBCV", "status", "payment_url", "title" }
```
Mandá `payment_url` por WhatsApp o mostrá el `qr` en tu checkout; hacé polling de `GET /pay/{ref}` hasta `status:"paid"`.

```
GET  /api/biz/pay/tarifa        tu tarifa vigente (base, per_km, per_min, minimo, moneda, precio_litro, km_por_litro)
GET  /api/biz/pay/plans         catálogo de planes 🟢 (público)
POST /api/biz/pay/plan          { "code":"pro" } → link de pago del plan
```

---

## 🔑🚢 Marítimo con clave

```
GET /api/biz/searoute?from={lon},{lat}&to={lon},{lat}
→ { "ok":true, "nm":10188.9, "km":18869.8, "dias_a_14kn":30.3, "geometry":{ LineString } }

GET /api/biz/ais/ship/{mmsi}    un buque puntual (detección de arribo a puerto)
```
Ruta marítima **real** por la red MARNET: esquiva tierra, cruza el Canal de Panamá. Guía completa: [CARGO.md](CARGO.md).

---

## 🔑 Telemetría

```
POST /api/biz/analytics/record
{ "type":"delivery", "dest_lat":…, "dest_lon":…, "fee_usd":3.5, "status":"completed" }
```
`type`: `search` | `delivery` | `view`. Alimenta tus reportes de demanda (heatmaps e insights según tu plan).

---

## 🤖 IA / LLMs (MCP)

TeleHost Maps expone un **servidor MCP** (Model Context Protocol) con 13+ herramientas espaciales para que agentes de IA razonen sobre rutas, cobertura y despacho. Acceso bajo plan — escribinos.

---

## Claves, límites y errores

| tope | valor |
|---|---|
| por minuto | **60 req/min** por clave · **10/min** los caros (`route/optimize`, isócronas, `searoute`) · **600/min** ingesta GPS |
| por día | cuota diaria de la clave (se amplía a pedido) |
| claves por cuenta | 5 — se crean en [/dev/](https://maps.telehost.net/dev/) y quedan *pendientes* hasta aprobarse |

Cada clave puede limitarse por **scopes**: `rutas, pagos, tracking, pedidos, pois, isocronas, analytics, cargo` (o `todo`). Si tu clave no tiene el scope, la respuesta es `403 {"error":"scope-no-autorizado"}`.

| HTTP | Significado |
|---|---|
| 400 | Parámetros inválidos — `{"error":"…","hint":"…"}` explica |
| 401 | Falta API key o es inválida |
| 403 | Clave pendiente/suspendida, scope no autorizado, o PIN inválido |
| 404 | Recurso no existe |
| 409 | Transición de estado inválida (pedidos) |
| 429 | Rate limit (`Retry-After` en segundos) o cuota diaria (`error:"quota-diaria"`, sin `Retry-After`) |
| 5xx | Error temporal — reintentá con backoff |

---

*info.telehost@gmail.com · https://telehost.net · portal: https://maps.telehost.net/dev/*
