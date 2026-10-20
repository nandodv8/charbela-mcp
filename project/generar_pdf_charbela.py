# -*- coding: utf-8 -*-
"""
Generador del PDF Ejecutivo para Charbela Pastelería
Guía Ejecutiva y Práctica: Visión General de Repositorios y Pasos de Instalación
Diseñado sin tecnicismos para Charbela y Gladys
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

# Paleta Ejecutiva Charbela
PRIMARY = colors.HexColor("#721C34")       # Vino / Borgoña profundo Charbela
PRIMARY_LIGHT = colors.HexColor("#FDF3F6") # Fondo suave vino
ACCENT_GOLD = colors.HexColor("#B8860B")   # Dorado artesanal
DARK_TEXT = colors.HexColor("#222222")     # Texto principal
MUTED_TEXT = colors.HexColor("#555555")    # Texto secundario
CARD_BG = colors.HexColor("#FAF7F2")       # Crema suave pastelería
CARD_BORDER = colors.HexColor("#E2D6CA")   # Borde tarjeta
SUCCESS_BG = colors.HexColor("#F0F7F2")    # Verde menta suave
SUCCESS_BORDER = colors.HexColor("#C2DEC9")
LINE_COLOR = colors.HexColor("#D8C9BB")

class NumberedCanvas(canvas.Canvas):
    """Lienzo de doble pasada para calcular el número total de páginas con precisión"""
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
            self.drawString(205, 755, "|   Guía de Configuración e Instalación del Asistente")
            
            self.setStrokeColor(LINE_COLOR)
            self.setLineWidth(0.7)
            self.line(40, 747, 572, 747)
            
        self.setStrokeColor(LINE_COLOR)
        self.setLineWidth(0.7)
        self.line(40, 42, 572, 42)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED_TEXT)
        self.drawString(40, 30, "Documento de Uso Interno  -  Charbela CRM & Asistente Inteligente")
        
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
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=ACCENT_GOLD,
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=PRIMARY,
        spaceBefore=7,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
        textColor=DARK_TEXT,
        spaceAfter=3
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
        fontSize=9.8,
        leading=13,
        textColor=PRIMARY,
        spaceAfter=2
    )

    card_text = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.6,
        leading=12.2,
        textColor=DARK_TEXT
    )

    instruction_text = ParagraphStyle(
        'InstructionText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.3,
        leading=11.8,
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
    # PÁGINA 1: PORTADA, QUÉ HACE EL ASISTENTE Y VISIÓN GENERAL DE REPOSITORIOS
    # =========================================================================
    header_data = [
        [
            Paragraph("CHARBELA PASTELERÍA ARTESANAL", badge_top_left),
            Paragraph("GUÍA DE ACTIVACIÓN DEL ASISTENTE", badge_top_right)
        ]
    ]
    header_table = Table(header_data, colWidths=[266, 266])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Tu Asistente de Gestión en Claude", title_style))
    story.append(Paragraph("Visión general del sistema, qué contiene cada repositorio y cómo conectarlo", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=8))

    # Bienvenida sin tecnicismos
    intro_p = Paragraph(
        "<b>¡Bienvenidas!</b><br/>"
        "Este documento explica de forma clara y directa cómo funciona el Asistente Inteligente de Charbela en Claude. "
        "El asistente se alimenta de <b>dos repositorios en GitHub</b> que contienen todo el conocimiento de la pastelería, "
        "y se conecta al CRM para que puedas consultar ventas, producción, recetas y finanzas en segundos.",
        card_text
    )
    intro_table = Table([[intro_p]], colWidths=[532])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 8))

    # VISIÓN GENERAL DE LOS DOS REPOSITORIOS
    story.append(Paragraph("1. Visión General: ¿Qué contiene cada Repositorio en GitHub?", h1_style))
    
    repo_data = [
        [
            Paragraph("<b>Repositorio 1: Operaciones y CRM</b>", card_title),
            Paragraph("<b>Repositorio 2: Marca y Estilo (Polen)</b>", card_title)
        ],
        [
            Paragraph("<b>Enlace:</b> https://github.com/nandodv8/charbela-mcp", body_bold),
            Paragraph("<b>Enlace:</b> https://github.com/nandodv8/charbela-brand", body_bold)
        ],
        [
            Paragraph(
                "<b>¿Qué contiene?</b><br/>"
                "&bull; <b>Habilidades operativas de la pastelería:</b> órdenes de producción para el taller, plan semanal de horneado en 4 familias, control de saldos y cobranza.<br/>"
                "&bull; <b>Herramientas financieras:</b> catálogo de recetas con costo de insumos, nómina del personal y control de gastos con comprobantes SRI.",
                card_text
            ),
            Paragraph(
                "<b>¿Qué contiene?</b><br/>"
                "&bull; <b>Identidad oficial de marca (Polen Estudio):</b> tono de voz y personalidad de Charbela.<br/>"
                "&bull; <b>Dos vías de comunicación:</b> tono cómplice para antojos (Vía BAKES) y tono cálido para tortas de eventos (Vía CELEBRACIÓN).<br/>"
                "&bull; <b>Checklists para el equipo:</b> estándares de empaque, despacho y plantillas de atención por WhatsApp.",
                card_text
            )
        ],
        [
            Paragraph("<b>¿Qué carpetas cargar?</b><br/>Cargar: <b>skills/</b> y <b>project/</b>", body_style),
            Paragraph("<b>¿Qué carpetas cargar?</b><br/><b>Cargar todo menos marca y referencia:</b><br/>(Sí cargar: 01_DOCS, 02_PARA_EL_EQUIPO, 03_SKILLS, 04_TOKENS. Omitir 05_MARCA y 06_REFERENCIA para evitar sobrepeso).", body_style)
        ]
    ]
    repo_table = Table(repo_data, colWidths=[266, 266])
    repo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), SUCCESS_BG),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor("#F9F0F3")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(repo_table)
    story.append(Spacer(1, 8))

    # FICHA RÁPIDA DE CONEXIÓN
    story.append(Paragraph("2. Datos Rápidos de Conexión del Asistente", h1_style))
    mcp_quick = [
        [Paragraph("<b>Nombre del Servidor:</b>", body_style), Paragraph("<b>Charbela CRM</b>", body_style)],
        [Paragraph("<b>URL del Servidor:</b>", body_style), Paragraph("<b>https://charbela-mcp-775456671841.us-central1.run.app/mcp</b>", body_style)],
        [Paragraph("<b>Tipo de Conexión:</b>", body_style), Paragraph("OAuth 2.0  (Inicio de sesión seguro con Google)", body_style)],
        [Paragraph("<b>ID de Cliente (Client ID):</b>", body_style), Paragraph("<font color='#721C34'><b>charbela_oauth_client_prod_2026</b></font>", body_style)],
        [Paragraph("<b>Secreto de Cliente:</b>", body_style), Paragraph("<i>(Dejar completamente en blanco / vacío)</i>", body_style)]
    ]
    mcp_quick_table = Table(mcp_quick, colWidths=[180, 352])
    mcp_quick_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(mcp_quick_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 2: GUÍA DE INSTALACIÓN PASO A PASO (SIN CÓDIGO)
    # =========================================================================
    story.append(Paragraph("Cómo Instalar tu Asistente en Claude", title_style))
    story.append(Paragraph("Instalación sencilla en 3 pasos: Conectar servidor, crear proyecto y agregar repositorios", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=10))

    # PASO 1
    paso1 = [
        Paragraph("<b>PASO 1: Conectar el Servidor de Charbela</b>", card_title),
        Spacer(1, 2),
        Paragraph(
            "1. Abre Claude (en la web o en tu aplicación de escritorio).<br/>"
            "2. Ve a <b>Ajustes (Settings)</b> ➔ <b>Integraciones / Servidores MCP</b>.<br/>"
            "3. Pulsa en <b>Agregar Servidor</b> y copia los datos:<br/>"
            "   &bull; <b>Nombre:</b> Charbela CRM<br/>"
            "   &bull; <b>URL:</b> https://charbela-mcp-775456671841.us-central1.run.app/mcp<br/>"
            "   &bull; <b>ID de Cliente:</b> charbela_oauth_client_prod_2026<br/>"
            "   &bull; <b>Secreto de Cliente:</b> Déjalo vacío.<br/>"
            "4. Haz clic en <b>Conectar</b>. Se abrirá una ventana con el logo de Charbela.<br/>"
            "5. Pulsa en <b>'Continuar con Google'</b>, elige tu correo habitual ¡y listo!",
            card_text
        )
    ]
    paso1_table = Table([[Paragraph("<font size=15 color='#721C34'><b>1</b></font>", ParagraphStyle('P1', alignment=1)), paso1]], colWidths=[36, 496])
    paso1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(paso1_table)
    story.append(Spacer(1, 8))

    # PASO 2
    paso2 = [
        Paragraph("<b>PASO 2: Crear el Proyecto en Claude</b>", card_title),
        Spacer(1, 2),
        Paragraph(
            "1. En el menú de la izquierda en Claude, entra a <b>Proyectos (Projects)</b>.<br/>"
            "2. Haz clic en <b>+ Crear Proyecto (+ Create Project)</b>.<br/>"
            "3. En título escribe: <b>Charbela Pastelería - Agente Ejecutivo CRM</b>.<br/>"
            "4. En la casilla <b>Project Instructions</b> haz clic en <b>Editar</b> y pega el texto de las instrucciones que se encuentra en la <b>Página 3</b> de esta guía.",
            card_text
        )
    ]
    paso2_table = Table([[Paragraph("<font size=15 color='#721C34'><b>2</b></font>", ParagraphStyle('P2', alignment=1)), paso2]], colWidths=[36, 496])
    paso2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(paso2_table)
    story.append(Spacer(1, 8))

    # PASO 3
    paso3 = [
        Paragraph("<b>PASO 3: Agregar los Dos Repositorios en el Proyecto</b>", card_title),
        Spacer(1, 2),
        Paragraph(
            "Dentro de tu Proyecto en Claude, entra a la pestaña <b>Project Knowledge (Conocimiento)</b> y pulsa en <b>Add Content ➔ GitHub</b>:<br/><br/>"
            "&bull; <b>Agregar Repositorio 1 (Operación & CRM):</b><br/>"
            "   Conecta <b>https://github.com/nandodv8/charbela-mcp</b> y selecciona las carpetas <b>skills/</b> y <b>project/</b>.<br/><br/>"
            "&bull; <b>Agregar Repositorio 2 (Marca Charbela & Polen):</b><br/>"
            "   Conecta <b>https://github.com/nandodv8/charbela-brand</b> y aplica la regla de carga ligera:<br/>"
            "   - <b>Cargar todo menos marca y referencia:</b> selecciona <b>01_DOCS/</b>, <b>02_PARA_EL_EQUIPO/</b>, <b>03_SKILLS/</b> y <b>04_TOKENS/</b>.<br/>"
            "   - Deja desmarcadas <b>05_MARCA/</b> y <b>06_REFERENCIA/</b> para que el proyecto no se ponga pesado.",
            card_text
        )
    ]
    paso3_table = Table([[Paragraph("<font size=15 color='#721C34'><b>3</b></font>", ParagraphStyle('P3', alignment=1)), paso3]], colWidths=[36, 496])
    paso3_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F9F0F3")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E2D0D8")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(paso3_table)
    story.append(Spacer(1, 8))

    # ENLACES RÁPIDOS CRM
    story.append(Paragraph("Enlaces Directos a los Módulos del CRM (Un Clic)", h1_style))
    crm_data = [
        [Paragraph("<b>Portal Principal:</b> https://crm.charbelapasteleria.com", body_style), Paragraph("<b>Taller y Obrador:</b> .../produccion", body_style)],
        [Paragraph("<b>Ventas y Cartera:</b> .../ventas", body_style), Paragraph("<b>Finanzas y Gastos:</b> .../finanzas", body_style)],
        [Paragraph("<b>Nómina y Asistencia:</b> .../nomina", body_style), Paragraph("<b>Recetas y Costos:</b> .../calidad", body_style)]
    ]
    crm_table = Table(crm_data, colWidths=[266, 266])
    crm_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 3.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(crm_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 3: TEXTO DE INSTRUCCIONES DEL PROYECTO (COPIAR Y PEGAR)
    # =========================================================================
    story.append(Paragraph("Instrucciones Oficiales del Proyecto", title_style))
    story.append(Paragraph("Texto maestro para copiar y pegar en la casilla 'Project Instructions' de Claude", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "<b>Instrucción para Charbela y Gladys:</b> Copia todo el contenido del recuadro a continuación y pégalo "
        "en las instrucciones de tu proyecto en Claude. Este texto le enseña al asistente cómo debe responderte:",
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

    # Construir documento
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
