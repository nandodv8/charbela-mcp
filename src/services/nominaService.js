// crm-charbela/mcp-server/src/services/nominaService.js
// Servicio MCP para Nómina, Personal, Asistencias y Liquidaciones de Charbela CRM

import { db } from "../firebase.js";
import { collection, getDocs, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";

/**
 * Consulta la lista de colaboradores / empleados registrados en el CRM
 */
export async function getNominaPersonal(args = {}) {
  const snap = await getDocs(collection(db, "empleados"));
  let empleados = [];

  snap.forEach((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    if (args.soloActivos !== false && data.activo === false) {
      return;
    }
    empleados.push({
      id: data.id,
      nombre: data.nombre || "Sin nombre",
      cargo: data.cargo || "Operativo",
      tipoPago: data.tipoPago || "Fijo",
      sueldoMensual: Number(data.sueldoMensual || 0),
      quincenaEstimada: Number((data.sueldoMensual || 0) / 2),
      afiliadoIESS: Boolean(data.afiliadoIESS),
      sueldoAfiliacion: Number(data.sueldoAfiliacion || 0),
      valorDiaExtra: Number(data.valorDiaExtra || 0),
      horario: data.horario || "08:00 - 17:00",
      activo: data.activo !== false
    });
  });

  empleados.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const totalNominaMensual = empleados.reduce((acc, e) => acc + (e.activo ? e.sueldoMensual : 0), 0);

  return {
    totalColaboradores: empleados.length,
    nominaEstimadaMensual: Number(totalNominaMensual.toFixed(2)),
    quincenaEstimadaTotal: Number((totalNominaMensual / 2).toFixed(2)),
    colaboradores: empleados
  };
}

/**
 * Consulta registros de marcación y asistencia del reloj checador (fichajes)
 */
export async function getAsistenciaFichajes(args = {}) {
  const maxLimit = Math.min(args.limite || 30, 100);
  const { fecha, empleadoId } = args;

  let q;
  if (fecha) {
    q = query(
      collection(db, "fichajes"),
      where("fecha", "==", fecha),
      firestoreLimit(maxLimit)
    );
  } else {
    q = query(
      collection(db, "fichajes"),
      orderBy("fecha", "desc"),
      firestoreLimit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const registros = [];

  snap.forEach((docSnap) => {
    const d = { id: docSnap.id, ...docSnap.data() };
    if (empleadoId && d.empleadoId !== empleadoId) return;

    registros.push({
      id: d.id,
      fecha: d.fecha,
      empleadoId: d.empleadoId,
      empleadoNombre: d.empleadoNombre || "Colaborador",
      checkIn: d.checkIn || null,
      checkOut: d.checkOut || null,
      horasExtra: Number(d.horasExtra || 0),
      estado: d.estado || "normal",
      notas: d.notas || ""
    });
  });

  return {
    totalRegistros: registros.length,
    fechaConsultada: fecha || "Recientes",
    fichajes: registros
  };
}

/**
 * Consulta las liquidaciones quincenales y pagos registrados en el CRM
 */
export async function getLiquidacionQuincena(args = {}) {
  const snap = await getDocs(collection(db, "empleados_pagos"));
  let pagos = [];

  snap.forEach((docSnap) => {
    const d = { id: docSnap.id, ...docSnap.data() };
    if (args.mes && d.mesContable && d.mesContable !== args.mes) return;
    if (args.periodoQuincena && d.periodoQuincena && d.periodoQuincena !== args.periodoQuincena) return;

    pagos.push({
      id: d.id,
      empleadoId: d.empleadoId,
      empleadoNombre: d.empleadoNombre,
      montoNetoPagado: Number(d.montoTotal || 0),
      descuentoIESS: Number(d.descuentoIESS || 0),
      diasTrabajados: d.diasTrabajados || 15,
      diasExtra: d.diasExtra || 0,
      mesContable: d.mesContable || "",
      periodoQuincena: d.periodoQuincena || "q1",
      fechaPago: d.fechaPago?.toDate ? d.fechaPago.toDate().toISOString().split("T")[0] : d.fechaPago,
      nota: d.nota || ""
    });
  });

  const totalDesembolsado = pagos.reduce((acc, p) => acc + p.montoNetoPagado, 0);
  const totalIESS = pagos.reduce((acc, p) => acc + p.descuentoIESS, 0);

  return {
    filtroMes: args.mes || "Histórico total",
    filtroQuincena: args.periodoQuincena || "Todas",
    totalPagosRegistrados: pagos.length,
    totalMontoNetoPagado: Number(totalDesembolsado.toFixed(2)),
    totalRetencionesIESS: Number(totalIESS.toFixed(2)),
    detallePagos: pagos
  };
}
