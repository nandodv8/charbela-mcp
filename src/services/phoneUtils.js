// mcp-charbela/src/services/phoneUtils.js
// Normalización de teléfonos a E.164 (Ecuador) e hidratación desde la colección `clientes`.
//
// Contexto: los docs de `pedidos` NO guardan `clienteTelefono` (solo `clienteId` y
// `clienteNombre`). El teléfono vive en `clientes/{clienteId}.telefono`. Sin esta
// hidratación, todos los links de WhatsApp salen en null.

import { db } from "../firebase.js";
import { doc, getDoc } from "firebase/firestore";

// Móvil EC: 593 + 9 + 8 dígitos  |  Fijo EC: 593 + área (2-7) + 7 dígitos
const EC_MOVIL = /^5939\d{8}$/;
const EC_FIJO = /^593[2-7]\d{7}$/;

/**
 * Normaliza cualquier formato local a E.164 sin "+" (listo para wa.me).
 * "0959288573" -> "593959288573" | "+593 97 955 7817" -> "593979557817"
 * Devuelve null si no es un número ecuatoriano válido o es ambiguo.
 */
export function normalizeEcPhone(raw) {
  if (!raw) return null;
  const crudo = String(raw).trim();
  let d = crudo.replace(/\D/g, "");
  if (!d) return null;

  // Un "+" o "00" explícito significa que el número ya trae código de país.
  const traeCodigoPais = crudo.startsWith("+") || d.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);

  // Internacional no ecuatoriano (clientes en el exterior): se respeta tal cual.
  if (traeCodigoPais && !d.startsWith("593")) {
    return d.length >= 10 && d.length <= 15 ? d : null;
  }

  if (d.startsWith("593")) {
    d = "593" + d.slice(3).replace(/^0+/, "");
  } else if (d.startsWith("0")) {
    d = "593" + d.replace(/^0+/, "");
  } else if (d.length === 9 && d.startsWith("9")) {
    d = "593" + d;
  } else if (d.length <= 8) {
    return null; // sin prefijo ni código de área: no se puede inferir
  }

  return EC_MOVIL.test(d) || EC_FIJO.test(d) ? d : null;
}

/**
 * Construye el link de WhatsApp. Devuelve null si el teléfono no es utilizable.
 */
export function buildWaLink(raw, mensaje) {
  const e164 = normalizeEcPhone(raw);
  if (!e164) return null;
  return `https://wa.me/${e164}?text=${encodeURIComponent(mensaje)}`;
}

// Caché en memoria para no releer el mismo cliente en cada tool del proceso.
const cacheClientes = new Map(); // clienteId -> { telefono, ts }
const TTL_MS = 5 * 60 * 1000;

export async function getClientePhone(clienteId) {
  if (!clienteId) return null;
  const hit = cacheClientes.get(clienteId);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.telefono;

  try {
    const snap = await getDoc(doc(db, "clientes", clienteId));
    const telefono = snap.exists() ? snap.data().telefono || null : null;
    cacheClientes.set(clienteId, { telefono, ts: Date.now() });
    return telefono;
  } catch {
    return null; // un fallo de lectura no debe romper el reporte completo
  }
}

/**
 * Resuelve el teléfono de una lista de pedidos en un solo lote.
 * Prioriza el campo del pedido (si algún día se denormaliza) y cae a `clientes`.
 * @returns {Promise<Map<string, string>>} orderId -> teléfono (string, "" si no hay)
 */
export async function resolvePhonesForOrders(pedidos = []) {
  const faltantes = [
    ...new Set(
      pedidos
        .filter((p) => !p.clienteTelefono && p.clienteId)
        .map((p) => p.clienteId)
    )
  ];

  const pares = await Promise.all(
    faltantes.map(async (id) => [id, await getClientePhone(id)])
  );
  const porCliente = new Map(pares);

  const porPedido = new Map();
  for (const p of pedidos) {
    porPedido.set(
      p.id,
      p.clienteTelefono || porCliente.get(p.clienteId) || ""
    );
  }
  return porPedido;
}
