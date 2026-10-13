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

import {
  normalizeEcuadorDate,
  getEcuadorToday,
  getEcuadorMesContable
} from "../utils/ecuadorDateUtils.js";

const CRM_BASE_URL = "https://charbela-crm.firebaseapp.com";

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

  const targetDate = fecha ? normalizeEcuadorDate(fecha) : getEcuadorToday();
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
 * Clasificación COGS vs OPEX estandarizada y alineada al CRM.
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

  const fechaRef = fecha ? normalizeEcuadorDate(fecha) : getEcuadorToday();
  const cleanCat = categoria ? categoria.trim() : "Materia Prima";
  const catLower = cleanCat.toLowerCase();
  
  // Normalizar categoría de transporte/logística
  const finalCat = (catLower === "logistica" || catLower === "logística" || catLower.includes("transporte"))
    ? "LOGISTICA de transporte"
    : cleanCat;

  const esCogs = finalCat.toLowerCase() === "materia prima" || finalCat.toLowerCase() === "mano de obra directa";
  const mesContable = getEcuadorMesContable(fechaRef);
  const provClean = (proveedor || "").trim();

  const gastoDoc = {
    monto: montoNum,
    subtotal: montoNum,
    iva: 0,
    categoria: finalCat,
    descripcion: descripcion.trim(),
    proveedor: provClean,
    proveedorNombre: provClean,
    metodoPago: metodoPago.trim(),
    estado: "pagado",
    montoPagado: montoNum,
    montoPendiente: 0,
    esCogs,
    fechaEmision: fechaRef,
    fechaPago: fechaRef,
    fechaVencimiento: fechaRef,
    diasCredito: 0,
    tipoOperacion: "contado",
    mesContable,
    origen: "Claude Desktop MCP",
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, "gastos"), gastoDoc);

  return {
    success: true,
    gastoId: docRef.id,
    monto: montoNum.toFixed(2),
    categoria: finalCat,
    tipoContable: esCogs ? "COGS (Costo Directo)" : "OPEX (Gasto Operativo)",
    descripcion: descripcion.trim(),
    proveedor: provClean || "No indicado",
    fecha: fechaRef,
    mesContable,
    mensaje: `🧾 Gasto de $${montoNum.toFixed(2)} (${finalCat}) guardado exitosamente en contabilidad (${mesContable}).`
  };
}

/**
 * CONSULTAR ESTADO FINANCIERO Y P&L CONVERSACIONAL (Día, Semana o Mes)
 * Alineado 100% con la lógica y fórmulas de Finanzas.jsx en el CRM de Charbela.
 */
