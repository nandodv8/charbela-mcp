# MICROCOPY.md — Textos de cara al cliente

> **Versión 1.0 · 2026-10-12** · Deriva de `BRAND_OS/BRAND.md` (§7.3 registro B, §7.5 reglas de cruce, §8 diccionario).
> **Alcance:** portal público de cotización (`/c/:id` y `/c/:id/feedback`) y plantillas de WhatsApp del CRM.
> **Registro:** todo lo de este archivo es **vía Celebración, registro B**. Aquí hay fechas, dinero y un evento de por medio: no entra el humor sobre la culpa.
> **Aplicado en:** `src/pages/ClientQuote.jsx` · `src/components/WhatsAppTemplatesModal.jsx`

---

## Principios de este canal

1. **El portal es el único lugar donde el cliente de evento ve la marca sin intermediarios.** Si algo suena a banco o a software, se pierde la cercanía que sostiene el ticket de $400.
2. **Precisión antes que calidez en las zonas de dinero y fecha.** Cálido es el tono, no los números.
3. **Emojis con mesura y nunca en dinero.** El corazón 🩷 es el emoji de la casa. En saldos, abonos y cobranza: ninguno.
4. **Nada de superlativos ni de "100%".** La certeza se da con un dato, no con un adverbio.
5. **Sentence case en frases, no Title Case.** El Title Case en español lee como traducción de software.
6. **Una sola acción por pantalla.** Dos botones del mismo peso es ningún botón.

---

## Hallazgos de claridad corregidos

Tres cambios no son de tono, son de comprensión. Valen más que todos los demás juntos:

| Antes | Después | Por qué |
|---|---|---|
| "Saldo por Cancelar" | **"Saldo pendiente"** | "Cancelar" significa pagar en Ecuador, pero también anular. En una pantalla de pagos la ambigüedad genera llamadas |
| "¡Pedido Totalmente Cancelado! ✨" | **"Pedido pagado por completo"** | Lee como pedido anulado. Es el peor mensaje posible justo cuando el cliente acabó de pagar |
| "Reserva el cupo de tu pedido" | **"Reserva tu fecha en nuestra agenda"** | "Cupo" es lenguaje de aforo. Y es la fórmula que el sistema de marca ya fijó en lugar de "aparta materiales" |

---

## Portal de cotización

### Encabezado y estados

| Antes | Después |
|---|---|
| ¡Tu propuesta ya está aquí! Dale una mirada y confírmanos para reservar tu fecha especial. | Tu propuesta está lista. Revísala con calma y confírmanos para reservar tu fecha. |
| Estamos preparando los detalles de tus dulces. Revisa que todo esté como lo soñaste. | Estamos afinando los detalles. Revisa que todo esté como lo imaginaste. |
| Revisa que cada detalle de tus dulces esté perfecto para tu gran día. | Revisa que cada detalle esté como lo quieres para tu día. |
| Propuesta por Confirmar | Propuesta por confirmar |
| Cotización Expirada | Esta propuesta ya venció |
| Confirmado (Pendiente Pago) | Confirmado · pago pendiente |

### Confirmación y reserva

| Antes | Después |
|---|---|
| Confirmación y Reserva de Fecha | Confirma y reserva tu fecha |
| Asegura tu fecha en nuestra agenda en 2 sencillos pasos: | Reserva tu fecha en nuestra agenda en dos pasos: |
| Asegura tu fecha en nuestra agenda en un solo paso: | Reserva tu fecha en nuestra agenda en un solo paso: |
| Reserva el cupo de tu pedido en nuestra agenda. | Reserva tu fecha en nuestra agenda. |
| Reserva de Agenda | Reserva de agenda |
| Tu reserva está 100% asegurada y programada en nuestro taller para el | Tu fecha ya está reservada en nuestro taller para el |
| ¡Pedido Confirmado y Agendado! | Tu pedido quedó agendado |

### Pagos

| Antes | Después |
|---|---|
| PAGO HOY (50%) | Hoy (50%) |
| PAGO HOY (100%) | Hoy (100%) |
| SEGUNDO PAGO (50% Saldo) | Antes de la entrega (50%) |
| Pago Final Previo a Entrega | Pago final, antes de la entrega |
| Saldo por Cancelar | Saldo pendiente |
| Saldo previo a entrega | Saldo antes de la entrega |
| Resumen de Cuenta | Resumen de pagos |
| Historial de Pagos | Historial de pagos |
| Subtotal de Productos | Subtotal de productos |
| ¡Pedido Totalmente Cancelado! ✨ | Pedido pagado por completo |
| Comprobante Recibido | Comprobante recibido |
| Ver comprobante enviado ↗ | Ver comprobante enviado ↗ *(sin cambio)* |

### Ajustes y dudas

| Antes | Después |
|---|---|
| Solicitar Cambios en la Propuesta | Pedir un ajuste |
| Solicitar cambios | Pedir un ajuste |
| ¿Qué cambios necesitas? | ¿Qué te gustaría ajustar? |
| Enviar Solicitud de Cambios | Enviar mi ajuste |
| Por favor escribe el detalle de los cambios que deseas solicitar. | Cuéntanos qué te gustaría ajustar. |
| Chatea directo por WhatsApp con nuestro equipo de pastelería. | Escríbenos por WhatsApp y lo vemos juntas. |
| Consultar por WhatsApp | Escribirnos por WhatsApp |

### Errores

