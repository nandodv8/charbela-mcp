// crm-charbela/mcp-server/src/services/expenseReceiptService.js
// Asistente Inteligente de Gastos, Comprobantes Bancarios y Conciliación para Charbela
// Desarrollado con los criterios de Bookkeeper & Controller (Dana) y Workflow Architect

import { db, storage } from "../firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

import {
  normalizeEcuadorDate,
  getEcuadorToday,
  getEcuadorMesContable
} from "../utils/ecuadorDateUtils.js";

/**
 * Heurística ecuatoriana para inferir la categoría contable de un gasto
 */
export function inferCategoryFromText(text = "") {
  const t = text.toLowerCase();

  // Materia Prima (COGS directo)
  if (
    t.includes("supermaxi") || t.includes("comisariato") || t.includes("espanola") || t.includes("española") ||
    t.includes("harina") || t.includes("mantequilla") || t.includes("chocolate") || t.includes("fresas") ||
    t.includes("azucar") || t.includes("azúcar") || t.includes("huevos") || t.includes("leche") ||
    t.includes("queso") || t.includes("crema") || t.includes("chantilly") || t.includes("maracuya") ||
    t.includes("maracuyá") || t.includes("molinos") || t.includes("distribuidora") || t.includes("insumo")
  ) {
    return "Materia Prima";
  }

  // Servicios Básicos
  if (
    t.includes("cnel") || t.includes("luz") || t.includes("interagua") || t.includes("agua") ||
    t.includes("claro") || t.includes("cnt") || t.includes("movistar") || t.includes("netlife") ||
    t.includes("internet") || t.includes("gas")
  ) {
    return "Servicios";
  }

  // Logística y Transporte
  if (
    t.includes("gasolina") || t.includes("combustible") || t.includes("primax") || t.includes("terpel") ||
    t.includes("petro") || t.includes("chofer") || t.includes("carrera") || t.includes("delivery") ||
    t.includes("envio") || t.includes("envío") || t.includes("peaje")
  ) {
    return "LOGISTICA de transporte";
  }

  // Operación y Empaques
  if (
    t.includes("cajas") || t.includes("empaque") || t.includes("bolsas") || t.includes("blondas") ||
    t.includes("moldes") || t.includes("papel") || t.includes("servilletas") || t.includes("cloro") ||
    t.includes("detergente") || t.includes("limpieza")
  ) {
    return "Gastos de operación";
  }

  // Mantenimiento
  if (
    t.includes("reparacion") || t.includes("reparación") || t.includes("horno") || t.includes("batidora") ||
    t.includes("mantenimiento") || t.includes("tecnico") || t.includes("técnico") || t.includes("repuesto")
  ) {
    return "Mantenimiento";
  }

  // Comisiones Bancarias / Deuna
  if (
    t.includes("deuna") || t.includes("datafast") || t.includes("medianet") || t.includes("comision") ||
    t.includes("comisión") || t.includes("retencion") || t.includes("retención")
  ) {
    return "Comisiones bancarias";
  }

  // Nómina y Sueldos
  if (
    t.includes("sueldo") || t.includes("salario") || t.includes("quincena") ||
    t.includes("liquidaci") || t.includes("iess") || t.includes("nomina") || t.includes("nómina")
  ) {
    return "Nómina";
  }

  // Marketing y Publicidad
  if (
    t.includes("facebook") || t.includes("meta") || t.includes("instagram") ||
    t.includes("publicidad") || t.includes("marketing") || t.includes("pauta") ||
    t.includes("ramiro") || t.includes("redes")
  ) {
    return "Marketing";
  }

  // Renta y Cuota de Inmueble (Taller)
  if (
    t.includes("alquiler") || t.includes("arriendo") || t.includes("renta") ||
    t.includes("hipoteca") || t.includes("hipotecario") || t.includes("local")
  ) {
    return "Renta";
  }

  return "Otros";
}

/**
 * PARSEA EL TEXTO DE UN CORREO DE NOTIFICACIÓN BANCARIA (Pichincha, Guayaquil, Deuna, etc.)
 */
