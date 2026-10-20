// crm-charbela/mcp-server/src/services/storageUploadService.js
// Servicio Centralizado de Almacenamiento y Adjuntos para Charbela CRM
// Soporta fotos de diseños (globales y por ítem), comprobantes de pago, capturas de bugs y gastos

import { storage } from "../firebase.js";
import { ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Detecta el tipo MIME y la extensión a partir de bytes mágicos en base64
 */
function inferMimeFromBase64(cleanBase64 = "") {
  if (cleanBase64.startsWith("iVBORw0KGgo")) {
    return { mime: "image/png", ext: "png" };
  }
  if (cleanBase64.startsWith("/9j/")) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (cleanBase64.startsWith("UklGR")) {
    return { mime: "image/webp", ext: "webp" };
  }
  if (cleanBase64.startsWith("JVBER")) {
    return { mime: "application/pdf", ext: "pdf" };
  }
  if (cleanBase64.startsWith("R0lGOD")) {
    return { mime: "image/gif", ext: "gif" };
  }
  return { mime: "image/jpeg", ext: "jpg" };
}

/**
 * Normaliza y sube un archivo (Base64 o URL externa) a Firebase Storage
 *
 * @param {Object} params
 * @param {string} [params.base64] - Cadena base64 o Data URL (ej. data:image/png;base64,...)
 * @param {string} [params.url] - URL pública o externa
 * @param {string} params.folder - Carpeta destino ('pedidos/disenos', 'pedidos/comprobantes', 'vibe_feedback_screenshots', 'gastos')
 * @param {string} [params.prefix] - Prefijo opcional para el nombre del archivo (ej. orderId, gastoId)
 * @param {string} [params.filename] - Nombre de archivo personalizado opcional
 * @returns {Promise<{ downloadUrl: string, storagePath: string, contentType: string }>}
 */
export async function uploadAttachmentToStorage({
  base64,
  url,
  folder = "pedidos/disenos",
  prefix = "",
  filename = ""
}) {
  // 1. Si no hay ni base64 ni url, lanzar error
  if (!base64 && !url) {
    throw new Error("Debes proporcionar una imagen en base64 o una URL válida.");
  }

  // 2. Si se proporcionó una URL directa:
  if (url && !base64) {
    const trimmedUrl = String(url).trim();
    // Si ya está alojada en el storage de Charbela, retornarla directamente
    if (trimmedUrl.includes("charbela-crm.firebasestorage.app") || trimmedUrl.includes("firebasestorage.googleapis.com")) {
      return {
        downloadUrl: trimmedUrl,
        storagePath: "",
        contentType: "image/*"
      };
    }

    // Si es una URL web externa, descargarla y guardarla en nuestro bucket para persistencia
    try {
      const response = await fetch(trimmedUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP al descargar imagen externa: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const mime = response.headers.get("content-type") || "image/jpeg";
      const ext = mime.includes("png") ? "png" : (mime.includes("webp") ? "webp" : (mime.includes("pdf") ? "pdf" : "jpg"));

      const timestamp = Date.now();
      const safePrefix = prefix ? `${prefix}_` : "";
      const safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, "_") : `adjunto_${timestamp}.${ext}`;
      const storagePath = `${folder}/${safePrefix}${safeName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, buffer, { contentType: mime });
      const downloadUrl = await getDownloadURL(storageRef);

      return {
        downloadUrl,
        storagePath,
        contentType: mime
      };
    } catch (fetchErr) {
      // Si falla la descarga externa, devolver la URL original como fallback
      console.warn(`[storageUploadService] No se pudo clonar la URL externa a Storage, se usa directamente: ${fetchErr.message}`);
      return {
        downloadUrl: trimmedUrl,
        storagePath: "",
        contentType: "image/*"
      };
    }
  }

  // 3. Si se proporcionó Base64:
  let rawData = String(base64).trim();
  let mimeType = "image/jpeg";
  let extension = "jpg";

  if (rawData.startsWith("data:")) {
    const commaIndex = rawData.indexOf(",");
    if (commaIndex !== -1) {
      const meta = rawData.substring(0, commaIndex);
      const mimeMatch = meta.match(/data:([^;]+);base64/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
        extension = mimeType.split("/")[1] || "jpg";
        if (extension === "jpeg") extension = "jpg";
      }
    }
  } else {
    // Es base64 puro sin encabezado data:
    const inferred = inferMimeFromBase64(rawData);
    mimeType = inferred.mime;
    extension = inferred.ext;
    rawData = `data:${mimeType};base64,${rawData}`;
  }

  const timestamp = Date.now();
  const safePrefix = prefix ? `${prefix}_` : "";
  const safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, "_") : `${timestamp}.${extension}`;
  const storagePath = `${folder}/${safePrefix}${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadString(storageRef, rawData, "data_url");
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    downloadUrl,
    storagePath,
    contentType: mimeType
  };
}
