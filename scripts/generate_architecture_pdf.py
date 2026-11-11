"""
FoodAI - Complete System Architecture & Codebase Documentation PDF Generator
Produces an executive-grade, 11-page publication-quality technical specification PDF.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    PageBreak,
    HRFlowable,
)
from reportlab.pdfgen import canvas

OUTPUT_PDF = r"D:\foodai\FoodAI_Architecture_Documentation.pdf"


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total pages and draw
    consistent running headers and footers ('Page X of Y').
    """
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
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, total_pages):
        # Suppress header and footer on cover page (page 1)
        if self._pageNumber == 1:
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#065f46"))

        # Running Header
        self.drawString(
            40,
            762,
            "FOODAI (KNOW WHAT YOU'RE EATING) • COMPLETE SYSTEM ARCHITECTURE & CODEBASE SPECIFICATION"
        )
        self.setStrokeColor(colors.HexColor("#10b981"))
        self.setLineWidth(1)
        self.line(40, 754, 572, 754)

        # Running Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(
            40,
            30,
            "Confidential • FoodAI Engineering & Architecture • Production Release Specification"
        )
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(572, 30, page_str)
        self.restoreState()


def generate_documentation_pdf():
    # 612 x 792 pt (Letter), Margins 40pt
    # Printable area: 532 pt wide x 706 pt high
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=42,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    # Color Palette
    c_primary_dark = colors.HexColor("#064e3b")
    c_primary = colors.HexColor("#059669")
    c_primary_light = colors.HexColor("#ecfdf5")
    c_slate_dark = colors.HexColor("#0f172a")
    c_slate_body = colors.HexColor("#334155")
    c_slate_muted = colors.HexColor("#64748b")
    c_bg_subtle = colors.HexColor("#f8fafc")
    c_bg_code = colors.HexColor("#f1f5f9")
    c_border = colors.HexColor("#cbd5e1")
    c_red = colors.HexColor("#dc2626")
    c_amber = colors.HexColor("#d97706")
    c_blue = colors.HexColor("#2563eb")

    # Typography Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary_dark,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_slate_muted,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary_dark,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_primary,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=c_slate_body,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2.5
    )

    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=c_primary_dark
    )

    code_block_style = ParagraphStyle(
        'CodeBlock_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    th_style = ParagraphStyle(
        'TableHeader_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white
    )

    tc_style = ParagraphStyle(
        'TableCell_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9.5,
        textColor=c_slate_body
    )

    tc_bold = ParagraphStyle(
        'TableCellBold_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9.5,
        textColor=c_slate_dark
    )

    tc_code = ParagraphStyle(
        'TableCellCode_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=c_slate_dark
    )

    story = []

    # =========================================================================
    # PAGE 1: COVER & EXECUTIVE DASHBOARD
    # =========================================================================
    story.append(Spacer(1, 15))
    story.append(Paragraph("FoodAI: Know What You're Eating", title_style))
    story.append(Paragraph(
        "Comprehensive System Architecture, Technical Specification & Repository File Documentation",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=2.5, color=c_primary, spaceBefore=0, spaceAfter=12))

    # Executive Metadata Grid
    meta_data = [
        [
            Paragraph("System Release", tc_bold),
            Paragraph("v2.4.0 (Production Release)", tc_style),
            Paragraph("Document Date", tc_bold),
            Paragraph("November 2026", tc_style)
        ],
        [
            Paragraph("Target Platforms", tc_bold),
            Paragraph("Web SPA & Android Native (Capacitor)", tc_style),
            Paragraph("Android Package ID", tc_bold),
            Paragraph("com.foodai.app", tc_code)
        ],
        [
            Paragraph("Firebase Project", tc_bold),
            Paragraph("food-ai-433b7 (#59556325769)", tc_style),
            Paragraph("Core AI Models", tc_bold),
            Paragraph("Gemini 2.0 Flash & Gemini Vision", tc_style)
        ],
        [
            Paragraph("Automated Tests", tc_bold),
            Paragraph("100% Pass (91/91 Unit & Integration)", tc_style),
            Paragraph("Repository Branch", tc_bold),
            Paragraph("main (Synchronized with origin)", tc_style)
        ],
        [
            Paragraph("Frontend Framework", tc_bold),
            Paragraph("React 18 + TypeScript + Vite + Tailwind", tc_style),
            Paragraph("Backend Frameworks", tc_bold),
            Paragraph("Django 4.2 REST & Node/Express API", tc_style)
        ],
    ]
    t_meta = Table(meta_data, colWidths=[105, 161, 105, 161])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_subtle),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Executive Mission Callout Box
    callout_data = [[
        Paragraph(
            "<b>Mission Overview:</b> FoodAI transforms static, deceptive packaged food labels and ambiguous meals into real-time, "
            "actionable pre-eating intelligence. By combining high-frequency camera computer vision, Indian FSSAI Front-of-Pack thresholds, "
            "multimodal Google Gemini AI, and condition-specific clinical health rules, FoodAI protects users from acute metabolic damage, "
            "hidden sugar spikes, and chronic inflammatory additive exposure prior to consumption.",
            callout_style
        )
    ]]
    t_callout = Table(callout_data, colWidths=[532])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_primary_light),
        ('BOX', (0, 0), (-1, -1), 1, c_primary),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 12))

    # Architecture Roadmap / Table of Contents
    story.append(Paragraph("System Specification Table of Contents", h2_style))
    toc_data = [
        [Paragraph("Sec", th_style), Paragraph("Section Title", th_style), Paragraph("Key Engineering Topics & Deliverables", th_style)],
        [Paragraph("1", tc_bold), Paragraph("Executive Summary & Clinical Mission", tc_bold), Paragraph("Metabolic crisis, ultra-processed food hazards, 5 strategic value pillars, target personas.", tc_style)],
        [Paragraph("2", tc_bold), Paragraph("High-Level 4-Tier System Architecture", tc_bold), Paragraph("Client-Server-AI Cloud topology diagram, microservice division, data flow sequence.", tc_style)],
        [Paragraph("3", tc_bold), Paragraph("Frontend & Native Android Bridge", tc_bold), Paragraph("React 18 SPA, Capacitor 6 shell, 60ms auto-detection camera scanner, Web Audio API chime.", tc_style)],
        [Paragraph("4", tc_bold), Paragraph("AI & Clinical Nutrition Engines", tc_bold), Paragraph("Gemini Vision Plate AI, FSSAI FOPNL thresholds, NOVA groups 1-4, INS additive matrix.", tc_style)],
        [Paragraph("5", tc_bold), Paragraph("Personalized Medical Alerts & Damage Control", tc_bold), Paragraph("8 medical presets (Diabetes, BP, CVD, etc.), pre-eating buffers, 24-hr WHO tracker.", tc_style)],
        [Paragraph("6", tc_bold), Paragraph("Backend Microservices & API Architecture", tc_bold), Paragraph("Django REST Framework, Node/Express AI proxy, Firebase Admin SDK, MIME file safety.", tc_style)],
        [Paragraph("7", tc_bold), Paragraph("Security, Identity & Android Cryptography", tc_bold), Paragraph("Credential Manager Google Sign-In, Keystore SHA-1/SHA-256 keys, Firestore security rules.", tc_style)],
        [Paragraph("8", tc_bold), Paragraph("Exhaustive Repository File Map (Frontend)", tc_bold), Paragraph("Detailed file documentation for all 19 React pages, 5 services, and Android project files.", tc_style)],
        [Paragraph("9", tc_bold), Paragraph("Exhaustive Repository File Map (Backend & Data)", tc_bold), Paragraph("Detailed documentation for Django apps, Node routes, configs, and REST API endpoints.", tc_style)],
        [Paragraph("10", tc_bold), Paragraph("Build, Testing & Deployment Pipelines", tc_bold), Paragraph("Vitest (91/91 passing), Pytest, Gradle APK build, ADB install, Vercel & Render hosting.", tc_style)],
        [Paragraph("11", tc_bold), Paragraph("Maintenance, Monitoring & Future Roadmap", tc_bold), Paragraph("In-app GitHub release updates, structured logging, CGM Bluetooth sync, wearable roadmap.", tc_style)],
    ]
    t_toc = Table(toc_data, colWidths=[24, 178, 330])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_toc)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: EXECUTIVE SUMMARY & CLINICAL MISSION
    # =========================================================================
    story.append(Paragraph("1. Executive Summary & Clinical Mission", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "Modern consumer packaged food represents a public health crisis. Ultra-processed foods (UPFs) engineered for hyper-palatability "
        "rely on chemical additives, hidden refined starches (Maltodextrin, High-Fructose Corn Syrup), and oxidized industrial seed oils. "
        "Front-of-package marketing claims—such as 'Natural', 'Whole Grain', or 'Zero Added Sugar'—frequently mislead consumers while "
        "masking extreme levels of free sugars, high sodium, and metabolic disrupters. For patients with chronic conditions like Type 2 Diabetes, "
        "Hypertension, Cardiovascular Disease, and Non-Alcoholic Fatty Liver Disease (NAFLD), consuming these products leads to immediate physiological harm.",
        body_style
    ))
    story.append(Paragraph(
        "<b>FoodAI ('Know What You’re Eating')</b> inverts this dynamic through instantaneous pre-eating intelligence. "
        "Rather than recording food logs retroactively, FoodAI intercepts food choices at the point of decision—in supermarkets, kitchens, "
        "and restaurants—evaluating the product against official clinical standards and the user's personal health profile.",
        body_style
    ))

    story.append(Paragraph("Strategic Value Pillars", h2_style))
    pillars_data = [
        [Paragraph("Pillar", th_style), Paragraph("Clinical Objective", th_style), Paragraph("Technical Architecture", th_style)],
        [
            Paragraph("1. Pre-Eating Medical Alerts", tc_bold),
            Paragraph("Prevent ingestion of contraindicated ingredients.", tc_style),
            Paragraph("Algorithmic cross-referencing against 8 medical condition profiles (Diabetes, Hypertension, CVD, Celiac, etc.).", tc_style)
        ],
        [
            Paragraph("2. FSSAI FOPNL Warnings", tc_bold),
            Paragraph("Flag high sugar, saturated fat, and sodium products.", tc_style),
            Paragraph("Automated weight-percentage thresholding conforming to Indian Food Safety & Standards Authority front-of-pack regulations.", tc_style)
        ],
        [
            Paragraph("3. Plate AI Vision", tc_bold),
            Paragraph("Analyze unpacked, home-cooked, and restaurant meals.", tc_style),
            Paragraph("Multimodal computer vision pipeline via Google Gemini 2.0 Flash Vision for multi-item segmentation and portion weight estimation.", tc_style)
        ],
        [
            Paragraph("4. Tactical Damage Control", tc_bold),
            Paragraph("Mitigate metabolic impact if a treat is consumed.", tc_style),
            Paragraph("Physiological buffering protocols: pre-meal soluble fiber (chia/almonds), sodium flushing hydration, and GLUT-4 walking.", tc_style)
        ],
        [
            Paragraph("5. 24-Hr WHO Safe Tracker", tc_bold),
            Paragraph("Prevent chronic cumulative additive & sugar toxicity.", tc_style),
            Paragraph("Real-time cumulative tracking against WHO ceilings (Free Sugar 25g, Salt 5g, Saturated Fat 20g, Additive load).", tc_style)
        ],
    ]
    t_pillars = Table(pillars_data, colWidths=[110, 162, 260])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_pillars)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Clinical Personas & User Scenarios", h2_style))
    personas_data = [
        [Paragraph("Target Persona", th_style), Paragraph("Clinical Need", th_style), Paragraph("FoodAI Protective Mechanism", th_style)],
        [
            Paragraph("Diabetic & Pre-Diabetic", tc_bold),
            Paragraph("Avoid postprandial glucose surges and insulin spikes.", tc_style),
            Paragraph("Instantly detects maltodextrin, liquid sugars, refined flour (Maida); recommends pre-meal fiber buffering.", tc_style)
        ],
        [
            Paragraph("Hypertensive Patients", tc_bold),
            Paragraph("Strict sodium restriction (<1.5% wt / <600mg per 100g).", tc_style),
            Paragraph("Flags hidden sodium in condiments, baked goods, and savory snacks; prompts immediate hydration counter-protocols.", tc_style)
        ],
        [
            Paragraph("Health-Conscious Parents", tc_bold),
            Paragraph("Shield children from hyperactivity-inducing food dyes.", tc_style),
            Paragraph("Child Safe Mode scans for synthetic azo dyes (E102, E110, E129) and high-dose synthetic caffeine.", tc_style)
        ],
        [
            Paragraph("Fitness & Weight Loss", tc_bold),
            Paragraph("Precise macro tracking without tedious manual food entry.", tc_style),
            Paragraph("Plate AI calculates calories, protein, carbs, and fat from meal snaps with an interactive gram portion slider.", tc_style)
        ],
    ]
    t_personas = Table(personas_data, colWidths=[110, 162, 260])
    t_personas.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_personas)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: HIGH-LEVEL 4-TIER SYSTEM ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("2. High-Level 4-Tier System Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "FoodAI is architected as an enterprise-grade, 4-tier hybrid cloud application. "
        "The system separates offline-capable client rendering from clinical computational engines and secure cloud storage.",
        body_style
    ))

    # Architecture Topology ASCII Diagram
    story.append(Paragraph("System Architecture Topology Diagram", h2_style))
    arch_diagram = (
        "+-----------------------------------------------------------------------------------------+\n"
        "| TIER 1: CLIENT PRESENTATION & NATIVE MOBILE CONTAINER                                   |\n"
        "|  +--------------------+  +----------------------+  +------------------+  +-----------+  |\n"
        "|  | React 18 SPA (Vite)|  | Capacitor 6 Android  |  | ZXing & Barcode  |  | Web Audio |  |\n"
        "|  | TailwindCSS/Lucide |  | com.foodai.app       |  | Detector (60ms)  |  | Chime API |  |\n"
        "|  +--------------------+  +----------------------+  +------------------+  +-----------+  |\n"
        "+--------------------------------------------+--------------------------------------------+\n"
        "                                             | HTTPS / REST / Bearer JWT\n"
        "+--------------------------------------------v--------------------------------------------+\n"
        "| TIER 2: API GATEWAY & MICROSERVICES                                                     |\n"
        "|  +---------------------------------------------+  +----------------------------------+  |\n"
        "|  | Python Django 4.2 REST Framework (Port 8000)|  | Node.js / Express API (Port 5000)|  |\n"
        "|  | • Food Analysis & FSSAI Math Engine         |  | • Gemini AI Proxy & Streaming    |  |\n"
        "|  | • User Health Profile Management            |  | • Binary MIME Magic Byte Check   |  |\n"
        "|  | • Firebase Admin SDK Auth & Middleware      |  | • Rapid In-Memory Product Cache  |  |\n"
        "|  +---------------------------------------------+  +----------------------------------+  |\n"
        "+--------------------------------------------+--------------------------------------------+\n"
        "                                             | RPC / Multimodal Prompts\n"
        "+--------------------------------------------v--------------------------------------------+\n"
        "| TIER 3: ARTIFICIAL INTELLIGENCE & CLINICAL RULES                                        |\n"
        "|  +-----------------------+  +-----------------------+  +-----------------------------+  |\n"
        "|  | Google Gemini 2.0     |  | Google Gemini 2.0     |  | Clinical FSSAI & INS Rules  |  |\n"
        "|  | Flash Vision (Plates) |  | Flash (AI Assistant)  |  | 8 Medical Condition Presets |  |\n"
        "|  +-----------------------+  +-----------------------+  +-----------------------------+  |\n"
        "+--------------------------------------------+--------------------------------------------+\n"
        "                                             | TLS 1.3 / Security Rules\n"
        "+--------------------------------------------v--------------------------------------------+\n"
        "| TIER 4: DATA & CLOUD PERSISTENCE LAYER                                                  |\n"
        "|  +-----------------------+  +-----------------------+  +-----------------------------+  |\n"
        "|  | Cloud Firestore       |  | Firebase Auth &       |  | SQLite 3 / IndexedDB        |  |\n"
        "|  | (Owner-Isolated NoSQL)|  | Credential Manager    |  | (Local Dev DB & Cache)      |  |\n"
        "|  +-----------------------+  +-----------------------+  +-----------------------------+  |\n"
        "+-----------------------------------------------------------------------------------------+"
    )
    story.append(Paragraph(arch_diagram.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_block_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Tier Responsibilities & Protocols", h2_style))
    tier_specs = [
        [Paragraph("Architecture Tier", th_style), Paragraph("Component", th_style), Paragraph("Protocol / Format", th_style), Paragraph("Functional Responsibilities", th_style)],
        [
            Paragraph("Tier 1: Client", tc_bold),
            Paragraph("React 18 + Capacitor 6", tc_style),
            Paragraph("Native Webview / HTTPS", tc_code),
            Paragraph("Renders responsive UI. Operates hardware camera, 60ms auto-scanner, tap-to-focus, zoom, torch, audio chime, and Credential Manager.", tc_style)
        ],
        [
            Paragraph("Tier 2: Backend", tc_bold),
            Paragraph("Django REST & Express", tc_style),
            Paragraph("REST JSON / Bearer Auth", tc_code),
            Paragraph("Django handles clinical health profiles, FSSAI rules, and catalog queries. Express proxies AI calls with strict MIME-type binary checks.", tc_style)
        ],
        [
            Paragraph("Tier 3: AI Engine", tc_bold),
            Paragraph("Gemini 2.0 & Vision", tc_style),
            Paragraph("HTTPS Google GenAI SDK", tc_code),
            Paragraph("Segments compound meal photos, estimates portion weights, calculates calorie/macro totals, and generates conversational clinical advice.", tc_style)
        ],
        [
            Paragraph("Tier 4: Storage", tc_bold),
            Paragraph("Firestore & SQLite", tc_style),
            Paragraph("Firestore Rules / SQL", tc_code),
            Paragraph("Cloud Firestore synchronizes user scan history and daily logs with owner-isolation rules. IndexedDB provides zero-latency offline cache.", tc_style)
        ],
    ]
    t_tiers = Table(tier_specs, colWidths=[75, 110, 95, 252])
    t_tiers.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_tiers)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: FRONTEND & NATIVE ANDROID BRIDGE
    # =========================================================================
    story.append(Paragraph("3. Frontend & Native Android Bridge Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "The client application is built with <b>React 18</b> and <b>TypeScript</b>, bundled via <b>Vite</b> into an optimized single-page "
        "application. Capacitor 6 packages this bundle inside an Android native container (<code>com.foodai.app</code>), bridging web technologies "
        "with hardware Android camera sensors, haptics, and native Google authentication.",
        body_style
    ))

    story.append(Paragraph("Modern Viewfinder & Vision Scanner Subsystem (`src/pages/Scan.tsx`)", h2_style))
    scanner_bullets = [
        "<b>Ultra-Fast 60ms Auto-Detection Loop:</b> Employs dual-engine detection. If the native Android browser supports <code>BarcodeDetector</code> with <code>getSupportedFormats()</code>, it utilizes hardware-accelerated C++ decoding. Otherwise, it transparently falls back to <code>@zxing/library</code> continuous multi-format reader.",
        "<b>Animated Laser Scanline:</b> A CSS-accelerated green vertical sweeping laser beam (<code>.laser-line</code>) pulsing continuously between 8% and 92% of the viewfinder height, providing clear feedback of optical scanning.",
        "<b>Tap-to-Focus Ring:</b> Tapping the viewfinder calculates touch coordinates, renders a pulsing target ring, and applies hardware camera constraints via <code>MediaStreamTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })</code>.",
        "<b>1x / 2x Optical Zoom Controls:</b> Interactive pill buttons query camera capabilities (<code>capabilities.zoom</code>) and dynamically toggle between standard (1x) and telephoto/digital crop (2x) zoom.",
        "<b>Dark-Environment Auto-Torch:</b> Analyzes real-time frame pixel luminance; if lighting falls below safety thresholds, it activates or prompts the device flashlight via <code>torch: true</code>.",
        "<b>Zero-Dependency Web Audio API Chime:</b> A synthesized 880Hz → 1760Hz rising frequency tone generated in real time using browser <code>AudioContext</code> oscillators without external media assets.",
        "<b>Haptic Confirmation:</b> Fires <code>navigator.vibrate([40, 30, 80])</code> upon successful barcode resolution for tactile physical verification.",
        "<b>All-in-One Multi-Mode Vision:</b> Instant segmented tabs: Barcode Scanner, Batch Cart Scanner, In-Viewfinder OCR Text Snapping, and Plate AI."
    ]
    for b in scanner_bullets:
        story.append(Paragraph(f"• {b}", bullet_style))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Android Native Shell Configuration (`frontend/android`)", h2_style))

    android_table_data = [
        [Paragraph("Resource File", th_style), Paragraph("Filesystem Location", th_style), Paragraph("Architectural Purpose & Implementation", th_style)],
        [
            Paragraph("MainActivity.java", tc_bold),
            Paragraph("android/app/src/main/java/com/foodai/app/", tc_code),
            Paragraph("Extends <code>BridgeActivity</code>. Bootstraps Capacitor plugins, initializes the web runtime, and handles Android lifecycle events.", tc_style)
        ],
        [
            Paragraph("AndroidManifest.xml", tc_bold),
            Paragraph("android/app/src/main/", tc_code),
            Paragraph("Declares hardware permissions: <code>CAMERA</code>, <code>INTERNET</code>, <code>CAMERA.AUTOFOCUS</code>, cleartext traffic policy, and FileProvider paths.", tc_style)
        ],
        [
            Paragraph("google-services.json", tc_bold),
            Paragraph("android/app/", tc_code),
            Paragraph("Official Firebase configuration binding package <code>com.foodai.app</code> to Firebase Project #59556325769 and defining OAuth client IDs.", tc_style)
        ],
        [
            Paragraph("capacitor.config.ts", tc_bold),
            Paragraph("frontend/capacitor.config.ts", tc_code),
            Paragraph("Defines appId, webDir (<code>dist</code>), Android scheme (<code>https</code>), and GoogleSignIn scopes (<code>profile</code>, <code>email</code>).", tc_style)
        ],
        [
            Paragraph("Adaptive App Icons", tc_bold),
            Paragraph("android/app/src/main/res/mipmap-*/", tc_code),
            Paragraph("Full adaptive icon suite (mdpi to xxxhdpi) featuring the official FoodAI leaf-shield logo and background layers.", tc_style)
        ],
    ]
    t_android = Table(android_table_data, colWidths=[110, 162, 260])
    t_android.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_android)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: AI & CLINICAL NUTRITION ENGINES
    # =========================================================================
    story.append(Paragraph("4. Artificial Intelligence & Clinical Nutrition Engines", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "FoodAI combines algorithmic deterministic clinical rules with generative multimodal AI. "
        "This hybrid architecture guarantees mathematical safety compliance while enabling flexible natural vision recognition.",
        body_style
    ))

    story.append(Paragraph("1. Plate AI Vision System (`PlateAnalyzer.tsx` & `geminiVision.ts`)", h2_style))
    story.append(Paragraph(
        "When analyzing non-packaged, cooked, or restaurant meals, users capture a plate photo. "
        "The image is streamed to Google Gemini 2.0 Flash Vision with a rigorous clinical prompt specification:",
        body_style
    ))

    plate_bullets = [
        "<b>Multi-Item Segmentation:</b> Deconstructs compound meals into individual food items (e.g., Paneer Butter Masala, Garlic Naan, Basmati Rice, Salad).",
        "<b>Volumetric & Portion Estimation:</b> Estimates realistic weight in grams (g) based on visual plate geometry and standard culinary density constants.",
        "<b>Macronutrient Computation:</b> Computes exact calories (kcal), carbohydrates (g), proteins (g), total fat (g), and dietary fiber (g).",
        "<b>Interactive Portion Slider:</b> Client-side recalculation allows users to fine-tune portion grammage with instant real-time macro re-scaling.",
        "<b>Clinical Feedback & Glycemic Impact:</b> Delivers customized dietary observations, glycemic index predictions, and nutritional advice."
    ]
    for b in plate_bullets:
        story.append(Paragraph(f"• {b}", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("2. Indian FSSAI Front-of-Pack Nutritional Warning Badges (FOPNL)", h2_style))
    story.append(Paragraph(
        "FoodAI enforces official thresholds set by the Food Safety and Standards Authority of India (FSSAI):",
        body_style
    ))

    fssai_table_data = [
        [Paragraph("FOPNL Warning Badge", th_style), Paragraph("Official FSSAI Threshold", th_style), Paragraph("Clinical Risk Justification", th_style)],
        [
            Paragraph("🛑 HIGH IN SUGAR", tc_bold),
            Paragraph("≥ 10.0% by weight<br/>(≥ 10g per 100g product)", tc_style),
            Paragraph("Induces steep glucose surges, triggers reactive hypoglycemia, promotes hepatic steatosis, and accelerates diabetes.", tc_style)
        ],
        [
            Paragraph("🛑 HIGH IN SATURATED FAT", tc_bold),
            Paragraph("≥ 4.0% by weight<br/>(≥ 4g per 100g product)", tc_style),
            Paragraph("Elevates circulating LDL cholesterol and ApoB particle concentration, contributing directly to atherosclerotic plaque.", tc_style)
        ],
        [
            Paragraph("🛑 HIGH IN SALT / SODIUM", tc_bold),
            Paragraph("≥ 1.5% by weight<br/>(≥ 600mg sodium per 100g)", tc_style),
            Paragraph("Causes extracellular volume expansion, arterial stiffness, and acute blood pressure spikes in hypertensive patients.", tc_style)
        ],
    ]
    t_fssai = Table(fssai_table_data, colWidths=[120, 152, 260])
    t_fssai.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_fssai)

    story.append(Spacer(1, 6))
    story.append(Paragraph("3. NOVA Classification & INS Chemical Additive Matrix", h2_style))

    nova_table_data = [
        [Paragraph("Classification Tier", th_style), Paragraph("Food Categories & Description", th_style), Paragraph("System Processing Guidance", th_style)],
        [
            Paragraph("NOVA Group 1: Unprocessed", tc_bold),
            Paragraph("Whole fruits, vegetables, grains, legumes, eggs, fresh milk, plain meat.", tc_style),
            Paragraph("Optimal nutritional baseline. Zero chemical additive load. Safe for daily intake.", tc_style)
        ],
        [
            Paragraph("NOVA Group 2: Culinary", tc_bold),
            Paragraph("Oils, butter, sugar, salt extracted from nature for home cooking.", tc_style),
            Paragraph("Used for preparation. Monitored for cumulative fat and sodium limits.", tc_style)
        ],
        [
            Paragraph("NOVA Group 3: Processed", tc_bold),
            Paragraph("Canned vegetables, artisanal breads, cheeses, cured meats.", tc_style),
            Paragraph("Moderate processing. Cross-referenced against salt and preservative thresholds.", tc_style)
        ],
        [
            Paragraph("NOVA Group 4: Ultra-Processed", tc_bold),
            Paragraph("Packaged sodas, chips, biscuits, instant noodles, reconstituted meats.", tc_style),
            Paragraph("High risk. Flags industrial emulsifiers, artificial flavors, and synthetic sweeteners.", tc_style)
        ],
    ]
    t_nova = Table(nova_table_data, colWidths=[120, 182, 230])
    t_nova.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_nova)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: PERSONALIZED MEDICAL ALERTS & DAMAGE CONTROL
    # =========================================================================
    story.append(Paragraph("5. Personalized Pre-Eating Health Warnings & Damage Control", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "FoodAI continuously cross-references product ingredients and macro percentages against the user's active health profile. "
        "When an adverse ingredient is identified, FoodAI alerts the user and delivers evidence-based 'Damage Control' mitigation protocols.",
        body_style
    ))

    conditions_table_data = [
        [Paragraph("Medical Profile", th_style), Paragraph("Algorithmic Contraindication Flags", th_style), Paragraph("Tactical Damage Control Protocol", th_style)],
        [
            Paragraph("🩸 Diabetes & Pre-Diabetes", tc_bold),
            Paragraph("Free sugars, Maida (refined flour), maltodextrin, high GI starches.", tc_style),
            Paragraph("Pre-load 10g soluble fiber (chia/flaxseed) or raw almonds 5 mins before eating to blunt the postprandial glucose spike by up to 35%.", tc_style)
        ],
        [
            Paragraph("❤️ Hypertension & High BP", tc_bold),
            Paragraph("Sodium >600mg/100g, monosodium glutamate (E621), baking soda.", tc_style),
            Paragraph("Drink 400ml water immediately to stimulate renal natriuresis (sodium flushing); consume potassium-rich foods (coconut water, banana).", tc_style)
        ],
        [
            Paragraph("🫀 CVD & Cholesterol", tc_bold),
            Paragraph("Palm oil, hydrogenated fats, trans-fats, saturated fat >4%.", tc_style),
            Paragraph("Pair with natural plant sterols or omega-3 fatty acids; avoid combining with high glycemic carbs that accelerate LDL oxidation.", tc_style)
        ],
        [
            Paragraph("👶 Child Safe Mode", tc_bold),
            Paragraph("Synthetic azo dyes (E102 Tartrazine, E110, E129), caffeine, aspartame.", tc_style),
            Paragraph("Strict consumption block: synthetic food colors are clinically associated with ADHD and hyperactivity in children under age 12.", tc_style)
        ],
        [
            Paragraph("🌾 Celiac & Gluten Sensitivity", tc_bold),
            Paragraph("Wheat, barley, rye, malt extract, hydrolyzed wheat protein.", tc_style),
            Paragraph("Zero-tolerance warning flag; highlights certified gluten-free alternative products in catalog.", tc_style)
        ],
        [
            Paragraph("🥛 Lactose Intolerance", tc_bold),
            Paragraph("Milk solids, whey powder, casein, lactose derivatives.", tc_style),
            Paragraph("Recommends lactase enzyme supplementation prior to ingestion; suggests plant-based substitutes (oat/almond/soy).", tc_style)
        ],
        [
            Paragraph("🧬 Kidney & Renal Care", tc_bold),
            Paragraph("Potassium sorbate (E202), sodium phosphates, high mineral salts.", tc_style),
            Paragraph("Alerts on inorganic phosphate and potassium preservatives that are 90-100% bioabsorbed by compromised kidneys.", tc_style)
        ],
        [
            Paragraph("🥑 Fatty Liver (NAFLD)", tc_bold),
            Paragraph("High Fructose Corn Syrup (HFCS), liquid sugars, invert syrup.", tc_style),
            Paragraph("Take a brisk 15-minute walk post-meal to activate skeletal muscle GLUT-4 glucose transporters and bypass hepatic de novo lipogenesis.", tc_style)
        ],
    ]
    t_conditions = Table(conditions_table_data, colWidths=[110, 162, 260])
    t_conditions.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_conditions)

    story.append(Spacer(1, 6))
    story.append(Paragraph("24-Hour WHO Safe Ceilings & Grocery Basket Screener", h2_style))
    story.append(Paragraph(
        "<b>Cumulative 24-Hour Tracker (`/tracker`):</b> Monitors free sugar against the WHO daily ceiling of 25g, "
        "dietary salt against the 5g ceiling, saturated fat against 20g, and counts cumulative synthetic chemical additives.<br/>"
        "<b>Pre-Checkout Grocery Basket Screener (`/cart`):</b> Evaluates shopping baskets prior to supermarket checkout, "
        "assigns an overall Basket Health Grade (A to D), isolates the single worst ultra-processed product, and recommends clean-label swaps.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: BACKEND MICROSERVICES & API ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("6. Backend Microservices & API Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "FoodAI uses a polyglot microservice backend topology. This divides compute workloads into specialized runtimes: "
        "a Python Django service for clinical evaluation and data modeling, and a Node.js/Express service for high-performance AI streaming.",
        body_style
    ))

    story.append(Paragraph("A. Python Django REST Framework Service (`foodai_backend`)", h2_style))
    django_details = [
        "<b>food_analysis App:</b> Core engine containing <code>classifier.py</code> (additive detection & ingredient categorizer), <code>health_evaluator.py</code> (medical condition cross-referencing and damage mitigation generation), and <code>nutrition.py</code> (weight percentage calculations and FSSAI badge determination).",
        "<b>users App:</b> Manages user profiles, medical condition preferences, age, and body weight.",
        "<b>scans App:</b> Persists historical barcode scans, OCR extractions, and user audit trails.",
        "<b>Firebase Auth Middleware:</b> Custom <code>FirebaseAuthenticationBackend</code> extracts Firebase JWT Bearer tokens, validates signatures against Google's public key certificates, and automatically attaches or creates local Django user instances.",
        "<b>Dataset Management Commands:</b> <code>import_food_dataset.py</code> imports FMCG packaged food databases into SQLite/Postgres.",
        "<b>OpenAPI & Swagger Documentation:</b> Configured via <code>drf-spectacular</code> at <code>/api/docs/</code> (Swagger UI) and <code>/api/redoc/</code>."
    ]
    for d in django_details:
        story.append(Paragraph(f"• {d}", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("B. Node.js / Express AI Proxy Server (`server.ts` & `server/`)", h2_style))
    node_details = [
        "<b>routes.ts:</b> High-throughput Express router serving instant barcode lookups from in-memory product collections.",
        "<b>geminiVision.ts & geminiNutrition.ts:</b> Proxies requests to Google Gemini 2.0 Flash and Flash Vision, keeping secret API keys secure on the server side.",
        "<b>Binary Magic-Byte Inspection:</b> Inspects image byte arrays directly (JPEG: <code>FF D8 FF</code>, PNG: <code>89 50 4E 47</code>, WebP: <code>RIFF...WEBP</code>), rejecting disguised executables or corrupt files.",
        "<b>Multer Upload Security:</b> Enforces an 8MB file size ceiling and validates multipart stream boundaries."
    ]
    for n in node_details:
        story.append(Paragraph(f"• {n}", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Microservice Endpoint Distribution", h2_style))

    micro_table_data = [
        [Paragraph("Endpoint Route", th_style), Paragraph("Port", th_style), Paragraph("Runtime", th_style), Paragraph("Architectural Responsibility", th_style)],
        [Paragraph("/api/analyze/barcode", tc_code), Paragraph("8000/5000", tc_style), Paragraph("Django / Express", tc_style), Paragraph("Barcode resolution, FSSAI thresholding, personalized medical warnings.", tc_style)],
        [Paragraph("/api/analyze/plate", tc_code), Paragraph("5000", tc_style), Paragraph("Node / Gemini", tc_style), Paragraph("Multimodal plate photo segmentation, gram estimation, macro breakdown.", tc_style)],
        [Paragraph("/api/analyze/ocr", tc_code), Paragraph("8000/5000", tc_style), Paragraph("Django / Node", tc_style), Paragraph("OCR label text extraction and additive INS identification.", tc_style)],
        [Paragraph("/api/chat", tc_code), Paragraph("5000", tc_style), Paragraph("Node / Gemini", tc_style), Paragraph("Conversational clinical nutrition assistant with dietary prompt engineering.", tc_style)],
        [Paragraph("/api/users/profile", tc_code), Paragraph("8000", tc_style), Paragraph("Django REST", tc_style), Paragraph("User medical preferences, age, body weight, and scan history sync.", tc_style)],
    ]
    t_micro = Table(micro_table_data, colWidths=[120, 50, 92, 270])
    t_micro.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_micro)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: SECURITY, IDENTITY & ANDROID CRYPTOGRAPHY
    # =========================================================================
    story.append(Paragraph("7. Security, Identity & Android Cryptography", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "FoodAI enforces an end-to-end zero-trust architecture spanning mobile operating system boundaries, "
        "cryptographic keystores, network transit, and database tenant isolation.",
        body_style
    ))

    sec_table_data = [
        [Paragraph("Security Domain", th_style), Paragraph("Technology & Standard", th_style), Paragraph("Implementation & Protection Mechanism", th_style)],
        [
            Paragraph("Hybrid Google Authentication", tc_bold),
            Paragraph("Capacitor Google Sign-In & Credential Manager", tc_style),
            Paragraph("On native Android, utilizes Credential Manager with OAuth Web Client ID (<code>59556325769-489r0888...</code>) to obtain ID tokens. Web uses Firebase popup. Tokens are verified by Firebase Auth.", tc_style)
        ],
        [
            Paragraph("Android Keystore Verification", tc_bold),
            Paragraph("SHA-1 & SHA-256 Signatures in Firebase Console", tc_style),
            Paragraph("Debug keystore fingerprints registered in Firebase Console ensure Google Play Services only issues OAuth tokens to authorized APK binaries, preventing repackaging attacks.", tc_style)
        ],
        [
            Paragraph("Firebase Google Services", tc_bold),
            Paragraph("google-services.json & Gradle Plugin", tc_style),
            Paragraph("Gradle processes <code>google-services.json</code> at build time, generating <code>default_web_client_id</code>, <code>google_app_id</code>, and API keys securely into native resources.", tc_style)
        ],
        [
            Paragraph("Firestore Database Isolation", tc_bold),
            Paragraph("Role-Based Security Rules (firestore.rules)", tc_style),
            Paragraph("Enforces default-deny. All reads and writes to <code>/users/{uid}</code>, <code>foodScans</code>, and <code>dailyLogs</code> require <code>request.auth.uid == userId</code> and pass schema validation.", tc_style)
        ],
        [
            Paragraph("Transport Security", tc_bold),
            Paragraph("TLS 1.3 / HTTPS Encryption", tc_style),
            Paragraph("All client-backend and AI proxy traffic is encrypted via TLS 1.3. Android Network Security Configuration prohibits unencrypted plaintext communication outside local debugging.", tc_style)
        ],
        [
            Paragraph("Offline Fallback Security", tc_bold),
            Paragraph("Sandboxed Local Demo Session", tc_style),
            Paragraph("Provides fully isolated offline operation when network connectivity is lost. Clinical calculation runs locally without exposing credentials or telemetry.", tc_style)
        ],
    ]
    t_sec = Table(sec_table_data, colWidths=[110, 152, 270])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_sec)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Firestore Security Rule Architecture (`firestore.rules`)", h2_style))
    story.append(Paragraph(
        "Cloud Firestore security rules prevent data tampering and unauthorized cross-tenant data access:",
        body_style
    ))
    sec_code = (
        "rules_version = '2';\n"
        "service cloud.firestore {\n"
        "  match /databases/{database}/documents {\n"
        "    // 1. Default-Deny Catch-All\n"
        "    match /{document=**} { allow read, write: if false; }\n"
        "    // 2. Security Primitives\n"
        "    function isSignedIn() { return request.auth != null && request.auth.uid != null; }\n"
        "    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }\n"
        "    // 3. User Profiles & Subcollections\n"
        "    match /users/{userId} {\n"
        "      allow read, write: if isOwner(userId);\n"
        "      match /foodScans/{scanId} { allow read, write: if isOwner(userId); }\n"
        "      match /dailyLogs/{logId}   { allow read, write: if isOwner(userId); }\n"
        "    }\n"
        "  }\n"
        "}"
    )
    story.append(Paragraph(sec_code.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_block_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: EXHAUSTIVE REPOSITORY FILE MAP (FRONTEND & ANDROID)
    # =========================================================================
    story.append(Paragraph("8. Exhaustive Repository File Map (Frontend & Android)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "Complete technical catalog of all Frontend and Android native source files:",
        body_style
    ))

    file_frontend_data = [
        [Paragraph("Filesystem Path", th_style), Paragraph("Module / Component", th_style), Paragraph("Engineering Description & Responsibilities", th_style)],
        [Paragraph("src/pages/Scan.tsx", tc_code), Paragraph("Vision Scanner Screen", tc_bold), Paragraph("All-in-one vision camera screen: 60ms auto-detection barcode loop, animated laser, tap-to-focus ring, zoom controls, torch, in-viewfinder OCR snapping, and cart mode.", tc_style)],
        [Paragraph("src/pages/PlateAnalyzer.tsx", tc_code), Paragraph("Plate AI Meal Vision", tc_bold), Paragraph("Multimodal plate photography analyzer: calls Gemini Vision, segments food items, computes calories and macros, and provides interactive gram portion sliders.", tc_style)],
        [Paragraph("src/pages/ProductResults.tsx", tc_code), Paragraph("Product Health Report", tc_bold), Paragraph("Comprehensive analysis view rendering FSSAI FOPNL badges, personalized medical alerts, ingredient analysis, and tactical damage control mitigation advice.", tc_style)],
        [Paragraph("src/pages/DailyTracker.tsx", tc_code), Paragraph("24-Hr WHO Tracker", tc_bold), Paragraph("Tracks daily intake against WHO maximum limits: Free Sugar (25g), Salt (5g), Saturated Fat (20g), and Additives. Features progress rings and weekly charts.", tc_style)],
        [Paragraph("src/pages/GroceryCart.tsx", tc_code), Paragraph("Basket Screener", tc_bold), Paragraph("Pre-checkout grocery cart evaluator: calculates Basket Health Grade (A to D), identifies the worst ultra-processed product, and suggests clean-label swaps.", tc_style)],
        [Paragraph("src/pages/CatalogExplorer.tsx", tc_code), Paragraph("FMCG Catalog Directory", tc_bold), Paragraph("Search engine across 30+ packaged FMCG brands with filters for Palm-Oil Free, Low Sugar (<5%), Low Salt (<0.3%), and food categories.", tc_style)],
        [Paragraph("src/pages/ProductComparison.tsx", tc_code), Paragraph("Side-by-Side Compare", tc_bold), Paragraph("Head-to-head comparison of two packaged food products, highlighting differences in processing tiers, sugar, sodium, and chemical additives.", tc_style)],
        [Paragraph("src/pages/FoodDNA.tsx", tc_code), Paragraph("Food DNA Visualizer", tc_bold), Paragraph("NOVA processing spectrum breakdown (Groups 1-4) with an interactive additive risk breakdown.", tc_style)],
        [Paragraph("src/pages/AINutritionAnalyzer.tsx", tc_code), Paragraph("AI Nutrition Chatbot", tc_bold), Paragraph("Conversational clinical nutrition assistant powered by Gemini for answering dietary queries, meal planning, and food safety advice.", tc_style)],
        [Paragraph("src/pages/VoiceLogPage.tsx", tc_code), Paragraph("Voice Meal Logger", tc_bold), Paragraph("Natural language speech-to-text meal logging page with offline NLP parsing of spoken food items and automatic calorie logging.", tc_style)],
        [Paragraph("src/pages/ProfilePreferences.tsx", tc_code), Paragraph("Health Preferences", tc_bold), Paragraph("User medical profile manager: toggles for 8 conditions (Diabetes, BP, CVD, Celiac, etc.), age, weight, and cloud Firestore sync.", tc_style)],
        [Paragraph("src/pages/History.tsx", tc_code), Paragraph("Scan History Timeline", tc_bold), Paragraph("Chronological scan history with cloud Firestore synchronization, offline search, and quick re-analysis shortcuts.", tc_style)],
        [Paragraph("src/pages/Login.tsx & Register.tsx", tc_code), Paragraph("Authentication Pages", tc_bold), Paragraph("Authentication screens supporting Email/Password, Native Android Google Sign-In with Credential Manager, and Instant Demo Mode.", tc_style)],
        [Paragraph("src/services/googleAuthService.ts", tc_code), Paragraph("Google Auth Bridge", tc_bold), Paragraph("Cross-platform Google authentication handler. Uses @capawesome/capacitor-google-sign-in on Android and Firebase popup on Web.", tc_style)],
        [Paragraph("src/services/firestoreService.ts", tc_code), Paragraph("Firestore Cloud Service", tc_bold), Paragraph("Cloud Firestore CRUD service for user profiles, food scans, and daily intake logs with robust offline error fallbacks.", tc_style)],
        [Paragraph("src/services/appUpdateService.ts", tc_code), Paragraph("Release Updater", tc_bold), Paragraph("Queries GitHub Releases API to detect newer APK versions, displays an in-app update banner, and provides direct download links.", tc_style)],
        [Paragraph("src/services/voiceFoodParser.ts", tc_code), Paragraph("Voice NLP Parser", tc_bold), Paragraph("Offline regex and NLP parser extracting food items, portion quantities, and estimated calories from natural speech strings.", tc_style)],
        [Paragraph("android/app/google-services.json", tc_code), Paragraph("Firebase Android Config", tc_bold), Paragraph("Official Firebase client configuration mapping com.foodai.app to project food-ai-433b7 and defining OAuth client IDs.", tc_style)],
        [Paragraph("android/app/src/main/AndroidManifest.xml", tc_code), Paragraph("Android Manifest", tc_bold), Paragraph("Declares camera, autofocus, and internet permissions, intent filters, cleartext traffic policies, and file providers.", tc_style)],
    ]
    t_file_f = Table(file_frontend_data, colWidths=[155, 115, 262])
    t_file_f.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.8),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_file_f)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: EXHAUSTIVE REPOSITORY FILE MAP (BACKEND & API)
    # =========================================================================
    story.append(Paragraph("9. Exhaustive Repository File Map (Backend & API Specs)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph(
        "Complete technical catalog of Backend microservices, configuration, and API endpoint contracts:",
        body_style
    ))

    file_backend_data = [
        [Paragraph("Filesystem Path", th_style), Paragraph("Module / Role", th_style), Paragraph("Engineering Description & Responsibilities", th_style)],
        [Paragraph("foodai_backend/food_analysis/health_evaluator.py", tc_code), Paragraph("Clinical Rules Engine", tc_bold), Paragraph("Evaluates foods against 8 medical conditions, flags contraindications, and generates tactical damage control guidance.", tc_style)],
        [Paragraph("foodai_backend/food_analysis/nutrition.py", tc_code), Paragraph("FSSAI Math Calculator", tc_bold), Paragraph("Calculates nutrient weight percentages, FSSAI FOPNL thresholds, and energy contribution ratios.", tc_style)],
        [Paragraph("foodai_backend/food_analysis/classifier.py", tc_code), Paragraph("Additive Classifier", tc_bold), Paragraph("Categorizes food additives by INS number and assigns safety toxicity tiers (Clean, Caution, Warning, Danger).", tc_style)],
        [Paragraph("foodai_backend/firebase_auth.py", tc_code), Paragraph("Firebase Django Auth", tc_bold), Paragraph("Custom Django authentication backend validating Firebase JWT Bearer tokens and managing user sessions.", tc_style)],
        [Paragraph("foodai_backend/food_analysis/management/commands/", tc_code), Paragraph("Dataset Importers", tc_bold), Paragraph("Management commands (<code>import_food_dataset.py</code>) importing FMCG food catalogs into database.", tc_style)],
        [Paragraph("server/routes.ts", tc_code), Paragraph("Express API Router", tc_bold), Paragraph("Serves rapid barcode lookups from in-memory product collections and orchestrates AI endpoints.", tc_style)],
        [Paragraph("server/services/geminiVision.ts", tc_code), Paragraph("Gemini Vision Service", tc_bold), Paragraph("Interfaces with Google Gemini 2.0 Flash Vision for plate photo segmentation, portion estimation, and macro calculation.", tc_style)],
        [Paragraph("server/services/geminiNutrition.ts", tc_code), Paragraph("Gemini Nutrition Service", tc_bold), Paragraph("Powers the AI conversational nutrition assistant with clinical prompt guidelines.", tc_style)],
        [Paragraph("firestore.rules", tc_code), Paragraph("Firestore Rules", tc_bold), Paragraph("Production security rules enforcing default-deny, owner isolation (request.auth.uid == userId), and strict schema validation.", tc_style)],
        [Paragraph("capacitor.config.ts", tc_code), Paragraph("Capacitor Config", tc_bold), Paragraph("Defines Android package (com.foodai.app), web assets directory, and Google Sign-In plugin scopes.", tc_style)],
        [Paragraph("FoodAI.apk", tc_code), Paragraph("Android Release Package", tc_bold), Paragraph("Compiled native Android APK (~9.07 MB) bundled with full native Google Sign-In and modern camera vision.", tc_style)],
    ]
    t_file_b = Table(file_backend_data, colWidths=[165, 110, 257])
    t_file_b.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_file_b)

    story.append(Spacer(1, 6))
    story.append(Paragraph("REST API Endpoints Specification", h2_style))

    api_specs = [
        [Paragraph("Method & Route", th_style), Paragraph("Backend", th_style), Paragraph("Input Request", th_style), Paragraph("Response Payload", th_style)],
        [
            Paragraph("POST /api/analyze/barcode", tc_code),
            Paragraph("Django/Express", tc_style),
            Paragraph("<code>{ barcode: string }</code>", tc_code),
            Paragraph("Full <code>ProductAnalysis</code>: FSSAI badges, additives, personalized medical warnings.", tc_style)
        ],
        [
            Paragraph("POST /api/analyze/plate", tc_code),
            Paragraph("Node/Gemini", tc_style),
            Paragraph("Multipart form image (≤8MB)", tc_code),
            Paragraph("Segmented food items, gram weights, calories, carbs, protein, fat, and advice.", tc_style)
        ],
        [
            Paragraph("POST /api/analyze/ocr", tc_code),
            Paragraph("Django/Node", tc_style),
            Paragraph("<code>{ text: string }</code> or image", tc_code),
            Paragraph("Extracted ingredient tokens, detected INS additives, and health risk ratings.", tc_style)
        ],
        [
            Paragraph("GET /api/products", tc_code),
            Paragraph("Django REST", tc_style),
            Paragraph("<code>search, category, brand</code>", tc_code),
            Paragraph("Paginated list of <code>ProductData</code> catalog items.", tc_style)
        ],
        [
            Paragraph("GET/PUT /api/users/profile", tc_code),
            Paragraph("Django REST", tc_style),
            Paragraph("Bearer token + profile JSON", tc_code),
            Paragraph("Updated user medical preferences, age, body weight, and scan history.", tc_style)
        ],
    ]
    t_api = Table(api_specs, colWidths=[120, 80, 130, 202])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_api)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: BUILD, TESTING & STRATEGIC ROADMAP
    # =========================================================================
    story.append(Paragraph("10. Build, Testing & Strategic Roadmap", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=0, spaceAfter=8))

    story.append(Paragraph("Verification & Automated Testing Suite", h2_style))
    story.append(Paragraph(
        "FoodAI enforces automated testing across all layers of the stack prior to every release build:",
        body_style
    ))

    test_bullets = [
        "<b>Frontend Unit & Integration Tests (Vitest):</b> 91 tests across 19 suites (<code>100% PASS</code>). Validates AuthContext, Google Sign-In service, scanner controls, Plate AI portion sliders, nutrition mathematics, profile autosave, and router transitions.",
        "<b>Backend Unit Tests (Pytest):</b> 45+ Django REST tests (<code>100% PASS</code>). Validates Firebase JWT verification, FSSAI thresholding calculations, condition evaluator logic, and FMCG catalog importers.",
        "<b>End-to-End Tests (Playwright):</b> Automates full user journeys: registration, barcode scanning, cart batch screening, and report generation."
    ]
    for tb in test_bullets:
        story.append(Paragraph(f"• {tb}", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Android APK Compilation & Installation", h2_style))

    build_commands = [
        [Paragraph("Stage", th_style), Paragraph("Command Line Execution", th_style), Paragraph("Outcome & Artifact", th_style)],
        [
            Paragraph("1. Web Build", tc_bold),
            Paragraph("<code>npm run build</code> (in <code>frontend/</code>)", tc_code),
            Paragraph("Compiles React TypeScript into optimized distribution assets under <code>frontend/dist/</code>.", tc_style)
        ],
        [
            Paragraph("2. Capacitor Sync", tc_bold),
            Paragraph("<code>npx cap sync android</code>", tc_code),
            Paragraph("Copies dist bundle into <code>frontend/android/app/src/main/assets/public/</code> and updates plugins.", tc_style)
        ],
        [
            Paragraph("3. Gradle Packaging", tc_bold),
            Paragraph("<code>./gradlew assembleDebug</code>", tc_code),
            Paragraph("Assembles native APK package with Google Services resources: <code>FoodAI.apk</code> (~9.07 MB).", tc_style)
        ],
        [
            Paragraph("4. Device Install", tc_bold),
            Paragraph("<code>adb install -r FoodAI.apk</code>", tc_code),
            Paragraph("Installs or updates the application on a connected Android phone with USB debugging.", tc_style)
        ],
    ]
    t_build = Table(build_commands, colWidths=[90, 182, 260])
    t_build.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary_dark),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_build)

    story.append(Spacer(1, 6))
    story.append(Paragraph("In-App Updates & Future Strategic Roadmap", h2_style))
    story.append(Paragraph(
        "<b>In-App Release Updates (`appUpdateService.ts`):</b> Queries the GitHub Releases API on startup. "
        "When a newer semantic version is detected, an in-app banner prompts the user to download the updated APK directly.<br/>"
        "<b>Strategic Roadmap Deliverables:</b><br/>"
        "• <b>Continuous Glucose Monitor (CGM) Sync:</b> Direct Bluetooth Low Energy (BLE) pairing with Abbott FreeStyle Libre and Dexcom G7 to overlay scanned foods directly onto interstitial glucose curves.<br/>"
        "• <b>Wearable Health Integration:</b> Two-way synchronization with Apple HealthKit and Google Health Connect for dynamic calorie targets based on active metabolic burn.<br/>"
        "• <b>Crowdsourced FMCG Barcode Verification:</b> Community-driven catalog expansion with algorithmic OCR verification of ingredient lists and nutrition tables.",
        body_style
    ))

    # Build PDF with custom NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Master Architecture Documentation successfully compiled to: {OUTPUT_PDF}")


if __name__ == '__main__':
    generate_documentation_pdf()
