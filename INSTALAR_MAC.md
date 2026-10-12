# Instalar el asistente del CRM en tu Mac

Esto conecta Claude con el CRM de la pastelería, para poder preguntarle cosas como
*"¿qué pedidos tengo pendientes de cobro?"* o *"¿qué hay que hornear mañana?"*.

Toma unos 5 minutos. No necesitas saber de programación.

---

## Antes de empezar

Necesitas dos cosas instaladas en la Mac:

1. **Claude Desktop** — la aplicación de Claude para computadora.
2. **Node.js** — el motor que hace funcionar la conexión.
   Si no lo tienes: entra a **https://nodejs.org**, baja el botón que dice **LTS**,
   y ábrelo como cualquier instalador (Siguiente, Siguiente, Listo).

Si no estás segura de tener Node.js, no importa: el instalador te lo dice.

---

## Pasos

**1.** Descomprime la carpeta que te envió Fernando. Si quedó con un nombre tipo
`MCP-Charbela-para-Mac`, déjala donde la vas a dejar para siempre — por ejemplo en
**Documentos**. Si después la mueves de lugar, hay que volver a correr el instalador.

**2.** Entra a la carpeta `mcp-server` y haz **doble clic** en el archivo:

> **instalar_mac.command**

**3.** Es casi seguro que macOS te muestre un aviso así:

> *"No se puede abrir porque proviene de un desarrollador no identificado"*

Eso es normal con cualquier archivo que llega por internet. Para resolverlo:

- Haz **clic derecho** sobre `instalar_mac.command`
- Elige **Abrir**
- En el aviso que aparece, vuelve a elegir **Abrir**

**4.** Se abre una ventana negra (la Terminal) y empieza a trabajar sola. Va mostrando
cinco pasos. Puede tardar **1 o 2 minutos** en el paso de las dependencias. No la cierres.

Cuando termine bien, vas a ver:

```
  🎉 Instalación completada
```

**5.** Último paso, el que más se olvida: **cierra Claude por completo**.
No basta con cerrar la ventana con la X — tienes que usar **Cmd + Q**.
Después vuelve a abrir Claude.

---

## Comprobar que quedó funcionando

Abre Claude y pregúntale:

> ¿Qué pedidos tengo pendientes de cobro?

Si te contesta con nombres de clientas y montos del CRM, quedó listo. 🎂

Otras cosas que ya le puedes preguntar:

- ¿Qué tengo que producir el sábado?
- Dame la ficha de la clienta Maria Jose
- ¿Cómo va la facturación de este mes?
- Busca el pedido de Yenila Torres

---

## Si algo sale mal

**La ventana negra se cierra sola de inmediato**
No alcanzaste a hacer clic derecho → Abrir. Repite el paso 3.

**Dice "No encontré Node.js en esta Mac"**
Falta instalar Node.js. Ve a https://nodejs.org, baja el botón **LTS**, instálalo,
y haz doble clic de nuevo en `instalar_mac.command`.

**Dice "Falló la instalación de dependencias"**
Casi siempre es el internet. Revisa la conexión y vuelve a intentar.

**Claude no responde nada del CRM después de instalar**
Lo más probable: no cerraste Claude con **Cmd + Q**. Hazlo y vuelve a abrirlo.

**Cualquier otro error**
Selecciona todo el texto de la ventana negra, cópialo y mándaselo a Fernando.
Ahí está escrito exactamente qué falló.

---

## Para volver a instalar o actualizar

Si Fernando te manda una versión nueva, reemplaza la carpeta y haz doble clic otra vez
en `instalar_mac.command`. Se puede correr todas las veces que quieras: no rompe nada
y guarda un respaldo de tu configuración anterior por si acaso.
