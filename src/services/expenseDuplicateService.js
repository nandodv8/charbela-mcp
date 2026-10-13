// crm-charbela/mcp-server/src/services/expenseDuplicateService.js
// Auditoría de Gastos Duplicados, Limpieza y Modificación Quirúrgica
// Creado bajo los lineamientos de Controller (Dana) y Backend Architect

import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  limit,
  Timestamp
} from "firebase/firestore";
import {
  normalizeEcuadorDate,
  getEcuadorMesContable,
  diffDays
} from "../utils/ecuadorDateUtils.js";

/**
 * DETECTAR GASTOS DUPLICADOS EN EL CRM
 * Identifica registros repetidos por referencia bancaria idéntica o por coincidencia de monto + fecha cercana.
 */
export async function detectDuplicateExpenses({ mes, toleranciaDias = 1 } = {}) {
  let q;
  if (mes) {
    const cleanMes = mes.trim().substring(0, 7);
    q = query(collection(db, "gastos"), where("mesContable", "==", cleanMes));
  } else {
    // Si no se especifica mes, revisar los últimos 250 gastos
    q = query(collection(db, "gastos"), limit(250));
  }

  const snap = await getDocs(q);
  const gastos = snap.docs.map(d => {
    const data = d.data();
    const fecha = normalizeEcuadorDate(data.fechaEmision || data.fechaPago || data.createdAt);
    return {
      id: d.id,
      ...data,
      monto: parseFloat(data.monto || 0),
      fecha,
      proveedor: (data.proveedor || data.proveedorNombre || "").trim(),
      descripcion: (data.descripcion || "").trim(),
      categoria: data.categoria || "Otros",
      referenciaBancaria: (data.referenciaBancaria || "").trim(),
      tieneComprobante: Boolean(data.facturaUrl || data.comprobanteUrl)
    };
  });

  const gruposDuplicados = [];
  const procesados = new Set();

  for (let i = 0; i < gastos.length; i++) {
    const g1 = gastos[i];
    if (procesados.has(g1.id)) continue;

    const grupo = [g1];

    for (let j = i + 1; j < gastos.length; j++) {
      const g2 = gastos[j];
      if (procesados.has(g2.id)) continue;

      let esDuplicado = false;
      let razon = "";

      // Criterio 1: Misma referencia bancaria no vacía
      if (g1.referenciaBancaria && g2.referenciaBancaria &&
          g1.referenciaBancaria.toLowerCase() === g2.referenciaBancaria.toLowerCase()) {
        esDuplicado = true;
        razon = `Misma referencia bancaria (#${g1.referenciaBancaria})`;
      }

      // Criterio 2: Mismo monto exacto y fecha dentro de la tolerancia
      const diffMonto = Math.abs(g1.monto - g2.monto);
      if (diffMonto < 0.01) {
        const dias = diffDays(g1.fecha, g2.fecha);
        if (dias <= toleranciaDias) {
          const provSimilar = g1.proveedor && g2.proveedor &&
            (g1.proveedor.toLowerCase().includes(g2.proveedor.toLowerCase()) ||
             g2.proveedor.toLowerCase().includes(g1.proveedor.toLowerCase()));
          const descSimilar = g1.descripcion && g2.descripcion &&
            (g1.descripcion.toLowerCase().includes(g2.descripcion.toLowerCase()) ||
             g2.descripcion.toLowerCase().includes(g1.descripcion.toLowerCase()));

          if (provSimilar || descSimilar || dias === 0) {
            esDuplicado = true;
            razon = `Mismo monto ($${g1.monto.toFixed(2)}) y fecha cercana (${dias} día(s) de diferencia)`;
          }
        }
      }

      if (esDuplicado) {
        g2._razon = razon;
        grupo.push(g2);
        procesados.add(g2.id);
      }
    }

    if (grupo.length > 1) {
      procesados.add(g1.id);

      // Determinar cuál es el mejor candidato a conservar:
      // Prioridad: 1) Tiene comprobante adjunto, 2) Tiene referencia bancaria, 3) Creado primero
      grupo.sort((a, b) => {
        if (a.tieneComprobante && !b.tieneComprobante) return -1;
        if (!a.tieneComprobante && b.tieneComprobante) return 1;
        if (a.referenciaBancaria && !b.referenciaBancaria) return -1;
        if (!a.referenciaBancaria && b.referenciaBancaria) return 1;
        return 0;
      });

      const conservar = grupo[0];
      const duplicados = grupo.slice(1);

      gruposDuplicados.push({
        criterio: duplicados[0]._razon || "Coincidencia de datos",
        monto: conservar.monto.toFixed(2),
        candidatoAConservar: {
          gastoId: conservar.id,
          monto: conservar.monto.toFixed(2),
          fecha: conservar.fecha,
          proveedor: conservar.proveedor || "No indicado",
          descripcion: conservar.descripcion,
          categoria: conservar.categoria,
          referenciaBancaria: conservar.referenciaBancaria || "Sin referencia",
          tieneComprobante: conservar.tieneComprobante
        },
        duplicadosParaEliminar: duplicados.map(d => ({
          gastoId: d.id,
          monto: d.monto.toFixed(2),
          fecha: d.fecha,
          proveedor: d.proveedor || "No indicado",
          descripcion: d.descripcion,
          categoria: d.categoria,
          referenciaBancaria: d.referenciaBancaria || "Sin referencia",
          tieneComprobante: d.tieneComprobante
        }))
      });
    }
  }

  const totalDuplicadosEliminables = gruposDuplicados.reduce((sum, grp) => sum + grp.duplicadosParaEliminar.length, 0);
  const totalMontoDuplicado = gruposDuplicados.reduce((sum, grp) => {
    return sum + grp.duplicadosParaEliminar.reduce((s, d) => s + parseFloat(d.monto), 0);
  }, 0);

  return {
    periodoAuditado: mes || "Últimos movimientos",
    totalGruposConDuplicados: gruposDuplicados.length,
    totalRegistrosDuplicadosParaEliminar: totalDuplicadosEliminables,
    montoTotalInfladoPorDuplicados: totalMontoDuplicado.toFixed(2),
    grupos: gruposDuplicados,
    mensaje: totalDuplicadosEliminables > 0
      ? `⚠️ Se detectaron ${totalDuplicadosEliminables} gastos duplicados que están inflando los egresos en $${totalMontoDuplicado.toFixed(2)}.`
      : "✅ No se encontraron gastos duplicados en el periodo auditado. La contabilidad está limpia."
  };
}

