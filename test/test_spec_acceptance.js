// test/test_spec_acceptance.js
// Batería formal de aceptación basada en:
// "Charbela CRM — Spec de correcciones MCP (19 oct 2026).md" (Líneas 234-268)

import { getProduccionSemanal } from "../src/services/produccionService.js";
import { getObradorAgendaFull, getOrderDetailFull, searchOrdersDetailed } from "../src/services/ordersService.js";
import { getMetricasPipeline, getCarteraPorCobrar } from "../src/services/ventasPipelineService.js";
import { getFinancialSummaryConversational } from "../src/services/financeService.js";

async function runAcceptanceBattery() {
  console.log("================================================================");
  console.log("🧪 BATERÍA DE VERIFICACIÓN FORMAL — SPEC CORRECCIONES MCP");
  console.log("================================================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition, message, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      if (details) console.log(`     ↳ ${details}`);
      passes++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      if (details) console.error(`     ↳ ${details}`);
      fails++;
    }
  }

  // -------------------------------------------------------------------------
  // P0-01 — Obrador
  // -------------------------------------------------------------------------
  console.log("▶ P0-01: Obrador (Plan semanal y agendas diarias)");
  
  const sem = await getProduccionSemanal({ fechaReferencia: "2026-10-19" });
  assert(
    sem.totalPedidosActivos >= 10,
    "consultar_produccion_semanal(2026-10-19) -> totalPedidosActivos >= 10",
    `Encontrados: ${sem.totalPedidosActivos} pedidos activos`
  );
  const diasPoblados = Object.keys(sem.cronogramaPorDia);
  assert(
    diasPoblados.includes("2026-10-19") && diasPoblados.includes("2026-10-21") && diasPoblados.includes("2026-10-22") && diasPoblados.includes("2026-10-23") && diasPoblados.includes("2026-10-24"),
    "Cronograma con días 19 al 24 de octubre poblados",
    `Días activos: ${diasPoblados.join(", ")}`
  );
  const famKeys = Object.keys(sem.familias);
  assert(
    famKeys.length === 4,
    "Ítems distribuidos en las 4 familias del Obrador (1.1 a 1.4)",
    `Familias: ${famKeys.join(", ")}`
  );

  const ag21 = await getObradorAgendaFull({ fecha: "2026-10-21" });
  const denisseOrder = ag21.pedidos?.find(p => p.orderId === "MC1Az0JrLQK3BoNXlrRX");
  assert(
    ag21.totalPedidosDia >= 1 && Boolean(denisseOrder),
    "consultar_agenda_obrador(2026-10-21) -> totalPedidosDia >= 1 con Denisse Castro",
    `Cliente: ${denisseOrder?.cliente}, total líneas: ${denisseOrder?.items?.length}`
  );
  assert(
    denisseOrder?.items?.length === 8,
    "Pedido Denisse Castro incluye sus 8 líneas de producto decorado",
    `Líneas: ${denisseOrder?.items?.length}`
  );

  const ag22 = await getObradorAgendaFull({ fecha: "2026-10-22" });
  const woo31011 = ag22.pedidos?.find(p => p.orderId === "woo_31011");
  assert(
    ag22.totalPedidosDia >= 3,
    "consultar_agenda_obrador(2026-10-22) -> >= 3 pedidos",
    `Total pedidos: ${ag22.totalPedidosDia}`
  );
  assert(
    Boolean(woo31011 && woo31011.advertencia),
    "Pedido woo_31011 incluido con bandera de advertencia por estado Borrador pagado",
    `Advertencia: ${woo31011?.advertencia}`
  );

  // -------------------------------------------------------------------------
  // P0-02 — Detalle de pedido
  // -------------------------------------------------------------------------
  console.log("\n▶ P0-02: Detalle de pedido (consultar_pedido_detalle)");

  const detDenisse = await getOrderDetailFull({ orderId: "MC1Az0JrLQK3BoNXlrRX" });
  assert(
    detDenisse.encontrado === true,
    "consultar_pedido_detalle(MC1Az0JrLQK3BoNXlrRX) -> respuesta sin error",
    `displayId: ${detDenisse.displayId}`
  );
  assert(
    detDenisse.productos?.length === 8,
    "Pedido Denisse Castro contiene exactamente 8 productos",
    `Productos: ${detDenisse.productos?.length}`
  );
  assert(
    detDenisse.notasEspeciales.includes("Juan Emilio 6 años") || detDenisse.tematica === "Juan Emilio 6 años",
    "Nota o temática 'Juan Emilio 6 años' preservada y expuesta",
    `Notas: "${detDenisse.notasEspeciales}"`
  );
  assert(
    detDenisse.finanzas?.total === "388.00" && detDenisse.finanzas?.saldoPendiente === "75.00",
    "Valores financieros correctos: Total $388.00 y Saldo $75.00",
    `Total: $${detDenisse.finanzas?.total}, Saldo: $${detDenisse.finanzas?.saldoPendiente}`
  );

  const detWoo = await getOrderDetailFull({ orderId: "woo_31011" });
  assert(
    detWoo.encontrado === true,
    "consultar_pedido_detalle(woo_31011) -> respuesta sin error sobre pedido web",
    `Cliente: ${detWoo.cliente?.nombre}, Total: $${detWoo.finanzas?.total}`
  );

  const detNoExiste = await getOrderDetailFull({ orderId: "NO_EXISTE_123" });
  assert(
    detNoExiste.encontrado === false && typeof detNoExiste.mensaje === "string",
    "consultar_pedido_detalle(NO_EXISTE_123) -> error estructurado y legible, no un crash",
    `Mensaje: "${detNoExiste.mensaje}"`
  );

  // -------------------------------------------------------------------------
  // P1 — Consistencia
  // -------------------------------------------------------------------------
  console.log("\n▶ P1: Consistencia comercial, métricas y cartera");

  const searchProd = await searchOrdersDetailed({ estado: "produccion", maxResultados: 50 });
  assert(
    searchProd.totalEncontrados >= 19,
    "buscar_pedidos(estado='produccion') -> recupera pedidos activos de producción sin crash",
    `Encontrados: ${searchProd.totalEncontrados}`
  );

  const metrics = await getMetricasPipeline();
  assert(
    metrics.valorTotalVentasAprobadasMes > 0,
    "consultar_metricas_pipeline() -> valorTotalVentasAprobadasMes > 0",
    `Monto mes actual: $${metrics.valorTotalVentasAprobadasMes} (Global: $${metrics.valorTotalVentasAprobadasGlobal})`
  );

  const fin = await getFinancialSummaryConversational({ mes: "2026-10" });
  const cart = await getCarteraPorCobrar({ alcance: "vigente" });
  assert(
    typeof cart.criterioDeclarado === "string" && cart.criterioDeclarado.length > 20,
    "consultar_cartera_por_cobrar() -> declara explícitamente el criterio aplicado",
    `Criterio: ${cart.criterioDeclarado.slice(0, 80)}...`
  );
  assert(
    cart.conciliacionFinanzasMes?.cuentasPorCobrarClientesCxC === parseFloat(fin.posicionLiquidez?.cuentasPorCobrarClientesCxC),
    "Cartera mensual concilia al centavo con cuentasPorCobrarClientesCxC de finanzas ($497.45)",
    `Cartera Mes: $${cart.conciliacionFinanzasMes?.cuentasPorCobrarClientesCxC} vs Finanzas CxC: $${fin.posicionLiquidez?.cuentasPorCobrarClientesCxC}`
  );

  // -------------------------------------------------------------------------
  // P2 — Campos de diseño y teléfono
  // -------------------------------------------------------------------------
  console.log("\n▶ P2: Campos de contrato MCP (Diseño y Teléfono)");

  const searchEnv = await searchOrdersDetailed({ estado: "enviada", maxResultados: 10 });
  const todosTienenCampoDiseno = searchEnv.pedidos.every(p => p.diseno && typeof p.diseno === "object");
  assert(
    todosTienenCampoDiseno && searchEnv.pedidos.length > 0,
    "buscar_pedidos(estado='enviada') -> cada pedido incluye campo de diseño/adjunto",
    `Revisados: ${searchEnv.pedidos.length} pedidos`
  );

  const searchSinDiseno = await searchOrdersDetailed({ soloSinDiseno: true, maxResultados: 10 });
  assert(
    searchSinDiseno.totalEncontrados > 0,
    "buscar_pedidos(soloSinDiseno=true) -> devuelve cotizaciones/pedidos sin diseño definido",
    `Total sin diseño: ${searchSinDiseno.totalEncontrados}`
  );

  console.log("\n================================================================");
  console.log(`🏁 RESULTADOS: ${passes} PASADAS, ${fails} FALLADAS`);
  console.log("================================================================\n");

  if (fails > 0) {
    process.exit(1);
  }
}

runAcceptanceBattery().catch(err => {
  console.error("Fatal error running acceptance battery:", err);
  process.exit(1);
});
