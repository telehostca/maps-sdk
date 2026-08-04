// La marca tiene que dibujarse sin red y sin dependencias extra.
//
// POR QUÉ IMPORTA (2026-08-04): la primera versión de la instrucción para las
// apps usaba `Image.network('.../icon.svg')`, que en Flutter NO renderiza —
// Flutter no decodifica SVG sin `flutter_svg`. Habría salido una píldora con el
// texto y un hueco donde va el isotipo. Acá se pinta con CustomPainter, así que
// además funciona sin señal: un repartidor en zona muerta ve la marca igual.
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:telehost_maps/telehost_maps.dart';

Widget _envuelto(Widget hijo) => Directionality(
      textDirection: TextDirection.ltr,
      child: Center(child: hijo),
    );

void main() {
  testWidgets('muestra el wordmark con "Maps" resaltado', (tester) async {
    await tester.pumpWidget(_envuelto(const MarcaTeleHost()));
    expect(find.textContaining('TeleHost'), findsOneWidget);
    expect(find.byType(CustomPaint), findsWidgets, reason: 'el isotipo se dibuja, no se descarga');
  });

  testWidgets('no pide NADA por red: sin Image ni SVG', (tester) async {
    await tester.pumpWidget(_envuelto(const MarcaTeleHost()));
    expect(find.byType(Image), findsNothing,
        reason: 'sin señal la marca tiene que verse igual; y un .svg en Image.network ni siquiera renderiza');
  });

  testWidgets('el tema oscuro cambia el fondo (blanca sobre satélite no se lee)', (tester) async {
    await tester.pumpWidget(_envuelto(const MarcaTeleHost()));
    final claro = tester.widget<Container>(find.byType(Container).first);
    await tester.pumpWidget(_envuelto(const MarcaTeleHost(oscuro: true)));
    final oscuro = tester.widget<Container>(find.byType(Container).first);
    final dClaro = claro.decoration! as BoxDecoration;
    final dOscuro = oscuro.decoration! as BoxDecoration;
    expect(dClaro.color, isNot(equals(dOscuro.color)));
  });

  testWidgets('sin alTocar no envuelve en GestureDetector (no roba toques al mapa)', (tester) async {
    await tester.pumpWidget(_envuelto(const MarcaTeleHost()));
    expect(find.byType(GestureDetector), findsNothing);
    var tocada = false;
    await tester.pumpWidget(_envuelto(MarcaTeleHost(alTocar: () => tocada = true)));
    await tester.tap(find.byType(MarcaTeleHost));
    expect(tocada, isTrue);
  });

  test('el enlace apunta al producto, no a la empresa', () {
    expect(MarcaTeleHost.enlace, 'https://maps.telehost.net');
  });
}
