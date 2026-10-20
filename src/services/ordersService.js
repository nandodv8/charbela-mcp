// crm-charbela/mcp-server/src/services/ordersService.js
// Gestión Completa de Pedidos y Obrador (Lectura Profunda y Mutaciones Conversacionales)
// Rediseñado con el framework de Agency Agents: Specialized MCP Builder & Workflow Architect

import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  Timestamp
} from "firebase/firestore";

import {
  normalizeEcuadorDate,
  getEcuadorToday
} from "../utils/ecuadorDateUtils.js";

import {
  resolveFechaPedido,
  esProduccionActiva,
  coincideEstado,
  normalizeEstado,
  esCotizacion
} from "./estados.js";

const CRM_BASE_URL = "https://crm.charbelapasteleria.com";

/**
 * Extrae y estructura la información de diseño y adjuntos de un pedido
 */
export function extraerDiseno(pedido) {
  if (!pedido) {
    return {
      definido: false,
      tieneAdjunto: false,
      requiereDiseno: false,
      urls: [],
      tematica: null,
      textoConfirmado: null,
      notasDiseno: null
    };
  }

  const urls = [];
  if (pedido.fotoDisenoEvento && typeof pedido.fotoDisenoEvento === "string" && pedido.fotoDisenoEvento.trim()) {
    urls.push(pedido.fotoDisenoEvento.trim());
  }
  if (pedido.disenoUrl && typeof pedido.disenoUrl === "string" && pedido.disenoUrl.trim()) {
    urls.push(pedido.disenoUrl.trim());
  }
  if (Array.isArray(pedido.adjuntos)) {
    pedido.adjuntos.forEach(u => {
      if (typeof u === "string" && u.trim()) urls.push(u.trim());
    });
  }

  const items = pedido.items || pedido.cart || [];
  let tieneItemDecorado = false;
  let textoPauta = pedido.pautaDiseno?.textoConfirmado?.fraseExacta || "";

  for (const it of items) {
    const cat = (it.categoria || "").toLowerCase();
    const nom = (it.nombre || it.name || "").toLowerCase();
    if (cat.includes("decorad") || nom.includes("decorad") || nom.includes("fondant") || nom.includes("torta personaliz")) {
      tieneItemDecorado = true;
    }
    if (Array.isArray(it.imagenes)) {
      it.imagenes.forEach(u => {
        if (typeof u === "string" && u.trim()) urls.push(u.trim());
      });
    }
    if (it.pautaDiseno?.textoConfirmado?.fraseExacta && !textoPauta) {
      textoPauta = it.pautaDiseno.textoConfirmado.fraseExacta;
    }
  }

  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  const tieneAdjunto = uniqueUrls.length > 0;
  const tematica = pedido.tematica && String(pedido.tematica).trim() ? String(pedido.tematica).trim() : null;
  const notasDiseno = pedido.notas && String(pedido.notas).trim() ? String(pedido.notas).trim() : null;
  const textoConf = textoPauta && String(textoPauta).trim() ? String(textoPauta).trim() : null;

  const definido = tieneAdjunto || Boolean(tematica) || Boolean(textoConf) || Boolean(notasDiseno);

  return {
    definido,
    tieneAdjunto,
    requiereDiseno: tieneItemDecorado,
    urls: uniqueUrls,
    tematica,
    textoConfirmado: textoConf,
    notasDiseno
  };
}

/**
 * Resuelve el teléfono del cliente: si falta en el pedido, busca en la colección clientes
 */
async function resolverTelefonoCliente(pedido) {
  if (pedido.clienteTelefono && String(pedido.clienteTelefono).trim() && pedido.clienteTelefono !== "Sin teléfono") {
    return String(pedido.clienteTelefono).trim();
  }
  if (pedido.clienteId) {
    try {
      const cSnap = await getDoc(doc(db, "clientes", pedido.clienteId));
      if (cSnap.exists()) {
        const cData = cSnap.data();
        if (cData.telefono && String(cData.telefono).trim()) {
          return String(cData.telefono).trim();
        }
      }
    } catch {
      // Ignorar fallback si falla lectura de cliente individual
    }
  }
  return "Sin teléfono";
}

/**
 * CREAR PEDIDO NUEVO DESDE EL CHAT
 */
