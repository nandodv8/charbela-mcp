---
name: charbela-producto
description: Escribe descripciones de producto, fichas de catálogo y textos de tienda para Charbela, conservando intacta la información técnica (mínimos, porciones, refrigeración, variantes). Úsala cuando pidan "descripción para la web", "texto para este producto", "ficha de catálogo", "nombre para esta caja" o textos de la tienda.
---

# Descripciones de producto

## Qué protege esta skill
La información técnica es lo que evita reclamos: **mínimo de unidades, porciones, variantes de sabor, necesidad de refrigeración y anticipación requerida**. Nunca se elimina, nunca se "mejora" por fluidez, nunca se inventa. Si un dato técnico no está disponible, va como `[FALTA: dato]`.

## Estructura de una descripción

```
APETITO       1-2 líneas. Qué es y por qué antoja. Textura antes que adjetivos.
OCASIÓN       1 línea. Para qué momento sirve.
TÉCNICA       Lista corta: mínimo, porciones, sabores disponibles, refrigeración, anticipación.
```

**Apetito:** describe lo que se siente al comerlo. *"Suave por dentro y crocante por fuera"*, *"mojado en más chocolate"*, *"esponjosito"*. Así habla la marca de su producto.

**Ocasión:** "ideal para [ocasión]" es la fórmula de la casa. Úsala sin exagerar.

**Técnica:** en frases planas, sin decorar. Esta parte no lleva humor.

## Adjetivos de la casa
Delicioso · clásico · artesanal · hecho desde cero · hecho con [ingrediente] · ideal para [ocasión] · esponjoso · crocante · suave · mojado

## Reglas de sabor y personalización
- **Tortas:** se define sabor de **masa** y **relleno**.
- **Cupcakes y cakepops:** 1 sabor por cada 12 unidades (docena). Si el pedido son múltiplos, cada docena puede llevar su sabor.
- **Galletas decoradas:** siempre son de vainilla. Es el proceso artesanal, no una limitación que haya que disculpar.
- **Extras:** empaque especial, lazos, stickers. Se describen como valor agregado, con su costo por unidad si está confirmado.
- Decir **"sabor y relleno"**, nunca "configuración oficial" ni "combinación oficial". Decir **"paleta de colores"**, nunca "colores oficiales".

## Registro
- Catálogo retail, tienda web, piezas de antojo → **registro A**, con la parte técnica en tono plano.
- Catálogo de eventos, paquetes religiosos, bodas, corporativo → **registro B** completo.

## Nombres de producto
Las cajas y combos llevan **nombre propio**, no "caja de 6". Un nombre que diga qué hay dentro o para quién es. Es una decisión de marca tomada en el brief, con Crumbs & Doilies como referencia.

Al proponer nombres: tres opciones, en español, cortas, pronunciables, sin inglés si la pieza es de la vía Celebración.

## Prohibiciones
- No inventar precios ni mínimos. El mínimo de bocaditos y de dulces decorados varía por producto: si no está confirmado, `[FALTA: mínimo]`.
- No inventar información de alérgenos, ingredientes ni tiempos de conservación.
- No prometer anticipación ni disponibilidad de fechas.
- No mencionar café, lattes, matcha ni bebidas: la línea de cafetería no existe todavía.
- No eliminar advertencias de refrigeración por razones de estilo.
- No usar superlativos vacíos ni compararse con otras pastelerías por nombre.

## Nota técnica para la tienda
En el catálogo de WooCommerce el mínimo de unidades se guarda como **texto** (`"6"`, no `6`) en el metadato `_wc_min_qty_product`, y los precios usan punto decimal al pasar por la API aunque el CSV los traiga con coma. Si lo que se pide es cargar o editar productos, respetar eso.

## Al entregar
La descripción lista para copiar, con la parte técnica separada visualmente. Debajo: registro usado y lista de `[FALTA: …]`.

Sistema completo: `BRAND.md` §7, §8, §10.
