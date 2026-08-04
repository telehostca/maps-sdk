/// La marca de TeleHost Maps, lista para poner encima del mapa.
///
/// POR QUÉ ESTÁ EN EL PAQUETE Y NO EN EL README (2026-08-04): el README decía
/// «mostrá © OpenStreetMap · TeleHost Maps en tu mapa» y eso es una regla que
/// depende de que alguien la lea y la escriba bien. La app de repartidor salió a
/// producción sin una sola mención — ni la marca ni la atribución legal. Lo que
/// el paquete trae puesto se usa; lo que hay que acordarse, no.
///
/// La atribución LEGAL ya no hay que dibujarla: desde 2026-08-04 viaja dentro
/// del style.json y MapLibre nativo la muestra sola. Lo único que hay que hacer
/// es no esconder el botón de atribución del mapa: es la licencia ODbL de
/// OpenStreetMap, no una preferencia nuestra.
library;

import 'dart:math' as math;
import 'package:flutter/widgets.dart';

/// El isotipo: círculo con degradado y tres barras. Se DIBUJA, no se descarga:
/// un repartidor sin señal tiene que ver la marca igual, y así el paquete no
/// arrastra `flutter_svg` ni depende de que el dominio resuelva.
class _Isotipo extends CustomPainter {
  const _Isotipo({required this.blanco});
  final bool blanco;

  // Fracciones tomadas del brand/icon.svg original (viewBox 14000).
  static const _barras = <List<double>>[
    [0.297, 0.265, 0.413, 0.104],
    [0.278, 0.415, 0.452, 0.176],
    [0.289, 0.635, 0.431, 0.101],
  ];

  @override
  void paint(Canvas lienzo, Size s) {
    final centro = Offset(s.width / 2, s.height / 2);
    final radio = math.min(s.width, s.height) * 0.475;
    final disco = Paint()..isAntiAlias = true;
    if (blanco) {
      disco.color = const Color(0xFFFFFFFF);
    } else {
      disco.shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFED3237), Color(0xFFFF3300)],
      ).createShader(Rect.fromCircle(center: centro, radius: radio));
    }
    lienzo.drawCircle(centro, radio, disco);

    final barra = Paint()
      ..isAntiAlias = true
      ..color = blanco ? const Color(0xFFED3237) : const Color(0xFFFFFFFF);
    for (final b in _barras) {
      final r = Rect.fromLTWH(b[0] * s.width, b[1] * s.height, b[2] * s.width, b[3] * s.height);
      lienzo.drawRRect(RRect.fromRectAndRadius(r, Radius.circular(r.height / 2)), barra);
    }
  }

  @override
  bool shouldRepaint(_Isotipo viejo) => viejo.blanco != blanco;
}

/// Watermark de TeleHost Maps: isotipo + «TeleHost **Maps**» en una píldora
/// translúcida, como la de Mapbox.
///
/// Va **abajo a la izquierda** (la atribución del mapa va abajo a la derecha:
/// no se cruzan), y se pone encima del mapa con un `Stack`:
///
/// ```dart
/// Stack(children: [
///   MapLibreMap(styleString: maps.urlEstilo(), /* … */),
///   const Positioned(left: 10, bottom: 10, child: MarcaTeleHost()),
/// ])
/// ```
///
/// Sobre satélite o híbrido, `MarcaTeleHost(oscuro: true)`: una píldora blanca
/// sobre imagen satelital no se lee.
///
/// El wordmark es TEXTO, no el logotipo vectorial: a 15 px de alto ese logotipo
/// se destruye y el texto del sistema se lee nítido.
class MarcaTeleHost extends StatelessWidget {
  const MarcaTeleHost({super.key, this.oscuro = false, this.alTocar});

  /// Tema oscuro, para satélite / híbrido / dark-matter.
  final bool oscuro;

  /// Qué hacer al tocarla. Lo normal es abrir https://maps.telehost.net —
  /// se deja al que integra porque abrir una URL necesita `url_launcher`, y
  /// este paquete no arrastra dependencias.
  final VoidCallback? alTocar;

  /// El enlace al que debería llevar la marca.
  static const enlace = 'https://maps.telehost.net';

  @override
  Widget build(BuildContext context) {
    final tinta = oscuro ? const Color(0xFFF4F4F5) : const Color(0xFF1F2937);
    final pildora = Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: oscuro ? const Color(0x8C0C0C0F) : const Color(0xCCFFFFFF),
        borderRadius: BorderRadius.circular(9),
        boxShadow: [
          BoxShadow(
            color: oscuro ? const Color(0x59000000) : const Color(0x2E0F172A),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 15,
            height: 15,
            child: CustomPaint(painter: _Isotipo(blanco: oscuro)),
          ),
          const SizedBox(width: 6),
          Text.rich(
            TextSpan(children: [
              const TextSpan(text: 'TeleHost '),
              TextSpan(text: 'Maps', style: TextStyle(fontWeight: FontWeight.w800, color: tinta)),
            ]),
            textDirection: TextDirection.ltr,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tinta, height: 1),
          ),
        ],
      ),
    );
    if (alTocar == null) return pildora;
    return GestureDetector(onTap: alTocar, child: pildora);
  }
}
