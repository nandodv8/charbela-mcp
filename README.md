# 🍰 Servidor MCP Oficial de Charbela CRM

Conexión directa entre **Claude Desktop** y el CRM de **Charbela Pastelería**.
Permite a Claude registrar gastos en lote, consultar pedidos, obrador, facturación SRI y conciliar estados de cuenta bancarios en lenguaje natural.

---

## 🍎 Instalación en Mac (Opción Más Rápida en 1 Línea)

Abre la **Terminal** en tu Mac (presiona `Cmd + Barra espaciadora`, escribe `Terminal` y pulsa Enter), luego pega esta sola línea y pulsa Enter:

```bash
curl -sSL https://raw.githubusercontent.com/nandodv8/charbela-mcp/main/setup_mac.sh | bash
```

Cuando veas `🎉 ¡LISTO CHARBELA!`, cierra Claude por completo con `Cmd + Q` y vuelve a abrirlo.

---

## 🪟 Instalación en Windows

1. Descarga o clona la carpeta.
2. Abre la carpeta y haz doble clic en:
   > **`instalar_claude.bat`**
3. Cierra Claude Desktop por completo (desde la bandeja de iconos junto al reloj o Administrador de Tareas) y vuelve a abrirlo.

---

## 🤖 Agente Concierge de Gastos
En este repositorio se incluye el archivo:
👉 **[`AGENTE_CONCIERGE_GASTOS_CHARBELA.md`](AGENTE_CONCIERGE_GASTOS_CHARBELA.md)**

Copia ese texto y pégalo como primer mensaje en Claude Desktop para activar el modo de asistente contable automático.

---

## 🛠️ Herramientas Disponibles en Claude (23 Tools)

### 💰 Gastos, Duplicados y Finanzas
- `detectar_gastos_duplicados`: Audita gastos registrados en el CRM para detectar pagos duplicados (por misma referencia bancaria o monto idéntico en fechas cercanas) y recomienda cuál conservar.
- `eliminar_gasto`: Elimina permanentemente un gasto erróneo o duplicado del CRM mediante su ID de documento en Firestore, generando constancia contable de auditoría.
- `eliminar_gastos_en_lote`: Elimina en bloque una lista de gastos duplicados confirmados tras una auditoría contable.
- `modificar_gasto`: Modifica quirúrgicamente campos de un gasto existente (monto, fecha, proveedor, descripción, categoría, método o referencia).
- `registrar_gastos_en_lote`: Guarda múltiples gastos bancarios o de Excel en un solo mensaje.
- `registrar_gasto`: Registra un gasto individual con categoría, proveedor y fecha ecuatoriana (UTC-5).
- `registrar_gasto_comprobante`: Registra gasto y asocia comprobante o número de autorización para control anti-duplicados.
- `conciliar_estado_cuenta_banco`: Cruza débitos bancarios contra el CRM para detectar faltantes.
- `parsear_notificacion_bancaria`: Extrae monto, comercio y fecha de correos de bancos ecuatorianos (Pichincha, Guayaquil, Produbanco, Deuna).
- `listar_gastos`: Lista y consulta gastos detallados del CRM con filtros por mes, rango de fechas, categoría, proveedor o fecha de carga (`createdAt`). Permite ver exactamente qué gastos se agregaron hoy o en cualquier periodo sin recortes.
- `consultar_gastos_sin_comprobante`: Auditoría preventiva de gastos que aún no tienen comprobante adjunto.
- `consultar_finanzas_resumen`: Estado de Resultados P&L conversacional del mes (Devengado vs Flujo de Caja, COGS, Utilidad Bruta, Margen Bruto, OPEX, Utilidad Neta, CxC y CxP).
- `consultar_facturas_sri`: Auditoría de comprobantes electrónicos autorizados en el SRI (Dátil).

### 🎂 Pedidos y Clientes
- `crear_pedido`: Registra un nuevo pedido con fecha de entrega, sabores y anticipo.
- `actualizar_estado_pedido`: Modifica estado (confirmado, en producción, listo, entregado).
- `modificar_pedido`: Ajusta sabores, detalles o notas de un pedido existente.
- `crear_o_actualizar_cliente`: Guarda teléfonos, nombres y direcciones de clientes.
- `consultar_pedido_detalle`: Muestra todo el detalle de una orden (abonos, saldos, sabores).
- `buscar_pedidos`: Busca pedidos por nombre, teléfono, producto o fecha.
- `consultar_agenda_obrador`: Hoja de producción del taller (horneado, decoración y despacho para hoy o fecha específica).
- `registrar_abono`: Registra un pago parcial a un pedido y actualiza su saldo pendiente.
