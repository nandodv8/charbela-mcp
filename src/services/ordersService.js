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
  Timestamp,
  runTransaction
} from "firebase/firestore";

import {
  normalizeEcuadorDate,
  getEcuadorToday
} from "../utils/ecuadorDateUtils.js";

const CRM_BASE_URL = "https://charbela-crm.firebaseapp.com";

/**
 * CREAR PEDIDO NUEVO DESDE EL CHAT
 * Registra cliente, pedido e items, y si hay abono inicial lo registra en la misma operación.
 */
export async function createOrderFromAgent({
  clienteNombre,
  clienteTelefono,
  productos, // Array de { nombre, cantidad, tamano, sabor, relleno, precio, especificaciones }
  fechaEntrega,
  horaEntrega = "Pendiente",
  metodoEntrega = "Retiro en Obrador", // 'Retiro en Obrador' o 'Entrega a Domicilio'
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

  // Calcular total si no fue provisto explícitamente
  let totalCalculado = parseFloat(total || 0);
  if (totalCalculado <= 0) {
    totalCalculado = itemsList.reduce((acc, it) => acc + (parseFloat(it.precio || 0) * (parseInt(it.cantidad || 1, 10))), 0);
  }

  const abonoNum = Math.max(0, parseFloat(abonoInicial || 0));
  const saldoPendiente = Math.max(0, totalCalculado - abonoNum);
  const estadoInicial = abonoNum >= totalCalculado ? "confirmado" : (abonoNum > 0 ? "en_preparacion" : "pendiente");

  const fechaNorm = normalizeEcuadorDate(fechaEntrega);

  const orderData = {
    clienteNombre: clienteNombre.trim(),
    clienteTelefono: (clienteTelefono || "").trim(),
    fechaEnvio: fechaNorm,
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

  // Registrar abono inicial si aplica
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
        crmVentas: `https://crm.charbelapasteleria.com/ventas?orderId=${orderId}`,
        portalCliente: `https://crm.charbelapasteleria.com/c/${orderId}`
      }
    }
  };
}

/**
 * ACTUALIZAR ESTADO DEL PEDIDO DIRECTAMENTE
 * Mueve el pedido en el pipeline operativo sin abrir el navegador.
 */
export async function updateOrderStatusFromAgent({ orderId, nuevoEstado, motivo = "" }) {
  if (!orderId) throw new Error("Debes indicar el ID del pedido.");
  if (!nuevoEstado) throw new Error("Debes indicar el nuevo estado (ej. 'confirmado', 'horneando', 'decorando', 'listo', 'entregado', 'cancelado').");

  // Normalizar estados habituales
  const estadoNorm = nuevoEstado.toLowerCase().trim().replace(/\s+/g, "_");
  const orderRef = doc(db, "pedidos", orderId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    throw new Error(`El pedido #${orderId} no existe en la base de datos.`);
  }

  const anterior = snap.data();
  const estadoAnterior = anterior.estado || "pendiente";

  await updateDoc(orderRef, {
    estado: estadoNorm,
    ultimoCambioEstado: Timestamp.now(),
    motivoCambio: motivo || "Actualizado desde Claude Desktop MCP",
    updatedAt: Timestamp.now()
  });

  return {
    success: true,
    orderId,
    cliente: anterior.clienteNombre || "Cliente",
    estadoAnterior,
    nuevoEstado: estadoNorm,
    mensaje: `✅ Estado del pedido #${orderId.substring(0, 6)} cambiado de "${estadoAnterior}" a "${estadoNorm}".`
  };
}

/**
 * MODIFICAR DETALLES DEL PEDIDO (FECHA, NOTAS, DIRECCIÓN O CHOFER)
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
  if (fechaEntrega) updates.fechaEnvio = normalizeEcuadorDate(fechaEntrega);
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
 * CONSULTAR EL DETALLE COMPLETO Y MINUCIOSO DE UN PEDIDO (Cero necesidad de ir al navegador)
 */
