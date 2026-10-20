# -*- coding: utf-8 -*-
"""
Generador del PDF Ejecutivo Oficial para Charbela Pastelería
Guía Práctica sin tecnicismos: Detalle exacto de qué llenar en cada espacio
- Cómo agregar el MCP a Claude (campo por campo)
- Cómo crear el Proyecto en Claude (campo por campo)
- Cómo agregar los dos repositorios en Project Knowledge (carpetas exactas)
"""

import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Paleta Corporativa Charbela
PRIMARY = colors.HexColor("#721C34")       # Vino / Borgoña profundo Charbela
PRIMARY_LIGHT = colors.HexColor("#FDF3F6") # Fondo suave vino
ACCENT_GOLD = colors.HexColor("#B8860B")   # Dorado artesanal
DARK_TEXT = colors.HexColor("#222222")     # Texto principal
MUTED_TEXT = colors.HexColor("#555555")    # Texto secundario
CARD_BG = colors.HexColor("#FAF7F2")       # Crema suave pastelería
CARD_BORDER = colors.HexColor("#E2D6CA")   # Borde tarjeta
SUCCESS_BG = colors.HexColor("#F0F7F2")    # Verde suave
SUCCESS_BORDER = colors.HexColor("#C2DEC9")
LINE_COLOR = colors.HexColor("#D8C9BB")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, total_pages):
        self.saveState()
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(PRIMARY)
            self.drawString(40, 755, "CHARBELA PASTELERÍA ARTESANAL")
            self.setFont("Helvetica", 8)
            self.setFillColor(MUTED_TEXT)
            self.drawString(205, 755, "|   Guía de Instalación del Asistente (Qué llenar en cada espacio)")
            
            self.setStrokeColor(LINE_COLOR)
            self.setLineWidth(0.7)
            self.line(40, 747, 572, 747)
            
        self.setStrokeColor(LINE_COLOR)
        self.setLineWidth(0.7)
        self.line(40, 42, 572, 42)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED_TEXT)
        self.drawString(40, 30, "Documento de Uso Interno  -  Charbela CRM & Conector Claude")
        
        page_str = f"Página {self._pageNumber} de {total_pages}"
        self.drawRightString(572, 30, page_str)
        self.restoreState()


