/// Cliente Dart de **TeleHost Maps** — el mapa propio de TeleHost C.A.
///
/// Rutas y giro a giro en español en 27 zonas (América Latina, España y las 5
/// regiones de EE.UU.), búsqueda de 30 M de negocios, 856 K barrios y 168 M de
/// direcciones. Datos de OpenStreetMap y Overture Maps. Sin billing.
///
/// Casi todo es público: solo los endpoints de producto necesitan API key, y
/// esa key va **en tu backend**, nunca compilada en la app.
///
/// ```dart
/// final maps = TeleHostMaps();
/// final yo = const Punto(10.4939, -66.8772);   // Sabana Grande, Caracas
///
/// final r = await maps.buscar('farmacia', cerca: yo);
/// final destino = r.lugares.first;
///
/// final rutas = await maps.ruta(yo, destino.punto, moto: true);
/// print('${rutas.first.km.toStringAsFixed(1)} km · ${rutas.first.minutos} min');
/// for (final p in rutas.first.pasos) print(p.instruccion);
/// ```
library telehost_maps;

export 'src/cliente.dart';
export 'src/errores.dart';
export 'src/instrucciones.dart' show instruccionEnEspanol, distanciaLegible, duracionLegible;
export 'src/modelos.dart';
