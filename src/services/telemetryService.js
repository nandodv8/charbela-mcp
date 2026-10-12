// mcp-charbela/src/services/telemetryService.js
// Sistema de Aprendizaje Continuo, Telemetría y Feedback (Kaizen Loop)

import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";

/**
 * Registra una llamada a tool en la bitácora de telemetría (silenciosa).
 */
export async function recordTelemetry(toolName, params, durationMs, success, error = null) {
  try {
    const cleanParams = { ...params };
    delete cleanParams.password;
    delete cleanParams.apiKey;

    await addDoc(collection(db, "mcp_telemetry"), {
      toolName,
      params: cleanParams,
      durationMs,
      success,
      error: error ? String(error) : null,
      createdAt: Timestamp.now()
    });
  } catch (err) {
    // No romper el flujo si falla el log de telemetría
    console.error("[Telemetry Error]:", err.message);
  }
}

/**
 * Guarda una regla/preferencia aprendida por el agente para recordar en futuras sesiones.
 */
export async function saveLearnedPreference({ categoria, regla, autor = "Charbela" }) {
  if (!regla || !regla.trim()) {
    throw new Error("La regla o preferencia no puede estar vacía.");
  }

  const docRef = await addDoc(collection(db, "mcp_learnings"), {
    categoria: categoria || "general",
    regla: regla.trim(),
    autor,
    activa: true,
    createdAt: Timestamp.now()
  });

  return { id: docRef.id, status: "guardada", regla: regla.trim(), categoria };
}

/**
 * Lee todas las directrices activas para nutrir el recurso MCP `crm://agent-memory/operating-rules`.
 */
export async function getOperatingRules() {
  try {
    const q = query(collection(db, "mcp_learnings"), where("activa", "==", true));
    const snap = await getDocs(q);

    if (snap.empty) {
      return (
        "# 🧠 Memoria Operativa de Charbela (Sin preferencias personalizadas aún)\n" +
        "- Formato preferido: Mostrar siempre links a pedidos y desgloses con IVA 15%.\n" +
        "- Horarios de obrador: Entregas matutinas antes de las 11:00 AM."
      );
    }

    const rules = snap.docs.map(d => d.data());
    let md = "# 🧠 Memoria Operativa y Preferencias Aprendidas de Charbela\n\n";
    md += "A continuación se presentan las directrices y preferencias que Charbela ha enseñado al agente:\n\n";

    const agrupadas = {};
    for (const r of rules) {
      const cat = r.categoria || "general";
      if (!agrupadas[cat]) agrupadas[cat] = [];
      agrupadas[cat].push(r.regla);
    }

    for (const [cat, lista] of Object.entries(agrupadas)) {
      md += `### 📌 Categoría: ${cat.toUpperCase()}\n`;
      lista.forEach(regla => {
        md += `- ${regla}\n`;
      });
      md += "\n";
    }

    return md;
  } catch (err) {
    console.error("[Get Operating Rules Error]:", err.message);
    return "# Memoria Operativa básica (Modo seguro por excepción)";
  }
}

/**
 * Registra feedback explícito de la usuaria.
 */
export async function submitUserFeedback({ tipo, descripcion, contexto = {} }) {
  const docRef = await addDoc(collection(db, "mcp_feedback"), {
    tipo: tipo || "sugerencia", // 'queja', 'sugerencia', 'felicitacion', 'error_respuesta'
    descripcion: descripcion.trim(),
    contexto,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, mensaje: "Feedback registrado exitosamente en el sistema Kaizen." };
}

/**
 * Registra solicitudes que el MCP aún no tiene programadas (Feature Gaps).
 */
export async function reportUnsupportedQuery({ queryText, categoriaSugerida = "general" }) {
  const docRef = await addDoc(collection(db, "mcp_feature_gaps"), {
    query: queryText.trim(),
    categoriaSugerida,
    createdAt: Timestamp.now()
  });
  return { id: docRef.id, mensaje: "Sugerencia de funcionalidad registrada para desarrollo continuo." };
}
