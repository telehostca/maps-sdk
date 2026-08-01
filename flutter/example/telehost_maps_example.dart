// Ejemplo real contra maps.telehost.net — sin API key.
//   dart run example/telehost_maps_example.dart
import 'package:telehost_maps/telehost_maps.dart';

Future<void> main() async {
  final maps = TeleHostMaps();
  const yo = Punto(10.4939, -66.8772); // Sabana Grande, Caracas

  // 1 · buscar por referencia (lo que la gente usa en Venezuela)
  final r = await maps.buscar('farmacia', cerca: yo, limite: 3);
  print('Buscar "farmacia" — radio ${r.radioKm} km');
  for (final l in r.lugares) {
    print('  ${l.esBarrio ? "📍" : "🏪"} ${l.nombre} · ${l.ciudad ?? "?"} · a ${l.km} km');
  }
  if (r.vacio) return print('sin resultados');

  // 2 · ruta con giro a giro en español, perfil moto
  final destino = r.lugares.first.punto;
  final rutas = await maps.ruta(yo, destino, moto: true);
  final ruta = rutas.first;
  print('\nRuta (${ruta.zona}): ${distanciaLegible(ruta.metros)} · ${duracionLegible(ruta.segundos)}');
  for (final p in ruta.pasos.take(4)) {
    print('  → ${p.instruccion} (${distanciaLegible(p.metros)})');
  }
  if (rutas.length > 1) print('  alternativas: ${rutas.length - 1}');

  // 3 · imagen para mandar por WhatsApp
  if (ruta.polyline != null) {
    print('\nPNG: ${maps.urlMapaEstatico(ruta.polyline!).substring(0, 90)}…');
  }

  // 4 · los errores son honestos: nunca una distancia inventada
  try {
    await maps.ruta(const Punto(4.711, -74.072), yo); // Bogotá → Caracas
  } on RutaCruzaZonas catch (e) {
    print('\nBogotá→Caracas rechazada: zonas ${e.zonas}');
  }

  maps.cerrar();
}