/**
 * ELIMINAR UN GASTO INDIVIDUAL DE FIRESTORE
 * Valida la existencia, extrae los datos para auditoría y elimina el documento.
 */
export async function deleteExpense({ gastoId, motivo = "" }) {
  if (!gastoId || !gastoId.trim()) {
    throw new Error("Debes proporcionar el ID del gasto a eliminar.");
  }

  const cleanId = gastoId.trim();
  const docRef = doc(db, "gastos", cleanId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`El gasto con ID '${cleanId}' no existe en el CRM.`);
  }

  const data = snap.data();
  const monto = parseFloat(data.monto || 0);
  const fecha = normalizeEcuadorDate(data.fechaEmision || data.fechaPago);

  // Eliminar físicamente el documento en Firestore
  await deleteDoc(docRef);

  return {
    success: true,
    gastoIdEliminado: cleanId,
    montoEliminado: monto.toFixed(2),
    fechaGasto: fecha,
    descripcion: data.descripcion || "Sin detalle",
    proveedor: data.proveedor || data.proveedorNombre || "No especificado",
    categoria: data.categoria || "Otros",
    motivo: motivo || "Eliminado a petición del usuario",
    mensaje: `🗑️ Gasto de $${monto.toFixed(2)} ('${data.descripcion || 'Sin detalle'}') eliminado exitosamente del CRM.`
  };
}

/**
 * ELIMINAR GASTOS DUPLICADOS EN LOTE
 * Borra una lista de IDs confirmados tras la auditoría.
 */
export async function batchDeleteExpenses({ gastoIds = [], motivo = "Limpieza de duplicados" }) {
  if (!Array.isArray(gastoIds) || gastoIds.length === 0) {
    throw new Error("Debes proporcionar una lista de IDs de gastos a eliminar.");
  }

  const eliminados = [];
  const errores = [];
  let totalMontoEliminado = 0;

  for (const id of gastoIds) {
    try {
      const res = await deleteExpense({ gastoId: id, motivo });
      eliminados.push(res);
      totalMontoEliminado += parseFloat(res.montoEliminado);
    } catch (e) {
      errores.push({ gastoId: id, error: e.message });
    }
  }

  return {
    totalSolicitados: gastoIds.length,
    totalEliminadosExitosamente: eliminados.length,
    totalFallidos: errores.length,
    montoTotalDepurado: totalMontoEliminado.toFixed(2),
    eliminados,
    errores: errores.length > 0 ? errores : undefined,
    mensaje: `🧹 Limpieza completada: ${eliminados.length} gastos eliminados exitosamente, corrigiendo un total de $${totalMontoEliminado.toFixed(2)} en egresos.`
  };
}

/**
 * MODIFICAR UN GASTO EXISTENTE (Fecha, Categoría, Monto, Proveedor o Detalle)
 */
export async function modifyExpense({ gastoId, cambios = {} }) {
  if (!gastoId || !gastoId.trim()) {
    throw new Error("Debes indicar el ID del gasto a modificar.");
  }

  const cleanId = gastoId.trim();
  const docRef = doc(db, "gastos", cleanId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`El gasto #${cleanId} no existe en el CRM.`);
  }

  const current = snap.data();
  const updatePayload = {
    updatedAt: Timestamp.now()
  };

  if (cambios.monto !== undefined) {
    const m = parseFloat(cambios.monto);
    if (isNaN(m) || m <= 0) throw new Error("El monto debe ser un número válido mayor a 0.");
    updatePayload.monto = m;
    updatePayload.subtotal = m;
    updatePayload.montoPagado = m;
  }

  if (cambios.descripcion) updatePayload.descripcion = cambios.descripcion.trim();
  if (cambios.proveedor) {
    updatePayload.proveedor = cambios.proveedor.trim();
    updatePayload.proveedorNombre = cambios.proveedor.trim();
  }
  if (cambios.categoria) updatePayload.categoria = cambios.categoria.trim();
  if (cambios.metodoPago) updatePayload.metodoPago = cambios.metodoPago.trim();
  if (cambios.referenciaBancaria) updatePayload.referenciaBancaria = cambios.referenciaBancaria.trim();

  if (cambios.fecha) {
    const fNorm = normalizeEcuadorDate(cambios.fecha);
    updatePayload.fechaEmision = fNorm;
    updatePayload.fechaPago = fNorm;
    updatePayload.fechaVencimiento = fNorm;
    updatePayload.mesContable = fNorm.substring(0, 7);
  }

  await updateDoc(docRef, updatePayload);

  return {
    success: true,
    gastoId: cleanId,
    cambiosAplicados: updatePayload,
    mensaje: `✏️ Gasto #${cleanId.substring(0, 6)} actualizado exitosamente.`
  };
}
