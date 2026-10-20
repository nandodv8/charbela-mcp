// crm-charbela/mcp-server/src/services/feedbackMejorasService.js
// Servicio MCP para Receptación y Gestión de Bugs, Mejoras, Adecuaciones y Deep-Linking en Charbela CRM

import { db } from "../firebase.js";
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { uploadAttachmentToStorage } from "./storageUploadService.js";

const CRM_BASE_URL = process.env.CRM_PUBLIC_URL || "https://crm.charbelapasteleria.com";

/**
 * Genera enlaces directos a las distintas vistas y módulos de Charbela CRM
 */
export function buildCrmLink(modulo, id = "") {
  const base = CRM_BASE_URL.replace(/\/$/, "");
  switch (modulo?.toLowerCase()) {
    case "portal_cliente":
    case "cotizacion":
      return id ? `${base}/c/${id}` : `${base}/tienda`;
    case "portal_feedback":
      return id ? `${base}/c/${id}/feedback` : base;
    case "ventas":
    case "pedidos":
      return id ? `${base}/ventas?orderId=${id}` : `${base}/ventas`;
    case "obrador":
    case "produccion":
      return id ? `${base}/produccion?orderId=${id}` : `${base}/produccion`;
    case "nomina":
    case "personal":
      return `${base}/nomina`;
    case "finanzas":
    case "gastos":
      return `${base}/finanzas`;
    case "calidad":
    case "recetas":
      return `${base}/calidad`;
    case "clientes":
      return `${base}/clientes`;
    case "dashboard":
      return `${base}/dashboard`;
    case "admin":
      return `${base}/admin`;
    default:
      return id ? `${base}/ventas?search=${id}` : base;
  }
}

/**
 * Registra un reporte de Bug, Mejora, Adecuación o Pulido en la colección `vibe_feedback`
 */
export async function reportarMejoraOBug(args) {
  const {
    tipo = "Mejora", // 'Bug' | 'Mejora' | 'Adecuacion' | 'Pulido' | 'Idea'
    titulo = "",
    descripcion = "",
    modulo = "General", // 'Ventas' | 'Obrador' | 'Personal' | 'Finanzas' | 'Calidad' | 'Catálogo' | 'General'
    gravedad = "Medio", // 'Bloqueante' | 'Alto' | 'Medio' | 'Leve'
    orderId = "",
    displayId = "",
    clienteNombre = "",
    reportadoPor = "Agente Claude / Charbela MCP",
    capturaBase64 = null,
    capturaUrl = null
  } = args;

  const descCompleta = titulo ? `[${titulo}]\n${descripcion}` : descripcion;

  let screenshotUrl = "";
  if (capturaBase64 || capturaUrl) {
    try {
      const uploadRes = await uploadAttachmentToStorage({
        base64: capturaBase64,
        url: capturaUrl,
        folder: "vibe_feedback_screenshots",
        prefix: `bug_${modulo.toLowerCase()}`
      });
      screenshotUrl = uploadRes.downloadUrl;
    } catch (err) {
      console.warn("No se pudo subir la captura de feedback:", err.message);
    }
  }

  const docData = {
    tipo,
    gravedad,
    modulo,
    orderId: orderId || "",
    displayId: displayId || "",
    clienteNombre: clienteNombre || "",
    descripcion: descCompleta,
    screenshotUrl: screenshotUrl || "",
    userEmail: reportadoPor,
    estado: "Pendiente", // 'Pendiente' | 'En Proceso' | 'Resuelto' | 'Archivado'
    resolucion: "",
    comoVerificar: "",
    origen: "MCP",
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "vibe_feedback"), docData);
  const linkModulo = buildCrmLink(modulo.toLowerCase(), orderId);

  return {
    success: true,
    feedbackId: docRef.id,
    mensaje: `Se ha registrado el ítem de ${tipo} exitosamente en la sección de Mejoras y Feedback del CRM.${screenshotUrl ? ' Se adjuntó la captura de pantalla.' : ''}`,
    estado: "Pendiente",
    modulo,
    gravedad,
    capturaUrl: screenshotUrl || null,
    enlaceCrm: linkModulo
  };
}

/**
 * Adjunta una captura de pantalla a un reporte existente de mejora o bug
 */
