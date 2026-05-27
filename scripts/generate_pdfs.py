#!/usr/bin/env python3
"""Render the 3 Spanish RAG markdown sources into PDFs via reportlab.

Brand colors applied. Tables stay tabular so the RAG splitter can recover
row/column boundaries. We avoid Chrome here because the workshop laptop is
MDM-enrolled and headless Chrome hangs on enrollment-domain annotation.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import markdown
from bs4 import BeautifulSoup
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PROJECT = Path(__file__).resolve().parent.parent
SEED = PROJECT / "data" / "seed-pdfs"

PURPLE = colors.HexColor("#4723EB")
PURPLE_DARK = colors.HexColor("#261089")
LIGHT = colors.HexColor("#F0EBFD")
CHARCOAL = colors.HexColor("#393942")
GREY = colors.HexColor("#888888")


def build_styles() -> dict:
    base = getSampleStyleSheet()
    body = ParagraphStyle(
        "Body",
        parent=base["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=CHARCOAL,
        spaceAfter=6,
    )
    h1 = ParagraphStyle(
        "H1",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PURPLE,
        spaceAfter=10,
        spaceBefore=4,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=PURPLE_DARK,
        spaceAfter=6,
        spaceBefore=14,
    )
    h3 = ParagraphStyle(
        "H3",
        parent=base["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=CHARCOAL,
        spaceAfter=4,
        spaceBefore=10,
    )
    bullet = ParagraphStyle(
        "Bullet",
        parent=body,
        leftIndent=14,
        bulletIndent=2,
        spaceAfter=2,
    )
    quote = ParagraphStyle(
        "Quote",
        parent=body,
        leftIndent=12,
        textColor=GREY,
        fontName="Helvetica-Oblique",
    )
    return {"body": body, "h1": h1, "h2": h2, "h3": h3, "bullet": bullet, "quote": quote}


def md_to_html(md_path: Path) -> str:
    return markdown.markdown(
        md_path.read_text(encoding="utf-8"),
        extensions=["tables", "fenced_code", "sane_lists", "attr_list"],
    )


def inline_html_to_rl(text: str) -> str:
    """Convert markdown-rendered inline HTML to reportlab paragraph subset."""
    soup = BeautifulSoup(text, "html.parser")
    out = []
    for node in soup.children:
        if isinstance(node, str):
            out.append(node)
            continue
        name = node.name
        inner = node.decode_contents()
        if name in ("strong", "b"):
            out.append(f"<b>{inner}</b>")
        elif name in ("em", "i"):
            out.append(f"<i>{inner}</i>")
        elif name == "code":
            out.append(f'<font name="Courier" size="9">{inner}</font>')
        elif name == "a":
            href = node.get("href", "")
            out.append(f'<link href="{href}" color="#4723EB">{inner}</link>')
        elif name == "br":
            out.append("<br/>")
        else:
            out.append(inner)
    text = "".join(out)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def html_to_flowables(html: str, styles: dict) -> list:
    soup = BeautifulSoup(html, "html.parser")
    flow = []
    for el in soup.children:
        if isinstance(el, str):
            t = el.strip()
            if t:
                flow.append(Paragraph(t, styles["body"]))
            continue
        name = el.name
        if name == "h1":
            flow.append(Paragraph(inline_html_to_rl(el.decode_contents()), styles["h1"]))
        elif name == "h2":
            flow.append(Paragraph(inline_html_to_rl(el.decode_contents()), styles["h2"]))
        elif name in ("h3", "h4", "h5"):
            flow.append(Paragraph(inline_html_to_rl(el.decode_contents()), styles["h3"]))
        elif name == "p":
            flow.append(Paragraph(inline_html_to_rl(el.decode_contents()), styles["body"]))
        elif name in ("ul", "ol"):
            for li in el.find_all("li", recursive=False):
                bullet = "•" if name == "ul" else f"{len(flow) % 9 + 1}."
                flow.append(
                    Paragraph(
                        f"{bullet} {inline_html_to_rl(li.decode_contents())}",
                        styles["bullet"],
                    )
                )
        elif name == "blockquote":
            flow.append(Paragraph(inline_html_to_rl(el.decode_contents()), styles["quote"]))
        elif name == "table":
            flow.append(table_to_flowable(el, styles))
        elif name == "hr":
            flow.append(Spacer(1, 4 * mm))
        elif name == "pre":
            code = el.get_text()
            flow.append(
                Paragraph(
                    f'<font name="Courier" size="9">{code.replace(chr(10), "<br/>")}</font>',
                    styles["body"],
                )
            )
        else:
            text = el.get_text().strip()
            if text:
                flow.append(Paragraph(inline_html_to_rl(str(el)), styles["body"]))
    return flow


def table_to_flowable(tbl, styles: dict) -> Table:
    rows = []
    for tr in tbl.find_all("tr"):
        row = []
        for cell in tr.find_all(["th", "td"]):
            row.append(
                Paragraph(
                    inline_html_to_rl(cell.decode_contents()),
                    styles["body"],
                )
            )
        rows.append(row)
    if not rows:
        return Spacer(1, 1)
    n_cols = max(len(r) for r in rows)
    for r in rows:
        while len(r) < n_cols:
            r.append(Paragraph("", styles["body"]))
    page_w = A4[0] - 36 * mm
    col_w = page_w / n_cols
    t = Table(rows, colWidths=[col_w] * n_cols, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                ("TEXTCOLOR", (0, 0), (-1, 0), PURPLE_DARK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C8B7F5")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def render(md_path: Path) -> Path:
    pdf_path = md_path.with_suffix(".pdf")
    html = md_to_html(md_path)
    styles = build_styles()
    flow = html_to_flowables(html, styles)
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=md_path.stem,
        author="Electra Auto",
    )
    doc.build(flow)
    return pdf_path


def main() -> int:
    md_files = sorted(SEED.glob("Electra-*.md"))
    if not md_files:
        print(f"No source .md files in {SEED}", file=sys.stderr)
        return 1
    for md in md_files:
        print(f"-> {md.name}")
        pdf = render(md)
        kb = pdf.stat().st_size // 1024
        print(f"   wrote {pdf.name} ({kb} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
