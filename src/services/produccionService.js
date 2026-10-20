// crm-charbela/mcp-server/src/services/produccionService.js
// Servicio MCP para Obrador & Producción de Charbela Pastelería
// Jerarquía oficial: 1.1 Bocaditos Tradicionales, 1.2 Bocaditos Decorados, 1.3 Dulces Decorados, 1.4 Masas de Tortas

import { db } from "../firebase.js";
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { resolveFechaPedido, esProduccionActiva } from "./estados.js";
import { normalizeEcuadorDate } from "../utils/ecuadorDateUtils.js";

/**
 * Normaliza y clasifica un ítem de producción en las 4 familias oficiales del Obrador
 */
export function clasificarItemObrador(item, descripcionCompleta = "") {
  const desc = (descripcionCompleta || item.descripcion || item.nombre || item.productoNombre || "").toLowerCase();
  const cat = (item.categoria || "").toLowerCase();
  const subcat = (item.subcategoria || "").toLowerCase();

  // 1.2 Bocaditos Decorados (bocaditos con decoración especial o religiosos)
  if (
    (desc.includes("bocadito") || desc.includes("bocaditos") || cat.includes("bocadito")) &&
    (desc.includes("decorad") || desc.includes("religios") || desc.includes("cruz") || desc.includes("paloma") || desc.includes("angel") || subcat.includes("decorad"))
  ) {
    return "1.2_bocaditos_decorados";
  }

  // 1.1 Bocaditos Tradicionales (salados, dulces tradicionales, paquetes)
  if (
    desc.includes("bocadito") ||
    desc.includes("alfajor") ||
    desc.includes("empanada") ||
    desc.includes("profiterol") ||
    desc.includes("trufa") ||
    desc.includes("bolita") ||
    desc.includes("volován") ||
    desc.includes("enrollad") ||
    desc.includes("croissant") ||
    desc.includes("sandwich") ||
    desc.includes("quiche") ||
    cat.includes("bocadito")
  ) {
    return "1.1_bocaditos_tradicionales";
  }

  // 1.3 Dulces Decorados (cupcakes, galletas decoradas, cakepops, paletas, brownies decorados, minitortas)
  if (
    desc.includes("cupcake") ||
    desc.includes("cakepop") ||
    desc.includes("cake pop") ||
    desc.includes("galleta") ||
    desc.includes("paleta") ||
    desc.includes("popsickle") ||
    desc.includes("icepop") ||
    desc.includes("minitorta") ||
    desc.includes("mini torta") ||
    desc.includes("bento") ||
    desc.includes("macaron") ||
    cat.includes("dulces decorados") ||
    subcat.includes("decorada")
  ) {
    return "1.3_dulces_decorados";
  }

  // 1.4 Masas de Tortas (tortas completas, pisos, tortas personalizadas, porciones)
  return "1.4_masas_tortas";
}

/**
 * Helper para obtener las fechas de inicio y fin de una semana (Lunes a Domingo)
 */
function getWeekRange(dateStr) {
  const target = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const day = target.getDay(); // 0 es domingo
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (d) => d.toISOString().split("T")[0];
  return {
    fechaInicio: format(monday),
    fechaFin: format(sunday)
  };
}

/**
 * Obtiene la planificación semanal consolidada de producción del obrador
 */