def create_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=42,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=PRIMARY,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=ACCENT_GOLD,
        spaceAfter=7
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14.5,
        textColor=PRIMARY,
        spaceBefore=6,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT,
        spaceAfter=2
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    card_title = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=PRIMARY,
        spaceAfter=2
    )

    card_text = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.3,
        leading=11.7,
        textColor=DARK_TEXT
    )

    instruction_text = ParagraphStyle(
        'InstructionText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.5,
        textColor=DARK_TEXT
    )

    badge_top_left = ParagraphStyle(
        'BadgeTopLeft',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY
    )

    badge_top_right = ParagraphStyle(
        'BadgeTopRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=ACCENT_GOLD
    )

    story = []

    # =========================================================================
    # PÁGINA 1: VISIÓN GENERAL Y PASO 1 (AGREGAR EL MCP A CLAUDE)
    # =========================================================================
    header_data = [
        [
            Paragraph("CHARBELA PASTELERÍA ARTESANAL", badge_top_left),
            Paragraph("FICHA DE INSTALACIÓN Y REPOSITORIOS", badge_top_right)
        ]
    ]
    header_table = Table(header_data, colWidths=[266, 266])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))

    story.append(Paragraph("Cómo Instalar tu Asistente en Claude", title_style))
    story.append(Paragraph("Guía práctica: Visión general de repositorios y detalle exacto de qué llenar en cada espacio", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=6))

    # Visión general de los dos repositorios
    story.append(Paragraph("1. Visión General: Los Dos Repositorios en GitHub", h1_style))
    
    repo_overview_data = [
        [
            Paragraph("<b>Repositorio 1: Operaciones y CRM</b>", card_title),
            Paragraph("<b>Repositorio 2: Marca y Estilo (Polen)</b>", card_title)
        ],
        [
            Paragraph("<b>https://github.com/nandodv8/charbela-mcp</b>", body_bold),
            Paragraph("<b>https://github.com/nandodv8/charbela-brand</b>", body_bold)
        ],
        [
            Paragraph(
                "<b>¿Para qué sirve?</b><br/>"
                "Es el cerebro operativo de la pastelería. Contiene la planificación de horneados para el obrador en 4 familias, el control de ventas y pedidos pendientes, la nómina de colaboradoras y el catálogo de recetas con costo de insumos.",
                card_text
            ),
            Paragraph(
                "<b>¿Para qué sirve?</b><br/>"
                "Es la identidad y voz de Charbela creada por Polen Estudio. Define cómo responder en WhatsApp, el tono cómplice para antojos (Vía BAKES), el tono cálido para tortas de eventos (Vía CELEBRACIÓN) y los checklists de empaque.",
                card_text
            )
        ]
    ]
    repo_overview_table = Table(repo_overview_data, colWidths=[266, 266])
    repo_overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SUCCESS_BG),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor("#F9F0F3")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(repo_overview_table)
    story.append(Spacer(1, 6))

    # PASO A: CÓMO AGREGAR EL SERVIDOR MCP A CLAUDE (DETALLE EXACTO)
    story.append(Paragraph("2. Cómo Agregar el Servidor MCP a Claude (Qué llenar en cada casilla)", h1_style))
    story.append(Paragraph(
        "<b>¿Dónde ir?</b> En Claude (computadora o web), entra a <b>Ajustes (Settings)</b> ➔ pestaña <b>Integrations</b> (o Servidores MCP) ➔ haz clic en <b>Add MCP Server</b> (Agregar Servidor). Completa cada casilla exactamente así:",
        card_text
    ))
    story.append(Spacer(1, 4))

    mcp_form_data = [
        [Paragraph("<b>Casilla en la pantalla de Claude</b>", card_title), Paragraph("<b>Qué escribir o pegar (Valor exacto)</b>", card_title)],
        [Paragraph("<b>Server Name (Nombre):</b>", body_bold), Paragraph("<b>Charbela CRM</b>", body_style)],
        [Paragraph("<b>Server URL (URL del Servidor):</b>", body_bold), Paragraph("<b>https://charbela-mcp-775456671841.us-central1.run.app/mcp</b>", body_style)],
        [Paragraph("<b>Authentication (Autenticación):</b>", body_bold), Paragraph("Selecciona <b>OAuth 2.0</b>", body_style)],
        [Paragraph("<b>Client ID (ID de Cliente):</b>", body_bold), Paragraph("<font color='#721C34'><b>charbela_oauth_client_prod_2026</b></font>", body_style)],
        [Paragraph("<b>Client Secret (Secreto):</b>", body_bold), Paragraph("<i>(Dejar COMPLETAMENTE EN BLANCO / vacío)</i>", body_style)],
        [Paragraph("<b>Botón de Inicio de Sesión:</b>", body_bold), Paragraph("Haz clic en <b>Connect</b>. En la ventana emergente, pulsa <b>'Continuar con Google'</b> y selecciona tu correo habitual de Gmail.", body_style)]
    ]
    mcp_form_table = Table(mcp_form_data, colWidths=[185, 347])
    mcp_form_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F2EAE1")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#FAF7F2")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.white),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor("#FFF0F4")),
        ('BACKGROUND', (0, 5), (-1, 5), colors.white),
        ('BACKGROUND', (0, 6), (-1, 6), SUCCESS_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(mcp_form_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 2: PASO B (CONFIGURAR EL PROYECTO) Y PASO C (AGREGAR LOS DOS REPOSITORIOS)
    # =========================================================================
    story.append(Paragraph("Configuración del Proyecto y Repositorios", title_style))
    story.append(Paragraph("Detalle de campos para crear el proyecto y cómo seleccionar carpetas en cada repositorio", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=8))

    # PASO B: CÓMO CONFIGURAR EL PROYECTO EN CLAUDE
    story.append(Paragraph("3. Cómo Configurar el Nuevo Proyecto en Claude (Qué llenar en cada casilla)", h1_style))
    story.append(Paragraph(
        "<b>¿Dónde ir?</b> En el menú izquierdo de Claude, haz clic en <b>Projects (Proyectos)</b> ➔ pulsa en <b>+ Create Project (+ Crear Proyecto)</b> y completa:",
        card_text
    ))
    story.append(Spacer(1, 4))

    proj_form_data = [
        [Paragraph("<b>Casilla en la pantalla de Claude</b>", card_title), Paragraph("<b>Qué escribir o pegar (Valor exacto)</b>", card_title)],
        [Paragraph("<b>Project Name (Nombre):</b>", body_bold), Paragraph("<b>Charbela Pastelería - Agente Ejecutivo CRM</b>", body_style)],
        [Paragraph("<b>Project Description (Descripción):</b>", body_bold), Paragraph("Asistente inteligente 360° para Charbela Pastelería con acceso a ventas, taller, nómina, finanzas, recetas y marca.", body_style)],
        [Paragraph("<b>Project Instructions (Instrucciones):</b>", body_bold), Paragraph("Haz clic en <b>Edit (Editar)</b> y pega el <b>texto oficial completo que se encuentra en la Página 3 de esta guía</b>. Pulsa Save (Guardar).", body_style)]
    ]
    proj_form_table = Table(proj_form_data, colWidths=[185, 347])
    proj_form_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F2EAE1")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#FAF7F2")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#FFF9F0")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(proj_form_table)
    story.append(Spacer(1, 8))

    # PASO C: CÓMO AGREGAR LOS DOS REPOSITORIOS EN PROJECT KNOWLEDGE
    story.append(Paragraph("4. Cómo Agregar los Dos Repositorios en Project Knowledge (Carpetas exactas)", h1_style))
    story.append(Paragraph(
        "Dentro de tu Proyecto en Claude, ve a la pestaña <b>Project Knowledge (Conocimiento del Proyecto)</b> ➔ pulsa en <b>Add Content ➔ GitHub</b>:",
        card_text
    ))
    story.append(Spacer(1, 4))

    github_steps_data = [
        [
            Paragraph("<b>Repositorio 1: Operaciones (charbela-mcp)</b>", card_title),
            Paragraph("<b>Repositorio 2: Marca (charbela-brand)</b>", card_title)
        ],
        [
            Paragraph("<b>URL a conectar:</b><br/>https://github.com/nandodv8/charbela-mcp", body_style),
            Paragraph("<b>URL a conectar:</b><br/>https://github.com/nandodv8/charbela-brand", body_style)
        ],
        [
            Paragraph(
                "<b>Qué carpetas marcar:</b><br/>"
                "&bull; ☑️ <b>skills/</b> (Habilidades de obrador, ventas, finanzas, recetas)<br/>"
                "&bull; ☑️ <b>project/</b> (Guías e instrucciones oficiales)<br/>"
                "&bull; ⬜ <i>(Desmarcar cualquier otra carpeta)</i><br/><br/>"
                "Haz clic en <b>Import / Add</b>.",
                card_text
            ),
            Paragraph(
                "<b>Qué carpetas marcar (Cargar todo menos marca y referencia):</b><br/>"
                "&bull; ☑️ <b>01_DOCS/</b> (Manuales, BRAND.md, MICROCOPY.md)<br/>"
                "&bull; ☑️ <b>02_PARA_EL_EQUIPO/</b> (Checklists de empaque y horneo)<br/>"
                "&bull; ☑️ <b>03_SKILLS/</b> (Voz de marca, WhatsApp y productos)<br/>"
                "&bull; ☑️ <b>04_TOKENS/</b> (Colores HEX/Pantone y fuentes)<br/>"
                "&bull; ⬜ <b>05_MARCA/ ➔ DEJAR DESMARCADO</b> (evita PDFs de 40MB)<br/>"
                "&bull; ⬜ <b>06_REFERENCIA/ ➔ DEJAR DESMARCADO</b> (evita fotos pesadas)<br/><br/>"
                "Haz clic en <b>Import / Add</b>.",
                card_text
            )
        ]
    ]
    github_steps_table = Table(github_steps_data, colWidths=[266, 266])
    github_steps_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SUCCESS_BG),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor("#F9F0F3")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(github_steps_table)
    story.append(Spacer(1, 6))

    # Enlaces directos CRM
    story.append(Paragraph("Enlaces Directos del CRM (Accesibles en un Clic)", h1_style))
    crm_links = [
        [Paragraph("<b>Portal Principal:</b> https://crm.charbelapasteleria.com", body_style), Paragraph("<b>Taller y Obrador:</b> .../produccion", body_style)],
        [Paragraph("<b>Ventas y Cartera:</b> .../ventas", body_style), Paragraph("<b>Finanzas y Gastos:</b> .../finanzas", body_style)],
        [Paragraph("<b>Nómina y Asistencia:</b> .../nomina", body_style), Paragraph("<b>Recetas y Calidad:</b> .../calidad", body_style)]
    ]
    crm_table = Table(crm_links, colWidths=[266, 266])
    crm_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(crm_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 3: TEXTO DE INSTRUCCIONES OFICIALES (COPIAR Y PEGAR)
    # =========================================================================
    story.append(Paragraph("Instrucciones Oficiales del Proyecto", title_style))
    story.append(Paragraph("Texto maestro para copiar y pegar en la casilla 'Project Instructions' de Claude", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "<b>Instrucción para Charbela y Gladys:</b> Copia exactamente todo el texto del recuadro a continuación "
        "y pégalo en la casilla <b>Project Instructions</b> de tu proyecto. No necesitas cambiar nada:",
        card_text
    ))
    story.append(Spacer(1, 6))

    instructions_block = Paragraph(
        "Eres el <b>Agente Ejecutivo & Concierge Operativo de Charbela Pastelería Artesanal</b>, conectado en tiempo "
        "real al CRM y base de datos de producción mediante el conector oficial MCP en Cloud Run.<br/><br/>"
        "<b>TU MISIÓN:</b><br/>"
        "Asistir a Charbela, Gladys y al equipo directivo en el control diario de todos los frentes del negocio: "
        "Ventas, Taller y Obrador, Finanzas y Gastos, Nómina del Personal, Costos y Recetas (COGS), y Calidad Operativa.<br/><br/>"
        "<b>REGLAS DE PRODUCCIÓN (4 FAMILIAS OFICIALES):</b><br/>"
        "Toda planificación de taller debe clasificarse estrictamente en:<br/>"
        "&bull; <b>1.1 Bocaditos Tradicionales:</b> alfajores, empanaditas, paquetes secos y trufas.<br/>"
        "&bull; <b>1.2 Bocaditos Decorados:</b> temáticos para bautizos, primeras comuniones y bodas.<br/>"
        "&bull; <b>1.3 Dulces Decorados:</b> cupcakes personalizados, galletas glaseadas y cakepops.<br/>"
        "&bull; <b>1.4 Masas de Tortas y Pisos:</b> horneado de bizcochuelos, rellenos, ganacheado y decoración final.<br/><br/>"
        "<b>REGLA DE ENLACES CLICKEABLES (DEEP-LINKING):</b><br/>"
        "Siempre que menciones un pedido, colaborador o módulo, incluye el enlace para abrirlo en un clic:<br/>"
        "&bull; Pedidos en CRM Ventas: https://crm.charbelapasteleria.com/ventas?orderId={id}<br/>"
        "&bull; Cotización para el Cliente: https://crm.charbelapasteleria.com/c/{id}<br/>"
        "&bull; Plan de Obrador / Taller: https://crm.charbelapasteleria.com/produccion?orderId={id}<br/>"
        "&bull; Módulos Generales: /nomina , /finanzas , /calidad<br/><br/>"
        "<b>REGLAS DE MARCA (CHARBELA BRAND OS - POLEN ESTUDIO):</b><br/>"
        "&bull; <b>Vía BAKES (Antojo $1-$25):</b> Tono cómplice, tagline '¡¡No fui yo, fue Charbela!!', Rosa + Naranja Metiche.<br/>"
        "&bull; <b>Vía CELEBRACIÓN (Eventos $200-$500+):</b> Tono cálido, seguro, sin humor de culpa en cotizaciones o reclamos.<br/>"
        "&bull; <b>Microcopy:</b> 'Saldo pendiente' (nunca 'saldo por cancelar'); 'Reserva tu fecha en nuestra agenda'.<br/>"
        "&bull; <b>Comprobantes SRI:</b> Alerta sobre egresos sin sustento o factura válida.<br/>"
        "&bull; <b>COGS Objetivo:</b> Entre 25% y 32% del precio de venta.",
        instruction_text
    )

    instructions_table = Table([[instructions_block]], colWidths=[532])
    instructions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1.2, PRIMARY),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(instructions_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 4: PREGUNTAS HABITUALES DEL DÍA A DÍA (CÓMO USARLO)
    # =========================================================================
    story.append(Paragraph("¿Qué le puedes pedir al Asistente?", title_style))
    story.append(Paragraph("Ejemplos cotidianos de preguntas que puedes hacerle en lenguaje natural", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=8))

    examples_data = [
        [
            Paragraph("<b>Área del Negocio</b>", card_title),
            Paragraph("<b>¿Para qué te sirve?</b>", card_title),
            Paragraph("<b>Pregunta de Ejemplo</b>", card_title)
        ],
        [
            Paragraph("<b>1. Taller y Obrador</b>", body_bold),
            Paragraph("Organiza los horneados de la semana en las 4 familias para no dejar tortas fuera.", card_text),
            Paragraph("<i>'¿Qué tortas y bocaditos debemos hornear para este fin de semana?'</i>", instruction_text)
        ],
        [
            Paragraph("<b>2. Ventas y Clientes</b>", body_bold),
            Paragraph("Revisa compras de la web pendientes de verificar y saldos adeudados por cobrar.", card_text),
            Paragraph("<i>'¿Qué pedidos de la página web tienen pago confirmado pero faltan sabores?'</i>", instruction_text)
        ],
        [
            Paragraph("<b>3. Finanzas y Caja</b>", body_bold),
            Paragraph("Reporte de ingresos, gastos del mes, cuentas por cobrar y facturas del SRI.", card_text),
            Paragraph("<i>'Muéstrame el resumen financiero de este mes y las cuentas por cobrar.'</i>", instruction_text)
        ],
        [
            Paragraph("<b>4. Mensajes y WhatsApp</b>", body_bold),
            Paragraph("Redacta respuestas dulces y sugerencias de combos usando la voz de Charbela.", card_text),
            Paragraph("<i>'Redáctame un mensaje de WhatsApp ofreciendo una mesa de dulces para 50 personas.'</i>", instruction_text)
        ],
        [
            Paragraph("<b>5. Personal y Horarios</b>", body_bold),
            Paragraph("Revisa horas extras, atrasos del reloj checador y pago de quincenas.", card_text),
            Paragraph("<i>'¿Hubo algún atraso o marcación pendiente del equipo esta semana?'</i>", instruction_text)
        ],
        [
            Paragraph("<b>6. Recetas y Costos</b>", body_bold),
            Paragraph("Calcula el costo exacto de ingredientes y alerta si la materia prima subió.", card_text),
            Paragraph("<i>'¿Cuánto nos cuesta producir la Torta de Chocolate de 20 porciones?'</i>", instruction_text)
        ],
        [
            Paragraph("<b>7. Calidad Kaizen</b>", body_bold),
            Paragraph("Bitácora de fotos de entrega y resolución de incidentes para cero errores.", card_text),
            Paragraph("<i>'Revisa si hubo alguna novedad con las entregas de ayer.'</i>", instruction_text)
        ]
    ]

    examples_table = Table(examples_data, colWidths=[110, 240, 182])
    examples_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(examples_table)
    story.append(Spacer(1, 8))

    # Tarjeta de Soporte Final
    footer_card = [
        Paragraph("<b>¡Tu pastelería más organizada, ágil y dulce que nunca!</b>", card_title),
        Paragraph(
            "Cualquier ajuste que desees sumar o duda sobre la conexión, Fernando está disponible para asistirte. "
            "Repositorios oficiales disponibles en GitHub: <b>charbela-mcp</b> y <b>charbela-brand</b>.",
            card_text
        )
    ]
    footer_table = Table([[footer_card]], colWidths=[532])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E8D1D9")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(footer_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado exitosamente en: {filename}")

