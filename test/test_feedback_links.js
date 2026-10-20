// crm-charbela/mcp-server/test/test_feedback_links.js
// Prueba de herramientas de gestión de mejoras/bugs y generación de enlaces CRM

import {
  reportarMejoraOBug,
  consultarMejorasYBugs,
  actualizarEstadoMejoraBug,
  generarEnlaceCrm,
  buildCrmLink
} from "../src/services/feedbackMejorasService.js";

async function run() {
  console.log("🧪 Probando herramientas de Mejoras, Bugs y Deep Links...");

  // 1. Enlaces
  const linkPortal = buildCrmLink("portal_cliente", "test-order-123");
  console.log("Link portal cliente:", linkPortal);
  if (!linkPortal.includes("/c/test-order-123")) throw new Error("Fallo en link portal cliente");

  const linkVentas = buildCrmLink("ventas", "test-order-123");
  console.log("Link ventas:", linkVentas);
  if (!linkVentas.includes("/ventas?orderId=test-order-123")) throw new Error("Fallo en link ventas");

  const linkProduccion = buildCrmLink("obrador", "test-order-123");
  console.log("Link obrador:", linkProduccion);
  if (!linkProduccion.includes("/produccion?orderId=test-order-123")) throw new Error("Fallo en link produccion");

  const resGen = generarEnlaceCrm({ modulo: "nomina" });
  console.log("Link nomina:", resGen.enlaceCrm);
  if (!resGen.enlaceCrm.includes("/nomina")) throw new Error("Fallo en link nomina");

  // 2. Reportar bug / mejora
  const rep = await reportarMejoraOBug({
    tipo: "Pulido",
    titulo: "Prueba automatizada de pulido visual",
    descripcion: "Validar que el botón de descarga PDF en nómina tenga margen adecuado",
    modulo: "Personal",
    gravedad: "Leve",
    reportadoPor: "test-suite@charbela.com"
  });
  console.log("Reporte creado con ID:", rep.feedbackId, "enlace:", rep.enlaceCrm);
  if (!rep.success || !rep.feedbackId) throw new Error("Fallo al reportar mejora");

  // 3. Consultar
  const consulta = await consultarMejorasYBugs({ modulo: "Personal", estado: "Pendiente" });
  console.log("Total encontrados en Personal:", consulta.totalEncontrados);
  if (consulta.totalEncontrados === 0) throw new Error("No se encontró el reporte recién creado");

  // 4. Actualizar estado
  const upd = await actualizarEstadoMejoraBug({
    feedbackId: rep.feedbackId,
    nuevoEstado: "Resuelto",
    resolucion: "Verificado y probado en test suite",
    comoVerificar: "Revisar status en vibe_feedback"
  });
  console.log("Actualizado:", upd.mensaje);
  if (!upd.success) throw new Error("Fallo al actualizar estado");

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DE FEEDBACK, MEJORAS Y ENLACES PASARON EXITOSAMENTE!");
}

run().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
