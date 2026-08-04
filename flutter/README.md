# telehost_maps

Cliente Dart de **[TeleHost Maps](https://maps.telehost.net)** — el mapa propio de
TeleHost C.A. Rutas, giro a giro **en español**, y búsqueda de negocios,
urbanizaciones y direcciones en América Latina, España y EE.UU.

Alternativa a Google Maps Platform: **sin billing, sin cuotas por carga de mapa**.
Datos de OpenStreetMap y Overture Maps.

```yaml
dependencies:
  telehost_maps: ^0.1.0
  maplibre_gl: ^0.20.0   # opcional: para dibujar el mapa
```

## En 20 segundos

```dart
import 'package:telehost_maps/telehost_maps.dart';

final maps = TeleHostMaps();            // sin API key: casi todo es público
const yo = Punto(10.4939, -66.8772);    // Sabana Grande, Caracas

// Buscar por REFERENCIA — así se ubica la gente donde no hay catastro
final r = await maps.buscar('farmacia', cerca: yo);
print('${r.lugares.first.nombre} · a ${r.lugares.first.km} km');

// Ruta con giro a giro, perfil moto
final rutas = await maps.ruta(yo, r.lugares.first.punto, moto: true);
for (final p in rutas.first.pasos) print(p.instruccion);
// → "Salí por Calle Unión"
// → "Girá a la izquierda por Avenida Francisco Solano"
```

## Qué trae

| | |
|---|---|
| `buscar()` | 30 M negocios · **856 K barrios y urbanizaciones** · 168 M direcciones |
| `cerca()` | qué hay alrededor, para sugerir apenas abre el mapa |
| `ruta()` | rutas con alternativas y **giro a giro en español** |
| `matriz()` | minutos y km reales entre varios puntos — para elegir repartidor |
| `zonaDe()` | en qué zona de ruteo cae un punto (con caché) |
| `urlMapaEstatico()` | PNG de la ruta, para mandar por WhatsApp |

## Tres cosas que este paquete hace por vos

**1 · No te deja cobrar kilómetros que no existen.** OSRM *no falla* con un punto
fuera de su grafo: lo pega a la vía más cercana y devuelve una distancia creíble
e inventada. Medido en producción: Bogotá→Caracas devolvía "Ok · 991 km" pegando
Caracas a 457 km. Acá eso lanza `PuntoFueraDelGrafo`.

```dart
try {
  final r = await maps.ruta(origen, destino);
} on RutaCruzaZonas catch (e) {
  // Chicago→Nueva York: EE.UU. rutea POR REGIÓN, no entre regiones
} on SinCobertura catch (e) {
  // hay mapa, pero no hay grafo de rutas ahí
} on PuntoFueraDelGrafo catch (e) {
  print('sin calles cerca: ${e.metros} m');
}
```

**2 · La ubicación manda.** `buscar()` parte del punto del usuario y abre anillos
de 25 → 100 → 400 km. Quien está en Barinas ve Barinas; quien está en Ciudad de
México ve México. Y como no filtra por país, el de San Antonio del Táchira sigue
viendo Cúcuta, a 12 km cruzando la frontera.

Mostrá siempre `Lugar.km` en la UI, y usá `Resultados.lejos` para avisar cuando
no había nada cerca.

**3 · El texto de los giros ya está escrito.** OSRM devuelve `type` + `modifier`,
no frases. Si cada app arma su propio texto, varias lo arman mal.

## Cobertura (no es uniforme — importa)

- **Rutas**: 27 zonas — 22 países + las 5 regiones de EE.UU. **No se rutea entre
  regiones de EE.UU.**: Chicago→Nueva York lanza `RutaCruzaZonas`.
- **Perfil moto** (`moto: true`): solo Venezuela. Medido: **21-27 % más rápido en
  vías de superficie**, 0-1 % cuando la ruta usa autopista — el perfil le da menos
  punta a propósito. **No prometas un porcentaje fijo.**
- **Direcciones de calle y número**: solo donde el catastro es público — Brasil,
  México, España, Colombia, Chile, Uruguay, EE.UU. **Venezuela no tiene ninguna**;
  ahí se resuelve por negocios y barrios, que es como se ubica la gente igual.

Consultá `zonaDe()` antes de rutear; nunca cablees `ve`/`co` en tu código.

## El mapa en pantalla

Este paquete es el **cliente de datos**. Para dibujar el mapa usá
[`maplibre_gl`](https://pub.dev/packages/maplibre_gl) con nuestros estilos:

```dart
MapLibreMap(
  styleString: 'https://maps.telehost.net/styles/telehost/style.json',
  initialCameraPosition: const CameraPosition(target: LatLng(10.49, -66.87), zoom: 14),
)
```

Estilos: `telehost` (el de la casa) · `liberty` · `hybrid` (satélite + etiquetas)
· `dark-matter` · `cargo` (náutico).

## API key

Solo para endpoints de producto (tracking de flota, despacho, combustible).
Se pide en [maps.telehost.net/dev](https://maps.telehost.net/dev/) y va
**únicamente en tu backend** — nunca compilada en la app:

```dart
final maps = TeleHostMaps(apiKey: Platform.environment['MAPS_KEY']);
```

## La marca, puesta

```dart
import 'package:telehost_maps/telehost_maps.dart';

Stack(children: [
  MapLibreMap(styleString: maps.urlEstilo(), /* … */),
  const Positioned(left: 10, bottom: 10, child: MarcaTeleHost()),
])
```

Sobre satélite o híbrido: `MarcaTeleHost(oscuro: true)`.

El isotipo se dibuja, no se descarga: se ve igual con el teléfono sin señal.

**La atribución legal no hay que dibujarla** — viaja dentro del `style.json` y
MapLibre la muestra sola. Lo único que tenés que hacer es **no esconder** el
botón de atribución del mapa: es la licencia ODbL de OpenStreetMap.

## Atribución

Mostrá en tu mapa: *© OpenStreetMap contributors · Overture Maps · TeleHost Maps*.
Satélite: *© Esri*.

## Licencia

MIT © TeleHost C.A. — [documentación completa](https://github.com/telehostca/maps-sdk)
