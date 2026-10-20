# -*- coding: utf-8 -*-
"""
Generador del PDF Ejecutivo para Charbela Pastelería
Guía de Configuración del Asistente en Claude & GitHub (Sin Líneas de Código)
Diseño Tipográfico Limpio y Editorial sin glifos incompatibles
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
GOLD_LIGHT = colors.HexColor("#FFFDF8")    # Crema dorado
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
            self.drawString(205, 755, "|   Guía Ejecutiva de Configuración del Asistente")
            
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

    # Estilos tipográficos
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=ACCENT_GOLD,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=5
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=DARK_TEXT,
        spaceAfter=6
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
        fontSize=10.5,
        leading=14,
        textColor=PRIMARY,
        spaceAfter=3
    )

    card_text = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=DARK_TEXT
    )

    quote_box_text = ParagraphStyle(
        'QuoteText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.8,
        leading=12.5,
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
    # PÁGINA 1: PORTADA EJECUTIVA Y VISIÓN GENERAL
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
    story.append(Spacer(1, 8))

    story.append(Paragraph("Tu Asistente Ejecutivo Inteligente en Claude", title_style))
    story.append(Paragraph("Guía práctica de activación y uso diario para Charbela y Gladys — Sin líneas de código", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=12))

    # Tarjeta de Bienvenida
    intro_p1 = Paragraph(
        "<b>¡Bienvenidas a la nueva forma de gestionar Charbela Pastelería!</b><br/>"
        "Hemos creado un <b>Asistente Ejecutivo Personalizado</b> dentro de Claude que se conecta directamente "
        "a la base de datos de tu pastelería en tiempo real. Ahora podrás consultar pedidos, planificar horneados, "
        "revisar nómina, verificar costos y cotizar eventos simplemente escribiendo como si conversaras con un colega de tu equipo directivo.",
        card_text
    )
    intro_table = Table([[intro_p1]], colWidths=[532])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 12))

    # Los 3 Pilares
    story.append(Paragraph("Los 3 Pilares de tu Asistente", h1_style))
    
    col1 = [
        Paragraph("<b>1. Conexión en Vivo</b>", card_title),
        Paragraph("Claude se comunica de forma segura con tu CRM en la nube. Todo dato de pedidos, clientes o gastos está 100% actualizado al instante.", card_text)
    ]
    col2 = [
        Paragraph("<b>2. Biblioteca en GitHub</b>", card_title),
        Paragraph("Un repositorio público donde se guardan las recetas, reglas y manuales. Cada actualización se refleja automáticamente en Claude.", card_text)
    ]
    col3 = [
        Paragraph("<b>3. Habilidades (Skills)</b>", card_title),
        Paragraph("Módulos de conocimiento especializado para cada frente: Obrador, Finanzas, Marketing, Nómina, Calidad y Sugerencias del CRM.", card_text)
    ]

    pillars_table = Table([[col1, col2, col3]], colWidths=[172, 172, 172])
    pillars_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), PRIMARY_LIGHT),
        ('BACKGROUND', (1, 0), (1, 0), CARD_BG),
        ('BACKGROUND', (2, 0), (2, 0), SUCCESS_BG),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor("#E8D1D9")),
        ('BOX', (1, 0), (1, 0), 1, CARD_BORDER),
        ('BOX', (2, 0), (2, 0), 1, SUCCESS_BORDER),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(pillars_table)
    story.append(Spacer(1, 14))

    # Ficha Técnica Simple del Asistente
    story.append(Paragraph("Ficha Técnica y Datos Clave", h1_style))
    
    info_data = [
        [Paragraph("<b>Nombre del Asistente:</b>", body_style), Paragraph("Charbela Pastelería - Agente Ejecutivo CRM", body_style)],
        [Paragraph("<b>Repositorio Oficial en GitHub:</b>", body_style), Paragraph("<b>https://github.com/nandodv8/charbela-mcp</b>  <i>(Público y abierto)</i>", body_style)],
        [Paragraph("<b>Servidor en la Nube (Google):</b>", body_style), Paragraph("Google Cloud Run con inicio de sesión seguro de Google", body_style)],
        [Paragraph("<b>Usuarios con Acceso Directo:</b>", body_style), Paragraph("Gladys Altos, Charbela, Fernando Colombo y equipo directivo", body_style)],
        [Paragraph("<b>Herramientas Disponibles:</b>", body_style), Paragraph("<b>36 funciones operativas</b> listas para responder preguntas al instante", body_style)]
    ]
    info_table = Table(info_data, colWidths=[180, 352])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F2EAE1")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor("#FBF8F5")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.white),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor("#FBF8F5")),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(info_table)
    
    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 2: PASO A PASO PARA ACTIVAR TU ASISTENTE EN CLAUDE
    # =========================================================================
    story.append(Paragraph("Pasos para Activar tu Asistente en Claude", title_style))
    story.append(Paragraph("Configuración en solo 3 pasos sencillos dentro de Claude.ai o la aplicación de computadora", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=14))

    # PASO 1
    step1_content = [
        Paragraph("<b>PASO 1: Crear el Proyecto en Claude</b>", card_title),
        Spacer(1, 3),
        Paragraph(
            "1. Ingresa a tu cuenta habitual en <b>claude.ai</b> o abre la app de Claude en tu Mac o Windows.<br/>"
            "2. En el menú de la izquierda, haz clic en la sección <b>Proyectos</b> (Projects).<br/>"
            "3. Pulsa el botón <b>+ Crear Proyecto</b> (Create Project) en la esquina superior derecha.<br/>"
            "4. Escribe el nombre: <b>Charbela Pastelería - Agente Ejecutivo CRM</b>.<br/>"
            "5. En descripción puedes poner: <i>Control total de pedidos, recetas, taller y finanzas.</i>",
            card_text
        )
    ]
    step1_table = Table([[Paragraph("<font size=16 color='#721C34'><b>1</b></font>", ParagraphStyle('N1', alignment=1)), step1_content]], colWidths=[40, 492])
    step1_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(step1_table)
    story.append(Spacer(1, 10))

    # PASO 2
    step2_content = [
        Paragraph("<b>PASO 2: Pegar las Instrucciones de Bienvenida</b>", card_title),
        Spacer(1, 3),
        Paragraph(
            "1. Dentro de tu nuevo Proyecto, verás una casilla que dice <b>Project Instructions</b>.<br/>"
            "2. Haz clic en el botón <b>Editar</b> (Edit).<br/>"
            "3. Pega el texto del archivo de instrucciones oficiales que Fernando te compartirá (también disponible en GitHub en la carpeta <i>project</i>).<br/>"
            "4. Guarda los cambios. Esto le indica a Claude cómo hablar con amabilidad, usar las 4 familias oficiales de producción de Charbela y darte siempre enlaces directos al CRM.",
            card_text
        )
    ]
    step2_table = Table([[Paragraph("<font size=16 color='#721C34'><b>2</b></font>", ParagraphStyle('N2', alignment=1)), step2_content]], colWidths=[40, 492])
    step2_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(step2_table)
    story.append(Spacer(1, 10))

    # PASO 3
    step3_content = [
        Paragraph("<b>PASO 3: Vincular el Repositorio de GitHub para Cargar las Habilidades</b>", card_title),
        Spacer(1, 3),
        Paragraph(
            "Para que Claude lea automáticamente todas las recetas, políticas y habilidades de Charbela:<br/>"
            "&bull; <b>Opción A (Recomendada con GitHub):</b><br/>"
            "   1. En la pestaña <b>Project Knowledge</b> (Conocimiento), haz clic en <b>Add Content</b> ➔ <b>GitHub</b>.<br/>"
            "   2. Conecta con el repositorio público: <b>https://github.com/nandodv8/charbela-mcp</b>.<br/>"
            "   3. Selecciona la carpeta <b>skills/</b> y la carpeta <b>project/</b>.<br/>"
            "   4. ¡Listo! Cada vez que el equipo agregue una receta o regla a GitHub, Claude la aprenderá de inmediato.<br/><br/>"
            "&bull; <b>Opción B (Carga de Archivos Directa):</b><br/>"
            "   Si prefieres no usar el botón de GitHub, haz clic en <b>Add Content</b> ➔ <b>Upload Files</b> y selecciona los documentos de la carpeta <i>skills</i> que Fernando te enviará.",
            card_text
        )
    ]
    step3_table = Table([[Paragraph("<font size=16 color='#721C34'><b>3</b></font>", ParagraphStyle('N3', alignment=1)), step3_content]], colWidths=[40, 492])
    step3_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(step3_table)
    story.append(Spacer(1, 12))

    # Nota destacada
    callout = Paragraph(
        "<b>¿Por qué es tan potente tenerlo conectado a GitHub?</b><br/>"
        "Porque no necesitas volver a configurar nada cuando haya cambios en el negocio. Si Charbela crea una nueva "
        "torta estrella, cambia los días de horneado o ajusta precios de insumos, el equipo actualiza GitHub y tu "
        "asistente ya sabrá responder con los nuevos datos al instante.",
        card_text
    )
    callout_table = Table([[callout]], colWidths=[532])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E8D1D9")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(callout_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 3: CATÁLOGO DE HABILIDADES (SKILLS)
    # =========================================================================
    story.append(Paragraph("Catálogo de Habilidades de tu Asistente", title_style))
    story.append(Paragraph("Conoce cada una de las 8 áreas de conocimiento que residen en tu repositorio", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=12))

    skills_data = [
        [
            Paragraph("<b>Área / Habilidad</b>", card_title),
            Paragraph("<b>¿Cómo te ayuda en el día a día?</b>", card_title),
            Paragraph("<b>Pregunta de Ejemplo</b>", card_title)
        ],
        [
            Paragraph("<b>1. Obrador & Producción</b>", body_bold),
            Paragraph("Organiza los horneados y armados del taller en las 4 familias oficiales (tradicionales, decorados, dulces decorados y masas de tortas).", card_text),
            Paragraph("<i>'¿Qué tortas y bocaditos debemos entregar este sábado?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>2. Ventas & Cartera</b>", body_bold),
            Paragraph("Monitorea pedidos web de WooCommerce por verificar sabor, cotizaciones enviadas y saldos pendientes por cobrar antes de entregar.", card_text),
            Paragraph("<i>'¿Qué pedidos de la página web requieren confirmación?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>3. Finanzas & Gastos</b>", body_bold),
            Paragraph("Audita egresos con comprobantes válidos, concilia transferencias bancarias y cuida la rentabilidad operativa.", card_text),
            Paragraph("<i>'¿Cuáles fueron los gastos más altos de la última semana?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>4. Marketing & WhatsApp</b>", body_bold),
            Paragraph("Redacta respuestas dulces, amables y persuasivas para WhatsApp con sugerencias de combos y venta complementaria para eventos.", card_text),
            Paragraph("<i>'Escríbeme un mensaje de cotización para una boda con mesa dulce.'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>5. Nómina & Personal</b>", body_bold),
            Paragraph("Verifica marcaciones de asistencia en el reloj checador, horas extras y liquidaciones de anticipos de quincena.", card_text),
            Paragraph("<i>'Revisa los fichajes de esta quincena del personal de pastelería.'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>6. Recetas & Costos (COGS)</b>", body_bold),
            Paragraph("Analiza los ingredientes de masas, rellenos y decoraciones. Te alerta si el costo de materia prima supera el 35% del precio.", card_text),
            Paragraph("<i>'Muéstrame el costo detallado de la Torta de Chocolate de 20 porciones.'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>7. Calidad & Kaizen</b>", body_bold),
            Paragraph("Bitácora de incidencias, fotos testigo de pedidos antes de salir y mejora continua para que ningún pedido salga con fallas.", card_text),
            Paragraph("<i>'¿Hubo algún reporte de entrega o retraso en la última semana?'</i>", quote_box_text)
        ],
        [
            Paragraph("<b>8. Mejoras & Sugerencias</b>", body_bold),
            Paragraph("¿Viste algo en la app que quisieras cambiar o agregar? Pídeselo a Claude y se registrará automáticamente en el CRM.", card_text),
            Paragraph("<i>'Reporta que en ventas queremos filtrar clientes por sector.'</i>", quote_box_text)
        ]
    ]

    skills_table = Table(skills_data, colWidths=[130, 242, 160])
    skills_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(skills_table)

    story.append(PageBreak())

    # =========================================================================
    # PÁGINA 4: GUÍA PRÁCTICA DE USO DIARIO Y ENLACES EN UN CLIC
    # =========================================================================
    story.append(Paragraph("Tu Día a Día con el Asistente", title_style))
    story.append(Paragraph("Respuestas instantáneas y enlaces directos a las pantallas de tu pastelería", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_GOLD, spaceBefore=0, spaceAfter=14))

    # Tarjeta de Deep-Linking
    link_card = [
        Paragraph("<b>La Magia de los Enlaces Directos (Deep-Linking)</b>", card_title),
        Spacer(1, 3),
        Paragraph(
            "Cada vez que Claude mencione un pedido, una receta o un pago, <b>no tienes que ir a buscarlo manualmente en el sistema</b>. "
            "Claude te mostrará un enlace azul. Con un solo clic, se abrirá la pantalla exacta en tu CRM:<br/>"
            "&bull; <b>Para el taller de cocina:</b> te lleva directo al pedido en la vista de producción.<br/>"
            "&bull; <b>Para cotizaciones de clientes:</b> te abre el enlace interactivo público que puedes compartirle por WhatsApp.<br/>"
            "&bull; <b>Para finanzas o personal:</b> te lleva a la sección de gastos o nómina correspondiente.",
            card_text
        )
    ]
    link_table = Table([[link_card]], colWidths=[532])
    link_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_BORDER),
        ('PADDING', (0, 0), (-1, -1), 9),
    ]))
    story.append(link_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("4 Situaciones Reales de Uso en Pastelería", h1_style))

    case1 = [
        Paragraph("<b>1. Lunes por la mañana: Planificar la Producción</b>", card_title),
        Paragraph("Escríbele: <i>'Claude, prepárame el resumen de pedidos de esta semana organizado por días y familias de producción.'</i><br/>"
                  "Claude te dará la lista consolidada de bizcochuelos para hornear el jueves y decorados para el viernes.", card_text)
    ]
    case2 = [
        Paragraph("<b>2. Miércoles por la tarde: Cobranzas y Anticipos</b>", card_title),
        Paragraph("Escríbele: <i>'¿Qué pedidos de este fin de semana tienen saldos pendientes por cobrar?'</i><br/>"
                  "Claude te listará los nombres de los clientes, los montos y los enlaces para que les envíes el recordatorio amable.", card_text)
    ]
    case3 = [
        Paragraph("<b>3. Viernes: Control de Calidad y Registro</b>", card_title),
        Paragraph("Escríbele: <i>'Verifica si el pedido #1042 tiene alguna observación especial sobre alergias o dedicatoria.'</i><br/>"
                  "Claude te responderá con las especificaciones exactas del cliente.", card_text)
    ]
    case4 = [
        Paragraph("<b>4. Cualquier momento: Proponer Mejoras en el CRM</b>", card_title),
        Paragraph("Escríbele: <i>'Claude, por favor anota una mejora: en la pantalla de pedidos sería ideal que aparezca una alerta roja si faltan menos de 24 horas para la entrega.'</i><br/>"
                  "Claude registrará la sugerencia en la base de datos de desarrollo y Fernando la verá de inmediato.", card_text)
    ]

    cases_table = Table([[case1, case2], [case3, case4]], colWidths=[261, 261])
    cases_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, CARD_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(cases_table)
    story.append(Spacer(1, 14))

    # Tarjeta de Soporte Final
    footer_card = [
        Paragraph("<b>¡Tu pastelería más ágil, organizada y dulce que nunca!</b>", card_title),
        Paragraph(
            "Cualquier consulta sobre cómo sacar el máximo provecho de tu asistente, o si deseas incorporar "
            "una nueva habilidad especializada para Charbela, Fernando está disponible para asistirte. "
            "Toda la documentación y catálogo de habilidades se mantiene respaldado en <b>https://github.com/nandodv8/charbela-mcp</b>.",
            card_text
        )
    ]
    footer_table = Table([[footer_card]], colWidths=[532])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E8D1D9")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(footer_table)

    # Construir documento
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado exitosamente en: {filename}")

if __name__ == "__main__":
    out_dir = r"C:\Users\fca\Documents\charbela-mcp\project"
    out_pdf = os.path.join(out_dir, "GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf")
    create_pdf(out_pdf)
    
    # Copiar a la raíz de charbela-mcp y al CRM
    root_pdf = r"C:\Users\fca\Documents\charbela-mcp\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf"
    shutil.copyfile(out_pdf, root_pdf)
    
    crm_pdf = r"c:\Users\fca\Documents\Charbela CRM\crm-charbela\GUIA_CONFIGURACION_CLAUDE_CHARBELA.pdf"
    shutil.copyfile(out_pdf, crm_pdf)
    print(f"Copiado a: {root_pdf}")
    print(f"Copiado a: {crm_pdf}")
