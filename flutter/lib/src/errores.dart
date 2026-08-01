/// Los errores que TeleHost Maps devuelve a propósito.
///
/// Existen porque el ruteo tiene una trampa que cuesta dinero: OSRM **no falla**
/// cuando un punto está fuera de su grafo — lo pega a la vía conocida más
/// cercana y responde una distancia creíble e inventada. Medido en producción:
/// Bogotá→Caracas devolvía "Ok · 991 km" pegando Caracas a 457 km del punto.
/// Si cobrás por kilómetro, cobrás una distancia que no existe.
///
/// Este cliente convierte esos casos en excepciones tipadas. Atrapalas y
/// mostrale algo honesto al usuario; nunca las ignores para "seguir igual".
library;

/// Base de todos los errores del mapa.
sealed class TeleHostError implements Exception {
  const TeleHostError(this.mensaje);
  final String mensaje;
  @override
  String toString() => '$runtimeType: $mensaje';
}

/// El punto está fuera de las zonas con grafo de rutas.
///
/// Hay mapa (tiles) en más lugares de los que hay ruteo: ver una ciudad en el
/// mapa **no** implica poder rutear ahí.
class SinCobertura extends TeleHostError {
  const SinCobertura({this.lat, this.lon, this.zona})
      : super('ese punto está fuera de la cobertura de rutas');
  final double? lat;
  final double? lon;

  /// Zona detectada, si la hay (p. ej. `us-south` cuando aún no tiene grafo).
  final String? zona;
}

/// Origen y destino caen en zonas distintas: no existe una ruta entre ellas.
///
/// Pasa entre países y **también dentro de EE.UU.**, donde cada región es un
/// grafo independiente: Chicago→Nueva York no se rutea (`us-midwest` vs
/// `us-northeast`).
class RutaCruzaZonas extends TeleHostError {
  const RutaCruzaZonas(this.zonas)
      : super('origen y destino están en zonas distintas: no hay ruta entre ellas');
  final List<String> zonas;
}

/// Un punto quedó pegado demasiado lejos de una vía: la ruta sería ficción.
///
/// Es la guarda contra la trampa del `code:"Ok"` con distancia inventada.
class PuntoFueraDelGrafo extends TeleHostError {
  const PuntoFueraDelGrafo({required this.indice, required this.metros, this.via})
      : super('el punto no tiene calles cerca: quedó pegado a $metros m');

  /// Posición del punto en la lista que se pidió (0 = origen).
  final int indice;

  /// A cuántos metros de una vía quedó pegado.
  final int metros;

  /// Nombre de la vía a la que se pegó, si OSRM lo trae.
  final String? via;
}

/// El servidor respondió algo inesperado (red caída, 5xx, JSON roto).
class ErrorDeRed extends TeleHostError {
  const ErrorDeRed(super.mensaje, {this.codigo});
  final int? codigo;
}
