# 🚀 GUÍA DE CONFIGURACIÓN DEL PROYECTO CHARBELA EN CLAUDE & GITHUB

Esta guía detalla paso a paso cómo crear el **Proyecto de Claude** (en Claude Web, Claude Desktop o Claude Cowork) y vincularlo con los repositorios oficiales de GitHub:
1. **Conector MCP & Operaciones:** `nandodv8/charbela-mcp`
2. **Sistema de Marca Oficial:** `nandodv8/charbela-brand`

---

## 📋 1. ¿Cómo crear el Proyecto en Claude?

1. Entra a tu cuenta en [Claude.ai](https://claude.ai) o abre Claude Desktop.
2. En la barra lateral izquierda, haz clic en **Projects** (Proyectos) y selecciona **+ Create Project** (Crear Proyecto).
3. Configura los datos básicos:
   - **Nombre del Proyecto:** `Charbela Pastelería - Agente Ejecutivo CRM`
   - **Descripción:** `Asistente ejecutivo y operativo 360° para Charbela Pastelería con acceso a ventas, taller, nómina, finanzas, recetas, marca y feedback.`
4. En la sección **Project Instructions** (Instrucciones del Proyecto), haz clic en **Edit** y pega el contenido completo de:
   👉 [`CLAUDE_PROJECT_INSTRUCTIONS.md`](file:///C:/Users/fca/Documents/charbela-mcp/project/CLAUDE_PROJECT_INSTRUCTIONS.md)

---

## 🐙 2. Conectar el Proyecto con GitHub (Conocimiento / Knowledge)

Para que Claude conozca la base de datos, las reglas operativas y la nueva identidad de marca de Polen Estudio:

### A. Repositorio 1: `nandodv8/charbela-mcp` (Operación y Conector)
1. En **Project Knowledge**, haz clic en **Add Content** ➔ **GitHub**.
2. Selecciona `nandodv8/charbela-mcp` (rama `main`).
3. Marca las carpetas:
   - `skills/` (todas las directrices de taller, ventas, nómina, finanzas, etc.)
   - `project/` (instrucciones y guías)

### B. Repositorio 2: `nandodv8/charbela-brand` (Charbela Brand OS v1.0)
1. En **Project Knowledge**, haz clic de nuevo en **Add Content** ➔ **GitHub**.
2. Selecciona `nandodv8/charbela-brand` (rama `main`).
3. **Regla de Carga Ligera (Cargar todo menos Marca y Referencia):**
   - ✅ **Cargar:** `01_DOCS/` (BRAND.md, MICROCOPY.md)
   - ✅ **Cargar:** `02_PARA_EL_EQUIPO/` (guías de Claude y equipo)
   - ✅ **Cargar:** `03_SKILLS/` (las 5 habilidades: voz, post, whatsapp, producto, revision)
   - ✅ **Cargar:** `04_TOKENS/` (tokens CSS y JSON)
   - ❌ **Excluir:** `05_MARCA/` y `06_REFERENCIA/` *(se omiten para no sobrecargar el proyecto con PDFs de 40MB e imágenes pesadas)*.

---

## ⚡ 3. Conexión del Conector MCP (Cloud Run)

- **Nombre del Servidor:** `Charbela CRM`
- **URL Oficial:** `https://charbela-mcp-775456671841.us-central1.run.app/mcp`
- **ID de Cliente (Client ID):** `charbela_oauth_client_prod_2026`
- **Secreto de Cliente:** *(Dejar en blanco / vacío)*
- **Usuarios Autorizados:**
  - `gladysaltospizarro@gmail.com`
  - `fcolombo87@gmail.com`
  - `charbelita314@gmail.com`
  - `gracesantoszamora@hotmail.com`
  - `july.villafuerte.p@gmail.com`
  - `zambucha.ec@gmail.com`
