# Subagent Report — Ejercicio 2 (Guía Review)

**Subagent:** Sonnet 4.6 prose tightening + UI-label discipline  
**Section:** `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/guia-sections/ej2.md`  
**Budget:** ≤5 min, ≤50K tokens  
**Status:** ✅ Complete

---

## Files Touched

- `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/guia-sections/ej2.md` (edited in place)

---

## Changes Made

### 1. Voseo Register (100% clean)
- **Before:** Mixed "tú" / "Usted" / "haz clic" forms
- **After:** All converted to voseo: "hacé clic", "tenés", "vas a ver", "expandí", "seleccioná", "pegá"
- **Validation:** `grep -nE '\b(tú|Usted|Ud\.)\b'` → **0 matches** ✅
- **Validation:** `grep -nE '\b(haz|has) clic'` → **0 matches** ✅

### 2. UI Labels in Bold English (systematic pass)
- Added `**bold**` to all Salesforce UI terms:
  - **App Launcher**, **Agentforce Studio**, **Agents**, **+ New Agent**, **Agentforce Employee Agent**, **Agentforce Service Agent**, **Select**, **Let's Go**
  - **Skip Ahead**, **Explorer**, **Canvas**, **Script**, **Preview**, **Agentforce Assistant**, **Settings**, **System**, **Agent-Level Instructions**, **Welcome Message**, **Error Message**, **Save**
  - **Subagents**, **+ New Subagent**, **Reasoning Instructions**, **+ Add Action**, **From Flow**, **Add From Library**, **Actions**, **Show in conversation**
  - **Off Topic**, **Commit Version**, **Activate**, **Deactivate**, **New Version**
  - **Answer Questions with Knowledge**, **RAG Feature Config ID**, **Service Agents**
- Every UI element in the 13-step agent-building flow now follows the GLOSSARY discipline.

### 3. Reasoning Instructions Bullets — ≤140 Chars (CRITICAL)
- **Challenge:** Ej 2 has THREE large Reasoning Instruction blocks (Descubrimiento_de_Vehiculos, Prueba_de_Manejo, Estado_y_FAQ).
- **Action taken:** Split bullets exceeding 140 chars into coordinated sub-bullets within each code-fenced block.
  - Example (Prueba_de_Manejo):
    - Before: `Cuando el usuario quiera agendar una prueba de manejo, recolectá los 5 datos antes de invocar: nombre, email, modelo, concesionaria, fecha+hora.` (164 chars)
    - After: Split into two bullets:
      - `Cuando el usuario quiera agendar una prueba de manejo, recolectá los 5 datos antes de invocar.`
      - `Datos: nombre, email, modelo, concesionaria, fecha+hora.`
  - Same for Estado_y_FAQ: split long RUTA 1/RUTA 2 descriptions, FAQ rules, and anti-alucinación bullets.
- **Validation:** `awk '/^[[:space:]]*```$/{in_code=!in_code; next} in_code && /^[[:space:]]*-[[:space:]]/ && length > 140'` → **0 matches** ✅

### 4. Subagent + Action Names (exact match required)
- **Subagent names:** `Descubrimiento_de_Vehiculos`, `Prueba_de_Manejo`, `Estado_y_FAQ` — all present with underscores intact, 3 occurrences ✅
- **Action names:** `Get_Vehicle_Catalog`, `Get_Vehicle_Detail`, `Schedule_Test_Drive`, `Get_Test_Drive_Status`, `AnswerQuestionsWithKnowledge` — 24 occurrences across steps 6, 8, 10, 11 ✅

### 5. AQWK Recovery Instruction (added)
- **Location:** Paso 11, after **Save** bullet.
- **Content:** Two-part note:
  1. If **Commit Version** fails with `Invalid ragFeatureConfigIds: [@knowledge.rag_feature_config_id]`, delete the action, save, re-add from dropdown, and re-commit.
  2. Explains expected behavior: token resolves to `ARFPC_<id>` on successful commit; literal `@knowledge.rag_feature_config_id` means commit failed.
- This addresses the Drift 2.19 AQWK gotcha from the v2 project.

### 6. Welcome Message (verified exact)
- **Location:** Paso 4, **Welcome Message** field.
- **Content:** Exact match with GLOSSARY.md line 85:
  > ¡Hola! Soy el Concierge de Electra Auto. Te puedo ayudar a descubrir nuestros modelos eléctricos, agendar una prueba de manejo o resolver dudas sobre garantía y carga. ¿En qué te ayudo?

### 7. Off-Topic Reasoning Instructions (Spanish, voseo)
- **Location:** Paso 12, **Off Topic** subagent **Reasoning Instructions**.
- **Content:** Translated from English default, voseo register, split long bullets to stay ≤140 chars.
- **Note:** The GLOSSARY off-topic message ("Eso está fuera del alcance...") is the *agent's response*, not the Reasoning Instructions. The Instructions control *how* the subagent behaves. Current content is appropriate.

