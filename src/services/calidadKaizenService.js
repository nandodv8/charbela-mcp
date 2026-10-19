// crm-charbela/mcp-server/src/services/calidadKaizenService.js
// Servicio MCP para Calidad, Bitácora de Errores y Mejora Continua Kaizen

import { db } from "../firebase.js";
import { collection, getDocs, query, orderBy, limit as firestoreLimit } from "firebase/firestore";

/**
 * Consulta la bitácora de errores, incidencias y mejoras Kaizen registradas en Obrador
 */
export async function getBitacoraKaizen(args = {}) {
  const maxLimit = Math.min(args.limite || 20, 50);

  const q = query(
    collection(db, "bitacora_errores"),
    orderBy("fecha", "desc"),
    firestoreLimit(maxLimit)
  );

  const snap = await getDocs(q);
  const registros = [];

  snap.forEach((docSnap) => {
    const d = { id: docSnap.id, ...docSnap.data() };
    if (args.proceso && (d.procesoCodigo || "").toLowerCase() !== args.proceso.toLowerCase()) {
      return;
    }

    registros.push({
      id: d.id,
      fecha: d.fecha || "Sin fecha",
      proceso: d.procesoCodigo || "General",
      descripcionIncidencia: d.descripcion || "Sin detalle",
      accionTomada: d.accionTomada || "En seguimiento",
      registradoPor: d.registradoPor || "Obrador",
      severidad: d.severidad || "Media",
      resuelto: d.resuelto !== false
    });
  });

  return {
    totalIncidenciasRegistradas: registros.length,
    incidencias: registros
  };
}