export async function getOrderDetailFull({ orderId }) {
  if (!orderId) throw new Error("Debes indicar el ID del pedido.");

  const orderRef = doc(db, "pedidos", orderId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    // Intentar buscar por coincidencia parcial si se envió un ID corto
    const listSnap = await getDocs(query(collection(db, "pedidos"), limit(100)));
    let match = null;
    for (const d of listSnap.docs) {
      if (d.id.startsWith(orderId) || d.id.includes(orderId)) {
        match = { id: d.id, ...d.data() };
        break;
      }
    }
    if (!match) {
      throw new Error(`No se encontró ningún pedido con el ID o referencia "${orderId}".`);
    }
    return buildFullOrderReport(match);
  }

  return buildFullOrderReport({ id: snap.id, ...snap.data() });
}

async function buildFullOrderReport(p) {
  // Traer historial real de abonos de la subcolección/colección
  const abonosSnap = await getDocs(query(collection(db, "abonos"), where("pedidoId", "==", p.id)));
  const listaAbonos = abonosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const total = parseFloat(p.total || p.coste || 0);
  const pagado = listaAbonos.reduce((s, a) => s + (parseFloat(a.monto || 0)), 0) || parseFloat(p.pagado || p.abono || 0);
  const saldo = Math.max(0, total - pagado);

  const items = (p.items || p.cart || []).map(it => ({
    nombre: it.nombre || it.name || "Producto",
    cantidad: it.cantidad || 1,
    tamano: it.tamano || it.porcion || "No especificado",
    sabor: it.sabor || "Estándar",
    relleno: it.relleno || "Estándar",
    precioUnitario: parseFloat(it.precio || it.precioUnitario || 0).toFixed(2),
    especificaciones: it.especificaciones || it.nota || "Ninguna"
  }));

  return {
    encontrado: true,
    pedidoId: p.id,
    displayId: p.displayId || p.id.slice(-6),
    enlaces: {
      crmVentas: `https://crm.charbelapasteleria.com/ventas?orderId=${p.id}`,
      portalCliente: `https://crm.charbelapasteleria.com/c/${p.id}`,
      obradorProduccion: `https://crm.charbelapasteleria.com/produccion?orderId=${p.id}`
    },
    cliente: {
      nombre: p.clienteNombre || "Sin nombre",
      telefono: p.clienteTelefono || "Sin teléfono registrado",
      direccion: p.direccionEntrega || "Retiro en local"
    },
    entrega: {
      fecha: toDateStr(p.fechaEnvio || p.createdAt),
      hora: p.horaEntrega || p.hora || "No especificada",
      metodo: p.metodoEntrega || (p.costoDelivery > 0 ? "Entrega a Domicilio" : "Retiro en Obrador"),
      chofer: p.choferNombre || "No asignado",
      estado: p.estado || "pendiente"
    },
    productos: items,
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
    notasEspeciales: p.notas || "Sin notas adicionales",
    facturacionSRI: p.facturacion ? {
      numeroFactura: p.facturacion.numeroFactura || "No emitido",
      estado: p.facturacion.estado || "PENDIENTE",
      ridePdfUrl: p.facturacion.ridePdfUrl || null
    } : "No solicitó factura electrónica"
  };
}

/**
 * BÚSQUEDA GENERAL DE PEDIDOS CON RETORNO DETALLADO EN TEXTO
 */
