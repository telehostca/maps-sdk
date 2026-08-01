import 'instrucciones.dart';

/// Un punto geográfico.
class Punto {
  const Punto(this.lat, this.lon);
  final double lat;
  final double lon;

  /// Formato que espera OSRM: `lon,lat` (al revés de lo que uno escribe).
  String get comoOsrm => '$lon,$lat';

  @override
  String toString() => 'Punto($lat, $lon)';
}

/// Un negocio, barrio o urbanización del directorio.
class Lugar {
  const Lugar({
    required this.nombre,
    required this.punto,
    this.categoria,
    this.direccion,
    this.ciudad,
    this.pais,
    this.km,
    this.confianza,
  });

  final String nombre;
  final Punto punto;

  /// Categoría de Overture (`pharmacy`, `bakery`…) o **`barrio`/`localidad`**.
  final String? categoria;
  final String? direccion;
  final String? ciudad;

  /// Zona de TeleHost en minúscula (`ve`, `co`, `us-south`…).
  final String? pais;

  /// Distancia en línea recta al punto de búsqueda. **Mostralo en la UI**: sin
  /// él, un resultado a 300 km parece un error de la búsqueda.
  final double? km;

  /// 0..1 de Overture. Sirve para ordenar, no para filtrar duro.
  final double? confianza;

  /// `true` si es un barrio o urbanización, no un comercio.
  bool get esBarrio => categoria == 'barrio' || categoria == 'localidad';

  factory Lugar.desdeJson(Map<String, dynamic> j) => Lugar(
        nombre: (j['nombre'] ?? '') as String,
        punto: Punto((j['lat'] as num).toDouble(), (j['lon'] as num).toDouble()),
        categoria: j['categoria'] as String?,
        direccion: j['direccion'] as String?,
        ciudad: j['ciudad'] as String?,
        pais: j['pais'] as String?,
        km: (j['km'] as num?)?.toDouble(),
        confianza: (j['confianza'] as num?)?.toDouble(),
      );
}

/// Una dirección de calle y número.
///
/// Solo existe donde el catastro del país es público (Brasil, México, España,
/// Colombia, Chile, Uruguay, EE.UU.). **Venezuela no tiene ninguna**: ahí se
/// resuelve por [Lugar] (negocios y barrios).
class Direccion {
  const Direccion({
    required this.etiqueta,
    required this.punto,
    this.calle,
    this.numero,
    this.ciudad,
    this.estado,
    this.cp,
    this.pais,
    this.km,
  });

  /// Texto listo para mostrar: `"28 CALLE GRAN VIA, Madrid, 28013"`.
  final String etiqueta;
  final Punto punto;
  final String? calle;
  final String? numero;
  final String? ciudad;
  final String? estado;
  final String? cp;
  final String? pais;
  final double? km;

  factory Direccion.desdeJson(Map<String, dynamic> j) => Direccion(
        etiqueta: (j['etiqueta'] ?? '') as String,
        punto: Punto((j['lat'] as num).toDouble(), (j['lon'] as num).toDouble()),
        calle: j['calle'] as String?,
        numero: j['numero'] as String?,
        ciudad: j['ciudad'] as String?,
        estado: j['estado'] as String?,
        cp: j['cp'] as String?,
        pais: j['pais'] as String?,
        km: (j['km'] as num?)?.toDouble(),
      );
}

/// Resultado de [TeleHostMaps.buscar].
class Resultados {
  const Resultados({
    required this.lugares,
    required this.direcciones,
    this.radioKm,
  });

  final List<Lugar> lugares;
  final List<Direccion> direcciones;

  /// A qué anillo (en km) apareció el primer resultado: 25, 100, 400 o `null`.
  ///
  /// Es la señal de confianza: 25 significa "está en tu ciudad"; 400 significa
  /// "no hay nada cerca con ese nombre" y conviene decírselo al usuario.
  final int? radioKm;

  bool get vacio => lugares.isEmpty && direcciones.isEmpty;

  /// `true` si hubo que buscar lejos. Útil para mostrar un aviso.
  bool get lejos => (radioKm ?? 0) > 100;
}

/// Un giro del recorrido.
class Paso {
  const Paso({
    required this.instruccion,
    required this.metros,
    required this.segundos,
    this.calle,
    this.tipo,
    this.modificador,
  });

  /// Texto en español, ya armado: `"Girá a la izquierda por Avenida Urdaneta"`.
  final String instruccion;
  final double metros;
  final double segundos;
  final String? calle;

  /// `maneuver.type` crudo de OSRM, por si querés armar tu propio texto.
  final String? tipo;

  /// `maneuver.modifier` crudo de OSRM (`left`, `slight right`…).
  final String? modificador;

  factory Paso.desdeJson(Map<String, dynamic> j) {
    final m = (j['maneuver'] as Map?)?.cast<String, dynamic>() ?? const {};
    return Paso(
      instruccion: instruccionEnEspanol(j),
      metros: ((j['distance'] as num?) ?? 0).toDouble(),
      segundos: ((j['duration'] as num?) ?? 0).toDouble(),
      calle: (j['name'] as String?)?.isEmpty ?? true ? null : j['name'] as String,
      tipo: m['type'] as String?,
      modificador: m['modifier'] as String?,
    );
  }
}

/// Una ruta calculada.
class Ruta {
  const Ruta({
    required this.metros,
    required this.segundos,
    required this.pasos,
    required this.geometria,
    required this.zona,
    this.polyline,
  });

  final double metros;
  final double segundos;

  /// Giro a giro en español. Vacío si no se pidieron pasos.
  final List<Paso> pasos;

  /// La línea de la ruta, para dibujarla en el mapa.
  final List<Punto> geometria;

  /// Zona en la que se ruteó (`ve`, `ve-moto`, `us-south`…).
  final String zona;

  /// Geometría codificada (polyline5), para el mapa estático de WhatsApp.
  final String? polyline;

  double get km => metros / 1000;
  int get minutos => (segundos / 60).round();
}

/// Cobertura de un punto, según el servidor.
class Zona {
  const Zona({required this.ruteable, this.cc, this.nombre});

  /// Código de la zona: `ve`, `co`, `us-south`… `null` si está fuera de todo.
  final String? cc;

  /// `true` si hay grafo de rutas ahí.
  final bool ruteable;
  final String? nombre;
}
