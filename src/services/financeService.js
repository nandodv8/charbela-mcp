// crm-charbela/mcp-server/src/services/financeService.js
// Gestión Financiera Integral: Mutaciones de Abonos, Gastos y P&L Conversacional
// Creado bajo las directrices contables de Dana (Bookkeeper & Controller)

import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  runTransaction,
  addDoc
} from "firebase/firestore";

const CRM_BASE_URL = "https://charbela-crm.firebaseapp.com";

function toDateStr(val) {
  if (!val) return "";
  if (typeof val === "string") return val.substring(0, 10);
  if (val.toDate && typeof val.toDate === "function") {
    return val.toDate().toISOString().substring(0, 10);
  }
  if (val instanceof Date) {
    return val.toISOString().substring(0, 10);
  }
  return "";
}

/**
 * REGISTRAR ABONO / PAGO A UN PEDIDO (Transacción Atómica)
 * Actualiza atómicamente el pedido y crea el registro oficial en `abonos`.
 */
export async function registerPaymentAbono({
  pedidoId,
  monto,
  metodoPago = "Transferencia", // 'Efectivo', 'Transferencia', 'Tarjeta', 'Deuna'
  nota = "",
  fecha
}) {
  if (!pedidoId) throw new Error("Debes especificar el ID del pedido.");
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    throw new Error("El monto del abono debe ser un número mayor a cero.");
  }

  const targetDate = fecha || new Date().toISOString().substring(0, 10);
  const newAbonoRef = doc(collection(db, "abonos"));
  let pedidoData = null;
  let nuevoPagado = 0;
  let saldoRestante = 0;

  await runTransaction(db, async (transaction) => {
    const pedidoRef = doc(db, "pedidos", pedidoId);
    const pedidoSnap = await transaction.get(pedidoRef);

    if (!pedidoSnap.exists()) {
      throw new Error(`El pedido #${pedidoId} no existe.`);
    }

    pedidoData = pedidoSnap.data();
    const totalPedido = parseFloat(pedidoData.total || pedidoData.coste || 0);
    const pagadoActual = parseFloat(pedidoData.pagado || pedidoData.abono || 0);

    nuevoPagado = pagadoActual + montoNum;
    saldoRestante = Math.max(0, totalPedido - nuevoPagado);

    // Si ya completó el pago y estaba pendiente, moverlo a confirmado
    const updateFields = {
      pagado: nuevoPagado,
      abono: nuevoPagado,
      saldoPendiente: saldoRestante,
      updatedAt: Timestamp.now()
    };
    if (saldoRestante <= 0.05 && pedidoData.estado === "pendiente") {
      updateFields.estado = "confirmado";
    }

    transaction.update(pedidoRef, updateFields);
    transaction.set(newAbonoRef, {
      pedidoId,
      monto: montoNum,
      metodoPago: metodoPago.trim(),
      nota: (nota || "Abono registrado desde Claude Desktop").trim(),
      fecha: targetDate,
      createdAt: Timestamp.now()
    });
  });

  return {
    success: true,
    abonoId: newAbonoRef.id,
    pedidoId,
    cliente: pedidoData?.clienteNombre || "Cliente",
    montoAbonado: montoNum.toFixed(2),
    totalPedido: parseFloat(pedidoData?.total || 0).toFixed(2),
    totalPagadoAcumulado: nuevoPagado.toFixed(2),
    saldoRestante: saldoRestante.toFixed(2),
    estadoPago: saldoRestante <= 0.05 ? "TOTALMENTE_PAGADO" : "PAGO_PARCIAL",
    mensaje: `💵 Abono de $${montoNum.toFixed(2)} registrado para ${pedidoData?.clienteNombre || "el pedido"}. Saldo pendiente: $${saldoRestante.toFixed(2)}.`
  };
}

/**
 * REGISTRAR UN GASTO / EGRESO CONTABLE DIRECTO
 * Clasificación COGS vs OPEX estandarizada.
 */
