// test/test_attachments.js
// Test integral para validar adjuntos de fotos, diseños, comprobantes de pago y bugs en Charbela MCP

import { db, storage } from "../src/firebase.js";
import {
  collection,
  addDoc,
  getDoc,
  deleteDoc,
  doc,
  Timestamp
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

import {
  attachDesignToOrder,
  attachPaymentReceiptToOrder
} from "../src/services/ordersService.js";

import {
  reportarMejoraOBug,
  adjuntarCapturaMejoraBug
} from "../src/services/feedbackMejorasService.js";

import {
  adjuntarComprobanteGasto
} from "../src/services/expenseReceiptService.js";

// 1x1 transparent PNG en base64 para simular imágenes
const DUMMY_PNG_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function safeDeleteStorageUrl(url) {
  if (!url || !url.includes("charbela-crm.firebasestorage.app")) return;
  try {
    // Extraer path del URL de Firebase Storage
    const match = url.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      const decodedPath = decodeURIComponent(match[1]);
      const sRef = ref(storage, decodedPath);
      await deleteObject(sRef);
    }
  } catch (e) {
    // Silently ignore if already deleted or permission
  }
}

async function runAttachmentTests() {
  console.log("🚀 Iniciando pruebas de integración de Adjuntos en Charbela MCP...\n");

  const cleanupTasks = [];

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Crear pedido simulado y adjuntar diseño global y a nivel de producto
    // ------------------------------------------------------------------------
    console.log("👉 TEST 1: Adjuntar diseño general y a nivel de producto con pauta...");
    const orderRef = await addDoc(collection(db, "pedidos"), {
      clienteNombre: "Cliente Test Adjuntos",
      clienteTelefono: "0991234567",
      fechaEnvio: "2026-10-25",
      fechaEntrega: "2026-10-25",
      horaEntrega: "15:00",
      total: 85.00,
      pagado: 0,
      saldoPendiente: 85.00,
      estado: "Borrador",
      items: [
        {
          nombre: "Torta Decorada 20P",
          cantidad: 1,
          precio: 65.00,
          categoria: "Tortas Decoradas"
        },
        {
          nombre: "Docena de Galletas Temáticas",
          cantidad: 1,
          precio: 20.00,
          categoria: "Galletas Decoradas"
        }
      ],
      createdAt: Timestamp.now()
    });
    const orderId = orderRef.id;
    cleanupTasks.push(async () => await deleteDoc(orderRef));

    // 1a. Adjuntar diseño global
    const resDisenoGlobal = await attachDesignToOrder({
      orderId,
      imagenBase64: DUMMY_PNG_BASE64,
      esDisenoGlobal: true,
      tematica: "Temática Bosque Encantado",
      notas: "Cuidado con la humedad en el traslado"
    });
    console.log("   ✓ Diseño global adjuntado:", resDisenoGlobal.success, resDisenoGlobal.fotoSubidaUrl);
    cleanupTasks.push(() => safeDeleteStorageUrl(resDisenoGlobal.fotoSubidaUrl));

    // 1b. Adjuntar diseño a ítem específico (Galletas) con Pauta de Diseño completa
    const resDisenoItem = await attachDesignToOrder({
      orderId,
      imagenBase64: DUMMY_PNG_BASE64,
      esDisenoGlobal: false,
      itemNombre: "Galletas",
      pautaDiseno: {
        textoConfirmado: {
          fraseExacta: "VALENTINA 5 AÑOS",
          ubicacion: "En galleta de placa principal"
        },
        loQueSiLleva: ["Honguitos de azúcar", "Musgo comestible", "Glaseado verde menta"],
        loQueNoLleva: ["Brillo dorado", "Perlas duras"],
        paletaColores: ["Verde menta", "Blanco tiza", "Terracota"],
        loQueSiNotas: "Empacar cada una en bolsita individual con lazo rosa",
        loQueNoNotas: "No usar colorante negro bajo ninguna circunstancia"
      }
    });
    console.log("   ✓ Diseño de ítem (Galletas) adjuntado:", resDisenoItem.success, resDisenoItem.alcance);
    cleanupTasks.push(() => safeDeleteStorageUrl(resDisenoItem.fotoSubidaUrl));

    // Verificar en Firestore
    const orderSnapAfterDesign = await getDoc(orderRef);
    const orderDataAfterDesign = orderSnapAfterDesign.data();
    if (!orderDataAfterDesign.fotoDisenoEvento) throw new Error("fotoDisenoEvento no se guardó en el pedido");
    if (!orderDataAfterDesign.items[1].pautaDiseno) throw new Error("pautaDiseno no se guardó en las galletas");
    if (orderDataAfterDesign.items[1].pautaDiseno.textoConfirmado.fraseExacta !== "VALENTINA 5 AÑOS") {
      throw new Error("Frase exacta de dedicatoria no coincide");
    }
    console.log("   ✅ Verificación en Firestore: fotoDisenoEvento y pautaDiseno en Galletas validadas al 100%!");

    // ------------------------------------------------------------------------
    // TEST 2: Adjuntar comprobante de pago bancario y registrar abono
    // ------------------------------------------------------------------------
    console.log("\n👉 TEST 2: Adjuntar comprobante bancario y registrar abono...");
    const resPago = await attachPaymentReceiptToOrder({
      orderId,
      comprobanteBase64: DUMMY_PNG_BASE64,
      monto: 40.00,
      metodoPago: "Transferencia",
      banco: "Banco Pichincha",
      notas: "Transferencia comprobante #782910"
    });
    console.log("   ✓ Comprobante adjuntado:", resPago.success, "Nuevo saldo:", resPago.abonoRegistrado?.nuevoSaldo);
    cleanupTasks.push(() => safeDeleteStorageUrl(resPago.comprobanteUrl));
    if (resPago.abonoRegistrado?.abonoId) {
      cleanupTasks.push(async () => await deleteDoc(doc(db, "abonos", resPago.abonoRegistrado.abonoId)));
    }

    const orderSnapAfterPago = await getDoc(orderRef);
    const orderDataAfterPago = orderSnapAfterPago.data();
    if (orderDataAfterPago.pagado !== 40.00 || orderDataAfterPago.saldoPendiente !== 45.00) {
      throw new Error(`Saldos no concilian: pagado ${orderDataAfterPago.pagado}, saldo ${orderDataAfterPago.saldoPendiente}`);
    }
    if (!orderDataAfterPago.comprobanteUrl) throw new Error("comprobanteUrl no se guardó en el pedido");
    console.log("   ✅ Verificación en Firestore: comprobanteUrl guardado y abono de $40 conciliado correctamente!");

    // ------------------------------------------------------------------------
    // TEST 3: Reportar bug/mejora con captura y adjuntar captura posterior
    // ------------------------------------------------------------------------
    console.log("\n👉 TEST 3: Reportar mejora/bug con captura y adjuntar captura...");
    const resBug = await reportarMejoraOBug({
      tipo: "Mejora",
      titulo: "Prueba de adjunto de mockup",
      descripcion: "Validando carga de capturas en vibe_feedback desde Claude MCP",
      modulo: "Ventas",
      capturaBase64: DUMMY_PNG_BASE64
    });
    console.log("   ✓ Reporte creado con captura:", resBug.success, resBug.capturaUrl);
    cleanupTasks.push(() => safeDeleteStorageUrl(resBug.capturaUrl));
    cleanupTasks.push(async () => await deleteDoc(doc(db, "vibe_feedback", resBug.feedbackId)));

    // Adjuntar nueva captura al reporte
    const resAdjBug = await adjuntarCapturaMejoraBug({
      feedbackId: resBug.feedbackId,
      capturaBase64: DUMMY_PNG_BASE64
    });
    console.log("   ✓ Captura adicional adjuntada al bug:", resAdjBug.success, resAdjBug.screenshotUrl);
    cleanupTasks.push(() => safeDeleteStorageUrl(resAdjBug.screenshotUrl));

    // ------------------------------------------------------------------------
    // TEST 4: Adjuntar comprobante a gasto existente
    // ------------------------------------------------------------------------
    console.log("\n👉 TEST 4: Adjuntar comprobante a gasto contable...");
    const gastoRef = await addDoc(collection(db, "gastos"), {
      monto: 35.50,
      descripcion: "Compra de mangas pasteleras",
      categoria: "Gastos de operación",
      proveedor: "Comercial Repostería",
      fechaEmision: "2026-10-20",
      createdAt: Timestamp.now()
    });
    cleanupTasks.push(async () => await deleteDoc(gastoRef));

    const resGasto = await adjuntarComprobanteGasto({
      gastoId: gastoRef.id,
      comprobanteBase64: DUMMY_PNG_BASE64
    });
    console.log("   ✓ Comprobante adjuntado al gasto:", resGasto.success, resGasto.comprobanteUrl);
    cleanupTasks.push(() => safeDeleteStorageUrl(resGasto.comprobanteUrl));

    console.log("\n🎉 TODOS LOS 4 TESTS DE ADJUNTOS PASARON EXITOSAMENTE!");

  } catch (error) {
    console.error("\n❌ Error durante la prueba de adjuntos:", error);
    process.exitCode = 1;
  } finally {
    console.log("\n🧹 Limpiando registros temporales de prueba en Firestore y Storage...");
    for (const task of cleanupTasks) {
      try {
        await task();
      } catch (err) {
        // Ignorar errores de limpieza
      }
    }
    console.log("✨ Limpieza completada sin dejar huella de prueba.");
  }
}

runAttachmentTests();