export function parseBankNotificationText(emailText = "") {
  if (!emailText || !emailText.trim()) {
    throw new Error("El texto del correo o notificación no puede estar vacío.");
  }

  const clean = emailText.replace(/\r\n/g, "\n");

  // 1. Detección de Banco
  let banco = "Banco No Identificado";
  if (/pichincha/i.test(clean)) banco = "Banco Pichincha";
  else if (/guayaquil/i.test(clean)) banco = "Banco Guayaquil";
  else if (/produbanco/i.test(clean)) banco = "Produbanco";
  else if (/pac[ií]fico/i.test(clean)) banco = "Banco del Pacífico";
  else if (/deuna/i.test(clean)) banco = "Deuna";

  // 2. Extracción de Monto (ej: $45.50, 45,50 USD, USD 120.00, etc.)
  let monto = 0;
  const montoRegex = /(?:USD|\$|valor|monto)[:\s]*([0-9]{1,4}[.,][0-9]{2})/i;
  const montoMatch = clean.match(montoRegex) || clean.match(/\b([0-9]{1,4}[.,][0-9]{2})\s*(?:USD|\$)/i);
  if (montoMatch) {
    monto = parseFloat(montoMatch[1].replace(",", "."));
  } else {
    // Buscar cualquier decimal con formato de moneda
    const generalMonto = clean.match(/([0-9]+[.,][0-9]{2})/);
    if (generalMonto) monto = parseFloat(generalMonto[1].replace(",", "."));
  }

  // 3. Extracción de Beneficiario / Establecimiento
  let proveedor = "Comercio / Proveedor";
  const proveedorRegex = /(?:a favor de|beneficiario|establecimiento|comercio|en|destinatario)[:\s]+([^\n.,;]+)/i;
  const provMatch = clean.match(proveedorRegex);
  if (provMatch && provMatch[1].trim().length > 2) {
    proveedor = provMatch[1].trim().replace(/\s{2,}/g, " ");
  }

  // 4. Extracción de Referencia o Código de Autorización
  let referencia = "";
  const refRegex = /(?:autorizaci[oó]n|referencia|documento|secuencial|comprobante|transacci[oó]n)[:\s#]*([0-9a-zA-Z]{4,20})/i;
  const refMatch = clean.match(refRegex);
  if (refMatch) {
    referencia = refMatch[1].trim();
  }

  // 5. Extracción de Fecha
  let fecha = getEcuadorToday();
  const fechaRegex = /([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{4})/;
  const fechaMatch = clean.match(fechaRegex);
  if (fechaMatch) {
    const dia = fechaMatch[1].padStart(2, "0");
    const mes = fechaMatch[2].padStart(2, "0");
    const anio = fechaMatch[3];
    fecha = normalizeEcuadorDate(`${anio}-${mes}-${dia}`);
  }

  // 6. Inferencia de Categoría y Método
  const categoriaSugerida = inferCategoryFromText(`${proveedor} ${clean}`);
  const metodoPago = /transferencia/i.test(clean) ? "Transferencia" : (/deuna/i.test(clean) ? "Deuna" : "Tarjeta de Débito");

  return {
    banco,
    monto,
    proveedor,
    referencia,
    fecha,
    categoriaSugerida,
    metodoPago,
    descripcionSugerida: `Pago a ${proveedor} (${banco})`
  };
}

/**
 * REGISTRAR UN GASTO CON COMPROBANTE Y VERIFICACIÓN ANTI-DUPLICADOS
 */
export async function registerExpenseWithReceipt({
  monto,
  categoria,
  descripcion,
  proveedor = "",
  metodoPago = "Transferencia",
  fecha,
  referenciaBancaria = "",
  banco = "",
  comprobanteUrl = null,
  comprobanteBase64 = null,
  notas = ""
}) {
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    throw new Error("El monto del gasto debe ser un número válido mayor a 0.");
  }
  if (!descripcion || !descripcion.trim()) {
    throw new Error("Debes indicar una descripción o detalle del gasto.");
  }

  const targetDate = fecha ? normalizeEcuadorDate(fecha) : getEcuadorToday();
  const targetMes = getEcuadorMesContable(targetDate);
  const rawCat = categoria ? categoria.trim() : inferCategoryFromText(`${descripcion} ${proveedor}`);
  const catLower = rawCat.toLowerCase();
  const cleanCat = (catLower === "logistica" || catLower === "logística" || catLower.includes("transporte"))
    ? "LOGISTICA de transporte"
    : rawCat;

  const refLimpia = (referenciaBancaria || "").trim();
  const provClean = (proveedor || "").trim();

  // 1. REVISIÓN ANTI-DUPLICADOS: Evitar que Charbela registre el mismo comprobante 2 veces
  if (refLimpia) {
    const duplicateQuery = query(
      collection(db, "gastos"),
      where("referenciaBancaria", "==", refLimpia),
      limit(1)
    );
    const dupSnap = await getDocs(duplicateQuery);
    if (!dupSnap.empty) {
      const dup = dupSnap.docs[0].data();
      return {
        success: false,
        duplicado: true,
        gastoExistenteId: dupSnap.docs[0].id,
        mensaje: `⚠️ Este comprobante ya fue registrado anteriormente (Gasto #${dupSnap.docs[0].id.substring(0, 6)} por $${dup.monto} el ${dup.fechaEmision}).`
      };
    }
  }

  // 2. Subida de imagen a Firebase Storage si se proporcionó base64
  let finalComprobanteUrl = comprobanteUrl;
  if (comprobanteBase64 && !finalComprobanteUrl) {
    try {
      const fileName = `gastos/${targetDate}_${Date.now()}_comprobante.jpg`;
      const storageRef = ref(storage, fileName);
      const cleanBase64 = comprobanteBase64.includes(",") ? comprobanteBase64 : `data:image/jpeg;base64,${comprobanteBase64}`;
      await uploadString(storageRef, cleanBase64, "data_url");
      finalComprobanteUrl = await getDownloadURL(storageRef);
    } catch (storageErr) {
      console.warn("No se pudo subir a Storage, guardando referencia:", storageErr.message);
    }
  }

  const esCogs = cleanCat.toLowerCase() === "materia prima" || cleanCat.toLowerCase() === "mano de obra directa";

  const nuevoGasto = {
    monto: montoNum,
    subtotal: montoNum,
    iva: 0,
    categoria: cleanCat,
    descripcion: descripcion.trim(),
    proveedor: provClean,
    proveedorNombre: provClean,
    metodoPago: metodoPago.trim(),
    estado: "pagado",
    montoPagado: montoNum,
    montoPendiente: 0,
    esCogs,
    referenciaBancaria: refLimpia || null,
    banco: (banco || "").trim() || null,
    facturaUrl: finalComprobanteUrl,
    comprobanteUrl: finalComprobanteUrl,
    tieneComprobante: Boolean(finalComprobanteUrl || refLimpia),
    fechaEmision: targetDate,
    fechaPago: targetDate,
    fechaVencimiento: targetDate,
    diasCredito: 0,
    tipoOperacion: "contado",
    mesContable: targetMes,
    notas: (notas || "").trim(),
    origen: "Claude Desktop MCP Gastos",
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, "gastos"), nuevoGasto);

  return {
    success: true,
    gastoId: docRef.id,
    monto: montoNum.toFixed(2),
    categoria: cleanCat,
    tipoContable: esCogs ? "COGS (Costo Directo)" : "OPEX (Gasto Operativo)",
    proveedor: provClean || "No especificado",
    referenciaBancaria: refLimpia || "Sin referencia",
    fecha: targetDate,
    mesContable: targetMes,
    comprobanteAdjunto: Boolean(finalComprobanteUrl),
    comprobanteUrl: finalComprobanteUrl,
    mensaje: `🧾 Gasto de $${montoNum.toFixed(2)} registrado exitosamente bajo "${cleanCat}" en periodo ${targetMes}.`
  };
}