export async function adjuntarCapturaMejoraBug({ feedbackId, capturaBase64, capturaUrl }) {
  if (!feedbackId || !String(feedbackId).trim()) {
    throw new Error("Debes indicar el ID del reporte de feedback.");
  }
  if (!capturaBase64 && !capturaUrl) {
    throw new Error("Debes proporcionar la captura en Base64 o URL.");
  }

  const cleanId = String(feedbackId).trim();
  const docRef = doc(db, "vibe_feedback", cleanId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`No se encontró el reporte con ID "${cleanId}".`);
  }

  const uploadRes = await uploadAttachmentToStorage({
    base64: capturaBase64,
    url: capturaUrl,
    folder: "vibe_feedback_screenshots",
    prefix: `bug_${cleanId.substring(0, 6)}`
  });

  await updateDoc(docRef, {
    screenshotUrl: uploadRes.downloadUrl,
    updatedAt: new Date().toISOString()
  });

  const data = snap.data();
  const linkModulo = buildCrmLink((data.modulo || "general").toLowerCase(), data.orderId || "");

  return {
    success: true,
    feedbackId: cleanId,
    screenshotUrl: uploadRes.downloadUrl,
    enlaceCrm: linkModulo,
    mensaje: `📸 Captura de pantalla adjuntada exitosamente al reporte #${cleanId}.`
  };
}

/**
 * Consulta la lista de mejoras, bugs y adecuaciones pendientes o en proceso
 */
export async function consultarMejorasYBugs(args = {}) {
  const maxLimit = Math.min(args.limite || 20, 50);
  const snap = await getDocs(collection(db, "vibe_feedback"));
  const items = [];

  snap.forEach((docSnap) => {
    const d = { id: docSnap.id, ...docSnap.data() };

    // Filtro de estado ('Pendiente', 'En Proceso', 'Resuelto', o 'Todos')
    const filtroEstado = args.estado || "Pendiente";
    if (filtroEstado !== "Todos" && d.estado !== filtroEstado) {
      return;
    }

    // Filtro por módulo
    if (args.modulo && d.modulo && d.modulo.toLowerCase() !== args.modulo.toLowerCase()) {
      return;
    }

    // Filtro por tipo ('Bug', 'Mejora', etc.)
    if (args.tipo && d.tipo && d.tipo.toLowerCase() !== args.tipo.toLowerCase()) {
      return;
    }

    items.push({
      id: d.id,
      tipo: d.tipo || "Mejora",
      gravedad: d.gravedad || "Medio",
      modulo: d.modulo || "General",
      estado: d.estado || "Pendiente",
      descripcion: d.descripcion || "",
      orderId: d.orderId || null,
      reportadoPor: d.userEmail || "Anónimo",
      createdAt: d.createdAt,
      enlaceCrm: buildCrmLink(d.modulo, d.orderId)
    });
  });

  // Ordenar los más recientes primero
  items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return {
    totalEncontrados: items.length,
    filtroEstado: args.estado || "Pendiente",
    filtroModulo: args.modulo || "Todos",
    items: items.slice(0, maxLimit)
  };
}

/**
 * Actualiza el estado de una mejora o bug (ej. marcar como 'En Proceso', 'Resuelto')
 */
export async function actualizarEstadoMejoraBug(args) {
  const { feedbackId, nuevoEstado, resolucion, comoVerificar } = args;

  if (!feedbackId) throw new Error("Falta feedbackId");
  if (!nuevoEstado) throw new Error("Falta nuevoEstado");

  const ref = doc(db, "vibe_feedback", feedbackId);
  const payload = {
    estado: nuevoEstado,
    updatedAt: new Date().toISOString()
  };

  if (resolucion) payload.resolucion = resolucion;
  if (comoVerificar) payload.comoVerificar = comoVerificar;
  if (nuevoEstado === "Resuelto") payload.resolvedAt = new Date().toISOString();

  await updateDoc(ref, payload);

  return {
    success: true,
    feedbackId,
    nuevoEstado,
    mensaje: `Ítem ${feedbackId} actualizado a estado '${nuevoEstado}' correctamente.`
  };
}

/**
 * Herramienta para generar y resolver enlaces profundos del CRM
 */
export function generarEnlaceCrm(args) {
  const { modulo, id = "" } = args;
  const url = buildCrmLink(modulo, id);

  return {
    modulo,
    id: id || null,
    enlaceCrm: url,
    mensaje: `Enlace generado para abrir directamente ${modulo} en Charbela CRM: ${url}`
  };
}
