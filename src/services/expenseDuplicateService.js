// crm-charbela/mcp-server/src/services/expenseDuplicateService.js
// Auditoría de Gastos Duplicados, Limpieza, Modificación Quirúrgica y Exploración
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
  getEcuadorToday,
  getEcuadorMesContable,
  formatEcuadorDateTime,
  diffDays
} from "../utils/ecuadorDateUtils.js";

/**
 * Extrae el beneficiario o persona mencionada en el proveedor o descripción.
 */
function extractPersonName(text = "") {
  const clean = text.toLowerCase();
  const known = [
    "charbela", "giovanna", "gladys", "robinson", "ramiro",
    "carlos", "andrea", "maria", "maría", "pedro", "luis"
  ];
  for (const name of known) {
    if (clean.includes(name)) return name;
  }
  return "";
}

/**
 * Determina si la categoría corresponde a nómina o pago de personal.
 */
function isPayrollCategory(categoria = "") {
  const c = categoria.toLowerCase();
  return c.includes("nómina") || c.includes("nomina") || c.includes("mano de obra");
}

/**
 * Determina si corresponde a flete, chofer o transporte recurrente.
 */
function isTransportExpense(categoria = "", descripcion = "") {
  const c = categoria.toLowerCase();
  const d = descripcion.toLowerCase();
  return c.includes("transporte") || c.includes("logistica") || c.includes("logística") ||
         d.includes("chofer") || d.includes("carrera") || d.includes("flete") || d.includes("delivery");
}

/**
 * DETECTAR GASTOS DUPLICADOS EN EL CRM
 * Protección total contra falsos positivos en nómina, empleados y pagos recurrentes de choferes.
 */
