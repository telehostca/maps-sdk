import 'dart:convert';
import 'package:http/http.dart' as http;

import 'errores.dart';
import 'modelos.dart';

/// Cliente de TeleHost Maps.
///
/// Casi todo es **público**: buscar, rutear y consultar cobertura no necesitan
/// llave. La [apiKey] (`thmk_…`) solo hace falta para los endpoints de producto
/// (tracking de flota, despacho, combustible) y **va únicamente en tu backend**,
/// nunca compilada en la app.
///
/// ```dart
/// final maps = TeleHostMaps();
/// final r = await maps.buscar('farmacia', cerca: const Punto(10.50, -66.90));
/// ```
class TeleHostMaps {
  TeleHostMaps({
    this.base = 'https://maps.telehost.net',
    this.apiKey,
    http.Client? cliente,
    this.snapMaximoMetros = 10000,
  }) : _http = cliente ?? http.Client();

  final String base;
  final String? apiKey;
  final http.Client _http;

  /// Tolerancia de *snap*: si OSRM tuvo que pegar un punto más lejos que esto,
  /// la ruta se considera inventada y se lanza [PuntoFueraDelGrafo].
  ///
  /// 10 km es generoso a propósito: una dirección rural legítima puede estar a
  /// cientos de metros de la vía mapeada. Bajarlo de ~2 km empieza a rechazar
  /// direcciones reales.
  final int snapMaximoMetros;

  final Map<String, Zona> _cacheZonas = {};

  void cerrar() => _http.close();

  Map<String, String> get _cabeceras => {
        'accept': 'application/json',
        if (apiKey != null) 'x-api-key': apiKey!,
      };

  Future<dynamic> _get(String ruta, [Map<String, String>? q]) async {
    final u = Uri.parse('$base$ruta').replace(queryParameters: q);
    late http.Response r;
    try {
      r = await _http.get(u, headers: _cabeceras);
    } catch (e) {
      throw ErrorDeRed('no se pudo conectar: $e');
    }
    // OJO: el gateway devuelve 200 con HTML para rutas inexistentes
    // (`try_files … /index.html`). Mirar solo el código de estado no alcanza.
    final ct = r.headers['content-type'] ?? '';
    if (!ct.contains('json')) {
      throw ErrorDeRed(
        'la respuesta no es JSON (${r.statusCode}, $ct) — revisá la URL: '
        'una ruta inexistente devuelve HTML con código 200',
        codigo: r.statusCode,
      );
    }
    final cuerpo = jsonDecode(utf8.decode(r.bodyBytes));
    if (r.statusCode == 422 && cuerpo is Map) throw _traducir422(cuerpo);
    if (r.statusCode >= 400) {
      throw ErrorDeRed(
        cuerpo is Map ? (cuerpo['error']?.toString() ?? r.reasonPhrase ?? '') : '',
        codigo: r.statusCode,
      );
    }
    return cuerpo;
  }

  TeleHostError _traducir422(Map d) => switch (d['error']) {
        'ruta-cruza-cobertura' =>
          RutaCruzaZonas(((d['paises'] as List?) ?? const []).cast<String>()),
        'punto-fuera-del-grafo' => PuntoFueraDelGrafo(
            indice: (d['indice'] as num?)?.toInt() ?? 0,
            metros: (d['pegado_a_m'] as num?)?.toInt() ?? 0,
            via: d['via'] as String?,
          ),
        _ => SinCobertura(
            lat: (d['punto']?['lat'] as num?)?.toDouble(),
            lon: (d['punto']?['lon'] as num?)?.toDouble(),
            zona: d['pais'] as String?,
          ),
      };

  // ─────────────────────────── directorio ───────────────────────────

  /// Busca negocios, barrios y direcciones **cerca del usuario**.
  ///
  /// La ubicación manda: la búsqueda parte de [cerca] y abre anillos de 25, 100
  /// y 400 km hasta encontrar. Por eso quien está en Barinas ve Barinas, y quien
  /// está en Ciudad de México ve México — sin filtrar por país, así el de la
  /// frontera sigue viendo el otro lado.
  ///
  /// Revisá [Resultados.radioKm]: si es grande, no había nada cerca.
  Future<Resultados> buscar(
    String texto, {
    Punto? cerca,
    int limite = 8,
    TipoBusqueda tipo = TipoBusqueda.ambos,
    /// Descarta direcciones más lejanas que esto. En Venezuela conviene dejarlo:
    /// como no hay catastro, el anillo de direcciones se abre muy lejos.
    double? maxKmDirecciones = 150,
  }) async {
    final j = await _get('/api/biz/buscar', {
      'q': texto,
      if (cerca != null) 'lat': '${cerca.lat}',
      if (cerca != null) 'lon': '${cerca.lon}',
      'limit': '$limite',
      'tipo': tipo.name,
    }) as Map<String, dynamic>;

    final dirs = ((j['direcciones'] as List?) ?? const [])
        .map((e) => Direccion.desdeJson((e as Map).cast()))
        .where((d) => maxKmDirecciones == null || (d.km ?? 0) <= maxKmDirecciones)
        .toList();

    return Resultados(
      lugares: ((j['negocios'] as List?) ?? const [])
          .map((e) => Lugar.desdeJson((e as Map).cast()))
          .toList(),
      direcciones: dirs,
      radioKm: (j['radio_km'] as num?)?.toInt(),
    );
  }