export async function createOrderFromAgent({
  clienteNombre,
  clienteTelefono,
  productos,
  fechaEntrega,
  horaEntrega = "Pendiente",
  metodoEntrega = "Retiro en Obrador",
  direccionEntrega = "",
  total,
  abonoInicial = 0,
  metodoPagoAbono = "Efectivo",
  notas = ""
}) {
  if (!clienteNombre || !clienteNombre.trim()) {
    throw new Error("El nombre del cliente es obligatorio para registrar un pedido.");
  }
  if (!fechaEntrega) {
    throw new Error("La fecha de entrega (YYYY-MM-DD) es obligatoria.");
  }

  const itemsList = Array.isArray(productos) && productos.length > 0 ? productos : [
    {
      nombre: "Pedido personalizado",
      cantidad: 1,
      precio: parseFloat(total || 0),
      tamano: "Estándar",
      sabor: "",
      relleno: "",
      especificaciones: notas
    }
  ];

  let totalCalculado = parseFloat(total || 0);
  if (totalCalculado <= 0) {
    totalCalculado = itemsList.reduce((acc, it) => acc + (parseFloat(it.precio || 0) * (parseInt(it.cantidad || 1, 10))), 0);
  }

  const abonoNum = Math.max(0, parseFloat(abonoInicial || 0));
  const saldoPendiente = Math.max(0, totalCalculado - abonoNum);
  const estadoInicial = abonoNum >= totalCalculado ? "Aprobada" : (abonoNum > 0 ? "Aprobada" : "Borrador");
  const fechaNorm = normalizeEcuadorDate(fechaEntrega);

  const orderData = {
    clienteNombre: clienteNombre.trim(),
    clienteTelefono: (clienteTelefono || "").trim(),
    fechaEnvio: fechaNorm,
    fechaEntrega: fechaNorm,
    horaEntrega: horaEntrega.trim(),
    metodoEntrega: metodoEntrega.trim(),
    direccionEntrega: direccionEntrega.trim(),
    items: itemsList,
    cart: itemsList,
    total: totalCalculado,
    coste: totalCalculado,
    pagado: abonoNum,
    abono: abonoNum,
    saldoPendiente,
    estado: estadoInicial,
    notas: (notas || "").trim(),
    origen: "Claude Desktop MCP",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const orderRef = await addDoc(collection(db, "pedidos"), orderData);
  const orderId = orderRef.id;

  let abonoId = null;
  if (abonoNum > 0) {
    const abonoRef = await addDoc(collection(db, "abonos"), {
      pedidoId: orderId,
      monto: abonoNum,
      metodoPago: metodoPagoAbono || "Efectivo",
      nota: "Abono inicial registrado vía Claude Desktop MCP",
      createdAt: Timestamp.now(),
      fecha: fechaNorm
    });
    abonoId = abonoRef.id;
  }

  return {
    success: true,
    mensaje: `🎉 Pedido #${orderId.substring(0, 6)} registrado exitosamente para ${clienteNombre}.`,
    pedido: {
      id: orderId,
      cliente: clienteNombre,
      telefono: clienteTelefono || "No registrado",
      fechaEntrega,
      horaEntrega,
      metodoEntrega,
      total: totalCalculado.toFixed(2),
      abonoRegistrado: abonoNum.toFixed(2),
      saldoPendiente: saldoPendiente.toFixed(2),
      estado: estadoInicial,
      items: itemsList,
      abonoId,
      enlaces: {
        crmVentas: `${CRM_BASE_URL}/ventas?orderId=${orderId}`,
        portalCliente: `${CRM_BASE_URL}/c/${orderId}`
      }
    }
  };
}

/**
 * ACTUALIZAR ESTADO DEL PEDIDO DIRECTAMENTE
 */
export async function updateOrderStatusFromAgent({ orderId, nuevoEstado, motivo = "" }) {
  if (!orderId) throw new Error("Debes indicar el ID del pedido.");
  if (!nuevoEstado) throw new Error("Debes indicar el nuevo estado (ej. 'Aprobada', 'Entregado', 'Cancelado').");

  const orderRef = doc(db, "pedidos", orderId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    throw new Error(`El pedido #${orderId} no existe en la base de datos.`);
  }

  const anterior = snap.data();
  const estadoAnterior = anterior.estado || "Borrador";

  await updateDoc(orderRef, {
    estado: nuevoEstado.trim(),
    ultimoCambioEstado: Timestamp.now(),
    motivoCambio: motivo || "Actualizado desde Claude Desktop MCP",
    updatedAt: Timestamp.now()
  });

  return {
    success: true,
    orderId,
    cliente: anterior.clienteNombre || "Cliente",
    estadoAnterior,
    nuevoEstado: nuevoEstado.trim(),
    mensaje: `✅ Estado del pedido #${orderId.substring(0, 6)} cambiado de "${estadoAnterior}" a "${nuevoEstado.trim()}".`
  };
}

/**
 * MODIFICAR DETALLES DEL PEDIDO
 */
export async function updateOrderDetailsFromAgent({
  orderId,
  fechaEntrega,
  horaEntrega,
  notas,
  direccionEntrega,
  choferNombre
}) {
  if (!orderId) throw new Error("Debes indicar el ID del pedido a modificar.");
  const orderRef = doc(db, "pedidos", orderId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    throw new Error(`El pedido #${orderId} no existe.`);
  }

  const updates = { updatedAt: Timestamp.now() };
  if (fechaEntrega) {
    const fNorm = normalizeEcuadorDate(fechaEntrega);
    updates.fechaEnvio = fNorm;
    updates.fechaEntrega = fNorm;
  }
  if (horaEntrega) updates.horaEntrega = horaEntrega.trim();
  if (notas !== undefined) updates.notas = (notas || "").trim();
  if (direccionEntrega) updates.direccionEntrega = direccionEntrega.trim();
  if (choferNombre) updates.choferNombre = choferNombre.trim();

  await updateDoc(orderRef, updates);

  return {
    success: true,
    orderId,
    camposActualizados: Object.keys(updates).filter(k => k !== 'updatedAt'),
    mensaje: `✏️ Pedido #${orderId.substring(0, 6)} actualizado exitosamente.`
  };
}

/**
 * CONSULTAR EL DETALLE COMPLETO Y MINUCIOSO DE UN PEDIDO (P0-02 Fix)
 */
export async function getOrderDetailFull({ orderId }) {
  if (!orderId || !String(orderId).trim()) {
    return {
      encontrado: false,
      orderId: orderId || null,
      mensaje: "Debes indicar un ID de pedido válido para realizar la consulta."
    };
  }

  const cleanId = String(orderId).trim();
  const orderRef = doc(db, "pedidos", cleanId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    // Intentar buscar por coincidencia parcial si se envió un ID corto o WooCommerce ID
    const listSnap = await getDocs(query(collection(db, "pedidos"), limit(150)));
    let match = null;
    for (const d of listSnap.docs) {
      const data = d.data();
      if (
        d.id === cleanId ||
        d.id.startsWith(cleanId) ||
        d.id.includes(cleanId) ||
        String(data.displayId || "").includes(cleanId) ||
        String(data.wcOrderId || "").includes(cleanId)
      ) {
        match = { id: d.id, ...data };
        break;
      }
    }
    if (!match) {
      return {
        encontrado: false,
        orderId: cleanId,
        mensaje: `No se encontró ningún pedido con el ID o referencia "${cleanId}". Verifica el identificador en el CRM.`
      };
    }
    return buildFullOrderReport(match);
  }

  return buildFullOrderReport({ id: snap.id, ...snap.data() });
}

async function buildFullOrderReport(p) {
  // Traer historial real de abonos de la colección abonos
  let listaAbonos = [];
  try {
    const abonosSnap = await getDocs(query(collection(db, "abonos"), where("pedidoId", "==", p.id)));
    listaAbonos = abonosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    listaAbonos = [];
  }

  const total = parseFloat(p.total !== undefined && p.total !== null ? p.total : (p.coste || 0));
  const sumaAbonosColeccion = listaAbonos.reduce((s, a) => s + (parseFloat(a.monto || 0)), 0);
  const pagadoDirecto = parseFloat(p.pagado !== undefined && p.pagado !== null ? p.pagado : (p.abono || 0));
  const pagado = sumaAbonosColeccion > 0 ? sumaAbonosColeccion : pagadoDirecto;
  const saldo = Math.max(0, total - pagado);

  const telefonoResuelto = await resolverTelefonoCliente(p);
  const fechaRepresentativa = resolveFechaPedido(p) || normalizeEcuadorDate(p.createdAt);
  const infoDiseno = extraerDiseno(p);

  const rawItems = p.items || p.cart || [];
  const items = rawItems.map(it => ({
    nombre: it.nombre || it.name || "Producto",
    cantidad: it.cantidad || 1,
    tamano: it.tamano || it.porcion || "Estándar",
    sabor: it.sabor || it.detalles?.Sabor || "Estándar",
    relleno: it.relleno || it.detalles?.Relleno || "Estándar",
    precioUnitario: parseFloat(it.precioUnitario || it.precio || 0).toFixed(2),
    precioTotal: (parseFloat(it.precio || (parseFloat(it.precioUnitario || 0) * (it.cantidad || 1)))).toFixed(2),
    especificaciones: it.especificaciones || it.nota || it.observaciones || "Ninguna",
    imagenesAdjuntas: Array.isArray(it.imagenes) ? it.imagenes : [],
    pautaConfirmada: it.pautaDiseno?.textoConfirmado?.fraseExacta || null
  }));

  const advertenciaBorradorCobrado = (normalizeEstado(p.estado) === "borrador" && (saldo <= 0.05 || pagado > 0))
    ? `⚠️ Pedido en estado Borrador pero con pago registrado ($${pagado.toFixed(2)}). Requiere confirmación administrativa de producción.`
    : null;

  return {
    encontrado: true,
    pedidoId: p.id,
    displayId: p.displayId || p.id.slice(-6),
    wcOrderId: p.wcOrderId || null,
    advertencia: advertenciaBorradorCobrado,
    enlaces: {
      crmVentas: `${CRM_BASE_URL}/ventas?orderId=${p.id}`,
      portalCliente: `${CRM_BASE_URL}/c/${p.id}`,
      obradorProduccion: `${CRM_BASE_URL}/produccion?orderId=${p.id}`
    },
    cliente: {
      nombre: p.clienteNombre || "Sin nombre",
      telefono: telefonoResuelto,
      direccion: p.direccionEntrega || "Retiro en Obrador",
      email: p.clienteEmail || null
    },
    entrega: {
      fecha: fechaRepresentativa,
      hora: p.horaEntrega || p.hora || "No especificada",
      metodo: p.metodoEntrega || (p.costoDelivery > 0 ? "Entrega a Domicilio" : "Retiro en Obrador"),
      chofer: p.choferNombre || "No asignado",
      estado: p.estado || "Borrador"
    },
    diseno: infoDiseno,
    productos: items,
    totalLineasProductos: items.length,
    finanzas: {
      total: total.toFixed(2),
      pagado: pagado.toFixed(2),
      saldoPendiente: saldo.toFixed(2),
      estadoPago: saldo <= 0.05 ? "PAGADO_TOTAL" : (pagado > 0 ? "ABONO_PARCIAL" : "PENDIENTE_PAGO"),
      historialAbonos: listaAbonos.map(a => ({
        monto: parseFloat(a.monto || 0).toFixed(2),
        metodo: a.metodoPago || "Transferencia",
        fecha: normalizeEcuadorDate(a.fecha || a.createdAt),
        nota: a.nota || ""
      }))
    },
    notasEspeciales: p.notas || p.notes || "Sin notas adicionales",
    tematica: p.tematica || null,
    facturacionSRI: p.facturacion ? {
      numeroFactura: p.facturacion.numeroFactura || "No emitido",
      estado: p.facturacion.estado || "PENDIENTE",
      ridePdfUrl: p.facturacion.ridePdfUrl || null
    } : "No solicitó factura electrónica"
  };
}

/**
 * BÚSQUEDA GENERAL DE PEDIDOS CON RETORNO DETALLADO EN TEXTO (P1-01, P2-01, P2-02)
 */
export async function searchOrdersDetailed({ queryText, estado, fecha, soloSinDiseno = false, maxResultados = 20 } = {}) {
  const snap = await getDocs(collection(db, "pedidos"));
  const term = (queryText || "").toLowerCase().trim();
  const filtroFecha = fecha ? normalizeEcuadorDate(fecha) : null;
  const resultados = [];

  // Mapear todos los pedidos
  const todosPedidos = [];
  snap.forEach(docSnap => {
    todosPedidos.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Ordenar descendente por fecha representativa
  todosPedidos.sort((a, b) => {
    const fA = resolveFechaPedido(a);
    const fB = resolveFechaPedido(b);
    return fB.localeCompare(fA);
  });

  for (const p of todosPedidos) {
    const fStr = resolveFechaPedido(p);

    if (filtroFecha && fStr !== filtroFecha) continue;

    // Normalización tolerante de estado (incluyendo "producción" -> esProduccionActiva)
    if (estado && !coincideEstado(p, estado)) {
      continue;
    }

    const infoDiseno = extraerDiseno(p);

    // Filtro P2-01: solo pedidos sin diseño definido
    if (soloSinDiseno) {
      if (infoDiseno.definido && infoDiseno.tieneAdjunto) {
        continue;
      }
    }

    if (term) {
      const nom = (p.clienteNombre || "").toLowerCase();
      const tel = (p.clienteTelefono || "").toLowerCase();
      const idMatch = p.id.toLowerCase().includes(term);
      const notas = (p.notas || "").toLowerCase();
      const tematica = (p.tematica || "").toLowerCase();
      const itemsMatch = (p.items || p.cart || []).some(i => (i.nombre || i.name || "").toLowerCase().includes(term));

      if (!nom.includes(term) && !tel.includes(term) && !idMatch && !notas.includes(term) && !tematica.includes(term) && !itemsMatch) {
        continue;
      }
    }

    const total = parseFloat(p.total !== undefined && p.total !== null ? p.total : (p.coste || 0));
    const pagado = parseFloat(p.pagado !== undefined && p.pagado !== null ? p.pagado : (p.abono || 0));
    const saldo = p.saldoPendiente !== undefined ? parseFloat(p.saldoPendiente) : Math.max(0, total - pagado);

    // Resolver teléfono si está ausente en el documento de pedido
    let telefono = p.clienteTelefono || "";
    if (!telefono || telefono === "Sin teléfono") {
      telefono = await resolverTelefonoCliente(p);
    }

    resultados.push({
      orderId: p.id,
      displayId: p.displayId || p.id.slice(-6),
      cliente: p.clienteNombre || "Cliente",
      telefono,
      fechaEntrega: fStr,
      horaEntrega: p.horaEntrega || p.hora || "No especificada",
      estado: p.estado || "Borrador",
      total: total.toFixed(2),
      saldoPendiente: saldo.toFixed(2),
      diseno: infoDiseno,
      enlaceCrm: `${CRM_BASE_URL}/ventas?orderId=${p.id}`,
      enlaceCliente: `${CRM_BASE_URL}/c/${p.id}`,
      productosResumen: (p.items || p.cart || []).map(i => `${i.cantidad || 1}x ${i.nombre || i.name || "Item"}`).join(", "),
      notas: p.notas || p.notes || "",
      tematica: p.tematica || null
    });

    if (resultados.length >= maxResultados) break;
  }

  return {
    totalEncontrados: resultados.length,
    pedidos: resultados
  };
}

/**
 * CONSULTA DE AGENDA DEL OBRADOR EN TEXTO ESTRUCTURADO (P0-01 Fix)
 */
export async function getObradorAgendaFull({ fecha } = {}) {
  const targetDate = fecha ? normalizeEcuadorDate(fecha) : getEcuadorToday();

  // Consultar en paralelo pedidos con fechaEnvio o fechaEntrega igual a la fecha objetivo
  const [snapEnvio, snapEntrega] = await Promise.all([
    getDocs(query(collection(db, "pedidos"), where("fechaEnvio", "==", targetDate))),
    getDocs(query(collection(db, "pedidos"), where("fechaEntrega", "==", targetDate)))
  ]);

  const mapPedidos = new Map();
  snapEnvio.forEach(d => mapPedidos.set(d.id, { id: d.id, ...d.data() }));
  snapEntrega.forEach(d => mapPedidos.set(d.id, { id: d.id, ...d.data() }));

  const pedidosDia = [];
  const resumenSabores = {};
  const porEstado = {
    por_hornear: [],
    en_decoracion: [],
    listo_para_entrega: [],
    entregados: []
  };

  for (const [id, p] of mapPedidos.entries()) {
    // Excluir cancelados y archivados
    const stNorm = normalizeEstado(p.estado);
    if (stNorm === "cancelado" || stNorm === "cancelada" || stNorm === "archivado" || stNorm === "anulado") {
      continue;
    }

    const items = (p.items || p.cart || []).map(i => {
      const sabor = i.sabor || i.detalles?.Sabor || "General";
      resumenSabores[sabor] = (resumenSabores[sabor] || 0) + (parseInt(i.cantidad || 1, 10));
      return {
        nombre: i.nombre || i.name || "Torta",
        cantidad: i.cantidad || 1,
        tamano: i.tamano || i.porcion || "Estándar",
        sabor,
        relleno: i.relleno || i.detalles?.Relleno || "",
        especificaciones: i.especificaciones || i.nota || i.observaciones || "",
        pautaConfirmada: i.pautaDiseno?.textoConfirmado?.fraseExacta || null
      };
    });

    const infoDiseno = extraerDiseno(p);
    const telefono = await resolverTelefonoCliente(p);

    const pagado = parseFloat(p.pagado !== undefined && p.pagado !== null ? p.pagado : (p.abono || 0));
    const total = parseFloat(p.total !== undefined && p.total !== null ? p.total : (p.coste || 0));
    const saldo = p.saldoPendiente !== undefined ? parseFloat(p.saldoPendiente) : Math.max(0, total - pagado);

    const advertenciaBorrador = (stNorm === "borrador" && (saldo <= 0.05 || pagado > 0))
      ? `⚠️ Pedido en estado Borrador pero con pago registrado ($${pagado.toFixed(2)}). Requiere confirmación administrativa de producción.`
      : null;

    const entry = {
      orderId: p.id,
      displayId: p.displayId || p.id.slice(-6),
      cliente: p.clienteNombre || "Cliente",
      telefono,
      hora: p.horaEntrega || p.hora || "Sin hora",
      estado: p.estado || "Aprobada",
      advertencia: advertenciaBorrador,
      metodoEntrega: p.metodoEntrega || (p.costoDelivery > 0 ? "Envío con Chofer" : "Retiro en Obrador"),
      direccion: p.direccionEntrega || "",
      items,
      totalItems: items.length,
      notas: p.notas || p.notes || "",
      tematica: p.tematica || null,
      diseno: infoDiseno
    };

    pedidosDia.push(entry);

    if (stNorm.includes("listo")) porEstado.listo_para_entrega.push(entry);
    else if (stNorm.includes("entreg")) porEstado.entregados.push(entry);
    else if (stNorm.includes("decor")) porEstado.en_decoracion.push(entry);
    else porEstado.por_hornear.push(entry);
  }

  // Ordenar por hora de entrega
  pedidosDia.sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

  return {
    fecha: targetDate,
    totalPedidosDia: pedidosDia.length,
    conteoPorEtapa: {
      porHornearOEnsamble: porEstado.por_hornear.length,
      enDecoracion: porEstado.en_decoracion.length,
      listosParaDespacho: porEstado.listo_para_entrega.length,
      entregados: porEstado.entregados.length
    },
    consolidadoSabores: resumenSabores,
    pedidos: pedidosDia,
    detallePorEtapa: porEstado
  };
}

/**
 * CREAR O ACTUALIZAR FICHA DE CLIENTE DIRECTO DESDE EL CHAT
 */
export async function upsertClientFromAgent({ nombre, telefono, email = "", direccion = "", notas = "" }) {
  if (!nombre || !nombre.trim()) throw new Error("El nombre del cliente es obligatorio.");

  const cleanName = nombre.trim();
  const cleanTel = (telefono || "").trim();

  const snap = await getDocs(query(collection(db, "clientes"), limit(100)));
  let existingId = null;

  for (const d of snap.docs) {
    const c = d.data();
    if (c.nombre?.toLowerCase() === cleanName.toLowerCase() || (cleanTel && c.telefono === cleanTel)) {
      existingId = d.id;
      break;
    }
  }

  if (existingId) {
    const ref = doc(db, "clientes", existingId);
    await updateDoc(ref, {
      nombre: cleanName,
      telefono: cleanTel,
      email: email.trim(),
      direccionPrincipal: direccion.trim(),
      notas: notas.trim(),
      updatedAt: Timestamp.now()
    });
    return {
      status: "actualizado",
      clienteId: existingId,
      mensaje: `👤 Ficha del cliente "${cleanName}" actualizada correctamente.`
    };
  } else {
    const ref = await addDoc(collection(db, "clientes"), {
      nombre: cleanName,
      telefono: cleanTel,
      email: email.trim(),
      direccionPrincipal: direccion.trim(),
      notas: notas.trim(),
      activo: true,
      totalPedidos: 0,
      totalGastado: 0,
      createdAt: Timestamp.now()
    });
    return {
      status: "creado",
      clienteId: ref.id,
      mensaje: `✨ Nuevo cliente "${cleanName}" registrado exitosamente en el CRM.`
    };
  }
}
