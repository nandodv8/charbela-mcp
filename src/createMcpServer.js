// crm-charbela/mcp-server/src/createMcpServer.js
// Fábrica de Servidor MCP Oficial de Charbela CRM
// Diseñado para funcionar de manera idéntica en local (stdio) o en Cloud Run (SSE)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

import {
  detectDuplicateExpenses,
  deleteExpense,
  batchDeleteExpenses,
  modifyExpense
} from "./services/expenseDuplicateService.js";

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
      isError: true,
      content: [
        {
          type: "text",
          text: `❌ Error al ejecutar ${toolName}: ${error.message}`
        }
      ]
    };
  }
}

/**
 * Crea y configura una instancia completa del servidor MCP Charbela
 */
export function createCharbelaMcpServer() {
  const server = new McpServer({
    name: "charbela-crm-mcp",
    version: "2.0.0"
  });

  // ============================================================================
  // 1. MUTACIONES PRINCIPALES (CREACIÓN Y EDICIÓN)
  // ============================================================================

  server.tool(
    "crear_pedido",
    "Registra un nuevo pedido en el CRM con fecha de entrega, sabores, notas, total y anticipo opcional.",
    {
      clienteNombre: z.string().describe("Nombre de la clienta"),
      clienteTelefono: z.string().describe("Número de WhatsApp o teléfono"),
      fechaEntrega: z.string().describe("Fecha prometida de entrega en formato YYYY-MM-DD"),
      horaEntrega: z.string().optional().describe("Hora estimada de entrega (ej. 16:30)"),
      items: z.array(z.object({
        descripcion: z.string().describe("Nombre o descripción del producto/torta"),
        cantidad: z.number().default(1),
        precio: z.number().describe("Precio unitario o total del item"),
        detalles: z.string().optional().describe("Sabores, relleno, temática o dedicatoria")
      })).describe("Lista de productos a incluir en el pedido"),
      abonoInicial: z.number().optional().describe("Monto pagado como anticipo/seña"),
      metodoPagoAbono: z.string().optional().describe("Transferencia, Efectivo, Deuna, etc."),
      notas: z.string().optional().describe("Instrucciones especiales para cocina o entrega")
    },
    async (args) => runWithTelemetry("crear_pedido", args, () => createOrderFromAgent(args))
  );

  server.tool(
    "actualizar_estado_pedido",
    "Cambia el estado de un pedido en el flujo de producción y entrega (ej. 'pendiente', 'confirmado', 'horneo', 'decoracion', 'listo', 'entregado').",
    {
      orderId: z.string().describe("ID del pedido en Firestore o número de referencia"),
      nuevoEstado: z.string().describe("Nuevo estado del pedido"),
      motivo: z.string().optional().describe("Razón del cambio o nota operativa")
    },
    async (args) => runWithTelemetry("actualizar_estado_pedido", args, () => updateOrderStatusFromAgent(args))
  );

  server.tool(
    "modificar_pedido",
    "Edita detalles, notas de cocina, sabores o fecha de entrega de un pedido existente.",
    {
      orderId: z.string().describe("ID del pedido"),
      cambios: z.object({
        notas: z.string().optional(),
        fechaEntrega: z.string().optional(),
        horaEntrega: z.string().optional(),
        direccionEntrega: z.string().optional(),
        sabores: z.string().optional()
      }).describe("Campos a actualizar en el pedido")
    },
    async (args) => runWithTelemetry("modificar_pedido", args, () => updateOrderDetailsFromAgent(args))
  );

  server.tool(
    "crear_o_actualizar_cliente",
    "Crea una nueva ficha de cliente o actualiza sus datos de contacto y dirección.",
    {
      nombre: z.string().describe("Nombre y apellido del cliente"),
      telefono: z.string().describe("Teléfono celular o WhatsApp"),
      email: z.string().optional().describe("Correo electrónico"),
      direccion: z.string().optional().describe("Dirección de entrega habitual"),
      notas: z.string().optional().describe("Preferencias o alergias alimentarias")
    },
    async (args) => runWithTelemetry("crear_o_actualizar_cliente", args, () => upsertClientFromAgent(args))
  );

  server.tool(
    "registrar_abono",
    "Registra un nuevo abono o pago parcial a un pedido existente y actualiza su saldo pendiente.",
    {
      orderId: z.string().describe("ID del pedido en Firestore"),
      monto: z.number().describe("Monto del abono recibido en dólares"),
      metodoPago: z.string().describe("Método de pago: Transferencia, Efectivo, Deuna, Tarjeta"),
      comprobante: z.string().optional().describe("Número de referencia o autorización"),
      banco: z.string().optional().describe("Banco donde ingresó el dinero")
    },
    async (args) => runWithTelemetry("registrar_abono", args, () => registerPaymentAbono(args))
  );

  // ============================================================================
  // 2. GASTOS, COMPROBANTES Y CONCILIACIÓN BANCARIA AUTOMÁTICA
  // ============================================================================

  server.tool(
    "registrar_gasto",
    "Registra un egreso de dinero en el CRM asignando categoría contable, proveedor y método de pago.",
    {
      monto: z.number().describe("Monto del egreso en dólares"),
      descripcion: z.string().describe("Motivo del gasto (ej. 'Compra de 2 sacos de harina', 'Pago chofer sábado')"),
      categoria: z.string().optional().describe("Materia Prima, Gastos de operación, Servicios, LOGISTICA de transporte, etc."),
      proveedor: z.string().optional().describe("Nombre del proveedor o persona pagada"),
      metodoPago: z.string().default("Transferencia").describe("Transferencia, Efectivo, Deuna, etc.")
    },
    async (args) => runWithTelemetry("registrar_gasto", args, () => registerExpenseGasto(args))
  );

  server.tool(
    "registrar_gasto_comprobante",
    "Registra un egreso adjuntando número de comprobante, autorización bancaria o URL de imagen de soporte para control anti-duplicados.",
    {
      monto: z.number().describe("Monto del egreso"),
      descripcion: z.string().describe("Concepto del gasto"),
      categoria: z.string().optional().describe("Categoría contable sugerida"),
      proveedor: z.string().optional().describe("Nombre del proveedor o comercio"),
      fecha: z.string().optional().describe("Fecha del gasto (YYYY-MM-DD)"),
      numeroComprobante: z.string().optional().describe("Número de factura física o autorización"),
      referenciaBancaria: z.string().optional().describe("Código único de transferencia bancaria"),
      banco: z.string().optional().describe("Banco emisor (ej. Pichincha, Guayaquil, Produbanco)"),
      comprobanteUrl: z.string().optional().describe("URL de imagen de la captura del recibo si aplica")
    },
    async (args) => runWithTelemetry("registrar_gasto_comprobante", args, () => registerExpenseWithReceipt(args))
  );

  server.tool(
    "parsear_notificacion_bancaria",
    "Interpreta el texto de un correo electrónico o SMS bancario (Banco Pichincha, Guayaquil, Produbanco, Deuna) y extrae monto, fecha, comercio y referencia.",
    {
      emailText: z.string().describe("Texto completo de la notificación bancaria de débito")
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

  server.tool(
    "detectar_gastos_duplicados",
    "Audita los gastos registrados en el CRM para detectar registros duplicados (por misma referencia bancaria o por coincidencia de monto y fecha cercana), recomendando cuál conservar.",
    {
      mes: z.string().optional().describe("Mes a auditar en formato YYYY-MM (ej. '2026-10'). Si no se indica, audita los últimos 250 gastos."),
      toleranciaDias: z.number().default(1).describe("Tolerancia máxima en días de diferencia entre fechas con mismo monto (por defecto 1 día).")
    },
    async (args) => runWithTelemetry("detectar_gastos_duplicados", args, () => detectDuplicateExpenses(args))
  );

  server.tool(
    "eliminar_gasto",
    "Elimina de forma permanente un gasto erróneo o duplicado del CRM mediante su ID de documento en Firestore, generando constancia contable de auditoría.",
    {
      gastoId: z.string().describe("ID del gasto a eliminar en Firestore"),
      motivo: z.string().optional().describe("Motivo de la eliminación (ej. 'Duplicado de transferencia #12345')")
    },
    async (args) => runWithTelemetry("eliminar_gasto", args, () => deleteExpense(args))
  );

  server.tool(
    "eliminar_gastos_en_lote",
    "Elimina de forma masiva y segura una lista de gastos duplicados confirmados tras una auditoría contable.",
    {
      gastoIds: z.array(z.string()).describe("Lista de IDs de gastos a eliminar en Firestore"),
      motivo: z.string().optional().describe("Motivo de la eliminación masiva")
    },
    async (args) => runWithTelemetry("eliminar_gastos_en_lote", args, () => batchDeleteExpenses(args))
  );

  server.tool(
    "modificar_gasto",
    "Modifica quirúrgicamente campos de un gasto existente en el CRM (monto, fecha, proveedor, descripción, categoría, método o referencia).",
    {
      gastoId: z.string().describe("ID del gasto a modificar en Firestore"),
      cambios: z.object({
        monto: z.number().optional().describe("Nuevo monto en dólares"),
        fecha: z.string().optional().describe("Nueva fecha en formato YYYY-MM-DD"),
        descripcion: z.string().optional().describe("Nuevo concepto o detalle"),
        proveedor: z.string().optional().describe("Nuevo nombre de proveedor"),
        categoria: z.string().optional().describe("Nueva categoría contable"),
        metodoPago: z.string().optional().describe("Nuevo método de pago"),
        referenciaBancaria: z.string().optional().describe("Nueva referencia de transferencia")
      }).describe("Campos específicos a actualizar")
    },
    async (args) => runWithTelemetry("modificar_gasto", args, () => modifyExpense(args))
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
  // 4. SISTEMA DE APRENDIZAJE Y MEMORIA (KAIZEN)
  // ============================================================================

  server.tool(
    "save_agent_preference",
    "Registra una preferencia o regla operativa dictada por Charbela para que persista permanentemente en la memoria operativa de futuras sesiones.",
    {
      category: z.string().describe("Categoría (ej. 'clientes', 'horarios', 'precios', 'recetas')"),
      preference: z.string().describe("Regla o instrucción clara a recordar")
    },
    async (args) => runWithTelemetry("save_agent_preference", args, () => saveLearnedPreference(args.category, args.preference))
  );

  server.tool(
    "submit_user_feedback",
    "Envía una queja, felicitación o sugerencia sobre la atención del agente para mejora continua.",
    {
      type: z.enum(["queja", "sugerencia", "felicitacion"]).describe("Tipo de feedback"),
      comment: z.string().describe("Detalle del comentario")
    },
    async (args) => runWithTelemetry("submit_user_feedback", args, () => submitUserFeedback(args.type, args.comment))
  );

  // ============================================================================
  // 5. RECURSO DE MEMORIA OPERATIVA
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

  return server;
}
