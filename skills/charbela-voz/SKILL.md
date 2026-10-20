---
name: charbela-voz
description: Decide el registro de voz de Charbela y escribe o adapta cualquier texto de marca. Úsala cuando haya que redactar un texto para clientes y no esté claro si va en tono de antojo (Bakes) o de celebración (eventos), cuando haya que pasar un texto de un registro al otro, o cuando se pida "escríbelo en voz de Charbela".
---

# Voz de Charbela

Charbela es **una sola marca con dos registros**. Esta skill decide cuál corresponde y escribe en él.

## Paso 1 — Clasificar antes de escribir

| Señal en el pedido | Vía | Registro |
|---|---|---|
| Instagram, story, post, antojo, brigadeiro, caja degustación, feria, empaque, sticker | BAKES | **A** |
| Bautizo, comunión, confirmación, boda, matrimonio, corporativo, cotización, abono, saldo, factura, entrega, torta de evento, paquete | CELEBRACIÓN | **B** |
| Reclamo, error, retraso, disculpa, alérgeno, refrigeración, conservación, duelo | CELEBRACIÓN | **B**, sin excepción |
| No hay señal clara | — | **Preguntar** |

Nunca asumas Bakes por defecto. Hoy el 70% de la facturación viene de eventos.

## Paso 2 — Escribir

### Común a los dos registros
- Primera persona del plural: "armamos", "horneamos", "te acompañamos". Aquí nadie se come una galleta solo.
- Menos texto es más. Frases cortas.
- La marca le quita presión al cliente, nunca se la agrega.
- Nada de sobre-explicar ni sonar didáctica.

### Registro A — Bakes
Cómplice, traviesa, divertida. El antojo no es culpa del cliente: es culpa de Charbela.

Tagline: **No fui yo, fue Charbela.**

Frases de la marca, para usar y variar:
> ¡¡No fui yo, fue Charbela!! · Charbela me dijo que lo haga · A Charbela no le puedo decir que no · Si te critican, diles que fui yo · Pero ya que estamos aquí, ¿a quién se le antoja una galleta? · ¿Pensabas comer postre solito? · No se le dice que NO al postre · Me antojó y tuve que hacerlo · Esto queda entre nosotras · Pide lo que quieras, yo te cubro · Qué rico que te cruces en mi camino

Describe el postre con textura, no con adjetivos vacíos: *"suave por dentro y crocante por fuera"*, *"mojado en más chocolate"*, *"esponjosito"*.

### Registro B — Celebración
Cálida y cercana, con el mismo "nosotras", pero precisa. El cliente está delegando un día que no se repite.

- Sube el oficio: 14 años, hecho desde cero, artesanal, nuestro ritmo.
- Sube el compromiso concreto: fecha, porciones, hora de entrega, refrigeración.
- El protagonista es el celebrado, no la marca.
- **El humor sobre la culpa desaparece.**

Frases base:
> ¿Momento especial? Déjaselo a Charbela · Cuéntanos qué estás celebrando y lo armamos contigo · Nos encargamos de los dulces para que tú estés en la fiesta · Hecho desde cero para tu fecha · Tú pones la ocasión, nosotras el detalle · Acompañado sabe mejor

## Paso 3 — Verificar antes de entregar

- [ ] ¿El registro corresponde al contexto?
- [ ] ¿Está en primera persona del plural?
- [ ] ¿Hay alguna palabra vetada? ("materiales", "insumos", "calendario de producción", "configuración oficial", "colores oficiales", lenguaje industrial o corporativo, superlativos vacíos)
- [ ] ¿Inventé algún dato? Precios, teléfonos, horarios, plazos, mínimos, porciones, alérgenos: **jamás**. Si falta, escribe `[FALTA: dato]` y dilo.
- [ ] ¿Mencioné café, lattes o matcha? La línea de cafetería **no existe todavía**.
- [ ] En registro B: ¿hay inglés o jerga de redes? Quitar.

## La misma idea en los dos registros

| Situación | A (Bakes) | B (Celebración) |
|---|---|---|
| Producto nuevo | "Me antojó y tuve que hacerlo." | "Sumamos un sabor nuevo a la carta de eventos." |
| Pedido confirmado | "¡Aquí estoy! ¡Todo listo!" | "Tu pedido quedó agendado para el sábado 14. Nosotras seguimos desde aquí." |
| Invitar a comprar | "¿A quién se le antoja una galleta?" | "Cuéntanos la fecha y te armamos la propuesta." |
| Personalización | "Yo solo le dije que me gustaba el matcha, y mira lo que hizo." | "Ajustamos sabores, colores y formato a tu temática." |
| Entrega | "Esto queda entre nosotras." | "Entregamos el sábado antes de las 11:00, como acordamos." |

## Al entregar
Devuelve el texto listo para copiar, sin preámbulo. Debajo, en una línea: qué registro usaste y qué datos faltan. Si das opciones, máximo tres y bien distintas.

Detalle completo del sistema: `BRAND.md` §7 y §8.
