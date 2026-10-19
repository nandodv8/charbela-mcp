// crm-charbela/mcp-server/src/services/recetasService.js
// Servicio MCP para Recetas, Fichas Técnicas, Subrecetas e Insumos (Cálculo de COGS)

import { db } from "../firebase.js";
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";

/**
 * Consulta el catálogo de recetas con cálculo de costo por porción (COGS) y rendimiento
 */
export async function getCatalogoRecetas(args = {}) {
  const snap = await getDocs(collection(db, "recetas"));
  const recetas = [];

  snap.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    if (args.categoria && data.categoria && data.categoria.toLowerCase() !== args.categoria.toLowerCase()) {
      return;
    }
    if (args.buscar) {
      const q = args.buscar.toLowerCase();
      const match =
        (data.nombre || "").toLowerCase().includes(q) ||
        (data.descripcion || "").toLowerCase().includes(q) ||
        (data.categoria || "").toLowerCase().includes(q);
      if (!match) return;
    }

    const costoInsumos = Number(data.costoInsumosTotal || data.costoTotal || 0);
    const rendimiento = Number(data.rendimientoPorciones || data.porciones || data.rendimientoGramos || 1);
    const costoUnitarioCOGS = rendimiento > 0 ? costoInsumos / rendimiento : costoInsumos;

    recetas.push({
      id: data.id,
      nombre: data.nombre || "Receta sin nombre",
      categoria: data.categoria || "Pastelería",
      esSubreceta: Boolean(data.esSubreceta),
      rendimiento: `${rendimiento} ${data.unidadRendimiento || "porciones"}`,
      costoTotalInsumos: Number(costoInsumos.toFixed(2)),
      costoUnitarioCOGS: Number(costoUnitarioCOGS.toFixed(2)),
      margenGananciaSugerido: `${data.margenGananciaPorc || 60}%`,
      tiempoPreparacionMin: data.tiempoPreparacionMin || 0,
      subrecetasVinculadasCount: (data.subrecetas || []).length
    });
  });

  recetas.sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    totalRecetas: recetas.length,
    categoriaFiltro: args.categoria || "Todas",
    recetas
  };
}

/**
 * Obtiene el detalle completo y ficha técnica de una receta específica
 */
export async function getRecetaDetalle(args = {}) {
  const { recetaId, nombre } = args;
  let targetDoc = null;

  if (recetaId) {
    const snap = await getDoc(doc(db, "recetas", recetaId));
    if (snap.exists()) {
      targetDoc = { id: snap.id, ...snap.data() };
    }
  }

  if (!targetDoc && nombre) {
    const snap = await getDocs(collection(db, "recetas"));
    const term = nombre.toLowerCase().trim();
    snap.forEach((d) => {
      const data = d.data();
      if ((data.nombre || "").toLowerCase().includes(term)) {
        targetDoc = { id: d.id, ...data };
      }
    });
  }

  if (!targetDoc) {
    throw new Error(`Receta no encontrada con el identificador o nombre proporcionado.`);
  }

  return {
    id: targetDoc.id,
    nombre: targetDoc.nombre,
    categoria: targetDoc.categoria,
    esSubreceta: Boolean(targetDoc.esSubreceta),
    rendimiento: `${targetDoc.rendimientoPorciones || targetDoc.porciones || 1} ${targetDoc.unidadRendimiento || "porciones"}`,
    costoInsumosTotal: Number((targetDoc.costoInsumosTotal || 0).toFixed(2)),
    costoManoObra: Number((targetDoc.costoManoObra || 0).toFixed(2)),
    ingredientes: (targetDoc.ingredientes || []).map((ing) => ({
      nombre: ing.nombre,
      cantidad: ing.cantidad,
      unidad: ing.unidad,
      costo: Number((ing.costo || 0).toFixed(2))
    })),
    subrecetas: (targetDoc.subrecetas || []).map((sub) => ({
      nombre: sub.nombre,
      cantidad: sub.cantidad,
      costoCalculado: Number((sub.costo || 0).toFixed(2))
    })),
    procedimiento: targetDoc.procedimiento || targetDoc.pasos || "Sin procedimiento detallado",
    puntosCriticosCalidad: targetDoc.puntosCriticos || targetDoc.notasCalidad || "Ninguno registrado"
  };
}

/**
 * Consulta el catálogo de materias primas e insumos con costos de compra
 */
export async function getInsumosPrecios(args = {}) {
  const snap = await getDocs(collection(db, "insumos"));
  const insumos = [];

  snap.forEach((docSnap) => {
    const d = { id: docSnap.id, ...docSnap.data() };
    if (args.buscar) {
      const q = args.buscar.toLowerCase();
      const match =
        (d.nombre || "").toLowerCase().includes(q) ||
        (d.proveedorPrincipal || "").toLowerCase().includes(q) ||
        (d.categoria || "").toLowerCase().includes(q);
      if (!match) return;
    }

    const costoPres = Number(d.costoPresentacion || d.precioCompra || 0);
    const cantPres = Number(d.cantidadPresentacion || 1);
    const costoUnitario = cantPres > 0 ? costoPres / cantPres : costoPres;

    insumos.push({
      id: d.id,
      nombre: d.nombre,
      presentacion: `${cantPres} ${d.unidadPresentacion || "unidad"}`,
      costoPresentacion: Number(costoPres.toFixed(2)),
      costoUnitarioBase: Number(costoUnitario.toFixed(4)),
      unidadBase: d.unidadBase || d.unidadPresentacion || "u",
      proveedor: d.proveedorPrincipal || "Sin proveedor asignado",
      stockActual: d.stockActual !== undefined ? Number(d.stockActual) : null
    });
  });

  insumos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    totalInsumos: insumos.length,
    insumos
  };
}
