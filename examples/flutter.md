# Flutter — maplibre_gl con TeleHost Maps

Reemplaza `google_maps_flutter` por [`maplibre_gl`](https://pub.dev/packages/maplibre_gl) — sin API key, sin billing.

## 1. Dependencia

```yaml
# pubspec.yaml
# QUITA: google_maps_flutter
dependencies:
  maplibre_gl: ^0.20.0
```

## 2. Mapa básico

```dart
import 'package:maplibre_gl/maplibre_gl.dart';

class MapaScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MapLibreMap(
      styleString: "https://maps.telehost.net/styles/liberty/style.json",
      initialCameraPosition: const CameraPosition(
        target: LatLng(8.6231, -70.2072),   // Barinas
        zoom: 13,
      ),
      myLocationEnabled: true,               // GPS nativo — gratis
      onMapCreated: (controller) async {
        await controller.addSymbol(const SymbolOptions(
          geometry: LatLng(8.6231, -70.2072),
          iconImage: "marker-15",
          textField: "Mi negocio",
          textOffset: Offset(0, 1.4),
        ));
      },
    );
  }
}
```

## 3. Dibujar la ruta del pedido

```dart
// GET https://maps.telehost.net/route/ve/route/v1/driving/{lonA},{latA};{lonB},{latB}?overview=full&geometries=geojson
final resp = await http.get(Uri.parse(
  'https://maps.telehost.net/route/ve/route/v1/driving/$lonA,$latA;$lonB,$latB?overview=full&geometries=geojson'));
final data = jsonDecode(resp.body);
final coords = (data['routes'][0]['geometry']['coordinates'] as List)
    .map((c) => LatLng(c[1], c[0])).toList();

await controller.addLine(LineOptions(
  geometry: coords, lineColor: "#1a73e8", lineWidth: 5, lineOpacity: 0.85,
));
```

## 4. Autocomplete en el checkout

Llama `GET /autocomplete?q=&lat=&lon=&lang=es&limit=5` con debounce de ~275 ms
(ver [autocomplete.html](autocomplete.html) para el patrón). Cotización/cobro/tracking:
[backend-api.md](backend-api.md) — desde tu backend, no desde la app.
