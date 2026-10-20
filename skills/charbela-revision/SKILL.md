---
name: charbela-revision
description: Revisa un texto, un diseño o una pieza de Charbela contra el sistema de marca antes de publicar o imprimir, y devuelve los hallazgos por gravedad con la corrección concreta. Úsala cuando pidan "revisa esto", "está bien así", "¿se puede publicar?", "¿lo mando a la imprenta?" o cuando se comparta una imagen o un borrador.
---

# Revisión de marca

Revisa y devuelve hallazgos **por gravedad**, cada uno con la corrección exacta. No reescribas la pieza completa salvo que te lo pidan.

## Gravedades

| Nivel | Significa | Acción |
|---|---|---|
| 🔴 **Bloquea** | No puede publicarse ni imprimirse así | Corregir antes de salir |
| 🟡 **Corregir** | Se nota, resta, pero no causa daño | Corregir si hay tiempo |
| 🔵 **Mejora** | Oportunidad, no error | Opcional |

## Lo que bloquea (🔴)

**Datos**
- Un precio, teléfono, horario, dirección, plazo, mínimo, porción o alérgeno que no esté confirmado. Un dato inventado es el hallazgo más grave que existe en esta marca.
- La dirección del taller publicada. No se publica.
- Mención de café, lattes, matcha o bebidas: la línea de cafetería no existe todavía.
- "12 años" en lugar de **14 años**.
- Teléfono que empiece con la letra O en lugar de cero (error presente en piezas del entregable original).
- Precios terminados en `.45` en columnas completas o tortas a $20.45 / $25.45: son los placeholder del brandbook, no precios reales.

**Voz**
- Humor sobre la culpa en uno de los siete contextos prohibidos: evento religioso, boda, corporativo, dinero, seguridad alimentaria, incidente, duelo.
- Tono corporativo, industrial o burocrático.
- Promesa que la operación no puede cumplir.

**Color y legibilidad**
- Texto en naranja `#F9603D` sobre beige, blanco o rosa. Contraste 2.98:1 o menos: ilegible. → Corregir a café `#5C3339`, o usar el naranja oscuro `#BB4B36` si el acento debe ser texto.
- Texto blanco o beige sobre rosa `#F6B3D9`. → Corregir a café.
- Precios o condiciones que no estén en café sobre beige.

**Logo**
- Logo con descriptivo "bakes" en una pieza de evento religioso, boda o documento formal. → Logo limpio.
- Logo rotado, con sombra, degradado, borde, expandido, comprimido o en un color no estipulado.

**Tipografía**
- Cualquier tipografía que no sea Parkinsans. Ballerina Script y Optima están retiradas.

**Operación** (si la pieza es física)
- Exige rotulado, armado o decoración manual en el mostrador. Hay dos manos decorando: no hay capacidad.
- Implica un formato nuevo de empaque en lugar de resolverlo con sticker. El principio es **una caja, muchos stickers**.
- Falta la etiqueta de conservación en un producto perecible o que va en frío.

## Lo que se corrige (🟡)
- Palabras vetadas: "materiales", "aparta materiales", "insumos", "compras inmediatas", "calendario de producción", "configuración oficial", "combinación oficial", "colores oficiales".
- Texto en tercera persona en lugar de "nosotras".
- Naranja ocupando más del 15% de la pieza.
- Más de un CTA, o ningún CTA.
- Inglés o jerga de redes ("drop", "collab") en vía Celebración.
- Superlativos vacíos: "el mejor de la ciudad".
- Fecha sin día de la semana en comunicación de pedido.
- Sobre-explicación: si se puede decir en la mitad, está largo.

## Lo que se señala como mejora (🔵)
- El producto no es el héroe de la imagen.
- Falta textura visible: el corte, el relleno, el chorreado.
- Fondo ocupado donde cabía un fondo plano de color.
- Caja o combo sin nombre propio ("caja de 6" en lugar de un nombre).
- Oportunidad de cruzar vías: una pieza de antojo que podría dejar ver que aquí también se encargan tortas para eventos. **Ese doble mensaje es el criterio de éxito del sistema.**

## Pruebas extra si va a imprenta
- [ ] ¿El logo se probó a un solo color, a 3 cm de ancho y a 15 metros?
- [ ] ¿Archivo vectorial (.eps o .ai) y en CMYK, no RGB ni PNG?
- [ ] ¿Rotulado obligatorio del empaque resuelto? No es responsabilidad del diseñador: la imprenta imprime lo que recibe.
- [ ] ¿Mínimos de imprenta verificados? Cuatro formatos de caja son cuatro mínimos.
- [ ] ¿Cero datos pendientes en la pieza?

## Formato de salida

```
VEREDICTO: se publica / se publica con correcciones / no se publica

🔴 BLOQUEA
1. [qué] → [corrección concreta]

🟡 CORREGIR
1. [qué] → [corrección concreta]

🔵 MEJORA
1. [qué]
```

Si no hay hallazgos de un nivel, omite el bloque. Si la pieza está bien, dilo en una línea y no inventes observaciones para parecer útil.

Sistema completo: `BRAND.md` §4, §7.5, §10.1, §13.