export async function getFinancialSummaryConversational({ fechaInicio, fechaFin, mes } = {}) {
  // Determinar mes contable objetivo
  let targetMes = mes ? mes.trim().substring(0, 7) : null;
  if (!targetMes && fechaInicio) {
    targetMes = fechaInicio.trim().substring(0, 7);
  }
  if (!targetMes) {
    targetMes = getEcuadorMesContable();
  }

  // Traer pedidos y gastos del CRM
  const [pedidosSnap, gastosSnap] = await Promise.all([
    getDocs(query(collection(db, "pedidos"), limit(300))),
    getDocs(query(collection(db, "gastos"), where("mesContable", "==", targetMes)))
  ]);

  let gastosDocs = gastosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (gastosDocs.length === 0) {
    const todosGastosSnap = await getDocs(query(collection(db, "gastos"), limit(250)));
    gastosDocs = todosGastosSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(g => {
        const f = normalizeEcuadorDate(g.fechaEmision || g.fechaPago || g.createdAt);
        return f.startsWith(targetMes) || g.mesContable === targetMes;
      });
  }

  // Normalizador de categoría idéntico a Finanzas.jsx
  const normalizarCat = (cat) => {
    if (!cat) return "Otros";
    const cl = String(cat).trim().toLowerCase();
    if (cl === "logística" || cl === "logistica" || cl === "logistica de transporte" || cl === "logística de transporte") {
      return "LOGISTICA de transporte";
    }
    return String(cat).trim();
  };

  // Conjunto COGS (Costo directo de ventas)
  const isCogs = (cat) => {
    const l = normalizarCat(cat).toLowerCase();
    return l === "materia prima" || l === "mano de obra directa";
  };

  // 1. Filtrar y procesar gastos
  let totalEgresosMes = 0;
  let totalCOGS = 0;
  let totalOPEX = 0;
  let totalIvaAcreditable = 0;
  const gastosPorCategoria = {};
  const listaGastos = [];
  const cxpPendientes = [];

  for (const g of gastosDocs) {
    const fStr = normalizeEcuadorDate(g.fechaEmision || g.fechaPago || g.createdAt);
    if (fStr < "2026-06-01") continue;

    const monto = parseFloat(g.monto || 0);
    const catNorm = normalizarCat(g.categoria);
    totalEgresosMes += monto;
    totalIvaAcreditable += parseFloat(g.iva || 0);

    if (isCogs(catNorm)) {
      totalCOGS += monto;
    } else {
      totalOPEX += monto;
    }

    gastosPorCategoria[catNorm] = (gastosPorCategoria[catNorm] || 0) + monto;

    listaGastos.push({
      id: g.id,
      monto: monto.toFixed(2),
      categoria: catNorm,
      tipoContable: isCogs(catNorm) ? "COGS" : "OPEX",
      descripcion: g.descripcion || "",
      proveedor: g.proveedor || g.proveedorNombre || "No indicado",
      fecha: fStr
    });

    // Cuentas por pagar (CxP): si está pendiente de pago o es a crédito
    const saldoPendiente = parseFloat(g.montoPendiente !== undefined ? g.montoPendiente : (g.estado !== 'pagado' ? g.monto : 0));
    if (saldoPendiente > 0.05 || (g.tipoOperacion === 'credito' && g.estado !== 'pagado')) {
      cxpPendientes.push({
        gastoId: g.id,
        proveedor: g.proveedor || g.proveedorNombre || "Proveedor",
        descripcion: g.descripcion || "",
        montoTotal: monto.toFixed(2),
        montoPendiente: saldoPendiente.toFixed(2),
        fechaVencimiento: normalizeEcuadorDate(g.fechaVencimiento || g.fechaEmision)
      });
    }
  }

  // 2. Filtrar y procesar pedidos del mes
  const estadosExcluidos = new Set(["borrador", "enviada", "cotización", "cotizacion", "cancelado", "anulado", "archivado"]);
  let totalIngresosDevengado = 0;
  let totalCobradoMes = 0;
  let pedidosValidosCount = 0;
  const cxcPendientes = [];

  for (const doc of pedidosSnap.docs) {
    const p = doc.data();
    const st = (p.estado || "").toLowerCase();
    if (estadosExcluidos.has(st)) continue;

    const fEnvio = normalizeEcuadorDate(p.fechaEnvio || p.fecha || p.createdAt);
    if (!fEnvio.startsWith(targetMes) || fEnvio < "2026-06-01") continue;

    const total = parseFloat(p.total || p.coste || 0);
    const pagado = parseFloat(p.pagado || p.abono || 0);
    const saldo = Math.max(0, total - pagado);

    totalIngresosDevengado += total;
    totalCobradoMes += pagado;
    pedidosValidosCount++;

    if (saldo > 0.05) {
      cxcPendientes.push({
        orderId: doc.id,
        cliente: p.clienteNombre || "Cliente",
        telefono: p.clienteTelefono || "",
        fechaEntrega: fEnvio,
        total: total.toFixed(2),
        saldo: saldo.toFixed(2),
        estado: p.estado || "pendiente"
      });
    }
  }

  // 3. Cálculos P&L (Devengado)
  const utilidadBruta = totalIngresosDevengado - totalCOGS;
  const margenBrutoPct = totalIngresosDevengado > 0 ? ((utilidadBruta / totalIngresosDevengado) * 100).toFixed(1) : "0.0";

  const utilidadNeta = utilidadBruta - totalOPEX;
  const margenNetoPct = totalIngresosDevengado > 0 ? ((utilidadNeta / totalIngresosDevengado) * 100).toFixed(1) : "0.0";

  // 4. Flujo de Caja
  const flujoCajaNeto = totalCobradoMes - totalEgresosMes;

  // Cuentas por Cobrar y por Pagar
  const totalCxC = cxcPendientes.reduce((sum, c) => sum + parseFloat(c.saldo), 0);
  const totalCxP = cxpPendientes.reduce((sum, c) => sum + parseFloat(c.montoPendiente), 0);

  // 5. Análisis Proactivo de Mejoras y Alertas para Fernando
  const hallazgos = [];
  const lineasParaCopiar = [];

  // A. Cuotas de Préstamo / Hipotecarias en OPEX o Servicios
  const cuotasHipotecas = [];
  for (const g of gastosDocs) {
    const desc = (g.descripcion || "").toLowerCase();
    const prov = (g.proveedor || g.proveedorNombre || "").toLowerCase();
    const cat = (g.categoria || "").toLowerCase();
    const notas = (g.notas || g.nota || "").toLowerCase();
    const combined = `${desc} ${prov} ${cat} ${notas}`;

    const esCuotaBancaria =
      combined.includes("hipoteca") || combined.includes("hipotecario") ||
      combined.includes("prestamo") || combined.includes("préstamo") ||
      combined.includes("credito") || combined.includes("crédito") ||
      (combined.includes("cuota") && (combined.includes("banco") || combined.includes("pichincha") || combined.includes("guayaquil") || combined.includes("biess") || combined.includes("cfn")));

    if (esCuotaBancaria) {
      cuotasHipotecas.push({
        id: g.id,
        monto: parseFloat(g.monto || 0),
        descripcion: g.descripcion || "Cuota o préstamo",
        categoria: g.categoria || "Servicios",
        proveedor: g.proveedor || g.proveedorNombre || "Banco",
        fecha: normalizeEcuadorDate(g.fechaEmision || g.fechaPago || g.createdAt)
      });
    }
  }

  if (cuotasHipotecas.length > 0) {
    const totalCuotas = cuotasHipotecas.reduce((s, c) => s + c.monto, 0);
    hallazgos.push({
      tipo: "clasificacion_contable",
      prioridad: "alta",
      titulo: "Cuota de préstamo / hipotecario registrada como OPEX puro",
      detalle: `Se detectaron $${totalCuotas.toFixed(2)} (${cuotasHipotecas.map(c => `#${c.id.substring(0, 6)}: $${c.monto.toFixed(2)} en '${c.categoria}'`).join(", ")}). Una cuota bancaria debe desglosarse en INTERÉS (gasto deducible) y CAPITAL (amortización de pasivo que no es gasto). Al registrarla completa como gasto operativo, se exagera la pérdida y se pierde deducibilidad limpia ante el SRI.`,
      accionSugerida: "Desglosar la cuota entre interés y amortización de capital en el CRM para no abultar el déficit contable."
    });
    lineasParaCopiar.push(`🏦 *Hipotecario/Préstamo:* Hay $${totalCuotas.toFixed(2)} registrado como gasto completo en OPEX. Conviene separar la cuota en interés (gasto) y amortización de capital en el CRM para no inflar la pérdida de ${targetMes}.`);
  }

  // B. Detección de COGS atípicamente bajo (< 20%)
  if (totalIngresosDevengado > 500) {
    const cogsPct = (totalCOGS / totalIngresosDevengado) * 100;
    if (cogsPct < 20) {
      hallazgos.push({
        tipo: "costo_de_ventas",
        prioridad: "media",
        titulo: `COGS atípicamente bajo (${cogsPct.toFixed(1)}% vs rango normal 25%-35%)`,
        detalle: `En pastelería artesanal, el costo directo de materia prima suele oscilar entre 25% y 35%. Un COGS de ${cogsPct.toFixed(1)}% sugiere compras pendientes de registrar o empaques/cajas ingresados como OPEX.`,
        accionSugerida: "Revisar facturas de insumos pendientes o reclasificar cajas/empaques a Costo Directo."
      });
      lineasParaCopiar.push(`🎂 *COGS Bajo (${cogsPct.toFixed(1)}%):* La materia prima está baja frente a lo usual en pastelería (25-35%). Puede que falten facturas por cargar o que las cajas/empaques deban reclasificarse a costo directo.`);
    }
  }

  // C. Detección de empaques/cajas en Gastos de Operación
  let totalEmpaquesEnOpex = 0;
  const empaquesList = [];
  for (const g of gastosDocs) {
    const desc = (g.descripcion || "").toLowerCase();
    const prov = (g.proveedor || g.proveedorNombre || "").toLowerCase();
    const cat = (g.categoria || "").toLowerCase();
    if (cat.includes("operacion") || cat.includes("operación") || cat.includes("servicios")) {
      if (desc.includes("caja") || desc.includes("carton") || desc.includes("cartón") || desc.includes("blonda") || desc.includes("empaque") || prov.includes("cartones del pacifico")) {
        const m = parseFloat(g.monto || 0);
        totalEmpaquesEnOpex += m;
        empaquesList.push(`${g.descripcion || prov} ($${m.toFixed(2)})`);
      }
    }
  }
  if (totalEmpaquesEnOpex > 0) {
    hallazgos.push({
      tipo: "reclasificacion_empaques",
      prioridad: "baja",
      titulo: `Cajas y empaques en Gastos de Operación ($${totalEmpaquesEnOpex.toFixed(2)})`,
      detalle: `Se detectaron ${empaquesList.join(", ")} en Gastos de Operación. Como se consumen directamente con cada torta vendida, pertenecen a Costo Directo (COGS).`,
      accionSugerida: "Reclasificar empaques a Costo Directo para que el margen bruto de pastelería sea preciso."
    });
  }

  // D. Detección de gastos significativos sin comprobante (SRI)
  const gastosGrandesSinComprobante = [];
  for (const g of gastosDocs) {
    const m = parseFloat(g.monto || 0);
    const tieneSustento = Boolean(g.facturaUrl || g.comprobanteUrl || g.referenciaBancaria || g.autorizacionSRI);
    if (m >= 50 && !tieneSustento) {
      gastosGrandesSinComprobante.push({
        id: g.id,
        monto: m,
        proveedor: g.proveedor || g.proveedorNombre || "No indicado",
        descripcion: g.descripcion || "",
        fecha: normalizeEcuadorDate(g.fechaEmision || g.fechaPago || g.createdAt)
      });
    }
  }
  if (gastosGrandesSinComprobante.length > 0) {
    const totalSinSustento = gastosGrandesSinComprobante.reduce((s, g) => s + g.monto, 0);
    const listaNombres = gastosGrandesSinComprobante.slice(0, 4).map(g => `${g.proveedor}: $${g.monto.toFixed(2)}`).join(", ");
    hallazgos.push({
      tipo: "tributario_sri",
      prioridad: "alta",
      titulo: `${gastosGrandesSinComprobante.length} gastos significativos sin comprobante ($${totalSinSustento.toFixed(2)})`,
      detalle: `Para el SRI ecuatoriano, los gastos sin factura autorizada con RUC pierden deducibilidad de Impuesto a la Renta. Egresos grandes sin soporte: ${listaNombres}.`,
      accionSugerida: "Solicitar facturas a proveedores o subir comprobantes para asegurar deducibilidad."
    });
    lineasParaCopiar.push(`🧾 *Sustento SRI:* Hay ${gastosGrandesSinComprobante.length} gastos fuertes por $${totalSinSustento.toFixed(2)} sin comprobante (${listaNombres}). Se está perdiendo base deducible ante el SRI.`);
  }

  // E. Déficit contable vs flujo real
  if (utilidadNeta < 0 && flujoCajaNeto >= 0) {
    lineasParaCopiar.push(`📊 *Déficit vs Caja:* En papel hay déficit contable de $${Math.abs(utilidadNeta).toFixed(2)}, pero la caja operativa tuvo superávit de $${flujoCajaNeto.toFixed(2)}. Es una discrepancia por cuotas bancarias o compras temporales.`);
  }

  // Generar bloque listo para enviar
  let tarjetaParaCopiar = "";
  if (lineasParaCopiar.length > 0) {
    tarjetaParaCopiar = [
      `📌 **Mensaje para Fernando (puedes copiarle esto):**`,
      `> Hola Fer, al revisar el CRM con el asistente salieron estos puntos técnicos/contables del mes de ${targetMes}:`,
      ...lineasParaCopiar.map(l => `> • ${l}`),
      `> ¿Me ayudas revisando cómo ajustarlo en el CRM o en las reglas del sistema?`
    ].join("\n");
  }

  const observacionesParaFernando = {
    requiereAtencionFernando: hallazgos.length > 0,
    totalAlertas: hallazgos.length,
    resumen: hallazgos.length > 0
      ? `Se detectaron ${hallazgos.length} alertas contables o de configuración técnica que convendría que Fernando revise.`
      : "No se detectaron anomalías contables ni de configuración en este periodo.",
    tarjetaParaCopiar,
    items: hallazgos
  };

  return {
    periodo: targetMes,
    resumenEjecutivo: {
      totalVentasContratadas: totalIngresosDevengado.toFixed(2),
      totalDineroCobradoEnCaja: totalCobradoMes.toFixed(2),
      totalGastosEgresos: totalEgresosMes.toFixed(2),
      flujoDeCajaNeto: flujoCajaNeto.toFixed(2),
      utilidadNetaDevengada: utilidadNeta.toFixed(2),
      margenNetoPorcentaje: `${margenNetoPct}%`
    },
    criterioDevengado: {
      ingresosTotalesFacturados: totalIngresosDevengado.toFixed(2),
      cogsCostoDeVentas: totalCOGS.toFixed(2),
      utilidadBruta: utilidadBruta.toFixed(2),
      margenBrutoPorcentaje: `${margenBrutoPct}%`,
      opexGastosOperativos: totalOPEX.toFixed(2),
      utilidadNeta: utilidadNeta.toFixed(2),
      margenNetoPorcentaje: `${margenNetoPct}%`,
      pedidosConfirmados: pedidosValidosCount
    },
    criterioFlujoDeCaja: {
      dineroCobradoEnEfectivo: totalCobradoMes.toFixed(2),
      totalEgresosPagados: totalEgresosMes.toFixed(2),
      flujoNetoDeCaja: flujoCajaNeto.toFixed(2),
      estadoCaja: flujoCajaNeto >= 0 ? "SUPERAVIT" : "DEFICIT"
    },
    posicionLiquidez: {
      cuentasPorCobrarClientesCxC: totalCxC.toFixed(2),
      cuentasPorPagarProveedoresCxP: totalCxP.toFixed(2),
      ivaAcreditableSoportado: totalIvaAcreditable.toFixed(2)
    },
    observacionesParaFernando,
    desgloseGastosPorCategoria: Object.entries(gastosPorCategoria).map(([categoria, monto]) => ({
      categoria,
      clasificacion: isCogs(categoria) ? "COGS (Directo)" : "OPEX (Operativo)",
      monto: monto.toFixed(2),
      porcentajeDelGasto: totalEgresosMes > 0 ? `${((monto / totalEgresosMes) * 100).toFixed(1)}%` : "0%"
    })),
    clientesPendientesDePagoCxC: cxcPendientes.slice(0, 25),
    cuentasPorPagarCxP: cxpPendientes.slice(0, 25),
    ultimosGastosRegistrados: listaGastos.slice(0, 25)
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
    const fecha = normalizeEcuadorDate(p.fechaEnvio || p.createdAt);

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
