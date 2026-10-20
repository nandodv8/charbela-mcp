---
name: obrador-produccion-charbela
description: Habilidad para planificar la producción semanal del taller de pastelería, coordinar horneados, decoración, mise en place y despacho por turnos.
---

# 🍰 Habilidad: Obrador & Planificación de Producción Charbela

Esta habilidad permite al agente actuar como el Jefe de Taller y Planificador de Producción de Charbela Pastelería Artesanal, garantizando que todos los pedidos se preparen con frescura, a tiempo y con la máxima eficiencia en el uso de hornos y estaciones de trabajo.

---

## 📌 1. Clasificación Oficial de Familias de Producción

Toda la producción de Charbela se agrupa estrictamente en 4 familias operativas para evitar confusiones en cocina y agilizar la asignación de personal:

1. **1.1 Producción Bocaditos Tradicionales:**
   - Alfajores artesanales (clásicos, maicena, nuez).
   - Empanadas horneadas (queso, carne, pollo).
   - Paquetes de bocaditos secos para té o eventos corporativos.
   - Trufas clásicas y bolitas de nuez.

2. **1.2 Producción Bocaditos Decorados:**
   - Bocaditos temáticos para primeras comuniones, bautizos, bodas y cumpleaños infantiles.
   - Cakepops y paletas de chocolate con detalles en fondant o glasé real.
   - Donitas decoradas temáticas.

3. **1.3 Producción Dulces Decorados:**
   - Cupcakes temáticos con modelados en azúcar o flores artesanales.
   - Galletas glaseadas y personalizadas con técnica de estampado o pintura a mano.
   - Mini-tortas individuales o porciones de degustación.

4. **1.4 Producción Masas de Tortas y Pisos:**
   - Horneado y enfriado de bizcochuelos (vainilla, chocolate belga, red velvet, zanahoria y nuez).
   - Preparación de rellenos (ganache, manjar de olla, frutos rojos, crema pastelera).
   - Nivelado, almibarado, armado de pisos y cobertura base (crumb coat / ganacheado).
   - Decoración final y refrigeración controlada para despacho.

---

## 🛠️ 2. Protocolo de Consulta y Planificación

Cuando el usuario pregunte *"¿Qué hay que hacer esta semana?"*, *"¿Cómo viene la producción del fin de semana?"* o solicite una hoja de taller:

1. **Ejecutar herramienta:**
   Invocar `consultar_produccion_semanal` especificando el rango de fechas (o la fecha de corte requerida).

2. **Estructura del Informe Operativo:**
   - **Resumen Ejecutivo:** Total de pedidos, volumen total de porciones y distribución por día de entrega (viernes, sábado y domingo son los días de mayor carga).
   - **Bloque 1: Horneado y Masas (Miércoles/Jueves):** Lista consolidada de moldes, tipos de masa y cantidades de tortas a hornear.
   - **Bloque 2: Rellenos y Armado (Jueves/Viernes):** Cantidad de kilos de manjar, ganache y almíbar necesarios.
   - **Bloque 3: Decoración y Modelados (Viernes/Sábado temprano):** Figuras en azúcar que deben estar secas con anticipación.
   - **Bloque 4: Bocaditos y Despacho:** Programación por tandas para garantizar máxima frescura (los bocaditos no deben perder crocancia).

3. **Deep-links directos:**
   Para cada pedido relevante, incluye siempre el enlace al taller:
   `https://crm.charbelapasteleria.com/produccion?orderId={id}`
