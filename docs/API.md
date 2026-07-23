# TeleHost Maps — Referencia de API

**Base:** `https://maps.telehost.net`

Dos niveles:
- 🟢 **Pública** — sin autenticación (mapa, geocoding, autocomplete, rutas). Libre para desarrollo; para producción con volumen ver [uso justo](../README.md#uso-justo).
- 🔑 **Producto** — requiere API key (`Authorization: Bearer thmk_…` o `x-api-key: thmk_…`). Solicítala: info.telehost@gmail.com

Convenciones: JSON; coordenadas `lat`/`lon` decimales (OSRM y estilos usan `{lon},{lat}`); país `ve`/`co` (auto-detectado si se omite); montos siempre en **USD**.

---

## 🟢 Mapa

### Estilos vectoriales (MapLibre)
```
GET /styles/{id}/style.json
```
`id`: `liberty` (calles VE+CO, recomendado) · `hybrid` (satélite+etiquetas) · `liberty-ve` · `liberty-co` · `hybrid-ve` · `hybrid-co` · `satellite`.

### Mapa estático PNG (ideal para WhatsApp)
```
GET /styles/{id}/static/{lon},{lat},{zoom}/{ancho}x{alto}.png
GET /styles/{id}/static/auto/{w}x{h}.png?path=stroke:%23FB3A0A|width:5|enc:{POLYLINE}
```

### Embed
```
/embed/?lat=&lng=&z=&style=map|sat&marker=1&popup=texto&search=1     (iframe)
/embed.js                                                            (widget JS → ver embed/)
```

---

## 🟢 Autocomplete (sugerencias por tecla, tolerante a typos)

```
GET /autocomplete?q={parcial}&lat={sesgo}&lon={sesgo}&lang=es&limit=5
GET /autocomplete/reverse?lat=&lon=&lang=es
```
Respuesta: GeoJSON `FeatureCollection`; cada feature trae `properties.name/city/state` y `geometry.coordinates [lon,lat]`.
**Pasa siempre `lat`/`lon` del usuario** → resultados cercanos primero. Recomendado: debounce 250-300 ms, mínimo 3 caracteres.

## 🟢 Geocoding

```
GET /geocode/search?q={texto}&format=jsonv2&countrycodes=ve,co&limit=5&accept-language=es
GET /geocode/reverse?lat=&lon=&format=jsonv2&zoom=18&accept-language=es
```

## 🟢 Rutas y matriz (OSRM)

```
GET /route/{ve|co}/route/v1/driving/{lonA},{latA};{lonB},{latB}?overview=false
    → routes[0].distance (m) · routes[0].duration (s)
    &overview=full&geometries=geojson|polyline  → línea para dibujar
    &steps=true                                 → giro a giro

GET /route/{ve|co}/table/v1/driving/{p1};{p2};...?sources=0;1&destinations=2&annotations=duration,distance
    → matriz (ej.: repartidor más cercano por tiempo real de vías)
```

## 🟢 Directorio

```
GET /api/biz/places/public.geojson      negocios registrados (aprobados)
GET /api/biz/places/search?q=pizza
GET /api/biz/pois?bbox=minLng,minLat,maxLng,maxLat&category=farmacia
GET /api/biz/categories
POST /api/biz/geofences/check           {"lat":8.62,"lon":-70.21} → {"in_zone":true,...}
```

---

## 🔑 Logística (API key)

### Cotizar delivery por distancia real
```
POST /api/biz/pay/quote
{ "origin": {"lat":8.6231,"lon":-70.2072}, "dest": {"lat":8.6350,"lon":-70.1950} }
→ { "ok":true, "km":3.2, "min":8, "usd":3.5, "moneda":"USD" }
```

### Cobrar el delivery (genera link + QR de pago)
```
POST /api/biz/pay/delivery
{ "origin":{...}, "dest":{...}, "cliente":"Pedido #1042" }
→ { "ok":true, "ref":"thm_…", "usd":3.5, "payment_url":"https://…", "qr":"data:image/png;base64,…" }
```
El cliente paga en bolívares (conversión automática desde la referencia USD).

### Optimización de rutas multi-parada
```
POST /api/biz/route/optimize
{ "depot":{"lat":8.62,"lon":-70.20},
  "deliveries":[{"id":"p1","lat":8.625,"lon":-70.205},{"id":"p2","lat":8.64,"lon":-70.23}],
  "return_to_depot": true }
→ { "order":[{"stop":1,"delivery_id":"p1","eta_min":2},…], "total_min":29, "total_km":16.3,
    "geometry":"polyline5", "unassigned":[] }
```
Máx 50 paradas por viaje.

### Isócronas (cobertura por tiempo de conducción)
```
GET  /api/biz/isochrone?lat=&lon=&minutes=10           → polígono GeoJSON real (sigue las vías)
POST /api/biz/delivery-zones   {"origin":{...},"zones":[5,10,15,20]}  → zonas + tarifa sugerida
POST /api/biz/isochrone/check  {"origin":{...},"point":{...},"minutes":15} → {"inside":bool,"durationMinutes":…}
```

### Tracking GPS de repartidores
```
POST /api/biz/tracking/position          {"device_id":"moto1","lat":…,"lon":…,"speed":28}
     (también acepta ?id=&lat=&lon= estilo OsmAnd — apps GPS genéricas)
GET  /api/biz/tracking/position/{id}     última posición
GET  /api/biz/tracking/positions         todas las activas
GET  /api/biz/tracking/nearby?lat=&lon=&radius=3000   ordenados por distancia
GET  /api/biz/tracking/history/{id}      últimas 500 posiciones
```

### Telemetría de negocio
```
POST /api/biz/analytics/record
{ "type":"delivery", "dest_lat":…, "dest_lon":…, "fee_usd":3.5, "status":"completed" }
```
Alimenta tus reportes de demanda (heatmaps e insights disponibles en tu plan).

---

## Errores

| HTTP | Significado |
|---|---|
| 400 | Parámetros inválidos — `{"error":"…","hint":"…"}` explica |
| 401 | Falta API key o es inválida |
| 404 | Recurso no existe |
| 5xx | Error temporal — reintenta con backoff |

## ¿IA / LLMs?

TeleHost Maps también expone un **servidor MCP** (Model Context Protocol) para que agentes de IA razonen espacialmente (rutas, cobertura, repartidor más cercano). Acceso bajo plan — escríbenos.

---

*info.telehost@gmail.com · https://telehost.net*
