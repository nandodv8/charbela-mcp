// crm-charbela/mcp-server/src/index.js
// Servidor MCP Oficial de Charbela CRM para Claude Desktop
// Arquitectura Integral: Mutaciones, Consultas Profundas y P&L Conversacional
// Diseñado con el framework de Agency Agents (ZeroLogic)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  createOrderFromAgent,
  updateOrderStatusFromAgent,
  updateOrderDetailsFromAgent,
  getOrderDetailFull,
  searchOrdersDetailed,
  getObradorAgendaFull,
  upsertClientFromAgent
} from "./services/ordersService.js";

import {
  registerPaymentAbono,
  registerExpenseGasto,
  getFinancialSummaryConversational,
  getInvoicingAudit
} from "./services/financeService.js";

import {
  saveLearnedPreference,
  getOperatingRules,
  submitUserFeedback,
  reportUnsupportedQuery,
  recordTelemetry
} from "./services/telemetryService.js";

import {
  registerExpenseWithReceipt,
  parseBankNotificationText,
  reconcileBankStatement,
  batchRegisterExpenses,
  getExpensesWithoutReceipts
} from "./services/expenseReceiptService.js";

// Inicializar el servidor MCP
const server = new McpServer({
  name: "charbela-crm-mcp",
  version: "2.0.0"
});

/**
 * Envoltorio con telemetría integrada y manejo de errores
 */
