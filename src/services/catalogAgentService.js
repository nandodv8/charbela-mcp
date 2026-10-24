// crm-charbela/mcp-server/src/services/catalogAgentService.js
// Gestión conversacional del Catálogo Maestro (padres_v2 / productos_v2).
// Espejo deliberado de src/services/catalogV2Service.js del front-end — este
// paquete MCP no comparte código con src/, así que la forma de los documentos
// se mantiene sincronizada a mano. Si cambia el esquema allá, actualizar aquí.

import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where
} from "firebase/firestore";

/**
 * Secciones válidas del Plan de Producción Semanal. Debe coincidir exactamente
 * con PRODUCTION_SECTIONS en src/services/catalogV2Service.js.
 */
export const PRODUCTION_SECTIONS = [
  { id: "bocaditos_clasicos", label: "Bocaditos Clásicos (1.1)" },
  { id: "productos_decorados", label: "Productos Decorados (1.2)" },
  { id: "bases_bizcochos", label: "Bases de Bizcochos (1.3)" },
  { id: "despacho_solo", label: "Solo Despacho (paquetes/combos)" },
  { id: "accesorio", label: "Accesorio / Adicional" }
];

const normalizeNombre = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Lista productos padre (familias), con filtros opcionales.
 */
export async function listParents({ categoria, seccionProduccion, soloSinSeccion } = {}) {
  const snap = await getDocs(collection(db, "padres_v2"));
  let padres = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (categoria) {
    const catLower = categoria.toLowerCase();
    padres = padres.filter(p => (p.categoriaBase || p.categoria || "").toLowerCase() === catLower);
  }
  if (seccionProduccion) {
    padres = padres.filter(p => p.seccionProduccion === seccionProduccion);
  }
  if (soloSinSeccion) {
    padres = padres.filter(p => !p.seccionProduccion);
  }

  return padres
    .map(p => ({
      id: p.id,
      nombre: p.nombreBase || p.nombre || "Producto Base",
      categoria: p.categoriaBase || p.categoria || "General",
      seccionProduccion: p.seccionProduccion || null,
      saboresDisponibles: p.saboresDisponibles || [],
      coleccion: p.coleccion || null,
      minQuantity: p.min_quantity || 1
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Detalle de un producto padre, incluyendo sus variaciones/presentaciones.
 */
export async function getParentWithVariations(productoId) {
  if (!productoId) throw new Error("productoId es obligatorio.");
  const padreSnap = await getDoc(doc(db, "padres_v2", productoId));
  if (!padreSnap.exists()) {
    throw new Error(`No se encontró ningún producto del catálogo con id "${productoId}".`);
  }
  const padre = { id: padreSnap.id, ...padreSnap.data() };

  const varsSnap = await getDocs(query(collection(db, "productos_v2"), where("parentId", "==", productoId)));
  const variaciones = varsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    id: padre.id,
    nombre: padre.nombreBase || padre.nombre || "Producto Base",
    categoria: padre.categoriaBase || padre.categoria || "General",
    seccionProduccion: padre.seccionProduccion || null,
    saboresDisponibles: padre.saboresDisponibles || [],
    minQuantity: padre.min_quantity || 1,
    variaciones: variaciones.map(v => ({
      id: v.id,
      nombre: v.nombre,
      precio: v.precio,
      precioNormal: v.precioNormal || null,
      costoProduccion: v.costoProduccion || 0,
      isBundle: Boolean(v.isBundle)
    }))
  };
}

/**
 * Busca un posible duplicado por nombre normalizado, antes de crear un producto nuevo.
 */
async function findPossibleDuplicate(nombreBase) {
  const target = normalizeNombre(nombreBase);
  if (!target) return null;
  const snap = await getDocs(collection(db, "padres_v2"));
  const match = snap.docs.find(d => normalizeNombre(d.data().nombreBase || d.data().nombre) === target);
  return match ? { id: match.id, ...match.data() } : null;
}

/**
 * Crea un producto padre (familia) nuevo. seccionProduccion es obligatorio:
 * sin esto el producto se pierde en el Plan de Producción Semanal (bug real
 * que motivó este set de herramientas — ver sesión del 2026-10-24).
 */
export async function createParent({
  nombreBase,
  categoriaBase,
  seccionProduccion,
  tipoVenta = "por_unidad",
  minQuantity = 1,
  descripcionBase = "",
  saboresDisponibles = null
}) {
  if (!nombreBase || !nombreBase.trim()) {
    throw new Error("nombreBase es obligatorio.");
  }
  if (!seccionProduccion) {
    throw new Error(
      "seccionProduccion es obligatorio al crear un producto. Opciones válidas: " +
      PRODUCTION_SECTIONS.map(s => `${s.id} (${s.label})`).join(", ")
    );
  }
  if (!PRODUCTION_SECTIONS.some(s => s.id === seccionProduccion)) {
    throw new Error(
      `seccionProduccion "${seccionProduccion}" no es válida. Opciones válidas: ` +
      PRODUCTION_SECTIONS.map(s => s.id).join(", ")
    );
  }

  const duplicate = await findPossibleDuplicate(nombreBase);
  if (duplicate) {
    throw new Error(
      `Ya existe un producto con un nombre muy similar: "${duplicate.nombreBase || duplicate.nombre}" (id: ${duplicate.id}). ` +
      `Si es el mismo producto, usa catalogo_actualizar_producto en vez de crear uno nuevo.`
    );
  }

  const id = `producto_${normalizeNombre(nombreBase).replace(/\s+/g, "-")}`;
  const payload = {
    id,
    nombreBase: nombreBase.trim(),
    categoriaBase: categoriaBase || "General",
    seccionProduccion,
    tipoVenta,
    min_quantity: parseInt(minQuantity, 10) || 1,
    descripcionBase,
    ...(Array.isArray(saboresDisponibles) && saboresDisponibles.length > 0 ? { saboresDisponibles } : {}),
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, "padres_v2", id), payload, { merge: true });
  return { id, ...payload };
}

/**
 * Actualiza campos de un producto padre existente (incluye reasignar
 * seccionProduccion o saboresDisponibles). No exige seccionProduccion en la
 * edición — solo en la creación — para no bloquear el catálogo legado
 * mientras se revisa producto por producto.
 */
export async function updateParent(productoId, cambios = {}) {
  if (!productoId) throw new Error("productoId es obligatorio.");
  const ref = doc(db, "padres_v2", productoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`No se encontró ningún producto del catálogo con id "${productoId}".`);
  }

  if (cambios.seccionProduccion && !PRODUCTION_SECTIONS.some(s => s.id === cambios.seccionProduccion)) {
    throw new Error(
      `seccionProduccion "${cambios.seccionProduccion}" no es válida. Opciones válidas: ` +
      PRODUCTION_SECTIONS.map(s => s.id).join(", ")
    );
  }

  const allowedKeys = ["categoriaBase", "seccionProduccion", "saboresDisponibles", "descripcionBase", "min_quantity"];
  const payload = { updatedAt: new Date().toISOString() };
  for (const key of allowedKeys) {
    if (cambios[key] !== undefined) payload[key] = cambios[key];
  }

  await updateDoc(ref, payload);
  return { id: productoId, ...snap.data(), ...payload };
}

/**
 * Crea una variación/presentación bajo un padre existente. Hereda
 * seccionProduccion del padre automáticamente — igual que hace el panel de
 * Catálogo al crear desde la UI.
 */
export async function createVariation({ parentId, nombre, precio, costoProduccion = 0 }) {
  if (!parentId) throw new Error("parentId es obligatorio.");
  if (!nombre || !nombre.trim()) throw new Error("nombre es obligatorio.");
  if (precio === undefined || precio === null || isNaN(parseFloat(precio))) {
    throw new Error("precio es obligatorio y debe ser un número.");
  }

  const padreSnap = await getDoc(doc(db, "padres_v2", parentId));
  if (!padreSnap.exists()) {
    throw new Error(`No se encontró ningún producto padre con id "${parentId}".`);
  }
  const padre = padreSnap.data();

  const varRef = doc(collection(db, "productos_v2"));
  const payload = {
    parentId,
    nombre: nombre.trim(),
    precio: parseFloat(precio),
    costoProduccion: parseFloat(costoProduccion) || 0,
    categoria: padre.categoriaBase || padre.categoria || "General",
    seccionProduccion: padre.seccionProduccion || "",
    updatedAt: new Date().toISOString()
  };
  await setDoc(varRef, payload);
  return { id: varRef.id, ...payload };
}

/**
 * Actualiza solo el precio/costo de una variación existente — operación
 * acotada a propósito (no toca nombre, categoría ni sección).
 */
export async function updatePrice(variacionId, { precio, precioNormal, costoProduccion } = {}) {
  if (!variacionId) throw new Error("variacionId es obligatorio.");
  const ref = doc(db, "productos_v2", variacionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error(`No se encontró ninguna variación del catálogo con id "${variacionId}".`);
  }

  const payload = { updatedAt: new Date().toISOString() };
  if (precio !== undefined) payload.precio = parseFloat(precio);
  if (precioNormal !== undefined) payload.precioNormal = parseFloat(precioNormal);
  if (costoProduccion !== undefined) payload.costoProduccion = parseFloat(costoProduccion);

  await updateDoc(ref, payload);
  return { id: variacionId, ...snap.data(), ...payload };
}

/**
 * Auditoría de solo lectura: productos padre sin seccionProduccion asignada.
 * Útil como primer barrido después de la migración del catálogo existente.
 */
export async function auditMissingSection() {
  const snap = await getDocs(collection(db, "padres_v2"));
  const sinSeccion = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.seccionProduccion)
    .map(p => ({
      id: p.id,
      nombre: p.nombreBase || p.nombre || "Producto Base",
      categoria: p.categoriaBase || p.categoria || "General"
    }));

  return {
    totalSinSeccion: sinSeccion.length,
    productos: sinSeccion
  };
}