export async function getProduccionSemanal(args = {}) {
  let { fechaInicio, fechaFin } = args;
  if (!fechaInicio || !fechaFin) {
    const range = getWeekRange(args.fechaReferencia);
    fechaInicio = range.fechaInicio;
    fechaFin = range.fechaFin;
  }

  // Consultar pedidos buscando por fechaEnvio y por fechaEntrega en paralelo para cubrir todas las variantes
  const [snapEnvio, snapEntrega] = await Promise.all([
    getDocs(query(
      collection(db, "pedidos"),
      where("fechaEnvio", ">=", fechaInicio),
      where("fechaEnvio", "<=", fechaFin)
    )),
    getDocs(query(
      collection(db, "pedidos"),
      where("fechaEntrega", ">=", fechaInicio),
      where("fechaEntrega", "<=", fechaFin)
    ))
  ]);

  const docMap = new Map();
  snapEnvio.forEach((d) => docMap.set(d.id, { id: d.id, ...d.data() }));
  snapEntrega.forEach((d) => docMap.set(d.id, { id: d.id, ...d.data() }));

  const pedidos = [];

  docMap.forEach((p) => {
    if (!esProduccionActiva(p)) return;

    const fechaReal = resolveFechaPedido(p);
    if (!fechaReal || fechaReal < fechaInicio || fechaReal > fechaFin) return;

    const est = (p.estado || "").toLowerCase();
    const pagado = Number(p.pagado ?? p.abono ?? 0);
    const total = Number(p.total ?? p.coste ?? 0);
    const saldo = p.saldoPendiente !== undefined ? Number(p.saldoPendiente) : Math.max(0, total - pagado);

    pedidos.push({
      ...p,
      fechaNormalizada: fechaReal,
      esBorradorPagado: est === "borrador" && (saldo <= 0.05 || pagado > 0),
      totalCalculado: total,
      saldoCalculado: saldo
    });
  });

  // Ordenar cronológicamente por fecha y hora
  pedidos.sort((a, b) => {
    const cmp = (a.fechaNormalizada || "").localeCompare(b.fechaNormalizada || "");
    if (cmp !== 0) return cmp;
    return (a.horaEntrega || a.hora || "23:59").localeCompare(b.horaEntrega || b.hora || "23:59");
  });

  // Estructuras de consolidación
  const resumen = {
    rangoSemana: `${fechaInicio} al ${fechaFin}`,
    totalPedidosActivos: pedidos.length,
    familias: {
      "1.1_bocaditos_tradicionales": { titulo: "1.1 Producción Bocaditos Tradicionales", items: {}, totalUnidades: 0 },
      "1.2_bocaditos_decorados": { titulo: "1.2 Producción Bocaditos Decorados", items: {}, totalUnidades: 0 },
      "1.3_dulces_decorados": { titulo: "1.3 Producción Dulces Decorados", items: {}, totalUnidades: 0 },
      "1.4_masas_tortas": { titulo: "1.4 Producción Masas de Tortas y Pisos", items: {}, totalTortas: 0 }
    },
    cronogramaPorDia: {}
  };

  pedidos.forEach((p) => {
    const dia = p.fechaNormalizada || "Sin fecha";
    if (!resumen.cronogramaPorDia[dia]) {
      resumen.cronogramaPorDia[dia] = [];
    }

    const itemsSummary = [];
    const itemsList = p.items || (p.productos ? p.productos : p.cart || []);

    itemsList.forEach((it) => {
      const cantidad = Number(it.cantidad || 1);
      const nombreItem = it.nombre || it.descripcion || it.productoNombre || "Item sin nombre";
      const detalles = it.detalles ? (typeof it.detalles === "object" ? Object.values(it.detalles).join(", ") : String(it.detalles)) : (it.sabores || it.tematica || "");
      const fullDesc = `${nombreItem} ${detalles}`.trim();
      const familia = clasificarItemObrador(it, fullDesc);

      const catFam = resumen.familias[familia];
      if (catFam) {
        if (!catFam.items[nombreItem]) {
          catFam.items[nombreItem] = { cantidadTotal: 0, detalles: new Set() };
        }
        catFam.items[nombreItem].cantidadTotal += cantidad;
        if (detalles) catFam.items[nombreItem].detalles.add(detalles);

        if (familia === "1.4_masas_tortas") {
          catFam.totalTortas += cantidad;
        } else {
          catFam.totalUnidades += cantidad;
        }
      }

      itemsSummary.push(`${cantidad}x ${nombreItem}${detalles ? ` (${detalles})` : ""}`);
    });

    const entry = {
      orderId: p.id,
      pedidoId: p.displayId || p.id.slice(-6),
      cliente: p.clienteNombre || p.cliente || "Cliente",
      hora: p.horaEntrega || p.hora || "Por coordinar",
      estado: p.estado || "Aprobada",
      total: p.totalCalculado,
      saldo: p.saldoCalculado,
      tipoEntrega: p.metodoEntrega || (p.costoDelivery ? "A Domicilio" : "Retiro en Obrador"),
      items: itemsSummary,
      notasDiseno: p.notas || p.observaciones || "",
      enlaceCrm: `https://crm.charbelapasteleria.com/produccion?orderId=${p.id}`
    };

    if (p.esBorradorPagado) {
      entry.advertencia = "⚠️ Pedido con saldo $0.00 en estado Borrador; requiere confirmación de estado administrativo en CRM.";
    }

    resumen.cronogramaPorDia[dia].push(entry);
  });

  // Limpiar Sets de detalles a Arrays para salida JSON limpia
  for (const fKey of Object.keys(resumen.familias)) {
    const fObj = resumen.familias[fKey];
    for (const iKey of Object.keys(fObj.items)) {
      fObj.items[iKey].detalles = Array.from(fObj.items[iKey].detalles);
    }
  }

  return resumen;
}

/**
 * Consulta pedidos históricos archivados o finalizados en Obrador
 */
export async function getHistoricoProduccion(args = {}) {
  const maxLimit = Math.min(args.limite || 20, 50);
  const queryText = (args.queryText || "").toLowerCase().trim();

  const q = query(
    collection(db, "pedidos"),
    orderBy("createdAt", "desc"),
    firestoreLimit(maxLimit * 2)
  );

  const snap = await getDocs(q);
  const resultados = [];

  snap.forEach((docSnap) => {
    if (resultados.length >= maxLimit) return;
    const p = { id: docSnap.id, ...docSnap.data() };
    const est = (p.estado || "").toLowerCase();

    // Solo completados, entregados o archivados
    const esHistorico = est === "entregado" || est === "entregada" || est === "archivado" || p.archivado === true;
    if (!esHistorico && !queryText) return;

    if (queryText) {
      const match =
        (p.clienteNombre || "").toLowerCase().includes(queryText) ||
        (p.displayId || "").toLowerCase().includes(queryText) ||
        (p.notas || "").toLowerCase().includes(queryText);
      if (!match) return;
    }

    resultados.push({
      orderId: p.id,
      pedidoId: p.displayId || p.id,
      cliente: p.clienteNombre || p.cliente,
      fechaEntrega: resolveFechaPedido(p),
      horaEntrega: p.horaEntrega || p.hora,
      estado: p.estado,
      total: p.total || p.coste || 0,
      saldo: p.saldoPendiente || 0,
      productos: (p.items || []).map((it) => `${it.cantidad || 1}x ${it.descripcion || it.nombre}`)
    });
  });

  return {
    totalEncontrados: resultados.length,
    pedidos: resultados
  };
}
