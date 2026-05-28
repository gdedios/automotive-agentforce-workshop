# Subagent Report — Guía Ejercicio 3

**Task:** Tighten Spanish prose and verify UI-label discipline in Ejercicio 3 (Conversation Preview).

**Duration:** ~3 min

**Status:** ✅ COMPLETE

---

## Files touched

- **EDIT** `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/guia-sections/ej3.md`

---

## Changes applied

### 1. Voseo normalization
- Converted all imperatives to voseo: "hacé clic", "esperá", "pegá", "respondé", "mirá", "usalo", "revisá", "verificá"
- No instances of "tú", "usted", "haz", or "has" remain
- Natural rioplatense register throughout

### 2. UI labels in bold English
- **Preview** (button)
- **Conversation Preview** (panel name, 6 instances)
- **Reset Conversation** (button)
- **Reasoning** (panel)
- **Explorer** (Builder sidebar)
- **Actions** (tab)
- Subagent names left in Spanish as API names: **Descubrimiento_de_Vehiculos**, **Prueba_de_Manejo**, **Estado_y_FAQ**

### 3. Prompts in Sofía Vega voice
- All 4 canonical prompts rewritten as natural conversational Spanish (rioplatense)
- 4 adversarial prompts retained with clarity on expected behavior
- Each prompt now has explicit quote formatting: `> "prompt text"`
- Total: 8 quoted prompts (meets ≥8 requirement)

### 4. Expected behavior after each prompt
- Added 1-2 sentence explanation per prompt:
  - Which subagent matches
  - Which action executes
  - What response the agent should give
- Examples:
  - Canónico 1: "El agente matchea el subagent **Descubrimiento_de_Vehiculos** y ejecuta la action `Get_Vehicle_Catalog` sin filtro de segmento."
  - Adversarial 2: "El agente routing detecta off-topic y activa el fallback definido en las instrucciones del sistema."

### 5. Troubleshooting block added (Paso 4)
- **"Inspeccionar razonamiento (si algo falla)"** — 5-step guide:
  1. Click on agent message in **Conversation Preview**
  2. Expand **Reasoning** panel
  3. Check which subagent matched, which action ran, which inputs resolved
  4. If wrong subagent: review **Reasoning Instructions** in **Explorer**
  5. If action didn't fire: verify wiring in **Actions** tab

### 6. Tone and framing
- Added opening para: "Ahora que construiste el agente completo, es momento de probarlo como si fueras Sofía Vega... Esto es jugar con tu agente — conversá con él, tratá de romperlo, y mirá cómo razona."
- Curious, exploratory tone throughout
- Section headers emphasize experimentation: "escenarios felices", "trampas"

### 7. Checkpoint final
- Expanded from 1 sentence to explicit criteria:
  - 4/4 canónicos verdes
  - ≥3/4 adversariales manejados correctamente
  - Specific checklist: no fabrication, off-topic redirect, Data Library citation, prompt injection ignored
  - Instruction to review **Reasoning** panel if any fail before advancing to Ejercicio 4

---

## Validation results

```bash
# Check 1: No tú/usted
OK: no tú/usted

# Check 2: No haz clic
OK: no haz clic

# Check 3: Prompt count (lines starting with '>')
8 prompts found (4 canónicos + 4 adversariales)

# Check 4: UI labels in bold
15+ instances of bold UI terms verified

# Check 5: Line length
12 lines > 140 chars — ALL are prose paragraphs, step descriptions, or quoted responses.
ZERO Reasoning Instructions bullets to check (this ejercicio is testing-focused, not authoring).
```

All validation checks PASS.

---

## Blockers

None.

---

## Notes

- **Special focus items met:**
  - 4 canónicos + 4 adversariales explicitly called out and quoted
  - Each prompt has expected subagent/action/response
  - Conversation Preview emphasized as the interactive testing console
  - Sofía Vega persona used in canonical prompts
  - Adversariales cover off-topic, fabrication, RAG, prompt injection
  - Troubleshooting section with Reasoning panel inspection guide

- **Line length:** The 12 lines exceeding 140 chars are NOT Reasoning Instructions bullets (which must stay ≤140). They are:
  - Section objective (1 line)
  - Opening prose (1 line)
  - Step instructions (3 lines)
  - Quoted prompts (2 lines)
  - Quoted expected responses (5 lines)
  
  These are allowed to be longer per style guide (only Reasoning Instructions bullets have the 140-char hard limit).

- **Tone:** Achieved "curioso, exploratorio" — participant is playing with their agent, not executing a checklist.

---

**Recommendation:** Ejercicio 3 ready for Opus integration. No further edits needed.
