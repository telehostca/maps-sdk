# Guía de Delivery — de la cotización a la entrega

Todo lo que necesita una app de delivery, en el orden en que pasa un pedido real.
Requiere tu **API key** (`thmk_…`) en el backend — creala en [/dev/](https://maps.telehost.net/dev/).

```bash
export MAPS="https://maps.telehost.net"
export KEY="thmk_TU_CLAVE"          # solo en tu backend, nunca en la app
```

## El flujo completo

```
cliente elige dirección (autocomplete 🟢)
   → cotizás (pay/quote)           ← precio por distancia/tiempo REALES, perfil moto
   → creás el pedido (orders)      ← te da tracking_url + PIN de entrega
   → cobrás (pay/delivery)         ← link + QR, el cliente paga en Bs
   → despachás (delivery/dispatch) ← el repartidor más cercano por vías reales
   → asignás (orders/:id/assign)   ← el pedido pasa a "en camino"
   → el cliente MIRA el tracking_url: repartidor en vivo + ETA que se recalcula solo
   → "está llegando" se dispara solo a <250 m
   → entregás con PIN (orders/:id/status)
```

El cliente recibe además WhatsApp automático en cada paso (recibido → en camino → cerca → entregado) si pasás su `telefono` — sin que tu app haga nada.

---

## 1 · Cotizar — el precio se calcula por vías reales, no línea recta

```bash
curl -X POST "$MAPS/api/biz/pay/quote" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},"vehiculo":"moto"}'
```
```json
{ "ok":true, "country":"ve", "vehiculo":"moto", "perfil":"ve-moto",
  "km":3.2, "min":8, "usd":3.5, "moneda":"USD",
  "combustible": { "km":3.2, "litros":0.11, "usd":0.05, "precio_litro":0.5, "km_por_litro":30 },
  "tarifa": { "base":1, "per_km":0.5, "per_min":0.05, "minimo":1.5 } }
```

- **`vehiculo:"moto"`** usa el grafo MOTO 🛵: en ciudad la moto filtra tráfico — su ETA es 15-30 % menor que el de carro. Es la diferencia entre prometer "25 min" y cumplir "18".
- `combustible` te dice cuánta gasolina cuesta el viaje — para tu margen o para pagarle al repartidor. También suelto: `GET /api/biz/delivery/combustible?km=12.4&ida_vuelta=true`.
- El país se detecta solo por el origen (frontera real VE/CO — Cúcuta y San Cristóbal se resuelven bien).

## 2 · Crear el pedido — tracking para el cliente sin construir nada

```bash
curl -X POST "$MAPS/api/biz/orders" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},
       "vehiculo":"moto","cliente":"Ana","telefono":"584121234567","dest_dir":"Av. 23 de Enero, casa azul"}'
```
```json
{ "ok":true, "id":18, "token":"kJ2…", "tracking_url":"https://maps.telehost.net/t/kJ2…",
  "pin":"4831", "nota_pin":"Dáselo al cliente: el repartidor lo pide al entregar. No se vuelve a mostrar.",
  "fee_usd":3.5, "km":3.2, "min":8, "vehiculo":"moto" }
```

- **`tracking_url`** es una página lista para compartir (WhatsApp, SMS): el cliente ve el mapa, al repartidor moverse, y un ETA que se **recalcula solo** con la posición GPS real (~cada 30 s con hasta 5 repartos activos; con más, rota round-robin).
- **`pin`**: guardalo y mostráselo SOLO al cliente. El repartidor lo pide al entregar — prueba de entrega sin firmar papeles. No se vuelve a mostrar.
- El `token` de la URL son 24 bytes aleatorios: nadie puede adivinar ni enumerar pedidos.

**Privacidad por diseño**: la página pública nunca muestra teléfono, PIN ni datos del repartidor más allá de su posición — y esa posición **se apaga** al entregar o cancelar.

## 3 · Cobrar — el cliente paga en Bs, tu contabilidad queda en USD

```bash
curl -X POST "$MAPS/api/biz/pay/delivery" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},"cliente":"Pedido #18"}'
# → { "ok":true, "ref":"thm_…", "usd":3.5, "payment_url":"https://…", "qr":"data:image/png;base64,…" }

# polling hasta 'paid':
curl "$MAPS/api/biz/pay/thm_XXXX" -H "x-api-key: $KEY"
# → { "ref":"thm_…", "usd":3.5, "status":"paid", "payment_url":"…", "title":"…" }
```
Guiate por `status` (`pending` → `paid`); tu referencia contable es el monto `usd`.

## 4 · Despachar — el repartidor más cercano DE VERDAD

```bash
curl -X POST "$MAPS/api/biz/delivery/dispatch" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"pickup":{"lat":8.622,"lon":-70.201},"vehiculo":"moto","top":3}'
```
```json
{ "ok":true, "country":"ve", "perfil":"ve-moto", "evaluados":7,
  "candidatos":[
    { "device_id":"moto1", "km":0.9, "min":3, "edad_s":4,  "lat":8.6215, "lon":-70.2043, "speed":22 },
    { "device_id":"moto4", "km":1.7, "min":6, "edad_s":11, … } ] }
```
Usa la **matriz OSRM real**: el que está "cerca" cruzando el río pero a 15 min por el puente queda abajo en la lista. Solo considera GPS fresco (≤5 min; ajustable con `max_edad_min`).

Para que esto funcione, la app del repartidor reporta su posición cada 3-5 s:
```bash
curl -X POST "$MAPS/api/biz/tracking/position" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"device_id":"moto1","lat":8.6215,"lon":-70.2043,"speed":22,"course":135}'
# o estilo OsmAnd (apps GPS genéricas): POST /api/biz/tracking/position?id=moto1&lat=…&lon=…
```

## 5 · Asignar y avanzar estados

```bash
# asignar → el pedido pasa a "en camino" (exige que moto1 tenga GPS fresco <5 min)
curl -X POST "$MAPS/api/biz/orders/18/assign" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"device_id":"moto1"}'

# estados manuales (preparando, cancelar):
curl -X POST "$MAPS/api/biz/orders/18/status" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'

# entregar — el repartidor tipea el PIN que tiene el cliente:
curl -X POST "$MAPS/api/biz/orders/18/status" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"status":"delivered","pin":"4831"}'
```

Máquina de estados (transición inválida → `409`):

```
created ──→ preparing ──→ en_route ──→ nearby ──→ delivered
   │            │            (auto a <250 m ↑)
   └────────────┴──→ cancelled
```

- `nearby` **no lo mandás vos**: el worker de ETA lo dispara solo cuando el repartidor está a menos de 250 m (y avisa por WhatsApp "tu pedido está llegando").
- `delivered` exige el PIN (5 intentos / 15 min — un PIN de 4 dígitos sin límite se fuerza en minutos; con límite, no).
- Cada transición queda en la bitácora: `GET /api/biz/track/{token}/events`.

## 6 · Tu propia UI de tracking (opcional)

Si preferís tu pantalla en vez de la página lista:

```js
// desde el navegador del cliente — público, el token ES la autorización
const r = await fetch(`https://maps.telehost.net/api/biz/track/${token}`);
const t = await r.json();
// t.status, t.eta_min, t.driver = {lat,lon,course}|null, t.stale,
// t.origen, t.destino {lat,lon,dir}, t.negocio {nombre,logo}, t.km, t.vehiculo
```
Refrescá cada 5-10 s. `driver:null` + `stale:true` = GPS viejo: mostrá el último ETA con un "hace un momento". `course` es el rumbo — rotá el ícono de la moto.

## 7 · Varios pedidos en un solo viaje

```bash
curl -X POST "$MAPS/api/biz/route/optimize" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"depot":{"lat":8.620,"lon":-70.200},
       "deliveries":[{"id":"p18","lat":8.625,"lon":-70.205},{"id":"p19","lat":8.640,"lon":-70.230},
                     {"id":"p20","lat":8.610,"lon":-70.210}]}'
# → orden óptimo de paradas + ETA por parada + geometry (polyline5) para dibujar
```

## 8 · Zonas de cobertura y tarifas por anillo

```bash
# ¿hasta dónde llego en 10 min desde el local? (polígono real, sigue las vías)
curl "$MAPS/api/biz/isochrone?lat=8.6231&lon=-70.2072&minutes=10" -H "x-api-key: $KEY"

# anillos 5/10/15/20 min con tarifa sugerida por zona:
curl -X POST "$MAPS/api/biz/delivery-zones" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"zones":[5,10,15,20]}'

# ¿este cliente está dentro de mi cobertura de 15 min?
curl -X POST "$MAPS/api/biz/isochrone/check" -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"point":{"lat":8.640,"lon":-70.19},"minutes":15}'
```

---

## Resumen de límites

- 60 req/min por clave · `optimize`/isócronas: 10/min · ingesta GPS: 600/min (un repartidor cada 5 s = 12/min).
- Tracking público del pedido: 30 req/min por IP del cliente.
- Cuota diaria por clave — ¿te quedás corto? Pedí más en [/dev/](https://maps.telehost.net/dev/).

Código listo para copiar (curl + PHP/Laravel): [examples/backend-api.md](../examples/backend-api.md).