export async function registerExpenseGasto({
  monto,
  categoria = "Materia Prima",
  descripcion,
  metodoPago = "Transferencia",
  proveedor = "",
  fecha
}) {
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    throw new Error("El monto del gasto debe ser un número mayor a cero.");
  }
  if (!descripcion || !descripcion.trim()) {
    throw new Error("La descripción del gasto es obligatoria (ej. 'Compra de 5kg de cobertura de chocolate').");
  }

  const fechaRef = fecha || new Date().toISOString().substring(0, 10);
  const cleanCat = categoria.trim();
  const esCogs = cleanCat.toLowerCase().includes("materia") || cleanCat.toLowerCase().includes("mano de obra");

  const gastoDoc = {
    monto: montoNum,
    subtotal: montoNum,
    iva: 0,
    categoria: cleanCat,
    descripcion: descripcion.trim(),
    proveedor: (proveedor || "").trim(),
    metodoPago: metodoPago.trim(),
    estado: "pagado",
    montoPagado: montoNum,
    montoPendiente: 0,
    esCogs,
    fechaEmision: fechaRef,
    fechaPago: fechaRef,
    mesContable: fechaRef.substring(0, 7),
    origen: "Claude Desktop MCP",
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, "gastos"), gastoDoc);

  return {
    success: true,
    gastoId: docRef.id,
    monto: montoNum.toFixed(2),
    categoria: cleanCat,
    descripcion: descripcion.trim(),
    fecha: fechaRef,
    mensaje: `🧾 Gasto de $${montoNum.toFixed(2)} (${cleanCat}) guardado exitosamente en contabilidad.`
  };
}

/**
 * CONSULTAR ESTADO FINANCIERO Y P&L CONVERSACIONAL (Día, Semana o Mes)
 */
export async function getFinancialSummaryConversational({ fechaInicio, fechaFin, mes } = {}) {
  const [pedidosSnap, abonosSnap, gastosSnap] = await Promise.all([
    getDocs(query(collection(db, "pedidos"), limit(150))),
    getDocs(query(collection(db, "abonos"), limit(200))),
    getDocs(query(collection(db, "gastos"), limit(150)))
  ]);

  let start = fechaInicio;
  let end = fechaFin;
  if (mes) {
    start = `${mes}-01`;
    end = `${mes}-31`;
  }

  // 1. Cobros en Efectivo / Abonos reales del periodo
  let totalDineroCobrado = 0;
  const abonosDetalle = [];
  abonosSnap.forEach(d => {
    const a = d.data();
    const fStr = toDateStr(a.fecha || a.createdAt);
    if (start && fStr < start) return;
    if (end && fStr > end) return;

    const m = parseFloat(a.monto || 0);
    totalDineroCobrado += m;
    abonosDetalle.push({
      monto: m,
      metodo: a.metodoPago || "Efectivo",
      fecha: fStr
    });
  });

  // 2. Ventas Totales contratadas en el periodo
  let totalVentasContratadas = 0;
  let totalPedidosPeriodo = 0;
  let saldoPorCobrarPeriodo = 0;
  const deudores = [];

  pedidosSnap.forEach(d => {
    const p = d.data();
    if (p.estado === "cancelado" || p.estado === "anulado") return;

    const fStr = toDateStr(p.fechaEnvio || p.createdAt);
    if (start && fStr < start) return;
    if (end && fStr > end) return;

    const tot = parseFloat(p.total || p.coste || 0);
    const pag = parseFloat(p.pagado || p.abono || 0);
    const s = Math.max(0, tot - pag);

    totalVentasContratadas += tot;
    totalPedidosPeriodo++;
    if (s > 0.05) {
      saldoPorCobrarPeriodo += s;
      deudores.push({
        orderId: d.id,
        cliente: p.clienteNombre || "Cliente",
        telefono: p.clienteTelefono || "",
        fechaEntrega: fStr,
        total: tot.toFixed(2),
        saldo: s.toFixed(2)
      });
    }
  });

  // 3. Gastos del periodo desglosados por categoría
  let totalGastos = 0;
  const gastosPorCategoria = {};
  const listaGastos = [];

  gastosSnap.forEach(d => {
    const g = d.data();
    const fStr = toDateStr(g.fechaEmision || g.fechaPago || g.createdAt);
    if (start && fStr < start) return;
    if (end && fStr > end) return;

    const m = parseFloat(g.monto || 0);
    totalGastos += m;
    const cat = g.categoria || "Otros";
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + m;

    listaGastos.push({
      id: d.id,
      monto: m.toFixed(2),
      categoria: cat,
      descripcion: g.descripcion || "",
      fecha: fStr
    });
  });

  const flujoCajaNeto = totalDineroCobrado - totalGastos;
  const margenOperativo = totalDineroCobrado > 0 ? ((flujoCajaNeto / totalDineroCobrado) * 100).toFixed(1) : "0";

  return {
    periodo: `${start || "Inicio"} al ${end || "Hoy"}`,
    resumenEjecutivo: {
      totalVentasContratadas: totalVentasContratadas.toFixed(2),
      totalDineroCobradoEnCaja: totalDineroCobrado.toFixed(2),
      totalGastosEgresos: totalGastos.toFixed(2),
      flujoDeCajaNeto: flujoCajaNeto.toFixed(2),
      margenEfectivoPorcentaje: `${margenOperativo}%`,
      pedidosEnPeriodo: totalPedidosPeriodo,
      totalSaldoPorCobrar: saldoPorCobrarPeriodo.toFixed(2)
    },
    gastosDesglosadosPorCategoria: Object.entries(gastosPorCategoria).map(([categoria, monto]) => ({
      categoria,
      monto: monto.toFixed(2),
      porcentajeDelGasto: totalGastos > 0 ? `${((monto / totalGastos) * 100).toFixed(1)}%` : "0%"
    })),
    cuentasPorCobrarPendientes: deudores.slice(0, 10),
    ultimosGastosRegistrados: listaGastos.slice(0, 8)
  };
}

