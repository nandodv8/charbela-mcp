// mcp-charbela/src/services/pedidosRepo.js
// Lectura de la colección `pedidos` sin ventanas arbitrarias.
//
// Antes cada tool leía con limit(100-150) y orderBy("fechaEnvio"), lo que
// devolvía solo los pedidos más antiguos (o más nuevos) y producía totales
// falsos. La colección es chica (~284 docs), así que se lee completa y se
// ordena/filtra en memoria.

import { db } from "../firebase.js";
import { collection, getDocs } from "firebase/firestore";

/** A partir de este volumen conviene migrar a paginación o filtro por rango. */
const UMBRAL_PAGINACION = 2000;

export async function fetchAllPedidos() {
  const snap = await getDocs(collection(db, "pedidos"));
  const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (pedidos.length > UMBRAL_PAGINACION) {
    console.error(
      `[mcp-charbela] ${pedidos.length} pedidos leídos de una sola vez. ` +
        `Conviene paginar o filtrar por rango de fechas en el servidor.`
    );
  }
  return pedidos;
}

export async function fetchAllClientes() {
  const snap = await getDocs(collection(db, "clientes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Ordena por fecha de entrega usando el normalizador de fechas de cada servicio.
 * Los pedidos sin fecha quedan al final.
 */
export function sortByFecha(pedidos, toDateStr, dir = "desc") {
  const sinFecha = dir === "desc" ? "" : "9999-99-99";
  return [...pedidos].sort((a, b) => {
    const fa = toDateStr(a.fechaEnvio || a.createdAt) || sinFecha;
    const fb = toDateStr(b.fechaEnvio || b.createdAt) || sinFecha;
    return dir === "desc" ? fb.localeCompare(fa) : fa.localeCompare(fb);
  });
}