/**
 * CONCILIAR ESTADO DE CUENTA BANCARIO
 * Cruza una lista de movimientos contra los gastos registrados en el CRM para hallar faltantes
 */
export async function reconcileBankStatement({ transacciones = [] }) {
  if (!Array.isArray(transacciones) || transacciones.length === 0) {
    throw new Error("Debes proporcionar una lista de transacciones del estado de cuenta.");
  }

  // Traer los gastos de los últimos 60 días
  const gastosSnap = await getDocs(query(collection(db, "gastos"), limit(250)));
  const gastosRegistrados = gastosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const conciliadas = [];
  const noRegistradas = [];
  let totalDebitosEstadoCuenta = 0;
  let totalFaltantePorRegistrar = 0;

  for (const t of transacciones) {
    const monto = parseFloat(t.monto || 0);
    const tipo = (t.tipo || "debito").toLowerCase();
    const fecha = t.fecha ? normalizeEcuadorDate(t.fecha) : "";
    const descripcion = (t.descripcion || "").trim();
    const referencia = (t.referencia || "").trim();

    if (tipo === "debito" || tipo === "egreso" || monto > 0) {
      totalDebitosEstadoCuenta += monto;

      // Buscar si ya coincide con algún gasto en Firestore
      const match = gastosRegistrados.find(g => {
        const mismoMonto = Math.abs((parseFloat(g.monto || 0)) - monto) < 0.05;
        const mismaRef = referencia && g.referenciaBancaria && g.referenciaBancaria.toLowerCase() === referencia.toLowerCase();
        const mismaFecha = fecha && g.fechaEmision && Math.abs(new Date(g.fechaEmision) - new Date(fecha)) <= 86400000 * 2;
        return mismaRef || (mismoMonto && mismaFecha);
      });

      if (match) {
        conciliadas.push({
          transaccion: t,
          gastoId: match.id,
          estado: "CONCILIADO",
          categoria: match.categoria
        });
      } else {
        totalFaltantePorRegistrar += monto;
        const categoriaSugerida = inferCategoryFromText(descripcion);
        noRegistradas.push({
          transaccion: {
            fecha: fecha || getEcuadorToday(),
            descripcion,
            monto: monto.toFixed(2),
            referencia: referencia || "N/A"
          },
          categoriaSugerida,
          estado: "FALTA_REGISTRAR"
        });
      }
    }
  }

  return {
    resumen: {
      totalMovimientosAnalizados: transacciones.length,
      totalDebitosMonto: totalDebitosEstadoCuenta.toFixed(2),
      yaRegistradosEnCRM: conciliadas.length,
      pendientesPorRegistrar: noRegistradas.length,
      montoPendientePorRegistrar: totalFaltantePorRegistrar.toFixed(2),
      porcentajeConciliado: totalDebitosEstadoCuenta > 0
        ? `${(((totalDebitosEstadoCuenta - totalFaltantePorRegistrar) / totalDebitosEstadoCuenta) * 100).toFixed(1)}%`
        : "100%"
    },
    movimientosFaltantesParaRegistrar: noRegistradas,
    movimientosConciliados: conciliadas.slice(0, 10)
  };
}