### 8. Line-length fixes for non-Builder bullets
- Several bullets in the procedural instructions (not Reasoning Instructions) exceeded 140 chars. Split them for readability:
  - App Launcher + direct URL: 2 bullets
  - **+ New Agent** button guidance: main bullet + sub-bullet
  - "What do you want..." screen: 2 bullets
  - Template card warning: main bullet + indented explanation
  - EinsteinServiceAgent User dropdown: 2 bullets
  - Description fields (multi-sentence): main bullet + indented code block or continuation
- These splits improve readability but don't affect Builder input (only Reasoning Instructions code blocks matter for the 140-char rule).

---

## Validation Exit Codes

```bash
# Voseo register
grep -nE '\b(tú|Usted|Ud\.)\b' ej2.md || echo "OK: no tú/usted"
# → OK: no tú/usted ✅

# Haz clic
grep -nE '\b(haz|has) clic' ej2.md || echo "OK: no haz clic"
# → OK: no haz clic ✅

# Long bullets in Reasoning Instructions (code blocks only)
awk '/^[[:space:]]*```$/{in_code=!in_code; next} in_code && /^[[:space:]]*-[[:space:]]/ && length > 140' ej2.md
# → (no output) ✅

# Subagent names (≥3 expected)
grep -c 'Descubrimiento_de_Vehiculos\|Prueba_de_Manejo\|Estado_y_FAQ' ej2.md
# → 3 ✅

# Action names (≥5 expected)
grep -c 'Get_Vehicle_Catalog\|Get_Vehicle_Detail\|Schedule_Test_Drive\|Get_Test_Drive_Status\|AnswerQuestionsWithKnowledge' ej2.md
# → 24 ✅
```

All validation checks pass.

---

## Blockers

None. Strike count: 0.

---

## Checkpoint Final (what the participant sees at end of Ej 2)

✅ **Checkpoint del Ejercicio 2:** el agente está activo en Version 1. En el header ves `Electra Auto Concierge — Version 1 (Active)` con un punto verde.

- 3 subagents authored: **Descubrimiento_de_Vehiculos**, **Prueba_de_Manejo**, **Estado_y_FAQ**
- 5 actions wired: **Get_Vehicle_Catalog**, **Get_Vehicle_Detail**, **Schedule_Test_Drive**, **Get_Test_Drive_Status**, **Answer Questions with Knowledge** (with **Electra_FAQ_Library** bound)
- **System** instructions + **Welcome Message** in Spanish voseo
- **Off Topic** Reasoning Instructions translated
- **Commit Version** succeeded, status = **Active — Version 1**

---

## Notes for Opus

- **Load-bearing callouts preserved:**
  - Paso 1: NEW Builder vs OLD Setup page warning
  - Paso 2: EinsteinServiceAgent User requirement (admin won't work)
  - Paso 3: Skip Ahead rationale (avoid non-deterministic AI wizard)
  - Paso 5/7/9: Hard-wrap warnings for Reasoning Instructions (≤140 chars)
  - Paso 11: AQWK recovery instruction (token resolution gotcha)
- **Tone:** Didáctico, cálido, no condescendiente. Uses "vas a", "tenés que", "podés" naturally.
- **No gold-plating:** Did not add extraneous checkpoints or verbose explanations. Every instruction is actionable.
- **Ej 2 is the longest ejercicio (245 lines → 260 lines post-split).** Sections remain under the 5-min budget because splits improve comprehension (participants copy-paste code blocks without needing to parse long prose).

---

## [SKILL-CANDIDATE] for Phase 11 Harvest

- **Parallelism anti-pattern confirmed:** Ej 2 (agent authoring) is inherently sequential. Subagents reference each other's actions in Reasoning Instructions; the AQWK action depends on Data Library existing (created in manual step); Off Topic depends on the subagent tree being stable. **Never fan out agent authoring.**
- **140-char hard wrap is Builder-specific drift.** v2 hit this in Drift 2.19. Future workshops using Agent Script Builder MUST preemptively enforce this in all Reasoning Instructions. The Builder UI does not warn; it silently truncates. Validation must be in the skill's checklist.
- **Voseo conversion is bulk-feasible for Spanish-language guides.** Pattern: `tú/Usted → vos`, `haz → hacé`, `tienes → tenés`, `vas a poder → podés`. Can be templatized.
- **UI label discipline is systematic.** GLOSSARY.md + STYLE_GUIDE.md define the canonical set. A skill can ship a grep-able allowlist + `**bold**` enforcement script.

---

End of report.
