# 🍰 Servidor MCP Oficial de Charbela CRM

Conexión directa entre **Claude Desktop** y el CRM de **Charbela Pastelería**.
Permite a Claude registrar gastos en lote, consultar pedidos, obrador, facturación SRI y conciliar estados de cuenta bancarios en lenguaje natural.

---

## 🍎 Instalación en Mac (Paso a Paso Rápido)

### 1. Requisitos
- Tener instalado [Claude Desktop](https://claude.ai/download).
- Tener instalado [Node.js (versión LTS)](https://nodejs.org/).

### 2. Descargar e Instalar
Puedes clonar este repositorio o descargarlo en ZIP desde el botón verde **Code -> Download ZIP**:

```bash
# Opción por Terminal:
git clone https://github.com/nandodv8/charbela-mcp.git
```

1. Entra a la carpeta descargada `charbela-mcp`.
2. Haz **clic derecho** sobre:
   > **`instalar_mac.command`**
3. Elige **Abrir** (y en el aviso de seguridad de macOS vuelve a hacer clic en **Abrir**).
4. La Terminal ejecutará la instalación y verificación automáticamente.
5. Cuando veas `🎉 Instalación completada`, **cierra Claude con Cmd + Q** y vuelve a abrirlo.

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

## 🛠️ Herramientas Disponibles en Claude (18 Tools)

### 💰 Gastos y Finanzas
- `registrar_gastos_en_lote`: Guarda múltiples gastos bancarios o de Excel en un solo mensaje.
- `registrar_gasto`: Registra un gasto individual con categoría, proveedor y fecha.
- `registrar_gasto_comprobante`: Registra gasto y asocia comprobante o número de autorización.
- `conciliar_estado_cuenta_banco`: Cruza débitos bancarios contra el CRM para detectar faltantes.
- `parsear_notificacion_bancaria`: Extrae monto, comercio y fecha de correos bancarios.
- `consultar_gastos_sin_comprobante`: Auditoría preventiva de gastos pendientes de comprobante.
- `consultar_finanzas_resumen`: Resumen P&L conversacional del mes o período.
- `consultar_facturas_sri`: Auditoría de comprobantes electrónicos autorizados en el SRI.

### 🎂 Pedidos y Clientes
- `crear_pedido`: Registra un nuevo pedido con fecha de entrega, sabores y anticipo.
- `actualizar_estado_pedido`: Modifica estado (confirmado, en producción, listo, entregado).
- `modificar_pedido`: Ajusta sabores, detalles o notas de un pedido existente.
- `crear_o_actualizar_cliente`: Guarda teléfonos, nombres y direcciones de clientes.
- `consultar_pedido_detalle`: Muestra todo el detalle de una orden (abonos, saldos, sabores).
- `buscar_pedidos`: Busca pedidos por nombre, teléfono, producto o fecha.
- `consultar_agenda_obrador`: Hoja de producción del taller (horneado, decoración y despacho).