  /// Qué hay alrededor de un punto, sin que el usuario escriba nada.
  Future<List<Lugar>> cerca(Punto punto, {double km = 3, int limite = 10}) async {
    final j = await _get('/api/biz/cerca', {
      'lat': '${punto.lat}',
      'lon': '${punto.lon}',
      'km': '$km',
      'limit': '$limite',
    }) as Map<String, dynamic>;
    return ((j['lugares'] as List?) ?? const [])
        .map((e) => Lugar.desdeJson((e as Map).cast()))
        .toList();
  }

  // ─────────────────────────── cobertura ───────────────────────────

  /// Zona de ruteo de un punto. **Nunca cablees `ve`/`co` en tu código**: la
  /// cobertura crece y este endpoint es la única fuente de verdad.
  ///
  /// Se cachea en memoria (el servidor lo marca cacheable por 1 h).
  Future<Zona> zonaDe(Punto p) async {
    final clave = '${p.lat.toStringAsFixed(3)},${p.lon.toStringAsFixed(3)}';
    final guardada = _cacheZonas[clave];
    if (guardada != null) return guardada;

    final j = await _get('/api/biz/config/country', {
      'lat': '${p.lat}',
      'lon': '${p.lon}',
    }) as Map<String, dynamic>;
    final z = Zona(
      cc: j['cc'] as String?,
      ruteable: j['ruteable'] == true,
      nombre: j['nombre'] as String?,
    );
    _cacheZonas[clave] = z;
    return z;
  }

  // ───────────────────────────── rutas ─────────────────────────────

  /// Calcula la ruta entre dos puntos, con giro a giro en español.
  ///
  /// Resuelve la zona sola (o usá [zona] si ya la sabés) y **valida el snap**:
  /// si OSRM tuvo que pegar un punto a más de [snapMaximoMetros], lanza
  /// [PuntoFueraDelGrafo] en vez de devolver una distancia inventada.
  ///
  /// Con [moto] pide el perfil de moto donde exista (hoy solo Venezuela). Ojo
  /// con el ETA: la moto gana 21-27 % en vías de superficie pero 0-1 % cuando la
  /// ruta usa autopista — no prometas un porcentaje fijo.
  ///
  /// Lanza [RutaCruzaZonas] si origen y destino están en zonas distintas — pasa
  /// entre países y también entre regiones de EE.UU.
  Future<List<Ruta>> ruta(
    Punto origen,
    Punto destino, {
    String? zona,
    bool moto = false,
    bool alternativas = true,
    bool pasos = true,
  }) async {
    var z = zona;
    if (z == null) {
      final zo = await zonaDe(origen);
      if (!zo.ruteable) throw SinCobertura(lat: origen.lat, lon: origen.lon, zona: zo.cc);
      final zd = await zonaDe(destino);
      if (!zd.ruteable) throw SinCobertura(lat: destino.lat, lon: destino.lon, zona: zd.cc);
      if (zo.cc != zd.cc) throw RutaCruzaZonas([zo.cc!, zd.cc!]);
      z = zo.cc!;
    }
    final perfil = (moto && z == 've') ? 've-moto' : z;

    final j = await _get(
      '/route/$perfil/route/v1/driving/${origen.comoOsrm};${destino.comoOsrm}',
      {
        'overview': 'full',
        'geometries': 'polyline',
        'steps': '$pasos',
        'alternatives': '$alternativas',
      },
    ) as Map<String, dynamic>;

    if (j['code'] != 'Ok') throw ErrorDeRed('OSRM: ${j['code']}');

    // La guarda que evita cobrar kilómetros que no existen.
    final wps = (j['waypoints'] as List?) ?? const [];
    for (var i = 0; i < wps.length; i++) {
      final d = ((wps[i] as Map)['distance'] as num?)?.toDouble() ?? 0;
      if (d > snapMaximoMetros) {
        throw PuntoFueraDelGrafo(
          indice: i,
          metros: d.round(),
          via: (wps[i] as Map)['name'] as String?,
        );
      }
    }

    return ((j['routes'] as List?) ?? const []).map((r) {
      final m = (r as Map).cast<String, dynamic>();
      final linea = m['geometry'] as String?;
      final legs = (m['legs'] as List?) ?? const [];
      final steps = legs.isEmpty
          ? const <dynamic>[]
          : ((legs.first as Map)['steps'] as List?) ?? const [];
      return Ruta(
        metros: ((m['distance'] as num?) ?? 0).toDouble(),
        segundos: ((m['duration'] as num?) ?? 0).toDouble(),
        pasos: steps.map((s) => Paso.desdeJson((s as Map).cast())).toList(),
        geometria: linea == null ? const [] : decodificarPolyline(linea),
        zona: perfil,
        polyline: linea,
      );
    }).toList();
  }

