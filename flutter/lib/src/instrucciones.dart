/// Texto de los giros, en español.
///
/// OSRM **no** devuelve instrucciones escritas: devuelve `maneuver.type` y
/// `maneuver.modifier`, y el texto lo arma el cliente (es lo mismo que hace
/// `osrm-text-instructions` en 30 idiomas). Sin esto, cada app termina
/// escribiendo su propia versión — y varias lo hacen mal.
library;

const _giros = <String, String>{
  'sharp right': 'cerrada a la derecha',
  'right': 'a la derecha',
  'slight right': 'leve a la derecha',
  'sharp left': 'cerrada a la izquierda',
  'left': 'a la izquierda',
  'slight left': 'leve a la izquierda',
  'straight': 'derecho',
  'uturn': 'en U',
};

/// Arma la instrucción en español de un `step` de OSRM.
///
/// Voseo rioplatense/venezolano ("Girá", "Seguí"), que es como habla el usuario
/// de TeleHost. Si necesitás tuteo, usá [Paso.tipo] y [Paso.modificador] y
/// armá el texto vos.
String instruccionEnEspanol(Map<String, dynamic> paso) {
  final m = (paso['maneuver'] as Map?)?.cast<String, dynamic>() ?? const {};
  final tipo = m['type'] as String?;
  final mod = _giros[m['modifier'] as String? ?? ''] ?? '';
  final nombre = paso['name'] as String?;
  final via = (nombre != null && nombre.isNotEmpty) ? ' por $nombre' : '';

  switch (tipo) {
    case 'depart':
      return 'Salí$via';
    case 'arrive':
      return 'Llegaste a destino';
    case 'turn':
      return 'Girá $mod$via'.replaceAll('  ', ' ');
    case 'new name':
      return 'Seguí$via';
    case 'continue':
      return 'Continuá $mod$via'.replaceAll('  ', ' ');
    case 'merge':
      return 'Incorporate $mod$via'.replaceAll('  ', ' ');
    case 'on ramp':
      return 'Tomá el acceso $mod$via'.replaceAll('  ', ' ');
    case 'off ramp':
      return 'Salí por la rampa $mod$via'.replaceAll('  ', ' ');
    case 'fork':
      return 'En la bifurcación, mantenete $mod$via'.replaceAll('  ', ' ');
    case 'end of road':
      return 'Al final de la calle, girá $mod$via'.replaceAll('  ', ' ');
    case 'roundabout':
    case 'rotary':
      final salida = m['exit'];
      return salida == null
          ? 'En la rotonda, seguí$via'
          : 'En la rotonda, tomá la salida $salida$via';
    case 'roundabout turn':
      return 'En la rotonda, girá $mod$via'.replaceAll('  ', ' ');
    default:
      return (mod.isEmpty ? 'Seguí' : 'Girá $mod') + via;
  }
}

/// Distancia legible: `"350 m"`, `"1,2 km"`, `"18 km"`.
String distanciaLegible(double metros) {
  if (metros < 1000) return '${metros.round()} m';
  final km = metros / 1000;
  return km < 10
      ? '${km.toStringAsFixed(1).replaceAll('.', ',')} km'
      : '${km.round()} km';
}

/// Duración legible: `"9 min"`, `"1 h 20 min"`.
String duracionLegible(double segundos) {
  final min = (segundos / 60).round();
  if (min < 60) return '$min min';
  final h = min ~/ 60, m = min % 60;
  return m == 0 ? '$h h' : '$h h $m min';
}