export async function searchOrdersDetailed({ queryText, estado, fecha, maxResultados = 10 } = {}) {
  const snap = await getDocs(query(collection(db, "pedidos"), orderBy("fechaEnvio", "desc"), limit(120)));
  const term = (queryText || "").toLowerCase().trim();
  const resultados = [];

  for (const doc of snap.docs) {
    const p = { id: doc.id, ...doc.data() };
    const fStr = normalizeEcuadorDate(p.fechaEnvio || p.createdAt);

    if (fecha && fStr !== fecha) continue;
    if (estado && (p.estado || "").toLowerCase() !== estado.toLowerCase()) continue;

    if (term) {
      const nom = (p.clienteNombre || "").toLowerCase();
      const tel = (p.clienteTelefono || "").toLowerCase();
      const idMatch = p.id.toLowerCase().includes(term);
      const notas = (p.notas || "").toLowerCase();
      const itemsMatch = (p.items || p.cart || []).some(i => (i.nombre || i.name || "").toLowerCase().includes(term));

      if (!nom.includes(term) && !tel.includes(term) && !idMatch && !notas.includes(term) && !itemsMatch) {
        continue;
      }
    }

    const total = parseFloat(p.total || p.coste || 0);
    const pagado = parseFloat(p.pagado || p.abono || 0);
    const saldo = Math.max(0, total - pagado);

    resultados.push({
      orderId: p.id,
      cliente: p.clienteNombre || "Cliente",
      telefono: p.clienteTelefono || "Sin teléfono",
      fechaEntrega: fStr,
      horaEntrega: p.horaEntrega || p.hora || "No especificada",
      estado: p.estado || "pendiente",
      total: total.toFixed(2),
      saldoPendiente: saldo.toFixed(2),
      enlaceCrm: `https://crm.charbelapasteleria.com/ventas?orderId=${p.id}`,
      enlaceCliente: `https://crm.charbelapasteleria.com/c/${p.id}`,
      productosResumen: (p.items || p.cart || []).map(i => `${i.cantidad || 1}x ${i.nombre || i.name || "Item"}`).join(", "),
      notas: p.notas || ""
    });

    if (resultados.length >= maxResultados) break;
  }

  return {
    totalEncontrados: resultados.length,
    pedidos: resultados
  };
}

/**
 * CONSULTA DE AGENDA DEL OBRADOR EN TEXTO ESTRUCTURADO (PRODUCCIÓN REAL)
 */
export async function getObradorAgendaFull({ fecha } = {}) {
  const targetDate = fecha ? normalizeEcuadorDate(fecha) : getEcuadorToday();
  const snap = await getDocs(query(collection(db, "pedidos"), orderBy("fechaEnvio", "asc"), limit(150)));

  const pedidosDia = [];
  const resumenSabores = {};
  const porEstado = {
    por_hornear: [],
    en_decoracion: [],
    listo_para_entrega: [],
    entregados: []
  };

  for (const doc of snap.docs) {
    const p = { id: doc.id, ...doc.data() };
    const fStr = normalizeEcuadorDate(p.fechaEnvio || p.createdAt);

    if (fStr === targetDate) {
      const items = (p.items || p.cart || []).map(i => {
        const sabor = i.sabor || "General";
        resumenSabores[sabor] = (resumenSabores[sabor] || 0) + (parseInt(i.cantidad || 1, 10));
        return {
          nombre: i.nombre || i.name || "Torta",
          cantidad: i.cantidad || 1,
          tamano: i.tamano || i.porcion || "",
          sabor: i.sabor || "",
          relleno: i.relleno || "",
          especificaciones: i.especificaciones || i.nota || ""
        };
      });

      const entry = {
        orderId: p.id,
        cliente: p.clienteNombre || "Cliente",
        hora: p.horaEntrega || p.hora || "Sin hora",
        estado: p.estado || "pendiente",
        metodoEntrega: p.metodoEntrega || (p.costoDelivery > 0 ? "Envío con Chofer" : "Retiro"),
        direccion: p.direccionEntrega || "",
        items,
        notas: p.notas || ""
      };

      pedidosDia.push(entry);

      const st = (p.estado || "pendiente").toLowerCase();
      if (st.includes("listo")) porEstado.listo_para_entrega.push(entry);
      else if (st.includes("entreg")) porEstado.entregados.push(entry);
      else if (st.includes("decor")) porEstado.en_decoracion.push(entry);
      else porEstado.por_hornear.push(entry);
    }
  }

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

  // Buscar si ya existe
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
