// mcp-charbela/src/services/estados.js
// Normalización y clasificación de estados de pedido.
//
// Los estados reales en Firestore vienen capitalizados y acentuados
// ("Entregado", "Aprobada", "Archivado", "Cotización Cliente Bot"), por lo que
// cualquier comparación debe ser case-insensitive. Estados observados en la base
// a 2026-10-12: Entregado, Archivado, Aprobada, Cancelado, Enviada, Borrador,
// Cotización Cliente Bot, Cotización Cliente Bot V2.

/** Estados que representan una venta en firme: lo único que es cartera real. */
export const ESTADOS_COBRABLES = ["aprobada", "enviada", "entregado"];

/** Estados que NO son venta (cotizaciones muertas, descartes, borradores). */
export const ESTADOS_NO_VENTA = [
  "archivado",
  "cancelado",
  "anulado",
  "borrador"
];

export function normalizeEstado(estado) {
  return String(estado || "").trim().toLowerCase();
}

/** Lista blanca: solo estos estados entran a cuentas por cobrar. */
export function esCobrable(estado) {
  return ESTADOS_COBRABLES.includes(normalizeEstado(estado));
}

export function esCotizacion(estado) {
  const n = normalizeEstado(estado);
  return n.startsWith("cotizacion") || n.startsWith("cotización");
}

export function esNoVenta(estado) {
  return ESTADOS_NO_VENTA.includes(normalizeEstado(estado)) || esCotizacion(estado);
}

/** Comparación tolerante para filtros que llegan desde el agente. */
export function coincideEstado(estadoPedido, filtro) {
  if (!filtro) return true;
  return normalizeEstado(estadoPedido) === normalizeEstado(filtro);
}
