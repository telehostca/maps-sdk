# @telehostnet/maps

Cliente TypeScript de **[TeleHost Maps](https://maps.telehost.net)** — el mapa
propio de TeleHost C.A. Rutas, giro a giro **en español**, y búsqueda de
negocios, urbanizaciones y direcciones en América Latina, España y EE.UU.

Alternativa a Google Maps Platform: **sin billing, sin cuotas por carga de mapa**.
Datos de OpenStreetMap y Overture Maps.

Funciona igual en **React Native**, **navegador** y **Node ≥18** — solo usa
`fetch`, sin dependencias.

```bash
npm i @telehostnet/maps
```

## En 20 segundos

```ts
import { TeleHostMaps } from "@telehostnet/maps";

const maps = new TeleHostMaps();               // sin API key: casi todo es público
const yo = { lat: 10.4939, lon: -66.8772 };    // Sabana Grande, Caracas

// Buscar por REFERENCIA — así se ubica la gente donde no hay catastro
const r = await maps.buscar("farmacia", { cerca: yo });
console.log(r.lugares[0].nombre, `a ${r.lugares[0].km} km`);

// Ruta con giro a giro, perfil moto
const [ruta] = await maps.ruta(yo, r.lugares[0].punto, { moto: true });
ruta.pasos.forEach(p => console.log(p.instruccion));
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
| `urlEstilo()` | la URL del estilo para MapLibre |

## Tres cosas que este paquete hace por vos

**1 · No te deja cobrar kilómetros que no existen.** OSRM *no falla* con un punto
fuera de su grafo: lo pega a la vía más cercana y devuelve una distancia creíble
e inventada. Medido en producción: Bogotá→Caracas devolvía `"Ok" · 991 km`
pegando Caracas a 457 km. Acá eso lanza `PuntoFueraDelGrafo`.

```ts
import { RutaCruzaZonas, SinCobertura, PuntoFueraDelGrafo } from "@telehostnet/maps";

try {
  const [ruta] = await maps.ruta(origen, destino);
} catch (e) {
  if (e instanceof RutaCruzaZonas) { /* Chicago→NY: EE.UU. rutea POR REGIÓN */ }
  else if (e instanceof SinCobertura) { /* hay mapa, pero no hay grafo ahí */ }
  else if (e instanceof PuntoFueraDelGrafo) { /* sin calles cerca: e.metros */ }
}
```

**2 · La ubicación manda.** `buscar()` parte del punto del usuario y abre anillos
de 25 → 100 → 400 km. Quien está en Barinas ve Barinas; quien está en Ciudad de
México ve México. Y como no filtra por país, el de San Antonio del Táchira sigue
viendo Cúcuta, a 12 km cruzando la frontera.

Mostrá siempre `lugar.km` en la UI, y usá `resultados.lejos` para avisar cuando
no había nada cerca.

**3 · El texto de los giros ya está escrito.** OSRM devuelve `type` + `modifier`,
no frases. Si cada app arma su propio texto, varias lo arman mal.

## React Native: el mapa en pantalla

Este paquete es el **cliente de datos**. Para dibujar el mapa usá
[`@maplibre/maplibre-react-native`](https://www.npmjs.com/package/@maplibre/maplibre-react-native):

```tsx
import MapLibreGL from "@maplibre/maplibre-react-native";
import { TeleHostMaps } from "@telehostnet/maps";

const maps = new TeleHostMaps();

<MapLibreGL.MapView style={{ flex: 1 }} styleURL={maps.urlEstilo()}>
  <MapLibreGL.Camera zoomLevel={14} centerCoordinate={[-66.8772, 10.4939]} />
</MapLibreGL.MapView>
```

Estilos: `telehost` (el de la casa) · `liberty` · `hybrid` (satélite + etiquetas)
· `dark-matter` · `cargo` (náutico).

## Cobertura (no es uniforme — importa)

- **Rutas**: 27 zonas — 22 países + las 5 regiones de EE.UU. **No se rutea entre
  regiones de EE.UU.**: Chicago→Nueva York lanza `RutaCruzaZonas`.
- **Perfil moto** (`{ moto: true }`): solo Venezuela. Medido: **21-27 % más rápido
  en vías de superficie**, 0-1 % cuando la ruta usa autopista — el perfil le da
  menos punta a propósito. **No prometas un porcentaje fijo.**
- **Direcciones de calle y número**: solo donde el catastro es público — Brasil,
  México, España, Colombia, Chile, Uruguay, EE.UU. **Venezuela no tiene ninguna**;
  ahí se resuelve por negocios y barrios, que es como se ubica la gente igual.

Consultá `zonaDe()` antes de rutear; nunca cablees `ve`/`co` en tu código.

## API key

Solo para endpoints de producto (tracking de flota, despacho, combustible).
Se pide en [maps.telehost.net/dev](https://maps.telehost.net/dev/) y va
**únicamente en tu backend** — nunca compilada en la app:

```ts
const maps = new TeleHostMaps({ apiKey: process.env.MAPS_KEY });
```

## También en Flutter

El mismo cliente para Dart: [`telehost_maps`](https://pub.dev/packages/telehost_maps).

## La marca, puesta

```ts
import { controlDeMarca } from "@telehostnet/maps";

const marca = controlDeMarca();
map.addControl(marca, "bottom-left");
marca.tema(true);            // al pasar a satélite
```

El isotipo va inline: sin pedirlo a la red y sin depender de tu dominio.

En React Native el mapa es nativo y no hay DOM: usá `MARCA` (colores, texto,
enlace, isotipo) para armar la misma píldora con un `View`.

**La atribución legal no hay que escribirla** — viaja dentro del `style.json` y
MapLibre la muestra sola, en web y en nativo. Si además mostrás resultados de
`buscar()`, agregá `ATRIBUCION_OVERTURE`: los negocios son datos de Overture.

## Atribución

Mostrá en tu mapa: *© OpenStreetMap contributors · Overture Maps · TeleHost Maps*.
Satélite: *© Esri*.

## Licencia

MIT © TeleHost C.A. — [documentación completa](https://github.com/telehostca/maps-sdk)
