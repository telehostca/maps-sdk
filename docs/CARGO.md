# Guía de Cargo Marítimo — rutas reales, buques en vivo, puertos 🚢

Para apps de importación/logística que siguen contenedores puerta a puerta —
por ejemplo la travesía **China → Venezuela**: Yantian → Canal de Panamá → Puerto Cabello.

Tres piezas públicas (van directo en el navegador) y dos con clave (en tu backend):

| pieza | auth | qué da |
|---|---|---|
| Estilo `cargo` + basemap mundial | 🟢 | mapa náutico del planeta entero, con etiquetas CJK (中文) |
| `GET /ais/ships?bbox=` | 🟢 | buques AIS **en vivo** por zona (GeoJSON) |
| `GET /puertos/puertos.geojson` | 🟢 | 3.804 puertos del mundo (WPI + UN/LOCODE) |
| `GET /api/biz/searoute` | 🔑 scope `cargo` | ruta marítima **real** (red MARNET): esquiva tierra, cruza Panamá |
| `GET /api/biz/ais/ship/{mmsi}` | 🔑 scope `cargo` | un buque puntual — para detectar arribos |

---

## 1 · El mapa de la travesía

```js
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://maps.telehost.net/styles/cargo/style.json',  // náutico: fondo marino, batimetría
  center: [-40, 15], zoom: 2                                    // Atlántico completo
});
```

- El estilo `cargo` usa el **basemap mundial** (z0-7): la ruta China→VE se ve entera, sin zonas grises.
- Las etiquetas chinas (深圳 · 盐田) renderizan bien — los glifos CJK están servidos.
- Al acercarte a Venezuela/Colombia entra el detalle z14 completo de calles.
- Alternativa: `styles/satellite/style.json` (satélite global) para la vista "foto".

## 2 · La ruta marítima real (backend, con tu clave)

```bash
# Yantian (China) → Puerto Cabello (VE)
curl "https://maps.telehost.net/api/biz/searoute?from=114.27,22.59&to=-68.01,10.48" \
  -H "x-api-key: $KEY"
```
```json
{ "ok": true, "nm": 10188.9, "km": 18869.8, "dias_a_14kn": 30.3,
  "geometry": { "type": "LineString", "coordinates": [ [114.27,22.59], … ] } }
```

- Calculada sobre la red **MARNET**: bordea tierra de verdad y cruza el **Canal de Panamá** — no es un arco dibujado a mano.
- `dias_a_14kn` = referencia de un portacontenedores típico. Con la velocidad real del buque (AIS `sog`) podés recalcular tu ETA.
- La `geometry` va directa a MapLibre como source GeoJSON, o al mapa estático para el minimapa de WhatsApp.
- Es un cálculo caro: 10/min por clave. **Cachealo** — la ruta Yantian→Pto Cabello no cambia entre pedidos.

## 3 · Buques en vivo (público — directo del navegador)

```js
// Caribe venezolano
const r = await fetch('https://maps.telehost.net/ais/ships?bbox=-73,9,-59,13');
const ships = await r.json();   // GeoJSON FeatureCollection
// properties: mmsi, name, dest, sog (nudos), cog (rumbo), stale, visto
```

- Datos AIS reales, refrescados en vivo. Cache de 10 s — pollear cada 10-30 s está bien.
- **`cog`** es el rumbo: usalo para **rotar el ícono** del barco.
- `stale:true` = sin señal hace >30 min (pintalo apagado). Los buques sin señal >24 h desaparecen — el AIS viejo miente.
- Cobertura actual: **Caribe venezolano y Canal de Panamá** (la costa china se activa por plan — escribinos).
- `sog` en nudos: >0.5 = navegando, ~0 = fondeado/atracado.

## 4 · Seguir TU buque (backend, con tu clave)

```bash
curl "https://maps.telehost.net/api/biz/ais/ship/311000000" -H "x-api-key: $KEY"
# → { "mmsi":311000000, "name":"GOLDEN FROID", "lat":…, "lon":…, "sog":…, "cog":…,
#     "dest":"CRISTOBAL", "eta_ais":…, "stale":0, "updated_at":"…" }
```

El patrón para **hitos automáticos** ("tu contenedor llegó a Panamá"):
1. Tu cliente te da el MMSI del buque (está en el B/L o lo buscás por nombre en `/ais/ships`).
2. Tu worker consulta cada 10-15 min.
3. `sog < 0.5` + posición dentro del radio de un puerto (de `puertos.geojson`) = **arribo** → notificás.
4. `404` = todavía fuera de las zonas de cobertura — no es error, es "en tránsito".

## 5 · Los puertos del mundo (público)

```js
const puertos = await fetch('https://maps.telehost.net/puertos/puertos.geojson').then(r => r.json());
// 3.804 puertos · properties: name, locode (UN/LOCODE), country, size
// El estilo cargo ya los pinta (punto con nombre) — no hace falta agregar la capa.
```
Usalos para el radio de arribo del punto 4, para autocompletar "puerto de origen/destino" (filtrá por `size` para quedarte con los grandes), o como datos para tu propia UI.

## 6 · Todo junto: la pantalla de tracking de un contenedor

```
[estilo cargo — ya trae puertos y buques pintados]
  + línea searoute Yantian→Pto Cabello        (la ruta planificada, desde tu backend)
  + posición AIS real de TU buque              (resaltala sobre la capa de buques)
  + puertos hito: Yantian · Cristóbal · Pto Cabello
  + % de avance = distancia recorrida sobre la geometry / nm total
```

Ejemplo funcionando con las piezas públicas (sin clave): [examples/cargo-tracker.html](../examples/cargo-tracker.html).

### Minimapa estático para WhatsApp

```
GET /styles/cargo/static/auto/800x400.png?path=stroke:%23ED3237|width:3|enc:{POLYLINE}
```
Codificá la `geometry` del searoute como polyline y tenés la imagen del avance para el chat.

---

## La última milla es la misma plataforma

El contenedor llega a Puerto Cabello y el paquete sigue en moto: **la misma API** hace la
cotización, el pedido con tracking en vivo, el despacho y el cobro en Bs.
Seguí con [DELIVERY.md](DELIVERY.md) — tu app de cargo ya tiene la mitad del trabajo hecho.
