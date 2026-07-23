# iOS (Swift) — MapLibre Native con TeleHost Maps

Reemplaza el pod `GoogleMaps` por [MapLibre Native iOS](https://maplibre.org/) — sin API key, sin billing.

## 1. Dependencia (Swift Package Manager)

En Xcode: **File → Add Package Dependencies…**

```
https://github.com/maplibre/maplibre-gl-native-distribution
```
(desde 6.0.0). Quita el pod `GoogleMaps` y la key `GMSServices.provideAPIKey(...)` del `AppDelegate`.

## 2. Mapa básico

```swift
import MapLibre

class MapViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let mapView = MLNMapView(
            frame: view.bounds,
            styleURL: URL(string: "https://maps.telehost.net/styles/liberty/style.json")
        )
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        mapView.setCenter(
            CLLocationCoordinate2D(latitude: 8.6231, longitude: -70.2072),
            zoomLevel: 13, animated: false
        )
        mapView.showsUserLocation = true   // GPS nativo (CoreLocation) — gratis
        view.addSubview(mapView)

        // Marcador
        let pin = MLNPointAnnotation()
        pin.coordinate = CLLocationCoordinate2D(latitude: 8.6231, longitude: -70.2072)
        pin.title = "Mi negocio"
        mapView.addAnnotation(pin)
    }
}
```

## 3. Ruta (OSRM → MLNPolyline)

```swift
// GET https://maps.telehost.net/route/ve/route/v1/driving/{lonA},{latA};{lonB},{latB}?overview=full&geometries=geojson
// Decodifica routes[0].geometry.coordinates → [CLLocationCoordinate2D] → MLNPolyline
let coords: [CLLocationCoordinate2D] = geo.map { CLLocationCoordinate2D(latitude: $0[1], longitude: $0[0]) }
let line = MLNPolyline(coordinates: coords, count: UInt(coords.count))
mapView.addAnnotation(line)
```

## 4. Llamadas de negocio

Autocomplete/cotización/cobro/tracking → HTTP desde TU backend (no embebas la
API key en la app). Ver [backend-api.md](backend-api.md).
