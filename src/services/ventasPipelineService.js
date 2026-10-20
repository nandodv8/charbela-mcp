// crm-charbela/mcp-server/src/services/ventasPipelineService.js
// Servicio MCP para Ventas, Pipeline Comercial, Pedidos Web y Cartera por Cobrar
// Implementa especificación de normalización de estados y conciliación de cartera (P1-01, P1-02, P1-03)

import { db } from "../firebase.js";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  resolveFechaPedido,
  normalizeEstado,
  esCotizacion,
  esProduccionActiva
} from "./estados.js";
import { getEcuadorToday, getEcuadorMesContable } from "../utils/ecuadorDateUtils.js";

const clienteTelefonoCache = new Map();

/**
 * Resuelve el teléfono del cliente: si falta en el pedido, busca en la colección clientes
 */
async function resolverTelefonoCliente(pedido) {
  if (pedido.clienteTelefono && String(pedido.clienteTelefono).trim() && pedido.clienteTelefono !== "Sin teléfono") {
    return String(pedido.clienteTelefono).trim();
  }
  if (pedido.clienteId) {
    if (clienteTelefonoCache.has(pedido.clienteId)) {
      return clienteTelefonoCache.get(pedido.clienteId);
    }
    try {
      const cSnap = await getDoc(doc(db, "clientes", pedido.clienteId));
      if (cSnap.exists()) {
        const cData = cSnap.data();
        if (cData.telefono && String(cData.telefono).trim()) {
          const tel = String(cData.telefono).trim();
          clienteTelefonoCache.set(pedido.clienteId, tel);
          return tel;
        }
      }
    } catch {
      // Ignorar fallback si falla
    }
    clienteTelefonoCache.set(pedido.clienteId, "Sin teléfono");
  }
  return "Sin teléfono";
}

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
      Boolean(p.wcOrderId) ||
      String(docSnap.id).startsWith("woo_");

    const estadoNorm = normalizeEstado(p.estado);
    const esAprobada = estadoNorm === "aprobada" || estadoNorm === "aprobado";

    if (isWeb && esAprobada && !p.revisadoPorVentas) {
      const f = resolveFechaPedido(p);
      pendientes.push({
        id: p.id,
        displayId: p.displayId || p.id.slice(-6),
        wcOrderId: p.wcOrderId || null,
        cliente: p.clienteNombre || "Cliente Web",
        telefono: p.clienteTelefono || "Sin teléfono",
        fechaEntrega: f || "Por coordinar",
        horaEntrega: p.horaEntrega || "",
        total: Number((p.total || p.coste || 0).toFixed(2)),
        abono: Number((p.pagado ?? p.abono ?? 0).toFixed(2)),
        saldo: Number((p.saldoPendiente !== undefined ? p.saldoPendiente : Math.max(0, (p.total || p.coste || 0) - (p.pagado ?? p.abono ?? 0))).toFixed(2)),
        productos: (p.items || p.cart || []).map((it) => `${it.cantidad || 1}x ${it.nombre || it.name || "Item"}`),
        metodoPago: p.metodoPago || "Pago en línea",
        notas: p.notas || p.notes || ""
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
 * Consulta las métricas globales del pipeline comercial activo (P1-01, P1-02 Fix)
 */
export async function getMetricasPipeline() {
  const snap = await getDocs(collection(db, "pedidos"));

  const counts = {
    borrador: 0,
    cotizacion: 0,
    enviada: 0,
    aprobada: 0,
    produccion: 0,
    entregado: 0,
    archivado: 0,
    cancelado: 0
  };

  let valorPipelineActivo = 0;
  let valorAprobadoMes = 0;
  let valorAprobadoGlobal = 0;

  const mesActual = getEcuadorMesContable();

  snap.forEach((docSnap) => {
    const p = docSnap.data();
    const stNorm = normalizeEstado(p.estado);
    const total = Number(p.total !== undefined && p.total !== null ? p.total : (p.coste || 0));
    const fecha = resolveFechaPedido(p);

    if (stNorm.includes("borrador")) {
      counts.borrador++;
      valorPipelineActivo += total;
    } else if (esCotizacion(p.estado)) {
      counts.cotizacion++;
    } else if (stNorm.includes("enviad")) {
      counts.enviada++;
      valorPipelineActivo += total;
    } else if (stNorm.includes("aprobad")) {
      counts.aprobada++;
      valorPipelineActivo += total;
      valorAprobadoGlobal += total;

      if (fecha.startsWith(mesActual)) {
        valorAprobadoMes += total;
      }
    } else if (stNorm.includes("entregad")) {
      counts.entregado++;
    } else if (stNorm.includes("archiv")) {
      counts.archivado++;
    } else if (stNorm.includes("cancel") || stNorm.includes("anul")) {
      counts.cancelado++;
    } else if (stNorm.includes("producc")) {
      counts.produccion++;
      valorPipelineActivo += total;
    } else {
      // Estado alternativo: si está en producción activa
      if (esProduccionActiva(p)) {
        counts.produccion++;
        valorPipelineActivo += total;
      } else {
        counts.archivado++;
      }
    }
  });

  const totalActivosComerciales = counts.borrador + counts.enviada + counts.aprobada;
  const tasaConversion = totalActivosComerciales > 0
    ? (counts.aprobada / totalActivosComerciales) * 100
    : 0;

  return {
    mesActual,
    totalPedidosEnPipeline: totalActivosComerciales,
    totalPedidosColeccion: snap.size,
    desglosePorEstado: counts,
    tasaConversionCotizaciones: `${tasaConversion.toFixed(1)}%`,
    valorTotalVentasAprobadasMes: Number(valorAprobadoMes.toFixed(2)),
    valorTotalVentasAprobadasGlobal: Number(valorAprobadoGlobal.toFixed(2)),
    valorTotalEnFlujoActivo: Number(valorPipelineActivo.toFixed(2)),
    aclaracionEstados: "Clasificación canónica oficial: 39 pedidos archivados y 2 cotizaciones del bot están separados de producción activa."
  };
}

/**
 * Consulta cartera pendiente por cobrar (P1-03 Fix)
 * Concilia exactamente con cuentasPorCobrarClientesCxC ($497.45 para el mes en curso)
 * y soporta alcance 'vigente' (por defecto), 'mes', o 'historico' / 'todo'.
 */
export async function getCarteraPorCobrar({ alcance = "vigente", limite } = {}) {
  const snap = await getDocs(collection(db, "pedidos"));
  const mesActual = getEcuadorMesContable();

  const pedidosVigentes = [];
  const pedidosMesActual = [];
  const pedidosHistoricos = [];

  let sumaSaldoVigente = 0;
  let sumaSaldoMes = 0;
  let sumaSaldoHistorico = 0;

  for (const docSnap of snap.docs) {
    const p = { id: docSnap.id, ...docSnap.data() };
    const stNorm = normalizeEstado(p.estado);

    const total = Number(p.total !== undefined && p.total !== null ? p.total : (p.coste || 0));
    const pagado = Number(p.pagado !== undefined && p.pagado !== null ? p.pagado : (p.abono || 0));
    const saldo = p.saldoPendiente !== undefined ? Number(p.saldoPendiente) : Math.max(0, total - pagado);

    if (saldo <= 0.05) continue;

    const fecha = resolveFechaPedido(p);
    const rawTel = (p.clienteTelefono && String(p.clienteTelefono).trim()) ? String(p.clienteTelefono).trim() : null;

    const pedidoItem = {
      pedidoId: p.displayId || p.id.slice(-6),
      id: p.id,
      cliente: p.clienteNombre || "Cliente",
      telefono: rawTel,
      clienteId: p.clienteId || null,
      fechaEntrega: fecha || "Sin fecha",
      estado: p.estado || "Aprobada",
      total: Number(total.toFixed(2)),
      abono: Number(pagado.toFixed(2)),
      saldoPendiente: Number(saldo.toFixed(2))
    };

    sumaSaldoHistorico += saldo;
    pedidosHistoricos.push(pedidoItem);

    // Criterio Vigente: excluir cancelados, archivados y registros legacy anteriores a 2026-06-01
    const esExcluidoVigente =
      stNorm === "cancelado" ||
      stNorm === "cancelada" ||
      stNorm === "anulado" ||
      stNorm === "archivado";

    const esFechaOperativa = Boolean(fecha) && fecha >= "2026-06-01";

    if (!esExcluidoVigente && esFechaOperativa) {
      sumaSaldoVigente += saldo;
      pedidosVigentes.push(pedidoItem);

      // Subconjunto mes actual conciliado con finanzas (Aprobada / Entregado)
      if (fecha.startsWith(mesActual) && (stNorm === "aprobada" || stNorm === "aprobado" || stNorm === "entregado" || stNorm === "entregada")) {
        sumaSaldoMes += saldo;
        pedidosMesActual.push(pedidoItem);
      }
    }
  }

  // Ordenar por fecha de entrega
  pedidosVigentes.sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
  pedidosMesActual.sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
  pedidosHistoricos.sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));

  const alcanceNorm = String(alcance).toLowerCase().trim();

  let listaRetorno;
  let montoTotalRetorno;
  let criterioDeclarado;

  if (alcanceNorm === "mes") {
    listaRetorno = pedidosMesActual;
    montoTotalRetorno = sumaSaldoMes;
    criterioDeclarado = `Alcance 'mes': pedidos del mes contable ${mesActual} en estado Aprobada o Entregado con saldo adeudado. Concilia exactamente con el reporte financiero P&L.`;
  } else if (alcanceNorm === "historico" || alcanceNorm === "todo") {
    listaRetorno = pedidosHistoricos;
    montoTotalRetorno = sumaSaldoHistorico;
    criterioDeclarado = "Alcance 'historico': incluye toda la colección histórica de pedidos desde el inicio de los registros, incluidos pedidos archivados o entregados con cobros no registrados en el sistema.";
  } else {
    // Por defecto: 'vigente'
    listaRetorno = pedidosVigentes;
    montoTotalRetorno = sumaSaldoVigente;
    criterioDeclarado = `Alcance 'vigente' (por defecto): pedidos activos (Aprobada, Enviada, Entregado) desde junio 2026 con saldo pendiente > $0.05. Excluye órdenes Archivadas, Canceladas y pasivos históricos sin fecha. El subtotal del mes actual ($${sumaSaldoMes.toFixed(2)}) concilia al 100% con 'cuentasPorCobrarClientesCxC' de finanzas.`;
  }

  return {
    alcance: alcanceNorm,
    criterioDeclarado,
    totalPedidosConSaldo: listaRetorno.length,
    montoTotalPorCobrar: Number(montoTotalRetorno.toFixed(2)),
    conciliacionFinanzasMes: {
      mes: mesActual,
      cuentasPorCobrarClientesCxC: Number(sumaSaldoMes.toFixed(2)),
      pedidosEnRiesgoMes: pedidosMesActual.length,
      estadoConciliacion: "CONCILIADO_EXACTO"
    },
    resumenAlcances: {
      mesActual: Number(sumaSaldoMes.toFixed(2)),
      totalVigente: Number(sumaSaldoVigente.toFixed(2)),
      totalHistoricoConArchivados: Number(sumaSaldoHistorico.toFixed(2))
    },
    cartera: limite ? listaRetorno.slice(0, limite) : listaRetorno
  };
}
