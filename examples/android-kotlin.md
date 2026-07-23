# Android (Kotlin) — MapLibre Native con TeleHost Maps

Reemplaza el SDK de Google Maps por [MapLibre Native](https://maplibre.org/) — sin API key, sin billing.

## 1. Dependencia

```gradle
// build.gradle (app)
// QUITA:  implementation("com.google.android.gms:play-services-maps:…")
dependencies {
    implementation("org.maplibre.gl:android-sdk:11.5.1")
}
```

> También quita la meta-data `com.google.android.geo.API_KEY` del `AndroidManifest.xml`.

## 2. Mapa básico

```kotlin
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView

class MapActivity : AppCompatActivity() {
    private lateinit var mapView: MapView

    override fun onCreate(savedInstanceState: Bundle?) {
        MapLibre.getInstance(this)                       // ANTES de inflar el layout
        super.onCreate(savedInstanceState)
        mapView = MapView(this)
        setContentView(mapView)
        mapView.onCreate(savedInstanceState)

        mapView.getMapAsync { map ->
            map.setStyle("https://maps.telehost.net/styles/liberty/style.json")
            map.cameraPosition = CameraPosition.Builder()
                .target(LatLng(8.6231, -70.2072))
                .zoom(13.0)
                .build()
        }
    }
    // Recuerda delegar onStart/onResume/onPause/onStop/onDestroy/onLowMemory a mapView
}
```

## 3. Marcadores y ruta

```kotlin
// Marcador simple (plugin de anotaciones o SymbolLayer)
map.getStyle { style ->
    // Ruta: pide la línea a OSRM y dibújala como LineLayer
    // GET https://maps.telehost.net/route/ve/route/v1/driving/-70.2072,8.6231;-70.185,8.645?overview=full&geometries=geojson
    // → routes[0].geometry es GeoJSON listo para GeoJsonSource + LineLayer
}
```

## 4. Ubicación del usuario (sin Google Geolocation API)

Usa el GPS nativo (`FusedLocationProviderClient` de Play Services Location **o** `LocationManager` puro) — la ubicación del dispositivo no toca las APIs de pago de Google Maps.

## 5. Llamadas de negocio (backend)

Autocomplete, cotización, cobro, optimización y tracking se llaman por HTTP —
ver [backend-api.md](backend-api.md). Recomendado: hazlas desde TU backend
(la API key no debe ir embebida en el APK).