Regla: decir qué pasó, en una línea, y dar la salida. Nunca culpar al cliente ("Por favor intenta de nuevo" suena a instrucción; "Inténtalo de nuevo" acompaña).

| Antes | Después |
|---|---|
| Cotización no encontrada. | No encontramos esta propuesta. |
| Ocurrió un error al cargar la cotización. | No pudimos cargar tu propuesta. Inténtalo de nuevo en un momento. |
| Hubo un error al procesar tu confirmación. Por favor intenta de nuevo. | No pudimos procesar tu confirmación. Inténtalo de nuevo y, si sigue igual, escríbenos por WhatsApp. |
| Hubo un error al procesar tu solicitud. Por favor intenta de nuevo. | No pudimos procesar tu solicitud. Inténtalo de nuevo y, si sigue igual, escríbenos por WhatsApp. |
| Preparando los detalles de tu pedido... | Preparando los detalles de tu pedido… *(sin cambio)* |

### Postventa

| Antes | Después |
|---|---|
| Dejar mi Opinión y Ganar Cupón | Dejar mi opinión y ganar el cupón |
| Dejar Opinión | Dejar mi opinión |
| ¿Qué tal estuvo tu pedido? | ¿Qué tal estuvo tu pedido? *(sin cambio)* |

### Firma

| Antes | Después |
|---|---|
| Dulces creados con amor y detalle | Hecho desde cero para tu fecha |
| Hecho con 🩷 por | Horneado con 🩷 por |

"Dulces creados con amor y detalle" es exactamente lo que la investigación de Polen señaló del lenguaje anterior: *"los mensajes emitidos por Charbela son fácilmente intercambiables por cualquier marca de pastelería personalizada local"*. "Hecho desde cero para tu fecha" es propio y dice algo verificable.

### Lo que no se toca
Los selectores de producto ya cumplen las reglas del sistema: **"Sabor y relleno"** (nunca "configuración oficial"), **"Paleta de colores"** (nunca "colores oficiales"), "Sin topping", "✎ Cambiar sabor y relleno". El costo adicional se muestra solo en las opciones que cobran. Eso queda igual.

---

## Plantillas de WhatsApp

Seis plantillas, en `WhatsAppTemplatesModal.jsx`. Las variables entre llaves las llena el CRM.

### Etiquetas del selector

| Antes | Después |
|---|---|
| ✉️ Nueva Cotización | ✉️ Enviar propuesta |
| ⏰ Seguimiento Amigable | ⏰ Seguimiento |
| 🎉 Confirmación de Agenda | 🎉 Pedido agendado |
| 💰 Recordatorio de Saldo | 💰 Saldo pendiente |
| 🚚 Pedido en Camino | 🚚 En camino |
| 💬 Solicitar Feedback | 💬 Pedir opinión |

### 1 · Enviar propuesta
```
¡Hola {nombre}! 🩷

Te preparamos la propuesta para tu celebración:

{fecha}
{hora}
{entrega}

Detalle:
{items}

{desglose}

Revisa los detalles y confírmanos aquí:
{link}

Si quieres ajustar algo, nos dices.
```

### 2 · Seguimiento
```
¡Hola {nombre}! ¿Cómo estás?

Te escribo por si pudiste ver la propuesta.

Puedes revisarla o confirmarla aquí:
{link}

Cualquier ajuste, nos dices. 🩷
```

### 3 · Pedido agendado
```
¡Hola {nombre}! Tu pedido quedó agendado 🩷

Gracias por la confianza. Este es el resumen:

{fecha}
{hora}
{entrega}

Detalle:
{items}

{desglose}
Abonado: ${abono}
Saldo pendiente: ${saldo}

Revisa tu pedido o sube tus comprobantes aquí:
{link}

Te escribimos un día antes para confirmar.
```
El cierre es el cambio importante: compromete un contacto concreto. Eso es lo que da certeza en registro B.

### 4 · Saldo pendiente — sin emojis
```
Hola {nombre}, ¿cómo estás?

Te recuerdo que queda pendiente el saldo de ${saldo} de tu pedido del {fecha}.

Puedes subir tu comprobante directamente aquí:
{link}

Cualquier cosa, nos dices.
```
Cobranza sin emojis, sin humor y sin presión. La plantilla anterior abría con 💸.

### 5 · En camino
```
¡Hola {nombre}! Tu pedido ya va en camino 🚚

Lo preparamos con todo el cuidado. Nos cuentas qué tal cuando lo pruebes.

Sigue el envío aquí:
{link}
```

### 6 · Pedir opinión
```
¡Hola {nombre}! 🩷

Pasamos a saber cómo te fue con el pedido. ¿Todo salió como lo esperabas?

Nos ayudas mucho contándonos aquí:
{link}/feedback
```

---

## Pendiente de este canal

- `⬜` **Mensaje de incidente** (retraso o error): no existe como plantilla y es el momento de mayor riesgo para un cliente de $400. La estructura está definida en la skill `charbela-whatsapp` (reconocer → qué estamos haciendo → qué sigue) y debería incorporarse al CRM como séptima plantilla.
- `⬜` **Nota de conservación en la plantilla de "En camino"**: el dato de refrigeración ya existe por producto en el CRM; conviene insertarlo automáticamente en lugar de depender de que alguien lo recuerde.
- `⬜` Revisar el microcopy de la tienda web (`StoreCatalog`, `StoreCart`, `StoreCheckout`, `StoreIntakeForm`): esa es **vía Bakes, registro A**, y no está cubierta por este archivo.
- `⬜` Correos transaccionales, si existen.
