# -*- coding: utf-8 -*-
"""
Generador del PDF Ejecutivo Completo para Charbela Pastelería
Guía de Configuración, Parámetros Exactos, Client ID, Enlaces e Instrucciones
Incluye Repositorio Oficial Charbela Brand y Carga Ligera
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
SUCCESS_TEXT = colors.HexColor("#1B6334")
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
        
        # Encabezado superior en páginas posteriores a la portada
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(PRIMARY)
            self.drawString(40, 755, "CHARBELA PASTELERÍA ARTESANAL")
            self.setFont("Helvetica", 8)
            self.setFillColor(MUTED_TEXT)
            self.drawString(205, 755, "|   Guía y Ficha de Configuración del Asistente")
            
            # Línea decorativa superior
            self.setStrokeColor(LINE_COLOR)
            self.setLineWidth(0.7)
            self.line(40, 747, 572, 747)
            
        # Pie de página en todas las páginas
        self.setStrokeColor(LINE_COLOR)
        self.setLineWidth(0.7)
        self.line(40, 42, 572, 42)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED_TEXT)
        self.drawString(40, 30, "Documento de Uso Interno  -  Charbela CRM & Conector Inteligente Cloud Run")
        
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
        fontSize=19,
        leading=23,
        textColor=PRIMARY,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14.5,
        textColor=ACCENT_GOLD,
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=PRIMARY,
        spaceBefore=7,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=DARK_TEXT,
        spaceAfter=4
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
        fontSize=10,
        leading=13.5,
        textColor=PRIMARY,
        spaceAfter=2
    )

    card_text = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
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

    quote_box_text = ParagraphStyle(
        'QuoteText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=MUTED_TEXT
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
    # PÁGINA 1: PORTADA Y FICHA DE CONEXIÓN RÁPIDA (DATOS EXACTOS)
    # =========================================================================
    header_data = [
        [
            Paragraph("CHARBELA PASTELERÍA ARTESANAL", badge_top_left),
            Paragraph("MANUAL DE OPERACIÓN Y ASISTENTE 2026", badge_top_right)
        ]
    ]
    header_table = Table(header_data, colWidths=[266, 266])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("Tu Asistente Ejecutivo Inteligente en Claude", title_style))
    story.append(Paragraph("Ficha de conexión rápida, enlaces directos y datos para copiar y pegar", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=8))

    # Tarjeta de Bienvenida
    intro_p1 = Paragraph(
        "<b>¡Bienvenidas a la nueva forma de gestionar Charbela!</b><br/>"
        "Esta guía contiene <b>todos los enlaces, títulos y códigos exactos</b> necesarios para activar tu "
        "Asistente Ejecutivo en Claude. Sin comandos complejos: solo copia cada valor en la casilla correspondiente.",
        card_text
    )
    intro_table = Table([[intro_p1]], colWidths=[532])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 8))

    # FICHA 1: DATOS PARA CONECTAR EL SERVIDOR MCP EN CLAUDE
    story.append(Paragraph("1. Datos para Conectar el Servidor MCP en Claude", h1_style))
    
    mcp_data = [
        [Paragraph("<b>Nombre del Servidor (Server Name):</b>", body_style), Paragraph("<b>Charbela CRM</b>", body_style)],
        [Paragraph("<b>URL del Servidor (Server URL):</b>", body_style), Paragraph("<b>https://charbela-mcp-775456671841.us-central1.run.app/mcp</b>", body_style)],
        [Paragraph("<b>Tipo de Autenticación:</b>", body_style), Paragraph("<b>OAuth 2.0</b>", body_style)],
        [Paragraph("<b>ID de Cliente (Client ID):</b>", body_style), Paragraph("<font color='#721C34'><b>charbela_oauth_client_prod_2026</b></font>", body_style)],
        [Paragraph("<b>Secreto de Cliente (Client Secret):</b>", body_style), Paragraph("<i>(Dejar completamente en blanco / vacío)</i>", body_style)],
        [Paragraph("<b>URL de Autorización (si lo pide):</b>", body_style), Paragraph("https://charbela-mcp-775456671841.us-central1.run.app/authorize", body_style)],
        [Paragraph("<b>URL de Token (si lo pide):</b>", body_style), Paragraph("https://charbela-mcp-775456671841.us-central1.run.app/token", body_style)],
        [Paragraph("<b>Método de Inicio de Sesión:</b>", body_style), Paragraph("Ventana emergente <b>'Continuar con Google'</b> (tu cuenta habitual)", body_style)]
    ]
    mcp_table = Table(mcp_data, colWidths=[195, 337])
    mcp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F2EAE1")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#FAF7F2")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#FFF0F4")),
        ('BACKGROUND', (0, 4), (-1, 4), colors.white),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor("#FAF7F2")),
        ('BACKGROUND', (0, 6), (-1, 6), colors.white),
        ('BACKGROUND', (0, 7), (-1, 7), colors.HexColor("#FAF7F2")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(mcp_table)
    story.append(Spacer(1, 8))

    # FICHA 2: DATOS DEL PROYECTO CLAUDE Y GITHUB
    story.append(Paragraph("2. Datos del Proyecto Claude & Repositorios en GitHub", h1_style))
    
    proj_data = [
        [Paragraph("<b>Título del Proyecto en Claude:</b>", body_style), Paragraph("<b>Charbela Pastelería - Agente Ejecutivo CRM</b>", body_style)],
        [Paragraph("<b>Descripción del Proyecto:</b>", body_style), Paragraph("Asistente inteligente 360° para Charbela Pastelería con acceso a ventas, taller, nómina, finanzas, recetas, marca y feedback.", body_style)],
        [Paragraph("<b>Repo 1 (Operación & MCP):</b>", body_style), Paragraph("<b>https://github.com/nandodv8/charbela-mcp</b>  <i>(Cargar: skills/ y project/)</i>", body_style)],
        [Paragraph("<b>Repo 2 (Marca Oficial Polen):</b>", body_style), Paragraph("<b>https://github.com/nandodv8/charbela-brand</b>  <i>(Cargar todo menos marca y referencia)</i>", body_style)]
    ]
    proj_table = Table(proj_data, colWidths=[195, 337])
    proj_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F2EAE1")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), SUCCESS_BG),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#F9F0F3")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(proj_table)
    story.append(Spacer(1, 8))

    # FICHA 3: ENLACES DIRECTOS DEL CRM DE CHARBELA
    story.append(Paragraph("3. Enlaces Directos del CRM (Accesibles en un Clic)", h1_style))
    
    crm_links_data = [
        [Paragraph("<b>Portal Principal del CRM:</b>", body_style), Paragraph("https://crm.charbelapasteleria.com", body_style)],
        [Paragraph("<b>Taller de Producción / Obrador:</b>", body_style), Paragraph("https://crm.charbelapasteleria.com/produccion", body_style)],
        [Paragraph("<b>Ventas, Pedidos y Cartera:</b>", body_style), Paragraph("https://crm.charbelapasteleria.com/ventas", body_style)],
        [Paragraph("<b>Nómina y Asistencia:</b>", body_style), Paragraph("https://crm.charbelapasteleria.com/nomina", body_style)],
        [Paragraph("<b>Finanzas y Gastos:</b>", body_style), Paragraph("https://crm.charbelapasteleria.com/finanzas", body_style)],
        [Paragraph("<b>Recetas, Costos y Calidad:</b>", body_style), Paragraph("https://crm.charbelapasteleria.com/calidad", body_style)]
    ]
    crm_links_table = Table(crm_links_data, colWidths=[195, 337])
    crm_links_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 3.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(crm_links_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 2: PASO A PASO PARA CONECTAR CLAUDE Y GITHUB
    # =========================================================================
    story.append(Paragraph("Paso a Paso de Conexión en Claude", title_style))
    story.append(Paragraph("Configuración en 3 fases: Conector MCP, Proyecto y Carga Ligera de Repositorios", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=12))

    # FASE A: AGREGAR EL CONECTOR MCP
    fase_a = [
        Paragraph("<b>FASE A: Conectar el Servidor MCP de Charbela</b>", card_title),
        Spacer(1, 2),
        Paragraph(
            "1. En Claude (pantalla de Ajustes / Integraciones o botón de Conectar Servidor MCP):<br/>"
            "2. En <b>Nombre del Servidor</b> escribe: <b>Charbela CRM</b>.<br/>"
            "3. En <b>URL</b> pega: <b>https://charbela-mcp-775456671841.us-central1.run.app/mcp</b>.<br/>"
            "4. En <b>ID de Cliente</b> pega: <b>charbela_oauth_client_prod_2026</b>.<br/>"
            "5. En <b>Secreto de Cliente</b>: déjalo <b>completamente en blanco / vacío</b>.<br/>"
            "6. Haz clic en <b>Conectar</b>. Se abrirá una ventana con el logo de Charbela.<br/>"
            "7. Pulsa <b>'Continuar con Google'</b>, elige tu correo de Gmail y ¡listo!",
            card_text
        )
    ]
    fase_a_table = Table([[Paragraph("<font size=15 color='#721C34'><b>A</b></font>", ParagraphStyle('NA', alignment=1)), fase_a]], colWidths=[36, 496])
    fase_a_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(fase_a_table)
    story.append(Spacer(1, 8))

    # FASE B: CREAR EL PROYECTO
    fase_b = [
        Paragraph("<b>FASE B: Crear el Proyecto en Claude</b>", card_title),
        Spacer(1, 2),
        Paragraph(
            "1. En el menú izquierdo de Claude, haz clic en <b>Proyectos</b> (Projects).<br/>"
            "2. Pulsa en <b>+ Crear Proyecto</b>.<br/>"
            "3. En título pon: <b>Charbela Pastelería - Agente Ejecutivo CRM</b>.<br/>"
            "4. En la casilla <b>Project Instructions</b> haz clic en <b>Editar</b> y pega el texto de las instrucciones (puedes copiarlo directamente de la <b>Página 3</b> de esta guía).",
            card_text
        )
    ]
    fase_b_table = Table([[Paragraph("<font size=15 color='#721C34'><b>B</b></font>", ParagraphStyle('NB', alignment=1)), fase_b]], colWidths=[36, 496])
    fase_b_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(fase_b_table)
    story.append(Spacer(1, 8))

    # FASE C: CONECTAR GITHUB (CARGA LIGERA)
    fase_c = [
        Paragraph("<b>FASE C: Cargar Habilidades y Marca (Carga Ligera sin sobrepeso)</b>", card_title),
        Spacer(1, 2),
        Paragraph(
            "Dentro de tu Proyecto en Claude, entra a la pestaña <b>Project Knowledge</b> (Conocimiento):<br/>"
            "&bull; <b>1. Del repositorio MCP (https://github.com/nandodv8/charbela-mcp):</b><br/>"
            "   Cargar la carpeta <b>skills/</b> y la carpeta <b>project/</b>.<br/>"
            "&bull; <b>2. Del repositorio Marca (https://github.com/nandodv8/charbela-brand):</b><br/>"
            "   <b>Cargar todo menos marca y referencia:</b><br/>"
            "   - Sí cargar: <b>01_DOCS/</b> (BRAND.md, MICROCOPY.md), <b>02_PARA_EL_EQUIPO/</b>, <b>03_SKILLS/</b> y <b>04_TOKENS/</b>.<br/>"
            "   - Excluir: <b>05_MARCA/</b> y <b>06_REFERENCIA/</b> (para evitar subir PDFs de 40MB e imágenes de muestra).",
            card_text
        )
    ]
    fase_c_table = Table([[Paragraph("<font size=15 color='#721C34'><b>C</b></font>", ParagraphStyle('NC', alignment=1)), fase_c]], colWidths=[36, 496])
    fase_c_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(fase_c_table)
    story.append(Spacer(1, 10))

    # Nota explicativa
    sync_note = Paragraph(
        "<b>¿Cómo se mantiene sincronizado?</b><br/>"
        "Al estar conectado con GitHub, cada vez que Fernando o el equipo actualicen recetas, combos o "
        "reglas de marca en GitHub, Claude los incorporará automáticamente en segundos.",
        card_text
    )
    sync_table = Table([[sync_note]], colWidths=[532])
    sync_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E8D1D9")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(sync_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 3: TEXTO EXACTO DE INSTRUCCIONES DEL PROYECTO (COPIAR Y PEGAR)
    # =========================================================================
    story.append(Paragraph("Instrucciones Oficiales del Proyecto", title_style))
    story.append(Paragraph("Texto maestro para copiar y pegar en la casilla 'Project Instructions' de Claude", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=10))

    instr_intro = Paragraph(
        "<b>Instrucción para Charbela y Gladys:</b><br/>"
        "Copia el texto del recuadro a continuación y pégalo directamente en las <b>Instrucciones del Proyecto</b> en Claude. "
        "Este texto le indica a la inteligencia artificial exactamente cómo debe atenderte:",
        card_text
    )
    story.append(instr_intro)
    story.append(Spacer(1, 8))

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
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(instructions_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 4: CATÁLOGO DE HABILIDADES Y CASOS COTIDIANOS
    # =========================================================================
    story.append(Paragraph("Catálogo de Habilidades y Casos de Uso", title_style))
    story.append(Paragraph("Las habilidades de tu repositorio y cómo aprovecharlas en la pastelería", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=10))

    skills_data = [
        [
            Paragraph("<b>Habilidad</b>", card_title),
            Paragraph("<b>¿Cómo te ayuda en el taller o tienda?</b>", card_title),
            Paragraph("<b>Pregunta de Ejemplo</b>", card_title)
        ],
        [
            Paragraph("<b>1. Obrador</b>", body_bold),
            Paragraph("Organiza los horneados en las 4 familias oficiales para optimizar los hornos.", card_text),
            Paragraph("<i>'¿Qué tortas debemos hornear para el fin de semana?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>2. Ventas</b>", body_bold),
            Paragraph("Revisa compras de la web pendientes de sabor y saldos adeudados por clientes.", card_text),
            Paragraph("<i>'¿Qué pedidos de la página web requieren confirmación?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>3. Finanzas</b>", body_bold),
            Paragraph("Audita gastos con comprobantes SRI y concilia cuentas bancarias.", card_text),
            Paragraph("<i>'¿Cuáles fueron los egresos más altos de esta semana?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>4. Marketing & Polen</b>", body_bold),
            Paragraph("Redacta respuestas dulces para WhatsApp ofreciendo combos y bocaditos.", card_text),
            Paragraph("<i>'Escríbeme una propuesta de torta y dulces para una boda.'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>5. Nómina</b>", body_bold),
            Paragraph("Controla horas extras, marcaciones de reloj y liquidaciones de quincena.", card_text),
            Paragraph("<i>'Revisa los fichajes del personal de pastelería de esta quincena.'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>6. Costos</b>", body_bold),
            Paragraph("Calcula el costo de ingredientes y alerta si la materia prima supera el 35%.", card_text),
            Paragraph("<i>'Muéstrame el costo detallado de la Torta de Chocolate 20p.'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>7. Calidad</b>", body_bold),
            Paragraph("Bitácora de fotos testigo y causa raíz para garantizar cero defectos.", card_text),
            Paragraph("<i>'¿Hubo algún reporte de entrega o reclamo en la semana?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>8. Mejoras</b>", body_bold),
            Paragraph("Registra sugerencias de cambios en la app directamente en el CRM.", card_text),
            Paragraph("<i>'Reporta que en pedidos queremos filtrar por sector de entrega.'</i>", quote_box_text)
        ]
    ]

    skills_table = Table(skills_data, colWidths=[110, 252, 170])
    skills_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(skills_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("4 Situaciones Reales de Uso", h1_style))

    case1 = [
        Paragraph("<b>Lunes: Planificar la Producción</b>", card_title),
        Paragraph("<i>'Claude, prepárame el resumen de producción de la semana por días.'</i><br/>"
                  "Te dará los bizcochuelos para el jueves y decorados para el viernes.", card_text)
    ]
    case2 = [
        Paragraph("<b>Miércoles: Cobranzas</b>", card_title),
        Paragraph("<i>'¿Qué pedidos de este fin de semana tienen saldos por cobrar?'</i><br/>"
                  "Te listará clientes, montos y enlaces para recordarles con amabilidad.", card_text)
    ]
    case3 = [
        Paragraph("<b>Viernes: Control de Calidad</b>", card_title),
        Paragraph("<i>'Revisa si el pedido #1042 tiene notas especiales o dedicatoria.'</i><br/>"
                  "Te dará los detalles exactos antes de salir del taller.", card_text)
    ]
    case4 = [
        Paragraph("<b>Cualquier Momento: Mejoras</b>", card_title),
        Paragraph("<i>'Anota una mejora: en pedidos quisiéramos alerta roja si faltan 24h.'</i><br/>"
                  "Se registrará en el sistema y Fernando la verá de inmediato.", card_text)
    ]

    cases_table = Table([[case1, case2], [case3, case4]], colWidths=[261, 261])
    cases_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(cases_table)
    story.append(Spacer(1, 8))

    # Tarjeta de Soporte Final
    footer_card = [
        Paragraph("<b>¡Tu pastelería más ágil, organizada y dulce que nunca!</b>", card_title),
        Paragraph(
            "Cualquier duda sobre el uso o si deseas sumar una nueva habilidad para Charbela, "
            "Fernando está disponible para asistirte. Repositorio en <b>https://github.com/nandodv8/charbela-mcp</b>.",
            card_text
        )
    ]
    footer_table = Table([[footer_card]], colWidths=[532])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E8D1D9")),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(footer_table)

    # Construir documento
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado exitosamente en: {filename}")

if __name__ == "__main__":
    out_dir = r"C:\Users\fca\Documents\charbela-mcp\project"
    out_pdf = os.path.join(out_dir, "GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf")
    create_pdf(out_pdf)
    
    root_pdf = r"C:\Users\fca\Documents\charbela-mcp\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf"
    shutil.copyfile(out_pdf, root_pdf)
    
    crm_pdf = r"c:\Users\fca\Documents\Charbela CRM\crm-charbela\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf"
    shutil.copyfile(out_pdf, crm_pdf)
    print(f"Copiado a: {root_pdf}")
    print(f"Copiado a: {crm_pdf}")
