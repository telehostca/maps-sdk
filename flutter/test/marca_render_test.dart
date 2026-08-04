// Renderiza la marca a PNG para MIRARLA. Los tests dicen que no explota;
// no dicen si el isotipo quedó bien dibujado. Escribe en /tmp y no falla nunca:
// es una herramienta de inspección, no un juez.
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:telehost_maps/telehost_maps.dart';

void main() {
  testWidgets('render de inspección', (tester) async {
    final salida = Platform.environment['MARCA_PNG'];
    if (salida == null) return;   // sólo cuando se pide

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: RepaintBoundary(
          key: const Key('cap'),
          child: Container(
            color: const Color(0xFFE8E4DF),          // el beige del mapa
            padding: const EdgeInsets.all(16),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                MarcaTeleHost(),
                SizedBox(width: 14),
                DecoratedBox(
                  decoration: BoxDecoration(color: Color(0xFF1B2430)),
                  child: Padding(
                    padding: EdgeInsets.all(8),
                    child: MarcaTeleHost(oscuro: true),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final limite = tester.renderObject(find.byKey(const Key('cap'))) as RenderRepaintBoundary;
    final img = await limite.toImage(pixelRatio: 6);   // 6x para ver el detalle
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    File(salida).writeAsBytesSync(bytes!.buffer.asUint8List());
  });
}
