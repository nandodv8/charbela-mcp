# 🚀 GUÍA DE CONFIGURACIÓN DEL PROYECTO CHARBELA EN CLAUDE & GITHUB

Esta guía detalla paso a paso cómo crear el **Proyecto de Claude** (en Claude Web, Claude Desktop o Claude Cowork) y vincularlo con el repositorio de GitHub `nandodv8/charbela-mcp` para que tú y Gladys tengan siempre a disposición el Agente Ejecutivo con sus 36 herramientas MCP y habilidades especializadas.

---

## 📋 1. ¿Cómo crear el Proyecto en Claude?

1. Entra a tu cuenta de [Claude.ai](https://claude.ai) o abre Claude Desktop.
2. En la barra lateral izquierda, haz clic en **Projects** (Proyectos) y selecciona **+ Create Project** (Crear Proyecto).
3. Configura los datos básicos:
   - **Nombre del Proyecto:** `Charbela Pastelería - Agente Ejecutivo CRM`
   - **Descripción:** `Asistente ejecutivo y operativo 360° para Charbela Pastelería con acceso a ventas, taller, nómina, finanzas, recetas y feedback.`
4. En la sección **Project Instructions** (Instrucciones del Proyecto), haz clic en **Edit** y pega el contenido completo de:
   👉 [`CLAUDE_PROJECT_INSTRUCTIONS.md`](file:///C:/Users/fca/Documents/charbela-mcp/project/CLAUDE_PROJECT_INSTRUCTIONS.md)

---

## 🐙 2. Conectar el Proyecto con GitHub

Para que Claude siempre conozca todas las habilidades (Skills) y la estructura del negocio sin tener que subir archivos manualmente:

### Opción A: Vinculación directa con GitHub (Recomendada)
1. Dentro de tu proyecto en Claude, ve a la pestaña **Project Knowledge** (Conocimiento del Proyecto).
2. Haz clic en **Add Content** -> **GitHub**.
3. Selecciona tu repositorio:
   - **Repositorio:** `nandodv8/charbela-mcp`
   - **Rama:** `main`
4. Selecciona las carpetas clave:
   - `skills/` (todas las directrices de finanzas, marketing, obrador, nómina, etc.)
   - `project/` (instrucciones y manuales)
5. ¡Listo! Cada vez que hagamos `git push` con nuevas recetas o políticas, Claude actualizará su conocimiento al instante.

### Opción B: Cargar archivos manualmente (Si no usas la integración de GitHub en Claude)
1. En **Project Knowledge**, haz clic en **Add Content** -> **Upload files**.
2. Sube todos los archivos `.md` de la carpeta `skills/`:
   - `skills/finanzas/SKILL.md`
   - `skills/marketing/SKILL.md`
   - `skills/obrador-produccion/SKILL.md`
   - `skills/ventas-crm/SKILL.md`
   - `skills/recursos-humanos/SKILL.md`
   - `skills/recetas-costos/SKILL.md`
   - `skills/calidad-kaizen/SKILL.md`
   - `skills/producto-feedback/SKILL.md`

---

## ⚡ 3. Conexión del Conector MCP (Cloud Run)

El conector MCP ya está desplegado en Google Cloud Run y asegurado con inicio de sesión de Google (OAuth 2.0).

- **URL Oficial:** `https://charbela-mcp-775456671841.us-central1.run.app/mcp`
- **Usuarios Autorizados:**
  - `gladysaltospizarro@gmail.com`
  - `fcolombo87@gmail.com`
  - `charbelita314@gmail.com`
  - `gracesantoszamora@hotmail.com`
  - `july.villafuerte.p@gmail.com`
  - `zambucha.ec@gmail.com`

### Configuración en Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "charbela-crm": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://charbela-mcp-775456671841.us-central1.run.app/sse"
      ]
    }
  }
}
```
*Al abrir Claude Desktop por primera vez, se abrirá la ventana emergente con el logo de Charbela para iniciar sesión con tu cuenta de Google.*

---

## 🧠 4. Habilidades (Skills) Especializadas Integradas

El proyecto cuenta con 7 habilidades modulares que se activan según la necesidad:

| Habilidad | Carpeta | Función Principal |
| :--- | :--- | :--- |
| **Obrador & Producción** | `skills/obrador-produccion` | Planificación semanal (1.1 Bocaditos, 1.2 Bocaditos Dec., 1.3 Dulces Dec., 1.4 Masas) |
| **Ventas & Pipeline** | `skills/ventas-crm` | Alertas de WooCommerce por verificar, cartera por cobrar, cotizaciones interactivas |
| **Finanzas & Contabilidad** | `skills/finanzas` | P&L, registro de gastos SRI, conciliación bancaria y auditoría anti-duplicados |
| **Marketing & Copywriting** | `skills/marketing` | Textos para WhatsApp, combos temáticos, up-selling y promociones estacionales |
| **Nómina & Talento Humano** | `skills/recursos-humanos` | Marcaciones de reloj checador, sueldos base, liquidaciones quincenales |
| **Recetas & Costos (COGS)** | `skills/recetas-costos` | Desglose de subrecetas, margen bruto objetivo (25%-32% COGS), mermas |
| **Calidad & Kaizen** | `skills/calidad-kaizen` | Causa raíz, bitácora de novedades y estandarización visual |
| **Feedback del CRM** | `skills/producto-feedback` | Reporte directo de bugs y mejoras al panel `vibe_feedback` del CRM |

---

## 💬 5. Ejemplos de Consultas que puedes hacerle a Claude

- **Planificación de Taller:**
  > *"¿Cuáles son los pedidos que tenemos que hornear y armar para este viernes y sábado? Sepáramelos por las 4 categorías oficiales."*

- **Revisión de Tienda Web y Cartera:**
  > *"Revisa si han entrado pedidos web de WooCommerce pendientes de verificar sabor y dime cuánto tenemos en cartera por cobrar de eventos de este mes."*

- **Costeo y Recetas:**
  > *"Muéstrame las recetas con mayor costo de ingredientes (COGS) y dime si alguna supera el 35% de su precio de venta."*

- **Reportar una Mejora en la App:**
  > *"Claude, registra una mejora en el módulo de ventas: los asesores necesitan que al buscar un cliente por WhatsApp se autocomplete la dirección de entrega."*
  *(Claude ejecutará `reportar_mejora_o_bug` y la mejora aparecerá de inmediato en la app web de Charbela).*