export async function detectDuplicateExpenses({ mes, toleranciaDias = 0 } = {}) {
  let q;
  if (mes) {
    const cleanMes = mes.trim().substring(0, 7);
    q = query(collection(db, "gastos"), where("mesContable", "==", cleanMes));
  } else {
    // Si no se especifica mes, revisar los últimos 300 gastos
    q = query(collection(db, "gastos"), limit(300));
  }

  const snap = await getDocs(q);
  const gastos = snap.docs.map(d => {
    const data = d.data();
    const fecha = normalizeEcuadorDate(data.fechaEmision || data.fechaPago || data.createdAt);
    const createdAtEcuador = formatEcuadorDateTime(data.createdAt);
    const prov = (data.proveedor || data.proveedorNombre || "").trim();
    const desc = (data.descripcion || "").trim();
    const cat = data.categoria || "Otros";
    const ref = (data.referenciaBancaria || "").trim();

    return {
      id: d.id,
      ...data,
      monto: parseFloat(data.monto || 0),
      fecha,
      createdAtEcuador,
      proveedor: prov,
      descripcion: desc,
      categoria: cat,
      referenciaBancaria: ref,
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
      let confianza = "alta";

      const ref1 = g1.referenciaBancaria.toLowerCase();
      const ref2 = g2.referenciaBancaria.toLowerCase();
      const hasValidRef1 = ref1.length >= 4 && !ref1.includes("sin") && !ref1.includes("n/a");
      const hasValidRef2 = ref2.length >= 4 && !ref2.includes("sin") && !ref2.includes("n/a");

      // Criterio 1: Misma referencia bancaria válida no vacía (Certero al 100%)
      if (hasValidRef1 && hasValidRef2 && ref1 === ref2) {
        esDuplicado = true;
        razon = `Misma referencia bancaria (#${g1.referenciaBancaria})`;
        confianza = "alta";
      } else {
        // Criterio 2: Coincidencia heurística con filtros anti falsos positivos
        const diffMonto = Math.abs(g1.monto - g2.monto);
        if (diffMonto < 0.01) {
          const dias = diffDays(g1.fecha, g2.fecha);
          const person1 = extractPersonName(`${g1.proveedor} ${g1.descripcion}`);
          const person2 = extractPersonName(`${g2.proveedor} ${g2.descripcion}`);
          const payroll1 = isPayrollCategory(g1.categoria);
          const payroll2 = isPayrollCategory(g2.categoria);

          // REGLA 1: NÓMINA (Pagos de quincena a empleados)
          if (payroll1 || payroll2) {
            // Si los beneficiarios son personas distintas (ej. Charbela vs Giovanna vs Gladys): NUNCA duplicado
            if (person1 && person2 && person1 !== person2) {
              continue;
            }
            // Solo marcar si es la MISMA persona, con el mismo monto y en la misma fecha exacta
            if (person1 && person2 && person1 === person2 && dias === 0) {
              esDuplicado = true;
              razon = `Mismo empleado (${person1}) registrado dos veces el mismo día (${g1.fecha}) por $${g1.monto.toFixed(2)}`;
              confianza = "media";
            }
          }
          // REGLA 2: CHOFER / LOGÍSTICA (Carreras en días distintos nunca son duplicados)
          else if (isTransportExpense(g1.categoria, g1.descripcion) || isTransportExpense(g2.categoria, g2.descripcion)) {
            if (dias === 0) {
              const provSame = g1.proveedor && g2.proveedor && g1.proveedor.toLowerCase() === g2.proveedor.toLowerCase();
              const descSame = g1.descripcion && g2.descripcion && g1.descripcion.toLowerCase() === g2.descripcion.toLowerCase();
              if (provSame || descSame) {
                esDuplicado = true;
                razon = `Mismo chofer/transporte registrado dos veces el mismo día (${g1.fecha})`;
                confianza = "media";
              }
            }
          }
          // REGLA 3: GASTOS GENERALES (Materia Prima, Insumos, Servicios, etc.)
          else {
            const p1 = g1.proveedor.toLowerCase();
            const p2 = g2.proveedor.toLowerCase();
            const provDistinct = p1 && p2 && p1 !== p2 && !p1.includes(p2) && !p2.includes(p1);

            // Si los proveedores son explícitamente distintos (ej. Supermaxi vs Primax): NUNCA duplicado
            if (!provDistinct) {
              const provSame = p1 && p2 && (p1 === p2 || p1.includes(p2) || p2.includes(p1));
              const descSame = g1.descripcion && g2.descripcion &&
                (g1.descripcion.toLowerCase() === g2.descripcion.toLowerCase() ||
                 g1.descripcion.toLowerCase().includes(g2.descripcion.toLowerCase()) ||
                 g2.descripcion.toLowerCase().includes(g1.descripcion.toLowerCase()));

              // Mismo día con coincidencia de proveedor o descripción
              if (dias === 0 && (provSame || descSame)) {
                esDuplicado = true;
                razon = `Mismo monto ($${g1.monto.toFixed(2)}), misma fecha (${g1.fecha}) y coincidencia de ${provSame ? 'proveedor' : 'concepto'}`;
                confianza = provSame ? "alta" : "media";
              } else if (dias <= toleranciaDias && toleranciaDias > 0 && provSame && descSame) {
                esDuplicado = true;
                razon = `Mismo proveedor y descripción idéntica con ${dias} día(s) de diferencia`;
                confianza = "baja";
              }
            }
          }
        }
      }

      if (esDuplicado) {
        g2._razon = razon;
        g2._confianza = confianza;
        grupo.push(g2);
        procesados.add(g2.id);
      }
    }

    if (grupo.length > 1) {
      procesados.add(g1.id);

      // Determinar cuál conservar: 1) Tiene comprobante, 2) Tiene referencia bancaria, 3) Primero creado
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
        criterio: duplicados[0]._razon || "Coincidencia estricta de datos",
        nivelConfianza: duplicados[0]._confianza || "alta",
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
      ? `⚠️ Se detectaron ${totalDuplicadosEliminables} gastos duplicados confirmados que están inflando los egresos en $${totalMontoDuplicado.toFixed(2)}.`
      : "✅ No se encontraron gastos duplicados en el periodo auditado. La nómina y los pagos recurrentes están protegidos y la contabilidad está limpia."
  };
}

/**
 * LISTAR GASTOS CON FILTROS AVANZADOS Y ORDENACIÓN
 * Permite a Claude auditar gastos por fecha del gasto o por fecha de carga al CRM (createdAt).
 */
export async function listExpenses({
  mes,
  fechaInicio,
  fechaFin,
  categoria,
  proveedor,
  ordenarPor = "fecha", // 'fecha' o 'fechaCreacion' / 'createdAt'
  creadosHoy = false,
  limite = 100
} = {}) {
  let q;
  if (mes) {
    const cleanMes = mes.trim().substring(0, 7);
    q = query(collection(db, "gastos"), where("mesContable", "==", cleanMes));
  } else {
    q = query(collection(db, "gastos"), limit(350));
  }

  const snap = await getDocs(q);
  const todayEcuador = getEcuadorToday();

  let gastos = snap.docs.map(d => {
    const data = d.data();
    const fecha = normalizeEcuadorDate(data.fechaEmision || data.fechaPago || data.createdAt);
    const createdAtStr = formatEcuadorDateTime(data.createdAt);
    const createdDate = createdAtStr ? createdAtStr.substring(0, 10) : "";

    return {
      id: d.id,
      monto: parseFloat(data.monto || 0),
      fecha,
      categoria: data.categoria || "Otros",
      proveedor: (data.proveedor || data.proveedorNombre || "No indicado").trim(),
      descripcion: (data.descripcion || "").trim(),
      metodoPago: data.metodoPago || "Transferencia",
      referenciaBancaria: data.referenciaBancaria || "N/A",
      tieneComprobante: Boolean(data.facturaUrl || data.comprobanteUrl),
      facturaUrl: data.facturaUrl || data.comprobanteUrl || null,
      mesContable: data.mesContable || fecha.substring(0, 7),
      estado: data.estado || "pagado",
      createdAtEcuador: createdAtStr || "No registrado",
      createdDateEcuador: createdDate
    };
  });

  // Filtros
  if (creadosHoy) {
    gastos = gastos.filter(g => g.createdDateEcuador === todayEcuador);
  }

  if (fechaInicio) {
    gastos = gastos.filter(g => g.fecha >= fechaInicio);
  }
  if (fechaFin) {
    gastos = gastos.filter(g => g.fecha <= fechaFin);
  }

  if (categoria) {
    const catLower = categoria.toLowerCase().trim();
    gastos = gastos.filter(g => g.categoria.toLowerCase().includes(catLower));
  }

  if (proveedor) {
    const provLower = proveedor.toLowerCase().trim();
    gastos = gastos.filter(g =>
      g.proveedor.toLowerCase().includes(provLower) ||
      g.descripcion.toLowerCase().includes(provLower)
    );
  }

  // Ordenación
  if (ordenarPor === "fechaCreacion" || ordenarPor === "createdAt") {
    gastos.sort((a, b) => b.createdAtEcuador.localeCompare(a.createdAtEcuador));
  } else {
    gastos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  const maxLim = Math.min(Math.max(limite, 1), 300);
  const seleccionados = gastos.slice(0, maxLim);

  const sumaMonto = seleccionados.reduce((s, g) => s + g.monto, 0);
  const porCategoria = {};
  seleccionados.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
  });

  return {
    periodoConsultado: mes || (fechaInicio ? `${fechaInicio} al ${fechaFin || todayEcuador}` : "Recientes"),
    criterioOrden: ordenarPor === "fechaCreacion" ? "Fecha de carga en CRM (más recientes primero)" : "Fecha de emisión del gasto",
    totalGastosEncontrados: gastos.length,
    totalMostrados: seleccionados.length,
    sumaTotalMonto: sumaMonto.toFixed(2),
    desglosePorCategoria: Object.entries(porCategoria).map(([cat, m]) => ({
      categoria: cat,
      monto: m.toFixed(2),
      porcentaje: sumaMonto > 0 ? `${((m / sumaMonto) * 100).toFixed(1)}%` : "0%"
    })),
    gastos: seleccionados.map(g => ({
      id: g.id,
      fecha: g.fecha,
      monto: g.monto.toFixed(2),
      categoria: g.categoria,
      proveedor: g.proveedor,
      descripcion: g.descripcion,
      referenciaBancaria: g.referenciaBancaria,
      tieneComprobante: g.tieneComprobante,
      facturaUrl: g.facturaUrl,
      fechaCargaCRM: g.createdAtEcuador,
      mesContable: g.mesContable
    }))
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
