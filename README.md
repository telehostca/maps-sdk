# TeleHost Maps — SDK y ejemplos de integración

<p align="center">
  <b>Mapas, geocoding, autocomplete, rutas y logística para Venezuela y Colombia.</b><br/>
  Infraestructura propia en LATAM · datos OpenStreetMap · sin límites de Google · precios en USD.
</p>

🌐 **Demo en vivo:** https://maps.telehost.net

---

## ¿Qué es TeleHost Maps?

Una plataforma de mapas y logística operada por [TeleHost C.A.](https://telehost.net) pensada para **apps de delivery, ride-hailing, e-commerce y logística** en Venezuela y Colombia:

| Capacidad | Reemplaza a |
|---|---|
| 🗺️ Mapas vectoriales (calles + satélite) | Google Maps SDK / Mapbox |
| 🔎 Autocomplete tolerante a errores | Google Places Autocomplete |
| 📍 Geocoding y reverse | Google Geocoding API |
| 🛣️ Rutas y matriz de distancias reales | Directions / Distance Matrix / Routes API |
| 🧭 Optimización de rutas multi-parada | Route Optimization API |
| ⏱️ Isócronas (zonas de cobertura por tiempo) | — (Google no lo ofrece) |
| 🛵 Tracking GPS de repartidores | — |
| 💳 Cobro del delivery por distancia (USD, pago en Bs) | — |

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

**Autocomplete de direcciones:**
```
GET https://maps.telehost.net/autocomplete?q=farmac&lat=8.62&lon=-70.20&lang=es&limit=5
```

**Ruta con distancia y tiempo reales:**
```
GET https://maps.telehost.net/route/ve/route/v1/driving/-70.2072,8.6231;-70.1850,8.6450?overview=false
```

## Contenido de este repo

```
docs/API.md            Referencia de la API (pública y de producto)
embed/embed.js         Widget de mapa embebible (fuente)
examples/
  web-maplibre.html    Mapa interactivo con MapLibre GL JS
  autocomplete.html    Buscador con sugerencias (patrón debounce)
  android-kotlin.md    Integración Android (MapLibre Native)
  ios-swift.md         Integración iOS (MapLibre Native)
  flutter.md           Integración Flutter (maplibre_gl)
  backend-api.md       Cotizar/cobrar delivery, optimizar rutas, tracking (API key)
```

## Apps móviles sin SDK de Google

Tu app Android/iOS/Flutter usa **[MapLibre Native](https://maplibre.org/)** (open source) apuntando al estilo de TeleHost:

```
https://maps.telehost.net/styles/liberty/style.json     ← calles
https://maps.telehost.net/styles/hybrid/style.json      ← satélite + etiquetas
```

Sin API key de Google, sin billing, sin cuotas por carga de mapa. Ver [examples/](examples/).

## API Keys (funciones de producto)

Las funciones de logística (cotización y cobro de delivery, optimización de rutas, isócronas, tracking GPS) requieren una **API key comercial**.

📩 Solicítala en **info.telehost@gmail.com** — planes desde $0 para probar.

## Uso justo

Los endpoints públicos (mapa, geocoding, autocomplete, rutas) están abiertos para desarrollo y evaluación. Para uso en producción con volumen, contáctanos para un plan — así mantenemos el servicio rápido para todos.

## Atribuciones

- Datos de mapa © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL). Muestra la atribución en tu mapa.
- Imágenes satelitales © Esri World Imagery (atribución requerida).
- Render: [MapLibre](https://maplibre.org/) (BSD-3). Rutas: [OSRM](http://project-osrm.org/). Geocoding: [Nominatim](https://nominatim.org/) / [Photon](https://photon.komoot.io/).

## Licencia

El código de este repositorio (widget y ejemplos) es [MIT](LICENSE) © TeleHost C.A.
El **servicio** TeleHost Maps y sus datos derivados son operados comercialmente por TeleHost C.A.

---

*Hecho en Venezuela 🇻🇪 con infraestructura propia.*
