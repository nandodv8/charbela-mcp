// mcp-charbela/src/services/estados.js
// Normalización y clasificación canónica de estados de pedido en Charbela CRM.
//
// Los estados reales en Firestore vienen capitalizados y acentuados
// ("Entregado", "Aprobada", "Archivado", "Cotización Cliente Bot", "Borrador", "Enviada"),
// por lo que cualquier comparación debe ser case-insensitive y tolerante a tildes.

/** Estados canónicos oficiales */
export const ESTADOS = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  APROBADA: "Aprobada",
  PRODUCCION: "En Producción",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Entregado",
  ARCHIVADO: "Archivado",
  CANCELADO: "Cancelado"
};

/** Normaliza un string removiendo espacios, mayúsculas y acentos diacríticos */
export function normalizeEstado(estado) {
  if (!estado) return "";
  return String(estado)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Obtiene la fecha representativa del pedido (fechaEnvio > fechaEntrega > fecha > createdAt) */
export function resolveFechaPedido(p) {
  if (!p) return "";
  const f = p.fechaEnvio || p.fechaEntrega || p.fecha || p.fechaAprobacion || p.createdAt;
  if (!f) return "";
  if (typeof f === "object" && typeof f.toDate === "function") {
    return f.toDate().toISOString().slice(0, 10);
  }
  const s = String(f).trim();
  if (s.includes("T")) return s.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/** Verifica si un pedido está en el flujo activo de producción del taller */
export function esProduccionActiva(p) {
  if (!p) return false;
  const est = normalizeEstado(p.estado);
  if (est === "cancelado" || est === "cancelada" || est === "archivado" || est === "anulado") {
    return false;
  }

  const pagado = Number(p.pagado ?? p.abono ?? 0);
  const total = Number(p.total ?? p.coste ?? 0);
  const saldo = p.saldoPendiente !== undefined ? Number(p.saldoPendiente) : Math.max(0, total - pagado);

  // 1. Estados aprobados o en producción
  if (est === "aprobada" || est === "aprobado" || est === "en produccion" || est === "produccion" || est === "confirmado") {
    return true;
  }

  // 2. Pedidos en Borrador pero ya cobrados (ej. woo_31011)
  if (est === "borrador" && (saldo <= 0.05 || pagado > 0)) {
    return true;
  }

  // 3. Status de producción a nivel de ítem o cabecera
  const stProd = normalizeEstado(p.statusProduccion);
  if (stProd === "programado" || stProd === "en proceso" || stProd === "horneado") {
    return true;
  }

  return false;
}

/** Lista blanca: estados que representan venta confirmada */
export function esVentaConfirmada(estado) {
  const n = normalizeEstado(estado);
  return n === "aprobada" || n === "aprobado" || n === "en produccion" || n === "produccion" || n === "entregado" || n === "entregada";
}

/** Estados que representan cartera real cobrable */
export const ESTADOS_COBRABLES = ["aprobada", "aprobado", "enviada", "entregado", "entregada", "en produccion", "produccion"];

export function esCobrable(estado) {
  return ESTADOS_COBRABLES.includes(normalizeEstado(estado));
}

export function esCotizacion(estado) {
  const n = normalizeEstado(estado);
  return n.startsWith("cotizacion");
}

export function esNoVenta(estado) {
  const n = normalizeEstado(estado);
  return n === "archivado" || n === "cancelado" || n === "cancelada" || n === "anulado" || n === "borrador" || esCotizacion(estado);
}

/** Comparación tolerante para filtros */
export function coincideEstado(pedidoOrEstado, filtro) {
  if (!filtro) return true;
  const p = typeof pedidoOrEstado === "object" && pedidoOrEstado !== null ? pedidoOrEstado : { estado: pedidoOrEstado };
  const estadoPedido = p.estado;
  const normFiltro = normalizeEstado(filtro);
  const normPedido = normalizeEstado(estadoPedido);

  if (normFiltro === normPedido) return true;

  // Tolerancia semántica para "producción"
  if (normFiltro === "produccion" || normFiltro === "en produccion") {
    if (typeof pedidoOrEstado === "object") {
      return esProduccionActiva(p);
    }
    return normPedido === "aprobada" || normPedido === "aprobado" || normPedido === "en produccion" || normPedido === "produccion";
  }

  // Tolerancia para "aprobada" / "aprobado"
  if (normFiltro === "aprobada" || normFiltro === "aprobado") {
    return normPedido === "aprobada" || normPedido === "aprobado";
  }

  // Tolerancia para "entregado" / "entregada"
  if (normFiltro === "entregado" || normFiltro === "entregada") {
    return normPedido === "entregado" || normPedido === "entregada";
  }

  // Tolerancia para cotizaciones
  if (normFiltro.startsWith("cotizac")) {
    return esCotizacion(estadoPedido);
  }

  // Tolerancia para borradores
  if (normFiltro === "borrador" || normFiltro === "borradores") {
    return normPedido === "borrador";
  }

  // Tolerancia para archivados
  if (normFiltro === "archivado" || normFiltro === "archivados") {
    return normPedido === "archivado";
  }

  return normPedido.includes(normFiltro);
}
