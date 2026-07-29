# Matriz, orden de paradas, traza GPS y snap — sin API key 🟢

Cuatro servicios de ruteo que se llaman **directo** (son públicos, CORS abierto) y que
en Mapbox son cuatro productos distintos: Matrix, Optimization, Map Matching y el snap
de Directions.

```bash
export MAPS="https://maps.telehost.net"
export P="ve"          # ve · co · ve-moto  🛵
```

> El orden de coordenadas es `{lon},{lat}` y los puntos van separados por `;`.

---

## 1 · Matriz N×M — ¿cuál de mis motos llega antes?

```bash
# 3 motos (índices 0,1,2) contra 1 restaurante (índice 3)
curl "$MAPS/route/$P/table/v1/driving/\
-70.204,8.621;-70.215,8.630;-70.190,8.615;-70.201,8.622\
?sources=0;1;2&destinations=3&annotations=duration,distance"
```
```json
{ "durations": [[77.1],[280.2],[212.7]],
  "distances": [[428.6],[2304.3],[1650.9]] }
```
La primera moto llega en 77 s recorriendo 429 m; la segunda tarda casi 4× más.
Tiempos y distancias **por vías reales**, no línea recta. Sin límite de elementos por request.

> Para delivery no hace falta que la armes vos: [`POST /api/biz/delivery/dispatch`](../docs/DELIVERY.md#4--despachar--el-repartidor-más-cercano-de-verdad) 🔑 corre esta matriz contra tu flota con GPS fresco y te devuelve el ranking listo.

---

## 2 · Orden óptimo de paradas (TSP)

```bash
# ¿en qué orden conviene visitar estas 3 entregas?
curl "$MAPS/route/$P/trip/v1/driving/\
-70.2072,8.6231;-70.1850,8.6450;-70.2200,8.6100?overview=false"
```
```json
{ "code": "Ok",
  "trips": [ { "distance": 42385, "duration": 3324 } ],
  "waypoints": [
    { "waypoint_index": 0, "trips_index": 0, "name": "Calle 10. Camejo" },
    { "waypoint_index": 1, "trips_index": 0, "name": "Eje Rural de Jobal" },
    { "waypoint_index": 2, "trips_index": 0, "name": "" } ] }
```

- Los `waypoints` vuelven **en el orden que los mandaste**; `waypoint_index` dice el lugar que ocupan **en la ruta óptima**. Ordená por ese campo para armar la lista del repartidor.
- Es **viaje cerrado** (vuelve al inicio) por defecto. Para dejarlo abierto:
  `&roundtrip=false&source=first&destination=last`.
- `&overview=full&geometries=geojson` te da la línea para dibujar.

| usá… | cuándo |
|---|---|
| `trip` 🟢 | **un** repartidor, sin ventanas de tiempo. Gratis y directo. |
| [`route/optimize`](../docs/API.md#optimización-multi-parada-vroom) 🔑 | **varias** motos, tiempo de servicio por parada, ETA de cada una |

---

## 3 · Map matching — por qué calles pasó DE VERDAD

El GPS de un celular salta entre cuadras. Esto agarra el rastro sucio y lo pega a la calle real:

```bash
curl "$MAPS/route/$P/match/v1/driving/{p1};{p2};…;{p18}\
?overview=full&geometries=geojson\
&timestamps={unix1};{unix2};…\
&radiuses=10;10;…"
```
```json
{ "matchings": [ { "confidence": 0.9047, "distance": 14822, "duration": …, "geometry": {…} } ],
  "tracepoints": [
    { "matchings_index": 0, "name": "Calle 10. Camejo", "distance": 7.5 },
    { "matchings_index": 0, "name": "",                 "distance": 6.2 },
    { "matchings_index": 0, "name": "Av. 18 Guárico",   "distance": 12.3 } ] }
```

### ⚠️ Lo que manda es la DENSIDAD de la traza, no los timestamps

Medido contra este servidor, misma ruta, con ruido de ±9 m simulando un GPS de celular:

| traza | sin `timestamps` | con `timestamps` + `radiuses` |
|---|---|---|
| **3 puntos** (dispersos) | `2.2e-16` ❌ | `1.3e-9` ❌ |
| **18 puntos** (uno cada ~9 s) | **0.7308** ✅ | **0.9047** ✅ |

- **Con pocos puntos la `confidence` es cero, le mandes lo que le mandes.** Tres coordenadas separadas admiten demasiados caminos posibles. Mandá el rastro completo, no una muestra.
- Con traza densa, los `timestamps` suben la confianza de 0.73 a 0.90 — mandalos igual.
- `radiuses` = precisión del GPS en metros (usá la que reporta el dispositivo).
- **`confidence` baja no significa geometría mal**: significa que OSRM encontró varios caminos plausibles. Si la usás como semáforo, un umbral razonable es 0.6.
- `tracepoints[i].distance` = cuánto se movió cada punto al pegarlo a la vía.
- Máx **100 puntos** por request: partí las trazas largas.

**Para qué sirve**: auditar el recorrido de un repartidor, cobrar por km reales (no por línea recta), limpiar el historial de `GET /api/biz/tracking/history/{id}` antes de mostrarlo, o detectar desvíos.

```js
// Limpiar el historial de un repartidor antes de dibujarlo
const h = await fetch(`${MAPS}/api/biz/tracking/history/moto1`, { headers: { 'x-api-key': KEY } }).then(r => r.json());
const pts  = h.map(p => `${p.lon},${p.lat}`).join(';');
const ts   = h.map(p => Math.floor(new Date(p.ts).getTime() / 1000)).join(';');
const m    = await fetch(`${MAPS}/route/ve-moto/match/v1/driving/${pts}?timestamps=${ts}&overview=full&geometries=geojson`).then(r => r.json());
// m.matchings[0].geometry → la línea limpia, pegada a las calles
```
*(el historial pide clave porque son datos de tu flota; el matching es público)*

---

## 4 · Snap — el punto exacto sobre la vía

```bash
curl "$MAPS/route/$P/nearest/v1/driving/-70.2072,8.6231?number=1"
```
```json
{ "code": "Ok",
  "waypoints": [ { "location": [-70.207151, 8.623147],
                   "name": "Calle 10. Camejo",
                   "distance": 7.49 } ] }
```

`distance` = metros desde tu punto hasta la vía más cercana. Tres usos típicos:

1. **Validar una dirección**: si `distance > 150 m`, el pin probablemente cae en el medio de una manzana o fuera de zona urbana → pedile al cliente que lo corrija.
2. **Corregir el pin** que el usuario arrastró: guardá `waypoints[0].location` en vez de lo que soltó.
3. **Nombre de la calle sin geocodificar**: más rápido y barato que `/geocode/reverse` cuando solo querés la vía.

`&number=3` devuelve las 3 vías más cercanas (útil en esquinas).

---

## Todo junto: auditar una entrega

```
tracking/history/{moto} 🔑     → el rastro crudo del GPS
   → match  🟢                 → por qué calles pasó realmente + km reales
   → nearest 🟢                → ¿el destino cae sobre una calle?
   → table  🟢                 → ¿había otra moto más cerca en ese momento?
   → trip   🟢                 → ¿el orden de las paradas fue el óptimo?
```

Referencia completa: [docs/API.md](../docs/API.md) · Flujo de delivery: [docs/DELIVERY.md](../docs/DELIVERY.md)
