// crm-charbela/mcp-server/src/services/clientesCrmService.js
// Servicio MCP para Directorio CRM, Perfil 360 y Fidelización de Clientes

import { db } from "../firebase.js";
import { collection, getDocs, doc, getDoc, query, where, limit as firestoreLimit } from "firebase/firestore";

/**
 * Consulta el perfil completo 360 de un cliente (datos personales, direcciones, compras acumuladas, LTV e historial de pedidos)
 */
export async function getPerfilClienteCompleto(args = {}) {
  const { clienteId, telefono, email, nombre } = args;
  let clientData = null;

  if (clienteId) {
    const snap = await getDoc(doc(db, "clientes", clienteId));
    if (snap.exists()) clientData = { id: snap.id, ...snap.data() };
  }

  if (!clientData) {
    const snap = await getDocs(collection(db, "clientes"));
    const termNombre = (nombre || "").toLowerCase().trim();
    const termTel = (telefono || "").replace(/\D/g, "");
    const termEmail = (email || "").toLowerCase().trim();

    snap.forEach((d) => {
      if (clientData) return;
      const data = d.data();
      const cTel = (data.telefono || "").replace(/\D/g, "");
      const cEmail = (data.email || "").toLowerCase().trim();
      const cNombre = (data.nombre || "").toLowerCase().trim();

      if (termTel && cTel.includes(termTel)) clientData = { id: d.id, ...data };
      else if (termEmail && cEmail === termEmail) clientData = { id: d.id, ...data };
      else if (termNombre && cNombre.includes(termNombre)) clientData = { id: d.id, ...data };
    });
  }

  if (!clientData) {
    throw new Error(`Cliente no encontrado con los criterios proporcionados.`);
  }

  // Buscar historial de pedidos del cliente
  const snapPedidos = await getDocs(collection(db, "pedidos"));
  const pedidosCliente = [];

  snapPedidos.forEach((pSnap) => {
    const p = { id: pSnap.id, ...pSnap.data() };
    const matchId = p.clienteId === clientData.id;
    const matchTel = telefono && (p.clienteTelefono || "").replace(/\D/g, "").includes((clientData.telefono || "").replace(/\D/g, ""));
    const matchNombre = (p.clienteNombre || "").toLowerCase().trim() === (clientData.nombre || "").toLowerCase().trim();

    if (matchId || matchTel || matchNombre) {
      pedidosCliente.push({
        id: p.id,
        displayId: p.displayId || p.id.slice(-6),
        fechaEntrega: p.fechaEntrega || "Sin fecha",
        estado: p.estado || "Aprobada",
        total: Number((p.total || p.coste || 0).toFixed(2)),
        saldo: Number((p.saldoPendiente || 0).toFixed(2)),
        items: (p.items || []).map((it) => `${it.cantidad || 1}x ${it.descripcion || it.nombre}`)
      });
    }
  });

  pedidosCliente.sort((a, b) => (b.fechaEntrega || "").localeCompare(a.fechaEntrega || ""));

  const totalHistorico = pedidosCliente.reduce((acc, p) => acc + p.total, 0);

  return {
    id: clientData.id,
    nombre: clientData.nombre || "Cliente sin nombre",
    telefono: clientData.telefono || "Sin teléfono",
    email: clientData.email || "Sin email",
    tierFidelidad: clientData.tier || (totalHistorico > 300 ? "Oro" : totalHistorico > 100 ? "Plata" : "Bronce"),
    direccionesEntrega: clientData.direccionesEntrega || (clientData.direccion ? [clientData.direccion] : []),
    datosFacturacion: clientData.facturacion || null,
    preferenciasOAlergias: clientData.notas || "Ninguna registrada",
    totalPedidosRealizados: pedidosCliente.length,
    valorTotalHistoricoLTV: Number(totalHistorico.toFixed(2)),
    historialPedidos: pedidosCliente
  };
}

/**
 * Busca clientes en el directorio del CRM
 */
export async function buscarClientes(args = {}) {
  const maxLimit = Math.min(args.limite || 15, 50);
  const snap = await getDocs(collection(db, "clientes"));
  const qText = (args.queryText || "").toLowerCase().trim();
  const resultados = [];

  snap.forEach((d) => {
    if (resultados.length >= maxLimit) return;
    const data = { id: d.id, ...d.data() };

    if (qText) {
      const match =
        (data.nombre || "").toLowerCase().includes(qText) ||
        (data.telefono || "").includes(qText) ||
        (data.email || "").toLowerCase().includes(qText) ||
        (data.notas || "").toLowerCase().includes(qText);
      if (!match) return;
    }

    if (args.tier && (data.tier || "").toLowerCase() !== args.tier.toLowerCase()) {
      return;
    }

    resultados.push({
      id: data.id,
      nombre: data.nombre,
      telefono: data.telefono,
      email: data.email,
      tier: data.tier || "Estándar",
      totalGastado: data.ticketPromedio || data.totalGastado || 0,
      notas: data.notas || ""
    });
  });

  return {
    totalEncontrados: resultados.length,
    clientes: resultados
  };
}