/**
 * REGISTRAR GASTOS EN LOTE TRAS REVISIÓN DEL ESTADO DE CUENTA
 */
export async function batchRegisterExpenses({ gastos = [] }) {
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error("Debes proporcionar una lista de gastos para registrar.");
  }

  const resultados = [];
  let totalRegistrado = 0;

  for (const g of gastos) {
    try {
      const res = await registerExpenseWithReceipt(g);
      if (res.success) {
        totalRegistrado += parseFloat(g.monto || 0);
        resultados.push({ ...g, status: "registrado", gastoId: res.gastoId });
      } else {
        resultados.push({ ...g, status: "duplicado_o_ignorado", motivo: res.mensaje });
      }
    } catch (e) {
      resultados.push({ ...g, status: "error", error: e.message });
    }
  }

  return {
    totalProcesados: gastos.length,
    totalMontoRegistrado: totalRegistrado.toFixed(2),
    detalles: resultados,
    mensaje: `🎉 Se registraron ${resultados.filter(r => r.status === 'registrado').length} gastos exitosamente por un total de $${totalRegistrado.toFixed(2)}.`
  };
}

/**
 * CONSULTA GASTOS RECIENTES QUE NO TIENEN COMPROBANTE ADJUNTO (Auditoría preventiva)
 */
export async function getExpensesWithoutReceipts({ limite = 15 } = {}) {
  const snap = await getDocs(query(collection(db, "gastos"), orderBy("fechaEmision", "desc"), limit(60)));
  const sinComprobante = [];

  for (const d of snap.docs) {
    const g = d.data();
    if (!g.facturaUrl && !g.comprobanteUrl && !g.referenciaBancaria) {
      sinComprobante.push({
        gastoId: d.id,
        monto: parseFloat(g.monto || 0).toFixed(2),
        categoria: g.categoria || "Otros",
        descripcion: g.descripcion || "Sin descripción",
        fecha: g.fechaEmision || g.fechaPago || "Reciente",
        proveedor: g.proveedor || "No indicado"
      });
    }
    if (sinComprobante.length >= limite) break;
  }

  const gastosPesados = sinComprobante.filter(g => parseFloat(g.monto) >= 50);
  const totalPesado = gastosPesados.reduce((s, g) => s + parseFloat(g.monto), 0);

  const tarjetaParaCopiar = gastosPesados.length > 0
    ? [
        `📌 **Mensaje para Fernando (puedes copiarle esto):**`,
        `> Hola Fer, en la auditoría de comprobantes del CRM encontré ${sinComprobante.length} gastos sin sustento.`,
        `> • Hay ${gastosPesados.length} gastos mayores a $50 que suman $${totalPesado.toFixed(2)} (ej. ${gastosPesados.slice(0, 3).map(g => `${g.proveedor}: $${g.monto}`).join(", ")}).`,
        `> Para efectos del SRI, estos gastos no son deducibles sin comprobante autorizado. ¿Me ayudas revisando cuáles se pueden solicitar o cargar?`
      ].join("\n")
    : "";

  const observacionesParaFernando = {
    requiereAtencionFernando: gastosPesados.length > 0,
    resumen: gastosPesados.length > 0
      ? `${gastosPesados.length} gastos significativos sin comprobante por $${totalPesado.toFixed(2)}.`
      : "No hay gastos de alto monto pendientes de comprobante.",
    tarjetaParaCopiar
  };

  return {
    totalGastosSinComprobante: sinComprobante.length,
    gastos: sinComprobante,
    observacionesParaFernando,
    mensaje: sinComprobante.length > 0
      ? `Hay ${sinComprobante.length} gastos registrados recientemente que aún no tienen comprobante o número de autorización asociado.`
      : "¡Excelente! Todos los gastos recientes tienen su comprobante o referencia bancaria registrada."
  };
}
