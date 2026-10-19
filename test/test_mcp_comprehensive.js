// crm-charbela/mcp-server/test/test_mcp_comprehensive.js
// Suite de verificación automatizada para el servidor MCP de Charbela CRM

import crypto from "node:crypto";
import { createCharbelaMcpServer } from "../src/createMcpServer.js";
import {
  getAuthorizedUser,
  verifyCodeChallenge,
  createAuthorizationCode,
  consumeAuthorizationCode,
  issueTokens,
  verifyOAuthAccessToken,
  RESOURCE_URL,
  getOAuthClientId
} from "../src/oauthServer.js";

import { getProduccionSemanal, getHistoricoProduccion } from "../src/services/produccionService.js";
import { getNominaPersonal, getAsistenciaFichajes, getLiquidacionQuincena } from "../src/services/nominaService.js";
import { getCatalogoRecetas, getInsumosPrecios } from "../src/services/recetasService.js";
import { getPedidosWebPorRevisar, getMetricasPipeline, getCarteraPorCobrar } from "../src/services/ventasPipelineService.js";
import { buscarClientes } from "../src/services/clientesCrmService.js";
import { getBitacoraKaizen } from "../src/services/calidadKaizenService.js";

async function runTests() {
  console.log("================================================================");
  console.log("🧪 INICIANDO VERIFICACIÓN INTEGRAL DE CHARBELA MCP");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Instanciación del servidor MCP y catálogo de tools
  // -------------------------------------------------------------
  console.log("▶ 1. Verificando servidor MCP y registro de herramientas...");
  const server = createCharbelaMcpServer();
  assert(server !== null && typeof server === "object", "Servidor MCP instanciado correctamente");

  // -------------------------------------------------------------
  // TEST 2: Validación de Usuarios y Roles OAuth
  // -------------------------------------------------------------
  console.log("\n▶ 2. Verificando autenticación de usuarios autorizados en Firestore...");
  const charbela = await getAuthorizedUser("charbelita314@gmail.com");
  assert(charbela && charbela.role === "admin", "Charbela Pizarro reconocida como admin");

  const gladys = await getAuthorizedUser("gladysaltospizarro@gmail.com");
  assert(gladys && gladys.role === "admin", "Gladys Saltos reconocida como admin");

  const fer = await getAuthorizedUser("fcolombo87@gmail.com");
  assert(fer && fer.role === "admin", "Fernando Colombo reconocido como admin");

  const randomUser = await getAuthorizedUser("hacker@malicioso.com");
  assert(randomUser === null, "Usuario no autorizado rechazado correctamente (null)");

  // -------------------------------------------------------------
  // TEST 3: Flujo PKCE y Emisión/Verificación de Tokens
  // -------------------------------------------------------------
  console.log("\n▶ 3. Verificando protocolo OAuth 2.0 PKCE y firma de JWT...");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  assert(verifyCodeChallenge(verifier, challenge), "Validación PKCE S256 matemática correcta");

  const clientId = getOAuthClientId();
  const redirectUri = "https://claude.ai/api/mcp/auth_callback";
  const code = await createAuthorizationCode({
    codeChallenge: challenge,
    clientId,
    redirectUri,
    uid: "test-charbela-uid",
    email: "charbelita314@gmail.com",
    role: "admin",
    resource: RESOURCE_URL
  });
  assert(code.startsWith("charbela_code_"), "Código de autorización temporal creado");

  const consumed = await consumeAuthorizationCode(code, clientId, redirectUri, verifier);
  assert(consumed.email === "charbelita314@gmail.com", "Código consumido atómicamente con verifier");

  // Intento de reusar el mismo código debe fallar
  let reusadoFallo = false;
  try {
    await consumeAuthorizationCode(code, clientId, redirectUri, verifier);
  } catch (e) {
    reusadoFallo = true;
  }
  assert(reusadoFallo, "Código de autorización no puede ser reutilizado (replay attack prevenido)");

  const tokens = await issueTokens({
    uid: consumed.uid,
    email: consumed.email,
    role: consumed.role,
    clientId,
    resource: RESOURCE_URL
  });
  assert(Boolean(tokens.accessToken && tokens.refreshToken), "Tokens JWT y Refresh emitidos");

  const actor = await verifyOAuthAccessToken(tokens.accessToken, RESOURCE_URL);
  assert(actor && actor.email === "charbelita314@gmail.com" && actor.role === "admin", "Token JWT verificado correctamente con rol admin");

  // -------------------------------------------------------------
  // TEST 4: Servicios de Obrador & Producción
  // -------------------------------------------------------------
  console.log("\n▶ 4. Probando herramientas de Obrador & Producción...");
  const prodSemanal = await getProduccionSemanal();
  assert(prodSemanal && prodSemanal.familias && "1.1_bocaditos_tradicionales" in prodSemanal.familias, "Resumen semanal con jerarquía 1.1 a 1.4 generado");
  assert(typeof prodSemanal.cronogramaPorDia === "object", "Cronograma cronológico por día operativo");

  const histProd = await getHistoricoProduccion({ limite: 5 });
  assert(Array.isArray(histProd.pedidos), "Consulta de histórico de producción ejecutada");

  // -------------------------------------------------------------
  // TEST 5: Servicios de Nómina & Personal
  // -------------------------------------------------------------
  console.log("\n▶ 5. Probando herramientas de Nómina & Personal...");
  const nomina = await getNominaPersonal();
  assert(Array.isArray(nomina.colaboradores) && nomina.colaboradores.length > 0, `Nómina consultada: ${nomina.colaboradores.length} colaboradores`);

  const fichajes = await getAsistenciaFichajes({ limite: 5 });
  assert(Array.isArray(fichajes.fichajes), "Marcaciones del reloj checador consultadas");

  const liquidaciones = await getLiquidacionQuincena();
  assert(typeof liquidaciones.totalMontoNetoPagado === "number", "Historial de liquidaciones quincenales consultado");

  // -------------------------------------------------------------
  // TEST 6: Servicios de Recetas, Subrecetas e Insumos (COGS)
  // -------------------------------------------------------------
  console.log("\n▶ 6. Probando herramientas de Recetas & COGS...");
  const recetas = await getCatalogoRecetas();
  assert(Array.isArray(recetas.recetas) && recetas.recetas.length > 0, `Catálogo de recetas con COGS consultado (${recetas.recetas.length} recetas)`);

  const insumos = await getInsumosPrecios();
  assert(Array.isArray(insumos.insumos) && insumos.insumos.length > 0, `Maestro de insumos con costos consultado (${insumos.insumos.length} insumos)`);

  // -------------------------------------------------------------
  // TEST 7: Servicios de Ventas, Pipeline y Cartera
  // -------------------------------------------------------------
  console.log("\n▶ 7. Probando herramientas de Ventas & Pipeline...");
  const pedidosWeb = await getPedidosWebPorRevisar();
  assert(typeof pedidosWeb.totalPedidosWebPendientesRevision === "number", "Consulta de pedidos web pendientes de revisión ejecutada");

  const pipeline = await getMetricasPipeline();
  assert(typeof pipeline.totalPedidosEnPipeline === "number", "Métricas del pipeline comercial calculadas");

  const cartera = await getCarteraPorCobrar({ limite: 5 });
  assert(typeof cartera.montoTotalPorCobrar === "number", "Cartera de pedidos con saldo adeudado consultada");

  // -------------------------------------------------------------
  // TEST 8: Clientes y Calidad Kaizen
  // -------------------------------------------------------------
  console.log("\n▶ 8. Probando herramientas de Clientes y Calidad Kaizen...");
  const clientes = await buscarClientes({ limite: 5 });
  assert(Array.isArray(clientes.clientes), "Búsqueda en directorio CRM de clientes ejecutada");

  const kaizen = await getBitacoraKaizen({ limite: 5 });
  assert(Array.isArray(kaizen.incidencias), "Bitácora de incidencias y calidad Kaizen consultada");

  console.log("\n================================================================");
  console.log(`🏁 RESULTADO: ${passed} PASADAS, ${failed} FALLADAS`);
  console.log("================================================================\n");

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Error fatal en suite de pruebas:", err);
  process.exit(1);
});
