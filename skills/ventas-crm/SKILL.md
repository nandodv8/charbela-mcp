---
name: ventas-crm-charbela
description: Habilidad especializada en embudo de ventas, seguimiento de cotizaciones, pedidos pendientes de WooCommerce, cobranza de saldos y fidelización de clientes.
---

# 🎯 Habilidad: Ventas & Pipeline Comercial Charbela

Esta habilidad capacita al agente para gestionar de punta a punta el ciclo comercial de Charbela: desde el ingreso de un lead por WhatsApp o tienda online hasta el cobro del 100% y la fidelización del cliente.

---

## 📌 1. Estados del Embudo Comercial (Pipeline)

Todo pedido en Charbela atraviesa las siguientes etapas estandarizadas:

1. **Borrador / Prospecto:** En conversación preliminar o diseño inicial.
2. **Enviada / Por Confirmar:** Cotización remitida al cliente con enlace público de revisión. Requiere el 50% de anticipo para bloquear la fecha en el calendario.
3. **Aprobada / Confirmada:** Anticipo pagado o verificado; lista para ser programada en obrador.
4. **En Producción:** En preparación activa en el taller.
5. **Lista para Entrega / En Ruta:** Empacada con control de calidad y en camino o esperando retiro.
6. **Entregada:** Pedido recibido por el cliente; saldo pendiente cobrado.
7. **Cancelada:** Si el cliente desiste o no confirma dentro del plazo de reserva.

---

## 🛍️ 2. Monitoreo de WooCommerce y Tienda Web

Los clientes que compran por la página web suelen pagar directamente por pasarela, pero requieren confirmación de sabor, dedicatoria y horario de entrega.

- **Herramienta:** `consultar_pedidos_pendientes_revision`
- **Acción:**
  - Identificar compras con estado `en_revision_diseno` o `pendiente_validacion`.
  - Revisar si el cliente dejó notas especiales o comprobantes adjuntos.
  - Generar el resumen de confirmación para que el asesor contacte por WhatsApp.

---

## 💰 3. Cartera por Cobrar y Seguimiento de Saldos

Para pedidos de eventos grandes (bodas, quinceañeras, eventos corporativos) donde se cobró el 50% de reserva:

- **Herramienta:** `consultar_cartera_por_cobrar`
- **Regla de Oro:** Todo pedido debe tener saldo \$0.00 antes de salir del taller o al momento de la entrega.
- **Protocolo de Cobranza Amable:**
  - Enviar recordatorio 48 horas antes de la entrega:
    *"¡Hola [Nombre]! Ya estamos preparando los detalles de tu celebración 🎂. Te recordamos que el saldo pendiente es de $[Saldo] para coordinar la entrega sin contratiempos."*

---

## 🔗 4. Deep-Linking Obligatorio en Respuestas Comerciales

Para cada cotización o pedido analizado:
- Enlace al CRM para asesores de venta: `https://crm.charbelapasteleria.com/ventas?orderId={id}`
- Enlace interactivo para el cliente: `https://crm.charbelapasteleria.com/c/{id}`
