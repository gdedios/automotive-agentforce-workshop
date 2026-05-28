#!/bin/bash
# Generate Guía de Participante PDF via pandoc → HTML → Chrome for Testing --print-to-pdf
# Workspace CLAUDE.md: PDF generation via Chrome for Testing beats reportlab
set -euo pipefail

ROOT="/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop"
SRC="$ROOT/docs/guia-participante-draft.md"
HTML="$ROOT/docs/guia-participante.html"
PDF="$ROOT/docs/guia-participante.pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="/tmp/chrome-electra-pdf-stable"

CSS=$(cat <<'CSSEOF'
@page { size: Letter; margin: 0.75in 0.65in; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt; line-height: 1.45; color: #050516; max-width: none;
}
h1 { color: #4723EB; font-size: 22pt; border-bottom: 3px solid #4723EB; padding-bottom: 6pt; }
h2 { color: #4723EB; font-size: 16pt; margin-top: 22pt; border-bottom: 1px solid #F0EBFD; padding-bottom: 4pt; page-break-after: avoid; }
h3 { color: #261089; font-size: 12pt; margin-top: 14pt; page-break-after: avoid; }
h4 { color: #393942; font-size: 11pt; margin-top: 10pt; page-break-after: avoid; }
code { background: #F0EBFD; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; color: #261089; }
pre { background: #F8F6FE; border: 1px solid #E5DEF8; border-radius: 4px; padding: 10pt; font-size: 9pt; overflow-x: auto; page-break-inside: avoid; }
pre code { background: transparent; padding: 0; color: #050516; }
table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 9.5pt; page-break-inside: avoid; }
th { background: #4723EB; color: white; text-align: left; padding: 6pt 8pt; }
td { border-bottom: 1px solid #E5DEF8; padding: 5pt 8pt; }
tr:nth-child(even) td { background: #FAFAFE; }
blockquote { border-left: 4px solid #4723EB; background: #F0EBFD; padding: 8pt 12pt; margin: 10pt 0; border-radius: 0 4px 4px 0; page-break-inside: avoid; }
ul, ol { margin: 6pt 0; padding-left: 22pt; }
li { margin: 3pt 0; }
strong { color: #261089; }
hr { border: none; border-top: 1px solid #E5DEF8; margin: 16pt 0; }
.title-page { text-align: center; padding-top: 1.5in; }
CSSEOF
)

mkdir -p "$PROFILE"

echo "[1/3] pandoc: markdown → HTML"
pandoc "$SRC" \
  --standalone \
  --metadata title="Guía de Participante — Electra Automotive Workshop" \
  --metadata lang=es-AR \
  -V "css=" \
  -H <(printf '<style>%s</style>' "$CSS") \
  -o "$HTML"

echo "[2/3] Chrome for Testing: HTML → PDF"
"$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --user-data-dir="$PROFILE" \
  --print-to-pdf="$PDF" \
  --print-to-pdf-no-header \
  --virtual-time-budget=10000 \
  --no-pdf-header-footer \
  "file://$HTML"

echo "[3/3] verify"
ls -la "$PDF"
echo "Done: $PDF"