  /// Tiempos y distancias reales entre varios orígenes y un destino.
  ///
  /// Es lo que hay que usar para elegir el repartidor más cercano: ordena por
  /// **minutos de manejo**, no por línea recta — el que está "cerca" cruzando el
  /// río pero a 15 min por el puente deja de ganar el pedido.
  ///
  /// Los orígenes cuyo punto quede pegado a más de [snapMaximoMetros] se
  /// devuelven con `null`: son GPS basura o de otra zona.
  Future<List<({double? minutos, double? km})>> matriz(
    List<Punto> origenes,
    Punto destino, {
    String? zona,
    bool moto = false,
  }) async {
    if (origenes.isEmpty) return const [];
    var z = zona;
    if (z == null) {
      final zd = await zonaDe(destino);
      if (!zd.ruteable) throw SinCobertura(lat: destino.lat, lon: destino.lon, zona: zd.cc);
      z = zd.cc!;
    }
    final perfil = (moto && z == 've') ? 've-moto' : z;
    final coords = [...origenes.map((p) => p.comoOsrm), destino.comoOsrm].join(';');
    final fuentes = List.generate(origenes.length, (i) => '$i').join(';');

    final j = await _get('/route/$perfil/table/v1/driving/$coords', {
      'sources': fuentes,
      'destinations': '${origenes.length}',
      'annotations': 'duration,distance',
    }) as Map<String, dynamic>;
    if (j['code'] != 'Ok') throw ErrorDeRed('OSRM: ${j['code']}');

    final srcs = (j['sources'] as List?) ?? const [];
    final dur = (j['durations'] as List?) ?? const [];
    final dis = (j['distances'] as List?) ?? const [];

    return List.generate(origenes.length, (i) {
      final snap = i < srcs.length
          ? ((srcs[i] as Map)['distance'] as num?)?.toDouble() ?? 0
          : 0.0;
      if (snap > snapMaximoMetros) return (minutos: null, km: null);
      final s = i < dur.length ? ((dur[i] as List).first as num?)?.toDouble() : null;
      final m = i < dis.length ? ((dis[i] as List).first as num?)?.toDouble() : null;
      return (minutos: s == null ? null : s / 60, km: m == null ? null : m / 1000);
    });
  }

  // ──────────────────────── mapa estático ────────────────────────

  /// URL de un PNG con la ruta dibujada — para mandar por WhatsApp.
  ///
  /// Pesa poco y se ve sin abrir nada, que en Venezuela importa. Pasale
  /// [Ruta.polyline].
  ///
  /// Los parámetros de estilo son `stroke`/`width` (tileserver). Con
  /// `weight`/`color` (sintaxis de Google) el servidor responde 400.
  String urlMapaEstatico(
    String polyline, {
    int ancho = 600,
    int alto = 400,
    String color = '#ED3237',
    int grosor = 5,
    String estilo = 'telehost',
  }) {
    final path = 'stroke:${Uri.encodeComponent(color)}|width:$grosor|enc:$polyline';
    return '$base/styles/$estilo/static/auto/${ancho}x$alto.png'
        '?path=${Uri.encodeComponent(path)}';
  }
}

/// Qué buscar con [TeleHostMaps.buscar].
enum TipoBusqueda { negocios, direcciones, ambos }

/// Decodifica una geometría polyline5 de OSRM a puntos.
List<Punto> decodificarPolyline(String s, {int precision = 5}) {
  final factor = 1.0 * (precision == 5 ? 1e5 : 1e6);
  final puntos = <Punto>[];
  var indice = 0, lat = 0, lon = 0;
  while (indice < s.length) {
    int shift = 0, resultado = 0, b;
    do {
      b = s.codeUnitAt(indice++) - 63;
      resultado |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (resultado & 1) != 0 ? ~(resultado >> 1) : (resultado >> 1);

    shift = 0;
    resultado = 0;
    do {
      b = s.codeUnitAt(indice++) - 63;
      resultado |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lon += (resultado & 1) != 0 ? ~(resultado >> 1) : (resultado >> 1);

    puntos.add(Punto(lat / factor, lon / factor));
  }
  return puntos;
}
