# 🚀 GUÍA OFICIAL: CÓMO INSTALAR EL ASISTENTE DE CHARBELA EN CLAUDE

Esta guía contiene los pasos puntuales y el **detalle exacto de qué llenar en cada casilla** para activar tu Asistente en Claude.

---

## ⚡ PASO 1: Cómo Agregar el Servidor MCP a Claude

1. En Claude (versión web o aplicación de escritorio), haz clic en tu perfil o en **Ajustes (Settings)**.
2. Entra a la pestaña **Integrations** (o **Servidores MCP** / **Add MCP Server**).
3. Haz clic en **Add Server (Agregar Servidor)** y completa cada espacio del formulario:

| Casilla en Claude | Qué llenar (Valor exacto a copiar y pegar) |
| :--- | :--- |
| **Server Name (Nombre del Servidor):** | `Charbela CRM` |
| **Server URL (URL del Servidor):** | `https://charbela-mcp-775456671841.us-central1.run.app/mcp` |
| **Authentication (Tipo de Autenticación):** | Seleccionar `OAuth 2.0` |
| **Client ID (ID de Cliente):** | `charbela_oauth_client_prod_2026` |
| **Client Secret (Secreto de Cliente):** | *(Dejar completamente en blanco / vacío)* |

4. Haz clic en **Connect (Conectar)** o Guardar.
5. Se abrirá una ventana emergente con el logo de Charbela:
   * Pulsa en el botón **"Continuar con Google"**.
   * Elige tu correo habitual de Gmail (`gladysaltospizarro@gmail.com`, `charbelita314@gmail.com`, `fcolombo87@gmail.com`, etc.).
   * Verás una marca verde que confirma la conexión activa.

---

## 📋 PASO 2: Cómo Crear y Configurar el Proyecto en Claude

1. En el menú de la izquierda en Claude, entra a la sección **Projects (Proyectos)**.
2. Haz clic en **+ Create Project (+ Crear Proyecto)** y llena cada casilla:

| Casilla en Claude | Qué llenar (Valor exacto) |
| :--- | :--- |
| **Project Name (Nombre del Proyecto):** | `Charbela Pastelería - Agente Ejecutivo CRM` |
| **Project Description (Descripción):** | `Asistente inteligente 360° para Charbela Pastelería con acceso a ventas, taller, nómina, finanzas, recetas y marca.` |
| **Project Instructions (Instrucciones):** | Haz clic en **Edit (Editar)** y pega el texto maestro oficial que se encuentra en [`CLAUDE_PROJECT_INSTRUCTIONS.md`](file:///C:/Users/fca/Documents/charbela-mcp/project/CLAUDE_PROJECT_INSTRUCTIONS.md). Pulsa **Save**. |

---

## 🐙 PASO 3: Cómo Agregar los Dos Repositorios en Project Knowledge

Dentro de tu Proyecto en Claude, entra a la pestaña **Project Knowledge (Conocimiento del Proyecto)** y sigue estos dos pasos:

### 1. Agregar el Repositorio de Operaciones & CRM:
1. Pulsa en **Add Content** ➔ selecciona **GitHub**.
2. Conecta el repositorio: `https://github.com/nandodv8/charbela-mcp` (rama `main`).
3. **Carpetas a marcar:**
   * ☑️ `skills/` (Contiene las habilidades de obrador, ventas, finanzas, nómina y recetas).
   * ☑️ `project/` (Contiene las guías e instrucciones).
   * ⬜ *(Desmarcar cualquier otra carpeta)*.
4. Pulsa en **Import / Add**.

### 2. Agregar el Repositorio de Marca Charbela & Polen:
1. Vuelve a pulsar en **Add Content** ➔ selecciona **GitHub**.
2. Conecta el repositorio: `https://github.com/nandodv8/charbela-brand` (rama `main`).
3. **Carpetas a marcar (Regla: Cargar todo menos marca y referencia):**
   * ☑️ `01_DOCS/` (Manual de marca, BRAND.md, MICROCOPY.md).
   * ☑️ `02_PARA_EL_EQUIPO/` (Checklists de empaque, horneo y despacho).
   * ☑️ `03_SKILLS/` (Voz de marca, WhatsApp y productos).
   * ☑️ `04_TOKENS/` (Paleta de colores HEX/Pantone y tipografías).
   * ⬜ `05_MARCA/` ➔ **DEJAR DESMARCADO** *(evita PDFs pesados de 40MB)*.
   * ⬜ `06_REFERENCIA/` ➔ **DEJAR DESMARCADO** *(evita fotos pesadas)*.
4. Pulsa en **Import / Add**.
