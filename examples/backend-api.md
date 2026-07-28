# Backend — el flujo de delivery completo con curl y PHP (API key)

Las funciones de producto requieren tu **API key** (`thmk_…`). Creala en el
[portal de desarrolladores](https://maps.telehost.net/dev/) o escribinos: info.telehost@gmail.com.
⚠️ La key vive en TU backend (variable de entorno) — nunca embebida en la app móvil.

```bash
export MAPS_BASE="https://maps.telehost.net"
export MAPS_KEY="thmk_TU_KEY"
```

La guía narrada de este flujo, con la máquina de estados y el tracking en vivo: [docs/DELIVERY.md](../docs/DELIVERY.md).

## 1. Cotizar (distancia real por vías → precio USD, con perfil MOTO)

```bash
curl -X POST "$MAPS_BASE/api/biz/pay/quote" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},"vehiculo":"moto"}'
# → {"ok":true,"perfil":"ve-moto","km":3.2,"min":8,"usd":3.5,
#    "combustible":{"litros":0.11,"usd":0.05,…},"tarifa":{…}}
```

## 2. Crear el pedido — tracking en vivo para el cliente, ya resuelto

```bash
curl -X POST "$MAPS_BASE/api/biz/orders" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},
       "vehiculo":"moto","cliente":"Ana","telefono":"584121234567"}'
# → {"ok":true,"id":18,"tracking_url":"https://maps.telehost.net/t/…","pin":"4831",
#    "fee_usd":3.5,"km":3.2,"min":8}
```
Compartí `tracking_url` con el cliente (la página ya existe: repartidor en vivo + ETA automático).
Guardá `pin`: el repartidor lo pide al entregar. Si pasás `telefono`, el cliente recibe
WhatsApp automático en cada estado.

## 3. Cobrar (link + QR; el cliente paga en Bs) + polling

```bash
curl -X POST "$MAPS_BASE/api/biz/pay/delivery" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},"cliente":"Pedido #18"}'
# → {"ok":true,"ref":"thm_…","usd":3.5,"payment_url":"https://…","qr":"data:image/png;base64,…"}

# polling hasta status:"paid" → {"ref","usd","status","payment_url","title"}
curl "$MAPS_BASE/api/biz/pay/thm_XXXX" -H "x-api-key: $MAPS_KEY"
```

## 4. Despachar al más cercano (matriz OSRM real) y asignar

```bash
# la app del motorizado reporta cada 3-5 s:
curl -X POST "$MAPS_BASE/api/biz/tracking/position" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"device_id":"moto1","lat":8.621,"lon":-70.202,"speed":28,"course":135}'

# ¿quién conviene? — por tiempo real de vías, no línea recta:
curl -X POST "$MAPS_BASE/api/biz/delivery/dispatch" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"pickup":{"lat":8.622,"lon":-70.201},"vehiculo":"moto","top":3}'
# → {"candidatos":[{"device_id":"moto1","km":0.9,"min":3,"edad_s":4,…},…]}

# asignar → pasa a en_route (y avisa por WhatsApp):
curl -X POST "$MAPS_BASE/api/biz/orders/18/assign" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" -d '{"device_id":"moto1"}'
```

## 5. Entregar con PIN

```bash
curl -X POST "$MAPS_BASE/api/biz/orders/18/status" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"status":"delivered","pin":"4831"}'
# PIN equivocado → 403 · más de 5 intentos en 15 min → 429
```

## 6. Optimizar la ruta si lleva varios pedidos

```bash
curl -X POST "$MAPS_BASE/api/biz/route/optimize" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"depot":{"lat":8.620,"lon":-70.200},
       "deliveries":[{"id":"p18","lat":8.625,"lon":-70.205},
                     {"id":"p19","lat":8.640,"lon":-70.230},
                     {"id":"p20","lat":8.610,"lon":-70.210}]}'
# → {"order":[{"stop":1,"delivery_id":"p18","eta_min":2},…],"total_min":29,"total_km":16.3,"geometry":"…"}
```

## 7. Cobertura por tiempo (isócronas)

```bash
# ¿el cliente está a menos de 15 min del restaurante?
curl -X POST "$MAPS_BASE/api/biz/isochrone/check" \
  -H "x-api-key: $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.625,"lon":-70.205},"point":{"lat":8.640,"lon":-70.190},"minutes":15}'
# → {"inside":true,"durationMinutes":11.2,…}
```

## PHP / Laravel

```php
$maps = Http::withHeaders(['x-api-key' => env('MAPS_KEY')])
    ->baseUrl(env('MAPS_BASE'))->acceptJson();

// Cotizar (moto = ETA honesto en ciudad)
$q = $maps->post('/api/biz/pay/quote', [
    'origin'   => ['lat' => 8.6231, 'lon' => -70.2072],
    'dest'     => ['lat' => $pedido->lat, 'lon' => $pedido->lon],
    'vehiculo' => 'moto',
])->json();                                   // $q['usd'], $q['km'], $q['min'], $q['combustible']

// Crear pedido con tracking
$orden = $maps->post('/api/biz/orders', [
    'origin'   => ['lat' => 8.6231, 'lon' => -70.2072],
    'dest'     => ['lat' => $pedido->lat, 'lon' => $pedido->lon],
    'vehiculo' => 'moto',
    'telefono' => $pedido->telefono,
])->json();                                   // $orden['tracking_url'], $orden['pin'], $orden['id']

// Cobrar
$pago = $maps->post('/api/biz/pay/delivery', [
    'origin'  => ['lat' => 8.6231, 'lon' => -70.2072],
    'dest'    => ['lat' => $pedido->lat, 'lon' => $pedido->lon],
    'cliente' => "Pedido #{$orden['id']}",
])->json();                                   // $pago['payment_url'], $pago['qr'], $pago['ref']

// Despachar y asignar
$disp = $maps->post('/api/biz/delivery/dispatch', [
    'pickup' => ['lat' => 8.622, 'lon' => -70.201], 'vehiculo' => 'moto',
])->json();
$maps->post("/api/biz/orders/{$orden['id']}/assign", [
    'device_id' => $disp['candidatos'][0]['device_id'],
]);
```

## El flujo completo en una línea

```
autocomplete 🟢 → pay/quote → orders (tracking_url + pin) → pay/delivery (link+QR)
→ pay/:ref hasta 'paid' → delivery/dispatch → orders/:id/assign → [nearby solo, a <250 m]
→ orders/:id/status delivered + PIN
```
