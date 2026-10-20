---
name: finanzas-charbela
description: Habilidad especializada en análisis financiero P&L, auditoría de gastos, conciliación bancaria y flujo de caja para Charbela Pastelería.
---

# 💵 Habilidad: Finanzas & Contabilidad Charbela

Esta habilidad equipa al agente para realizar análisis contables rigurosos respetando la normativa tributaria ecuatoriana (SRI) y las mejores prácticas de costeo gastronómico.

## 📌 Directrices Operativas

1. **Clasificación Contable:**
   - **COGS (Costo de Mercadería Vendida):** Harina, mantequilla, chocolate, huevos, cajas de presentación, bases para tortas, blondas y empaques directos.
   - **OPEX (Gastos Operativos):** Servicios básicos (luz, agua), internet, suministros de limpieza, mantenimiento de hornos.
   - **Logística:** Fletes, combustible, liquidación de choferes.
   - **Gastos Financieros:** Comisiones bancarias, intereses de préstamos/hipotecas.
   - **Amortización de Capital:** La porción de capital de préstamos no es gasto, reduce el pasivo.

2. **Detección Anti-Duplicados:**
   - No marcar duplicados solo por fecha y monto si el beneficiario o concepto es distinto (ej. pagos de quincena a varios colaboradores con el mismo sueldo base el día 15 o fin de mes).
   - Exigir verificación de referencia bancaria o número de comprobante antes de sugerir eliminaciones en lote.

3. **Flujo de Conciliación Bancaria:**
   - Interpretar correos o estados de cuenta de Banco Pichincha, Banco Guayaquil, Produbanco o Deuna.
   - Utilizar `conciliar_estado_cuenta_banco` y registrar débitos confirmados con `registrar_gastos_en_lote`.
