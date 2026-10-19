// crm-charbela/mcp-server/src/services/ventasPipelineService.js
// Servicio MCP para Ventas, Pipeline Comercial, Pedidos Web y Cartera por Cobrar

import { db } from "../firebase.js";
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";

/**
 * Consulta pedidos de tienda web / WooCommerce que están aprobados pero pendientes de revisión por Ventas
 */
export async function getPedidosWebPorRevisar() {
  const snap = await getDocs(collection(db, "pedidos"));
  const pendientes = [];

  snap.forEach((docSnap) => {
    const p = { id: docSnap.id, ...docSnap.data() };
    const isWeb =
      p.origen === "tienda" ||
      p.origen === "WooCommerce" ||
      String(p.displayId || "").startsWith("WOO-") ||
      Boolean(p.wcOrderId);

    const estadoNorm = (p.estado || "").toLowerCase();
    const esAprobada = estadoNorm === "aprobada" || estadoNorm === "aprobado";

    if (isWeb && esAprobada && !p.revisadoPorVentas) {
      pendientes.push({
        id: p.id,
        displayId: p.displayId || p.id.slice(-6),
        wcOrderId: p.wcOrderId || null,
        cliente: p.clienteNombre || "Cliente Web",
        telefono: p.clienteTelefono || "",
        fechaEntrega: p.fechaEntrega || "Por coordinar",
        horaEntrega: p.horaEntrega || "",
        total: Number((p.total || p.coste || 0).toFixed(2)),
        abono: Number((p.abono || 0).toFixed(2)),
        saldo: Number((p.saldoPendiente || 0).toFixed(2)),
        productos: (p.items || []).map((it) => `${it.cantidad || 1}x ${it.descripcion || it.nombre}`),
        metodoPago: p.metodoPago || "Pago en línea",
        notas: p.notas || ""
      });
    }
  });

  return {
    totalPedidosWebPendientesRevision: pendientes.length,
    mensaje: pendientes.length > 0
      ? `Hay ${pendientes.length} pedido(s) web pagados online pendientes de verificar sabores, empaque o entrega por el equipo de Ventas.`
      : "Todos los pedidos web han sido revisados por el equipo de Ventas.",
    pedidos: pendientes
  };
}

/**
 * Consulta las métricas globales del pipeline comercial activo
 */
export async function getMetricasPipeline() {
  const snap = await getDocs(collection(db, "pedidos"));
  const counts = { borrador: 0, enviada: 0, aprobada: 0, produccion: 0, entregado: 0, cancelado: 0 };
  let valorPipelineActivo = 0;
  let valorAprobadoMes = 0;

  const mesActual = new Date().toISOString().slice(0, 7);

  snap.forEach((docSnap) => {
    const p = docSnap.data();
    const est = (p.estado || "borrador").toLowerCase();
    const total = Number(p.total || p.coste || 0);

    if (est.includes("borrador")) counts.borrador++;
    else if (est.includes("enviad")) counts.enviada++;
    else if (est.includes("aprobad")) {
      counts.aprobada++;
      valorPipelineActivo += total;
      if ((p.fechaEntrega || "").startsWith(mesActual)) {
        valorAprobadoMes += total;
      }
    } else if (est.includes("entregad")) {
      counts.entregado++;
    } else if (est.includes("cancel")) {
      counts.cancelado++;
    } else {
      counts.produccion++;
      valorPipelineActivo += total;
    }
  });

  const totalActivos = counts.borrador + counts.enviada + counts.aprobada + counts.produccion;
  const tasaConversion = (counts.borrador + counts.enviada + counts.aprobada) > 0
    ? (counts.aprobada / (counts.borrador + counts.enviada + counts.aprobada)) * 100
    : 0;

  return {
    mesActual,
    totalPedidosEnPipeline: totalActivos,
    desglosePorEstado: counts,
    tasaConversionCotizaciones: `${tasaConversion.toFixed(1)}%`,
    valorTotalVentasAprobadasMes: Number(valorAprobadoMes.toFixed(2)),
    valorTotalEnFlujoActivo: Number(valorPipelineActivo.toFixed(2))
  };
}

/**
 * Consulta cartera pendiente por cobrar (pedidos entregados o por entregar con saldo adeudado)
 */
export async function getCarteraPorCobrar(args = {}) {
  const snap = await getDocs(collection(db, "pedidos"));
  const pedidosConSaldo = [];
  let saldoTotalCartera = 0;

  snap.forEach((docSnap) => {
    const p = { id: docSnap.id, ...docSnap.data() };
    const est = (p.estado || "").toLowerCase();
    if (est === "cancelada" || est === "cancelado") return;

    const total = Number(p.total || p.coste || 0);
    const abono = Number(p.abono || 0);
    const saldo = p.saldoPendiente !== undefined ? Number(p.saldoPendiente) : Math.max(0, total - abono);

    if (saldo > 0.05) {
      saldoTotalCartera += saldo;
      pedidosConSaldo.push({
        pedidoId: p.displayId || p.id.slice(-6),
        id: p.id,
        cliente: p.clienteNombre || "Cliente",
        telefono: p.clienteTelefono || "",
        fechaEntrega: p.fechaEntrega || "Sin fecha",
        estado: p.estado || "Aprobada",
        total: Number(total.toFixed(2)),
        abono: Number(abono.toFixed(2)),
        saldoPendiente: Number(saldo.toFixed(2))
      });
    }
  });

  // Ordenar por fecha de entrega más próxima
  pedidosConSaldo.sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));

  return {
    totalPedidosConSaldo: pedidosConSaldo.length,
    montoTotalPorCobrar: Number(saldoTotalCartera.toFixed(2)),
    cartera: args.limite ? pedidosConSaldo.slice(0, args.limite) : pedidosConSaldo
  };
}
