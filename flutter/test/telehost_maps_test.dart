import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:telehost_maps/telehost_maps.dart';
import 'package:test/test.dart';

/// Cliente falso: responde lo que le digas, sin salir a la red.
TeleHostMaps conRespuesta(dynamic cuerpo, {int codigo = 200, String tipo = 'application/json'}) =>
    TeleHostMaps(
      cliente: MockClient((_) async => http.Response(
            jsonEncode(cuerpo),
            codigo,
            headers: {'content-type': tipo},
          )),
    );

void main() {
  group('instrucciones en español', () {
    test('arma el texto desde type + modifier', () {
      expect(
        instruccionEnEspanol({
          'maneuver': {'type': 'turn', 'modifier': 'left'},
          'name': 'Avenida Urdaneta',
        }),
        'Girá a la izquierda por Avenida Urdaneta',
      );
    });
    test('salida y llegada', () {
      expect(instruccionEnEspanol({'maneuver': {'type': 'depart'}, 'name': 'Calle 5'}), 'Salí por Calle 5');
      expect(instruccionEnEspanol({'maneuver': {'type': 'arrive'}}), 'Llegaste a destino');
    });
    test('rotonda con número de salida', () {
      expect(
        instruccionEnEspanol({'maneuver': {'type': 'roundabout', 'exit': 2}, 'name': ''}),
        'En la rotonda, tomá la salida 2',
      );
    });
    test('sin nombre de calle no deja espacios sueltos', () {
      final t = instruccionEnEspanol({'maneuver': {'type': 'turn', 'modifier': 'right'}, 'name': ''});
      expect(t, 'Girá a la derecha');
      expect(t.contains('  '), isFalse);
    });
  });

  group('formato legible', () {
    test('distancia', () {
      expect(distanciaLegible(350), '350 m');
      expect(distanciaLegible(1234), '1,2 km');
      expect(distanciaLegible(18400), '18 km');
    });
    test('duración', () {
      expect(duracionLegible(540), '9 min');
      expect(duracionLegible(4800), '1 h 20 min');
      expect(duracionLegible(7200), '2 h');
    });
  });

  group('polyline', () {
    test('decodifica el ejemplo canónico de Google', () {
      final p = decodificarPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
      expect(p.length, 3);
      expect(p.first.lat, closeTo(38.5, 0.001));
      expect(p.first.lon, closeTo(-120.2, 0.001));
      expect(p.last.lat, closeTo(43.252, 0.001));
    });
  });

  group('guarda de snap (trampa #48 — la que evita cobrar de más)', () {
    test('un punto pegado a 457 km hace fallar la ruta, no la devuelve', () async {
      final maps = conRespuesta({
        'code': 'Ok',
        'waypoints': [
          {'distance': 12},
          {'distance': 457796, 'name': 'Carretera Nacional'},
        ],
        'routes': [
          {'distance': 991000, 'duration': 50000, 'geometry': '_p~iF~ps|U', 'legs': []}
        ],
      });
      expect(
        () => maps.ruta(const Punto(4.711, -74.072), const Punto(10.504, -66.903), zona: 'co'),
        throwsA(isA<PuntoFueraDelGrafo>()
            .having((e) => e.metros, 'metros', 457796)
            .having((e) => e.indice, 'índice', 1)),
      );
    });

    test('distancias normales de una dirección real pasan', () async {
      final maps = conRespuesta({
        'code': 'Ok',
        'waypoints': [
          {'distance': 8},
          {'distance': 312}
        ],
        'routes': [
          {
            'distance': 6900,
            'duration': 540,
            'geometry': '_p~iF~ps|U',
            'legs': [
              {
                'steps': [
                  {'maneuver': {'type': 'depart'}, 'name': 'Calle Unión', 'distance': 172, 'duration': 30},
                  {'maneuver': {'type': 'arrive'}, 'name': '', 'distance': 0, 'duration': 0},
                ]
              }
            ]
          }
        ],
      });
      final r = await maps.ruta(const Punto(10.50, -66.90), const Punto(10.49, -66.85), zona: 've');
      expect(r.single.km, closeTo(6.9, 0.01));
      expect(r.single.minutos, 9);
      expect(r.single.pasos.first.instruccion, 'Salí por Calle Unión');
    });
  });

  group('errores del servidor traducidos', () {
    test('422 ruta-cruza-cobertura', () async {
      final maps = conRespuesta(
        {'error': 'ruta-cruza-cobertura', 'paises': ['us-midwest', 'us-northeast']},
        codigo: 422,
      );
      expect(
        () => maps.ruta(const Punto(41.87, -87.63), const Punto(40.71, -74.00), zona: 'us-midwest'),
        throwsA(isA<RutaCruzaZonas>().having((e) => e.zonas, 'zonas', ['us-midwest', 'us-northeast'])),
      );
    });

    test('200 con HTML no se toma por bueno (el gateway hace try_files)', () async {
      final maps = TeleHostMaps(
        cliente: MockClient((_) async =>
            http.Response('<!doctype html><html>…', 200, headers: {'content-type': 'text/html'})),
      );
      expect(
        () => maps.buscar('farmacia', cerca: const Punto(10.5, -66.9)),
        throwsA(isA<ErrorDeRed>()),
      );
    });
  });

  group('buscar', () {
    test('separa negocios, barrios y direcciones, y expone el radio', () async {
      final maps = conRespuesta({
        'radio_km': 25,
        'negocios': [
          {'nombre': 'Hotel Bristol', 'categoria': 'hotel', 'ciudad': 'Barinas', 'pais': 've', 'lat': 8.62, 'lon': -70.22, 'km': 1.5, 'confianza': 0.98},
          {'nombre': 'Prados del Este', 'categoria': 'barrio', 'pais': 've', 'lat': 8.58, 'lon': -70.17, 'km': 5.2},
        ],
        'direcciones': [],
      });
      final r = await maps.buscar('bristol', cerca: const Punto(8.6231, -70.2072));
      expect(r.radioKm, 25);
      expect(r.lejos, isFalse);
      expect(r.lugares.first.nombre, 'Hotel Bristol');
      expect(r.lugares.first.esBarrio, isFalse);
      expect(r.lugares.last.esBarrio, isTrue);
    });

    test('descarta direcciones lejanas (VE no tiene catastro)', () async {
      final maps = conRespuesta({
        'radio_km': 400,
        'negocios': [],
        'direcciones': [
          {'etiqueta': '2268 BRISTOL, DEL BIOBÍO', 'lat': -36.77, 'lon': -73.11, 'km': 5064.1},
        ],
      });
      final r = await maps.buscar('bristol', cerca: const Punto(8.62, -70.20));
      expect(r.direcciones, isEmpty, reason: 'una calle en Chile a 5.064 km no le sirve a nadie en Barinas');
      expect(r.lejos, isTrue);
    });
  });

  group('matriz (despacho)', () {
    test('devuelve null para el repartidor cuyo GPS cae fuera del grafo', () async {
      final maps = conRespuesta({
        'code': 'Ok',
        'sources': [
          {'distance': 20},
          {'distance': 480000},
          {'distance': 35},
        ],
        'durations': [[600.0], [99999.0], [420.0]],
        'distances': [[3000.0], [900000.0], [2100.0]],
      });
      final m = await maps.matriz(
        const [Punto(10.50, -66.90), Punto(4.71, -74.07), Punto(10.49, -66.88)],
        const Punto(10.4939, -66.8772),
        zona: 've',
      );
      expect(m[0].minutos, closeTo(10, 0.1));
      expect(m[1].minutos, isNull, reason: 'GPS de otra zona: no debe ganar el ranking');
      expect(m[2].minutos, closeTo(7, 0.1));
    });
  });

  group('mapa estático', () {
    test('usa stroke/width, no weight/color (con esos el servidor da 400)', () {
      final u = TeleHostMaps().urlMapaEstatico('_p~iF~ps|U');
      expect(u, contains('stroke'));
      expect(u, contains('width'));
      expect(u, contains('enc%3A'));
      expect(u, isNot(contains('weight')));
    });
  });
}
