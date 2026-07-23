# Backend — cotizar, cobrar, optimizar y trackear (API key)

Las funciones de logística requieren tu **API key** (`thmk_…`). Solicítala: info.telehost@gmail.com.
⚠️ La key vive en TU backend (variable de entorno) — nunca embebida en la app móvil.

```bash
export MAPS_BASE="https://maps.telehost.net"
export MAPS_KEY="thmk_TU_KEY"
```

## 1. Cotizar el delivery (distancia real por vías → precio USD)

```bash
curl -X POST "$MAPS_BASE/api/biz/pay/quote" \
  -H "Authorization: Bearer $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950}}'
# → {"ok":true,"km":3.2,"min":8,"usd":3.5,"moneda":"USD",...}
```

## 2. Cobrar (genera link + QR de pago; el cliente paga en Bs)

```bash
curl -X POST "$MAPS_BASE/api/biz/pay/delivery" \
  -H "Authorization: Bearer $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.6231,"lon":-70.2072},"dest":{"lat":8.6350,"lon":-70.1950},"cliente":"Pedido #1042"}'
# → {"ok":true,"ref":"thm_…","usd":3.5,"payment_url":"https://…","qr":"data:image/png;base64,…"}
```
Envía `payment_url` por WhatsApp o muestra el `qr` en tu checkout.

## 3. Optimizar la ruta del repartidor (N pedidos → orden óptimo)

```bash
curl -X POST "$MAPS_BASE/api/biz/route/optimize" \
  -H "Authorization: Bearer $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"depot":{"lat":8.620,"lon":-70.200},
       "deliveries":[{"id":"p1","lat":8.625,"lon":-70.205},
                     {"id":"p2","lat":8.640,"lon":-70.230},
                     {"id":"p3","lat":8.610,"lon":-70.210}]}'
# → {"order":[{"stop":1,"delivery_id":"p1","eta_min":2},…],"total_min":29,"total_km":16.3,"geometry":"…"}
```

## 4. Tracking del repartidor

```bash
# La app del motorizado reporta cada 3-5 s:
curl -X POST "$MAPS_BASE/api/biz/tracking/position" \
  -H "Authorization: Bearer $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"device_id":"moto1","lat":8.621,"lon":-70.202,"speed":28}'

# ¿Quién está más cerca del restaurante?
curl "$MAPS_BASE/api/biz/tracking/nearby?lat=8.622&lon=-70.201&radius=3000" \
  -H "Authorization: Bearer $MAPS_KEY"
# → [{"device_id":"moto1","distance_m":246,…},{"device_id":"moto2","distance_m":2893,…}]

# ¿Dónde va mi pedido? (para el cliente)
curl "$MAPS_BASE/api/biz/tracking/position/moto1" -H "Authorization: Bearer $MAPS_KEY"
```

## 5. Cobertura por tiempo (isócronas)

```bash
# ¿El cliente está a menos de 15 min del restaurante?
curl -X POST "$MAPS_BASE/api/biz/isochrone/check" \
  -H "Authorization: Bearer $MAPS_KEY" -H "Content-Type: application/json" \
  -d '{"origin":{"lat":8.625,"lon":-70.205},"point":{"lat":8.640,"lon":-70.190},"minutes":15}'
# → {"inside":true,"durationMinutes":11.2,…}
```

## PHP / Laravel

```php
$maps = Http::withToken(env('MAPS_KEY'))->baseUrl(env('MAPS_BASE'))->acceptJson();

// Cotizar
$q = $maps->post('/api/biz/pay/quote', [
    'origin' => ['lat' => 8.6231, 'lon' => -70.2072],
    'dest'   => ['lat' => $pedido->lat, 'lon' => $pedido->lon],
])->json();                                   // $q['usd'], $q['km'], $q['min']

// Cobrar
$pago = $maps->post('/api/biz/pay/delivery', [
    'origin'  => ['lat' => 8.6231, 'lon' => -70.2072],
    'dest'    => ['lat' => $pedido->lat, 'lon' => $pedido->lon],
    'cliente' => "Pedido #{$pedido->id}",
])->json();                                   // $pago['payment_url'], $pago['qr'], $pago['ref']

// Repartidor más cercano
$motos = $maps->get('/api/biz/tracking/nearby', [
    'lat' => 8.622, 'lon' => -70.201, 'radius' => 5000,
])->json();                                   // ordenados por distancia
```

## Flujo completo recomendado

```
autocomplete (cliente elige dirección) → quote (muestras precio) →
pay/delivery (link+QR) → [pago confirmado] → tracking/nearby (asignas moto) →
route/optimize (si lleva varios) → tracking/position (en vivo) → entregado
```