async function runWithTelemetry(toolName, params, handler) {
  const start = Date.now();
  try {
    const data = await handler();
    const duration = Date.now() - start;
    recordTelemetry(toolName, params, duration, true).catch(() => {});

    return {
      content: [
        {
          type: "text",
          text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
        }
      ]
    };
  } catch (error) {
    const duration = Date.now() - start;
    recordTelemetry(toolName, params, duration, false, error.message).catch(() => {});
    console.error(`[MCP Tool Error] ${toolName}:`, error.message);

    return {
      content: [
        {
          type: "text",
          text: `⚠️ Error en "${toolName}": ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// ============================================================================
// 1. MUTACIONES: INGRESAR Y MODIFICAR DATOS (PEDIDOS Y CLIENTES)
// ============================================================================

server.tool(
  "crear_pedido",
  "Crea y registra un nuevo pedido completo en el CRM desde el chat. Permite registrar cliente, productos, fecha, hora de entrega y abono inicial.",
  {
    clienteNombre: z.string().describe("Nombre completo del cliente"),
    clienteTelefono: z.string().optional().describe("Teléfono celular del cliente"),
    fechaEntrega: z.string().describe("Fecha prometida de entrega en formato YYYY-MM-DD"),
    horaEntrega: z.string().optional().default("Pendiente").describe("Hora de entrega aproximada (ej. '15:30' o '11:00 AM')"),
    metodoEntrega: z.enum(["Retiro en Obrador", "Entrega a Domicilio"]).default("Retiro en Obrador").describe("Modalidad de entrega"),
    direccionEntrega: z.string().optional().describe("Dirección de entrega si es a domicilio"),
    total: z.number().describe("Monto total pactado del pedido en USD"),
    abonoInicial: z.number().optional().default(0).describe("Monto del abono recibido al momento de crear el pedido"),
    metodoPagoAbono: z.string().optional().default("Transferencia").describe("Método del abono inicial (Efectivo, Transferencia, Deuna)"),
    notas: z.string().optional().describe("Notas especiales, mensaje de tarjeta o dedicatoria"),
    productos: z.array(z.object({
      nombre: z.string().describe("Nombre del producto (ej. Torta Red Velvet)"),
      cantidad: z.number().default(1),
      tamano: z.string().optional().describe("Porciones o tamaño (ej. 15 porciones)"),
      sabor: z.string().optional().describe("Sabor del bizcocho"),
      relleno: z.string().optional().describe("Relleno seleccionado"),
      precio: z.number().optional(),
      especificaciones: z.string().optional().describe("Detalles temáticos o decoración")
    })).optional().describe("Lista de ítems del pedido")
  },
  async (args) => runWithTelemetry("crear_pedido", args, () => createOrderFromAgent(args))
);

server.tool(
  "actualizar_estado_pedido",
  "Cambia el estado operativo de un pedido directamente (ej. 'confirmado', 'horneando', 'decorando', 'listo', 'entregado', 'cancelado').",
  {
    orderId: z.string().describe("ID del pedido en el CRM"),
    nuevoEstado: z.string().describe("Nuevo estado: 'pendiente', 'confirmado', 'en_preparacion', 'horneando', 'decorando', 'listo', 'entregado', 'cancelado'"),
    motivo: z.string().optional().describe("Motivo opcional del cambio")
  },
  async (args) => runWithTelemetry("actualizar_estado_pedido", args, () => updateOrderStatusFromAgent(args))
);

server.tool(
  "modificar_pedido",
  "Modifica fecha de entrega, hora, dirección, notas especiales o chofer asignado de un pedido existente.",
  {
    orderId: z.string().describe("ID del pedido a modificar"),
    fechaEntrega: z.string().optional().describe("Nueva fecha de entrega en formato YYYY-MM-DD"),
    horaEntrega: z.string().optional().describe("Nueva hora de entrega"),
    direccionEntrega: z.string().optional().describe("Nueva dirección de entrega"),
    choferNombre: z.string().optional().describe("Nombre del chofer asignado para la entrega"),
    notas: z.string().optional().describe("Notas actualizadas del pedido")
  },
  async (args) => runWithTelemetry("modificar_pedido", args, () => updateOrderDetailsFromAgent(args))
);

server.tool(
  "crear_o_actualizar_cliente",
  "Registra un nuevo cliente o actualiza los datos de uno existente (teléfono, dirección, notas de cumpleaños o alergias).",
  {
    nombre: z.string().describe("Nombre completo del cliente"),
    telefono: z.string().optional().describe("Teléfono celular del cliente"),
    email: z.string().optional().describe("Correo electrónico"),
    direccion: z.string().optional().describe("Dirección principal de entrega"),
    notas: z.string().optional().describe("Notas sobre el cliente (preferencias, fechas importantes, alergias)")
  },
  async (args) => runWithTelemetry("crear_o_actualizar_cliente", args, () => upsertClientFromAgent(args))
);

// ============================================================================
// 2. MUTACIONES FINANCIERAS: REGISTRAR ABONOS Y GASTOS
// ============================================================================

server.tool(
  "registrar_abono",
  "Registra un pago o abono parcial/total recibido para un pedido. Actualiza el saldo del pedido atómicamente y crea el comprobante.",
  {
    pedidoId: z.string().describe("ID del pedido a abonar"),
    monto: z.number().describe("Monto del abono recibido en dólares"),
    metodoPago: z.enum(["Efectivo", "Transferencia", "Tarjeta", "Deuna", "Otro"]).default("Transferencia").describe("Método de pago"),
    nota: z.string().optional().describe("Detalle adicional (ej. Banco Pichincha ref #1234)"),
    fecha: z.string().optional().describe("Fecha del abono en formato YYYY-MM-DD (por defecto hoy)")
  },
  async (args) => runWithTelemetry("registrar_abono", args, () => registerPaymentAbono(args))
);

server.tool(
  "registrar_gasto",
  "Registra un gasto o egreso contable en el sistema (compras de insumos, servicios, nómina, logística, etc.).",
  {
    monto: z.number().describe("Monto total del gasto en USD"),
    categoria: z.enum([
      "Materia Prima",
      "Mano de Obra Directa",
      "Nómina",
      "Servicios",
      "Renta",
      "Mantenimiento",
      "Marketing",
      "LOGISTICA de transporte",
      "Gastos de operación",
      "Otros"
    ]).default("Materia Prima").describe("Categoría contable del egreso"),
    descripcion: z.string().describe("Descripción exacta del gasto (ej. 'Compra de 10 paquetes de mantequilla y harina')"),
    proveedor: z.string().optional().describe("Nombre del proveedor o comercio"),
    metodoPago: z.string().default("Transferencia").describe("Medio de pago utilizado"),
    fecha: z.string().optional().describe("Fecha del gasto en formato YYYY-MM-DD (por defecto hoy)")
  },
  async (args) => runWithTelemetry("registrar_gasto", args, () => registerExpenseGasto(args))
);

server.tool(
  "registrar_gasto_comprobante",
  "Registra un gasto respaldado por comprobante o captura bancaria, con número de autorización/referencia y protección anti-duplicados.",
  {
    monto: z.number().describe("Monto exacto del comprobante"),
    descripcion: z.string().describe("Detalle de lo que se pagó"),
    categoria: z.string().optional().describe("Categoría contable (si no se envía, se infiere automáticamente)"),
    proveedor: z.string().optional().describe("Nombre del comercio o persona receptora"),
    metodoPago: z.string().default("Transferencia").describe("Método: Transferencia, Deuna, Efectivo, Tarjeta"),
    fecha: z.string().optional().describe("Fecha del pago (YYYY-MM-DD)"),
    referenciaBancaria: z.string().optional().describe("Número de comprobante, autorización o secuencial bancario"),
    banco: z.string().optional().describe("Banco emisor (ej. Banco Pichincha, Banco Guayaquil, Deuna)"),
    comprobanteUrl: z.string().optional().describe("URL pública del comprobante si existe"),
    comprobanteBase64: z.string().optional().describe("Imagen o captura en base64 para subir a Storage"),
    notas: z.string().optional().describe("Notas adicionales para contabilidad")
  },
  async (args) => runWithTelemetry("registrar_gasto_comprobante", args, () => registerExpenseWithReceipt(args))
);

server.tool(
  "parsear_notificacion_bancaria",
  "Extrae automáticamente monto, proveedor, banco, referencia y fecha a partir del texto de un correo o notificación bancaria de Gmail/SMS.",
  {
    emailText: z.string().describe("Texto completo pegado del correo o alerta de débito bancario")
  },
  async (args) => runWithTelemetry("parsear_notificacion_bancaria", args, () => parseBankNotificationText(args.emailText))
);

server.tool(
  "conciliar_estado_cuenta_banco",
  "Cruza una lista de movimientos extraídos de un estado de cuenta bancario (PDF/Excel) contra el CRM para detectar débitos faltantes por registrar.",
  {
    transacciones: z.array(z.object({
      fecha: z.string().optional().describe("Fecha del movimiento"),
      descripcion: z.string().describe("Concepto o nombre del establecimiento"),
      monto: z.number().describe("Monto del débito"),
      tipo: z.string().default("debito").describe("debito o credito"),
      referencia: z.string().optional().describe("Número de referencia o documento")
    })).describe("Lista de movimientos del estado de cuenta")
  },
  async (args) => runWithTelemetry("conciliar_estado_cuenta_banco", args, () => reconcileBankStatement(args))
);

server.tool(
  "registrar_gastos_en_lote",
  "Registra en un solo paso múltiples gastos confirmados provenientes de un estado de cuenta bancario conciliado.",
  {
    gastos: z.array(z.object({
      monto: z.number(),
      descripcion: z.string(),
      categoria: z.string().optional(),
      proveedor: z.string().optional(),
      fecha: z.string().optional(),
      metodoPago: z.string().default("Transferencia"),
      referenciaBancaria: z.string().optional()
    })).describe("Lista de gastos a registrar")
  },
  async (args) => runWithTelemetry("registrar_gastos_en_lote", args, () => batchRegisterExpenses(args))
);

server.tool(
  "consultar_gastos_sin_comprobante",
  "Auditoría preventiva: Lista gastos registrados en el CRM que aún no tienen comprobante o número de autorización asociado.",
  {
    limite: z.number().default(15).describe("Máximo de gastos a auditar")
  },
  async (args) => runWithTelemetry("consultar_gastos_sin_comprobante", args, () => getExpensesWithoutReceipts(args))
);

// ============================================================================
// 3. CONSULTAS PROFUNDAS EN TEXTO (CERO NAVEGADOR)
// ============================================================================

server.tool(
  "consultar_pedido_detalle",
  "Obtiene TODO el detalle minucioso de un pedido en texto (productos, sabores, rellenos, estado de entrega, historial de abonos y saldo pendiente).",
  {
    orderId: z.string().describe("ID completo o referencia del pedido")
  },
  async (args) => runWithTelemetry("consultar_pedido_detalle", args, () => getOrderDetailFull(args))
);

server.tool(
  "buscar_pedidos",
  "Busca pedidos filtrando por cliente, producto, estado o fecha con desglose de montos y saldos en texto.",
  {
    queryText: z.string().optional().describe("Nombre de cliente, teléfono, producto o palabra clave"),
    estado: z.string().optional().describe("Filtrar por estado del pedido (ej. 'pendiente', 'confirmado', 'listo', 'entregado')"),
    fecha: z.string().optional().describe("Filtrar por fecha específica de entrega en formato YYYY-MM-DD"),
    maxResultados: z.number().default(10).describe("Límite máximo de pedidos a retornar")
  },
  async (args) => runWithTelemetry("buscar_pedidos", args, () => searchOrdersDetailed(args))
);

server.tool(
  "consultar_agenda_obrador",
  "Entrega la hoja de producción del obrador para una fecha: qué tortas y postres hornear, qué decorar, qué entregar y consolidado de sabores.",
  {
    fecha: z.string().optional().describe("Fecha en formato YYYY-MM-DD (por defecto hoy)")
  },
  async (args) => runWithTelemetry("consultar_agenda_obrador", args, () => getObradorAgendaFull(args))
);

server.tool(
  "consultar_finanzas_resumen",
  "Genera un estado financiero P&L conversacional del periodo: total vendido, cobrado en caja, gastos por categoría, margen neto y cuentas por cobrar.",
  {
    fechaInicio: z.string().optional().describe("Fecha de inicio en formato YYYY-MM-DD"),
    fechaFin: z.string().optional().describe("Fecha de fin en formato YYYY-MM-DD"),
    mes: z.string().optional().describe("Mes a consultar en formato YYYY-MM (ej. '2026-10')")
  },
  async (args) => runWithTelemetry("consultar_finanzas_resumen", args, () => getFinancialSummaryConversational(args))
);

server.tool(
  "consultar_facturas_sri",
  "Audita comprobantes electrónicos emitidos en el SRI (Dátil), totales, IVA 15% y links a comprobantes RIDE.",
  {
    fechaInicio: z.string().optional().describe("Fecha de inicio (YYYY-MM-DD)"),
    fechaFin: z.string().optional().describe("Fecha de fin (YYYY-MM-DD)"),
    soloConError: z.boolean().default(false).describe("Filtrar solo comprobantes con error")
  },
  async (args) => runWithTelemetry("consultar_facturas_sri", args, () => getInvoicingAudit(args))
);

// ============================================================================
// 4. MEMORIA ADAPTATIVA Y FEEDBACK KAIZEN
// ============================================================================

server.tool(
  "save_agent_preference",
  "Enseña al agente una regla o preferencia de Charbela para recordar en todas las conversaciones futuras.",
  {
    categoria: z.string().describe("Área de la regla: 'produccion', 'finanzas', 'pedidos' o 'general'"),
    regla: z.string().describe("Descripción de la regla o preferencia aprendida"),
    autor: z.string().default("Charbela").describe("Quién definió la regla")
  },
  async (args) => runWithTelemetry("save_agent_preference", args, () => saveLearnedPreference(args))
);

server.tool(
  "submit_user_feedback",
  "Registra una sugerencia o reporte de Charbela en el sistema Kaizen.",
  {
    tipo: z.enum(["sugerencia", "queja", "felicitacion", "error_respuesta"]).describe("Tipo de feedback"),
    descripcion: z.string().describe("Detalle del comentario"),
    contexto: z.record(z.any()).optional().describe("Contexto opcional")
  },
  async (args) => runWithTelemetry("submit_user_feedback", args, () => submitUserFeedback(args))
);

// ============================================================================
// 5. RECURSOS MCP (Contexto Inicial y Memoria Operativa)
// ============================================================================

server.resource(
  "operating-rules",
  "crm://agent-memory/operating-rules",
  async () => {
    const text = await getOperatingRules();
    return {
      contents: [
        {
          uri: "crm://agent-memory/operating-rules",
          mimeType: "text/markdown",
          text
        }
      ]
    };
  }
);

// ============================================================================
// 6. INICIALIZAR TRANSPORTE STDIO
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Servidor MCP Charbela v2.0 conectado exitosamente mediante stdio.");
}

main().catch((err) => {
  console.error("❌ Error fatal al iniciar el servidor MCP:", err);
  process.exit(1);
});