if __name__ == "__main__":
    out_dir = r"C:\Users\fca\Documents\charbela-mcp\project"
    out_pdf = os.path.join(out_dir, "GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf")
    create_pdf(out_pdf)
    
    destinations = [
        r"C:\Users\fca\Documents\charbela-mcp\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf",
        r"c:\Users\fca\Documents\Charbela CRM\crm-charbela\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf",
        r"c:\Users\fca\Documents\Charbela CRM\crm-charbela\mcp-server\project\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf",
        r"c:\Users\fca\Documents\Charbela CRM\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf",
        r"c:\Users\fca\Downloads\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf",
        r"C:\Users\fca\.gemini\antigravity\brain\96b2525d-a69d-4a0a-9c48-ecff6d3db77e\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf"
    ]
    
    for dst in destinations:
        try:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(out_pdf, dst)
            print(f"Copiado a: {dst}")
        except Exception as e:
            print(f"Error copiando a {dst}: {e}")

    # Renderizar páginas a imágenes PNG de alta resolución
    try:
        import fitz
        doc_fitz = fitz.open(out_pdf)
        brain_dir = r"C:\Users\fca\.gemini\antigravity\brain\96b2525d-a69d-4a0a-9c48-ecff6d3db77e"
        for i, page in enumerate(doc_fitz):
            pix = page.get_pixmap(dpi=150)
            img_path = os.path.join(brain_dir, f"guia_charbela_pag_{i+1}.png")
            pix.save(img_path)
            print(f"Página {i+1} renderizada a imagen: {img_path}")
    except Exception as e:
        print(f"Error renderizando imágenes: {e}")
