// crm-charbela/mcp-server/test/standalone_test.js
// Prueba de integración exhaustiva del Servidor MCP v2.0 (Mutaciones y Consultas Profundas)

import {
  searchOrdersDetailed,
  getOrderDetailFull,
  getObradorAgendaFull,
  updateOrderStatusFromAgent
} from "../src/services/ordersService.js";

import {
  getFinancialSummaryConversational,
  getInvoicingAudit,
  registerExpenseGasto
} from "../src/services/financeService.js";

import { getOperatingRules, recordTelemetry } from "../src/services/telemetryService.js";

async function runTestSuite() {
  console.log("==================================================");
  console.log("🧪 SUITE DE PRUEBAS MCP v2.0 (BIDIRECCIONAL)");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  // 1. Lectura de Reglas de Memoria
  try {
    process.stdout.write("1. Verificando lectura de reglas operativas de memoria... ");
    const rules = await getOperatingRules();
    if (typeof rules === "string" && rules.length > 5) {
      console.log("✅ OK");
      passed++;
    } else {
      throw new Error("Formato de reglas inválido");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 2. Búsqueda Detallada de Pedidos
  let sampleOrderId = null;
  try {
    process.stdout.write("2. Verificando búsqueda detallada de pedidos en texto... ");
    const res = await searchOrdersDetailed({ maxResultados: 5 });
    if (res && Array.isArray(res.pedidos)) {
      console.log(`✅ OK (${res.totalEncontrados} pedidos listados)`);
      if (res.pedidos.length > 0) {
        sampleOrderId = res.pedidos[0].orderId;
        console.log(`   -> Pedido Muestra: #${sampleOrderId.substring(0, 6)} - Cliente: ${res.pedidos[0].cliente} - Total: $${res.pedidos[0].total} - Saldo: $${res.pedidos[0].saldoPendiente}`);
      }
      passed++;
    } else {
      throw new Error("Respuesta no es válida");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 3. Consulta Profunda de Detalle de 1 Pedido (Sin navegador)
  if (sampleOrderId) {
    try {
      process.stdout.write(`3. Consultando detalle completo de pedido #${sampleOrderId.substring(0, 6)}... `);
      const detail = await getOrderDetailFull({ orderId: sampleOrderId });
      if (detail && detail.cliente && detail.finanzas) {
        console.log(`✅ OK (Estado: ${detail.entrega.estado}, Productos: ${detail.productos.length}, Saldo: $${detail.finanzas.saldoPendiente})`);
        passed++;
      } else {
        throw new Error("Detalle de pedido incompleto");
      }
    } catch (err) {
      console.log("❌ FALLÓ:", err.message);
      failed++;
    }
  }

  // 4. Agenda y Desglose de Producción del Obrador
  try {
    process.stdout.write("4. Consultando agenda completa del obrador (hoja de cocina)... ");
    const obrador = await getObradorAgendaFull();
    if (obrador && obrador.conteoPorEtapa) {
      console.log(`✅ OK (Por hornear: ${obrador.conteoPorEtapa.porHornearOEnsamble}, Decorando: ${obrador.conteoPorEtapa.enDecoracion})`);
      passed++;
    } else {
      throw new Error("Desglose de obrador inválido");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 5. P&L y Estado Financiero Conversacional
  try {
    process.stdout.write("5. Calculando P&L y balance financiero conversacional... ");
    const finanzas = await getFinancialSummaryConversational();
    if (finanzas && finanzas.resumenEjecutivo) {
      console.log(`✅ OK (Vendido: $${finanzas.resumenEjecutivo.totalVentasContratadas}, Cobrado: $${finanzas.resumenEjecutivo.totalDineroCobradoEnCaja}, Gastos: $${finanzas.resumenEjecutivo.totalGastosEgresos}, Flujo Neto: $${finanzas.resumenEjecutivo.flujoDeCajaNeto})`);
      passed++;
    } else {
      throw new Error("Resumen financiero inválido");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 6. Auditoría de Facturación Electrónica SRI
  try {
    process.stdout.write("6. Verificando auditoría fiscal SRI... ");
    const sri = await getInvoicingAudit();
    if (sri && sri.resumen) {
      console.log(`✅ OK (Facturas Autorizadas: ${sri.resumen.facturasAutorizadas}, Monto: $${sri.resumen.montoTotalFacturado})`);
      passed++;
    } else {
      throw new Error("Error en auditoría SRI");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 7. Mutación: Registro de Gasto Contable
  try {
    process.stdout.write("7. Verificando mutación: Registro de gasto contable... ");
    const gastoRes = await registerExpenseGasto({
      monto: 1.50,
      categoria: "Materia Prima",
      descripcion: "Prueba automática MCP v2.0 - Compra test insumo",
      proveedor: "Test Runner"
    });
    if (gastoRes && gastoRes.success) {
      console.log(`✅ OK (Gasto ID: ${gastoRes.gastoId})`);
      passed++;
    } else {
      throw new Error("Fallo al registrar gasto");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 8. Parser de Notificaciones Bancarias de Correo
  try {
    process.stdout.write("8. Verificando parser de notificación bancaria de email... ");
    const { parseBankNotificationText } = await import("../src/services/expenseReceiptService.js");
    const fakeEmail = "Banco Pichincha le notifica que se realizó una Transferencia por $34.50 a favor de MOLINOS DEL ECUADOR. Autorización: 987654. Fecha: 12/10/2026.";
    const parsed = parseBankNotificationText(fakeEmail);
    if (parsed && parsed.monto === 34.50 && parsed.categoriaSugerida === "Materia Prima") {
      console.log(`✅ OK (Banco: ${parsed.banco}, Monto: $${parsed.monto}, Cat: ${parsed.categoriaSugerida})`);
      passed++;
    } else {
      throw new Error(`Parseo fallido: ${JSON.stringify(parsed)}`);
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 9. Registro de Gasto con Comprobante y Anti-Duplicados
  try {
    process.stdout.write("9. Verificando registro de gasto con comprobante y anti-duplicados... ");
    const { registerExpenseWithReceipt } = await import("../src/services/expenseReceiptService.js");
    const testRef = "TEST-REF-" + Date.now();
    const resGasto1 = await registerExpenseWithReceipt({
      monto: 12.00,
      descripcion: "Compra de fresas frescas para tortas",
      proveedor: "Supermaxi",
      referenciaBancaria: testRef,
      banco: "Banco Pichincha"
    });
    if (!resGasto1 || !resGasto1.success) throw new Error("Fallo en registro inicial de comprobante");

    // Intento de duplicado con misma referencia
    const resGastoDup = await registerExpenseWithReceipt({
      monto: 12.00,
      descripcion: "Intento duplicado",
      referenciaBancaria: testRef
    });
    if (resGastoDup && resGastoDup.duplicado) {
      console.log("✅ OK (Anti-duplicados bloqueó reingreso correctamente)");
      passed++;
    } else {
      throw new Error("El sistema no detectó el duplicado de comprobante");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 10. Conciliación de Extracto Bancario
  try {
    process.stdout.write("10. Verificando conciliación de extracto bancario contra CRM... ");
    const { reconcileBankStatement } = await import("../src/services/expenseReceiptService.js");
    const conciliacion = await reconcileBankStatement({
      transacciones: [
        { fecha: "2026-10-12", descripcion: "SUPERMAXI QUICENTRO", monto: 45.00, tipo: "debito" },
        { fecha: "2026-10-12", descripcion: "CNEL SERVICIO ELECTRICO", monto: 120.00, tipo: "debito" }
      ]
    });
    if (conciliacion && conciliacion.resumen) {
      console.log(`✅ OK (Analizados: ${conciliacion.resumen.totalMovimientosAnalizados}, Faltantes detectados: ${conciliacion.resumen.pendientesPorRegistrar})`);
      passed++;
    } else {
      throw new Error("Resumen de conciliación no generado");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  // 11. Auditoría de Gastos sin Comprobante
  try {
    process.stdout.write("11. Verificando auditoría de gastos sin comprobante... ");
    const { getExpensesWithoutReceipts } = await import("../src/services/expenseReceiptService.js");
    const sinComp = await getExpensesWithoutReceipts({ limite: 5 });
    if (sinComp && Array.isArray(sinComp.gastos)) {
      console.log(`✅ OK (Detectados: ${sinComp.totalGastosSinComprobante})`);
      passed++;
    } else {
      throw new Error("Fallo en auditoría de comprobantes");
    }
  } catch (err) {
    console.log("❌ FALLÓ:", err.message);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`📊 RESUMEN: ${passed} PRUEBAS SUPERADAS, ${failed} FALLOS`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error("Error fatal en pruebas:", err);
  process.exit(1);
});