/**
 * AUDITORÍA DE FACTURACIÓN ELECTRÓNICA SRI (Dátil)
 */
export async function getInvoicingAudit({ fechaInicio, fechaFin, soloConError = false } = {}) {
  const pedidosSnap = await getDocs(query(collection(db, "pedidos"), orderBy("fechaEnvio", "desc"), limit(120)));
  
  let facturadas = [];
  let pendientesFacturar = [];
  let conError = [];
  let totalMontoFacturado = 0;
  let totalIvaFacturado = 0;

  for (const doc of pedidosSnap.docs) {
    const p = { id: doc.id, ...doc.data() };
    const fecha = toDateStr(p.fechaEnvio || p.createdAt);

    if (fechaInicio && fecha < fechaInicio) continue;
    if (fechaFin && fecha > fechaFin) continue;

    const fac = p.facturacion;
    const totalPedido = parseFloat(p.total || p.coste || 0);

    if (fac && fac.numeroFactura) {
      const estadoSRI = (fac.estado || "AUTORIZADO").toUpperCase();
      const subtotal = parseFloat(fac.totales?.subtotal || totalPedido / 1.15 || 0);
      const iva = parseFloat(fac.totales?.iva || totalPedido - subtotal || 0);

      const item = {
        orderId: p.id,
        cliente: p.clienteNombre || fac.comprador?.razonSocial || "Consumidor Final",
        numeroFactura: fac.numeroFactura,
        claveAcceso: fac.claveAcceso || "N/A",
        estadoSRI,
        total: parseFloat(fac.totales?.total || totalPedido).toFixed(2),
        iva: iva.toFixed(2),
        ridePdfUrl: fac.ridePdfUrl || null,
        fecha
      };

      if (estadoSRI.includes("ERROR") || estadoSRI.includes("RECHAZADO")) {
        conError.push(item);
      } else {
        facturadas.push(item);
        totalMontoFacturado += parseFloat(item.total);
        totalIvaFacturado += iva;
      }
    } else {
      const pagado = parseFloat(p.pagado || p.abono || 0);
      if (pagado > 0 || p.estado === "entregado" || p.estado === "listo") {
        pendientesFacturar.push({
          orderId: p.id,
          cliente: p.clienteNombre || "Cliente",
          total: totalPedido.toFixed(2),
          pagado: pagado.toFixed(2),
          estado: p.estado || "pendiente",
          fecha
        });
      }
    }
  }

  return {
    resumen: {
      periodo: `${fechaInicio || "Reciente"} a ${fechaFin || "Hoy"}`,
      facturasAutorizadas: facturadas.length,
      facturasConError: conError.length,
      pendientesFacturar: pendientesFacturar.length,
      montoTotalFacturado: totalMontoFacturado.toFixed(2),
      iva15Recaudado: totalIvaFacturado.toFixed(2)
    },
    facturas: soloConError ? conError : facturadas,
    pendientesFacturar: pendientesFacturar.slice(0, 10)
  };
}
