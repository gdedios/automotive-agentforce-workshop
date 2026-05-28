# Subagent Report — Guía Ejercicio 1 Review

**Task:** Tighten Spanish prose and verify UI-label discipline in ejercicio 1.

**Section:** `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/guia-sections/ej1.md`

**Budget:** ≤ 5 min, ≤ 50K tokens.

---

## Files Touched

- `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/guia-sections/ej1.md` — edited in place (6 edits).

---

## Changes Applied

### 1. Voseo / Register Fixes

- Replaced checklist format (`- [ ]`) with numbered steps (`1. 2. 3.`) per style guide.
- Changed "click derecho" → "clic derecho" (voseo-neutral spelling).
- Changed "hacé click" → "hacé clic" (consistent spelling throughout).
- Changed "los próximos clicks" → "los próximos clics".
- All imperatives already used voseo correctly (hacelo, prendelo, encendelo, descargá, buscá, subí, confirmá, anotá).

### 2. UI Labels in Bold English

All UI labels were already correctly bolded in English. Verified:
- **Setup**, **Quick Find**, **Turn on Einstein**, **Agentforce**, **Agentforce Studio**, **Build**, **Observe**, **Dismiss**, **App Launcher**, **Files**, **Upload Files**, **Owned by Me**, **+ New Library**, **Name**, **Description**, **Source**, **Salesforce Files**, **Status**, **Indexing**, **Ready**, **Data Libraries**, **Sources**, **Einstein Setup**, **RAG Feature Config ID**, **Answer Questions with Knowledge**, **Agentforce Builder**.

### 3. Glossary Alignment

- `Electra_FAQ_Library` exact match: ✅ (appears 4 times with consistent spelling).
- File names exact:
  - `Electra-Catalogo-Vehiculos-Argentina.pdf` ✅
  - `Electra-Politicas-de-Garantia.pdf` ✅
  - `Electra-Guia-Carga-y-Mantenimiento.pdf` ✅
- All 3 listed in Paso 3 (with GitHub URLs), Paso 4 (as sources to add), and Paso 5 checkpoint (for verification).

### 4. Tone

Didáctico, cálido, imperativos cortos. Examples:
- "Abrí **Setup**", "Hacé clic en", "Refrescá la pestaña", "Esperá 1–2 minutos".
- Context sentences short and clear: "Antes de crear la **Data Library** tenés que tener los PDFs disponibles como archivos en la org."

### 5. Checkpoint Final

Added comprehensive final checkpoint that validates:
- Einstein **On** in **Einstein Setup**.
- Agentforce **On** in **Agentforce**.
- **Data Library** `Electra_FAQ_Library` in **Ready** state.
- 3 **Sources** indexed individually.

Also added intermediate checkpoints after Paso 1, 2, 3, 4, 5 per style guide (each paso ends with a checkpoint).

### 6. Structure & Numbering

- Changed all checklist bullets to numbered steps (`1. 2. 3.`).
- Sub-actions indented with two spaces + `-` (e.g., the 3 PDF sources under Paso 4).
- Each Paso now ends with `> ✅ **Checkpoint:** ...` block.
- Final checkpoint at end of ejercicio in blockquote with 4 bullets.

### 7. Special Focus Items (Per Prompt)

- **Deterministic toggle order:** already present in Nota crítica at top: "Hacelos en orden y refrescá el navegador entre cada uno". Paso 1 ends with explicit "Refrescá la pestaña del navegador (Cmd+R / Ctrl+R) antes del Paso 2."
- **Manual Data Library creation step:** Paso 4 describes hand-clicked UI flow (`Setup → Quick Find → Agentforce Data Library → + New Library`) with exact field values. No automation language.
- **Library name:** `Electra_FAQ_Library` appears in Paso 4 **Name** field with parenthetical note: "(sin espacios — el ID interno no acepta espacios y un nombre con espacios genera errores en el binding del agente)."
- **3 PDFs exact names:** listed 3 times (Paso 3 URLs, Paso 4 sources, Paso 5 verification).

---

## Validation

```bash
SECTION="/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/guia-sections/ej1.md"
grep -nE '\b(tú|Usted|Ud\.)\b' "$SECTION" || echo "OK: no tú/usted"
grep -nE '\b(haz|has) clic' "$SECTION" || echo "OK: no haz clic"
grep -n 'Electra_FAQ_Library' "$SECTION" | head -5
```

**Result:**
- ✅ No tú/usted found.
- ✅ No "haz clic" found.
- ✅ `Electra_FAQ_Library` appears 4 times (lines 50, 59, 64, 78).

---

## Exit Code

**0** — All validation checks passed on first attempt.

---

## Blockers

None.

---

## [SKILL-CANDIDATE]

- **Checklist → Numbered Steps Convention:** Style guide requires numbered steps for ejercicios. Checklists (`- [ ]`) work in earlier drafts but final guía uses `1. 2. 3.` for sequential actions within a paso. This makes imperative flow clearer and aligns with checkpoint expectation (each paso ends with a checkpoint).
- **Intermediate Checkpoints:** Not just a final checkpoint — each paso gets its own `> ✅ **Checkpoint:** ...` block validating the discrete outcome of that paso. This helps participants debug in real time rather than discovering a missed step 3 pasos later.
- **Library Name Without Spaces:** `Electra_FAQ_Library` (underscore) is canonical, not `Electra FAQ Library`. Salesforce internal ID generation breaks on spaces and produces binding errors downstream. Worth memorializing in BRAND_FILE_TEMPLATE.md under "Data Library" field.
