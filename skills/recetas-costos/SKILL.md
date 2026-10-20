---
name: recetas-costos-charbela
description: Habilidad para costeo gastronómico, ingeniería de menú, análisis de mermas, subrecetas y control del margen bruto (COGS) en Charbela Pastelería.
---

# 🧁 Habilidad: Recetas, Subrecetas & Costeo (COGS)

Esta habilidad proporciona herramientas analíticas para evaluar la rentabilidad real de cada producto vendido en Charbela, detectando variaciones de precios en insumos y asegurando márgenes brutos saludables.

---

## 📌 1. Arquitectura de Fichas Técnicas y Subrecetas

Los productos de pastelería fina de Charbela no son ingredientes simples aislados; se componen de subrecetas modulares:

- **Producto Final (Torta Signature 20 Porciones):**
  - Subreceta 1: Bizcocho Húmedo de Chocolate (Harina, Cacao puro, Azúcar, Huevos, Mantequilla, Polvo de hornear).
  - Subreceta 2: Relleno Manjar de Olla Artesanal (Leche entera, Azúcar, Canela, Esencia de vainilla).
  - Subreceta 3: Cobertura Ganache de Chocolate Semi-amargo (Chocolate 55%, Crema de leche).
  - Subreceta 4: Almíbar de Especias.
  - Empaque: Base rígida dorada de 30cm + Caja alta con ventana acetato + Cinta de tela con logo.

---

## 📊 2. Reglas Financieras de Costeo Gastronómico

1. **Target de COGS:**
   - Materia prima directa + empaque debe situarse entre el **25% y 32%** del precio de venta al público (PVP sin IVA).
   - Margen de Contribución Bruto deseado: **68% a 75%**.

2. **Detección de Desviaciones:**
   - Si un producto arroja un COGS > 38%:
     - Sugerir ajuste de precio de venta.
     - Revisar si el precio de compra del chocolate, mantequilla o lácteos subió recientemente (`consultar_insumos_precios`).
     - Evaluar optimización de gramos por porción o reducción de mermas en corte.

---

## 🛠️ 3. Herramientas MCP Disponibles

- `consultar_recetas_costos`: Lista todas las recetas con su costo unitario, PVP actual y porcentaje de margen.
- `consultar_receta_detalle`: Muestra la explosión completa de ingredientes y subrecetas de un producto específico.
- `consultar_insumos_precios`: Monitorea el costo de compra de materias primas y empaques en inventario.
- **Enlace directo:** `https://crm.charbelapasteleria.com/calidad`
