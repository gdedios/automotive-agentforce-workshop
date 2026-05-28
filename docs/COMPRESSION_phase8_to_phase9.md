# COMPRESSION phase8 → phase9

## Status: Phase 8 GREEN

Spanish-rioplatense participant guide drafted, peer-reviewed by 5 parallel Sonnet subagents (one per ejercicio), merged + drift-flattened by Opus, exported to a 27-page Letter PDF via pandoc → Chrome.app `--print-to-pdf`. All voseo / UI-label / bullet-length validations clean.

## Deliverables

| Artifact | Path | Notes |
|---|---|---|
| Final markdown | `docs/guia-participante-draft.md` | 780 lines, 49KB |
| Final PDF | `docs/guia-participante.pdf` | 27 pages, 1.06MB, Letter, Electra purple branding |
| Intermediate HTML | `docs/guia-participante.html` | 72KB, used for PDF export |
| Style canonical | `docs/STYLE_GUIDE.md` | voseo + UI-label + ≤140-char bullet rules |
| Vocabulary canonical | `docs/GLOSSARY.md` | UI labels EN, domain ES, exact welcome / off-topic copy |
| Per-section drafts | `docs/guia-sections/{ej0..ej4,anexos}.md` | reviewer scratch (kept for Phase 9 reference) |
| Reviewer reports | `docs/subagent-report-guia-ej{0..4}.md` | what each Sonnet edited + validation exit codes |
| PDF generator | `scripts/generate-guia-pdf.sh` | pandoc + inline CSS + Chrome.app --print-to-pdf |

## Workshop shape (locked)

5 ejercicios + 4 anexos. Voseo informal, UI labels in `**bold English**`, all Reasoning Instructions bullets ≤140 chars (Builder truncation gotcha).

| Ej | Title | Time | Key gates |
|---|---|---|---|
| 0 | Preparación del entorno | 10 min | App Launcher → Electra Sales Studio, Sembrar Datos flow, permset assigned |
| 1 | Einstein + Agentforce + Data Library | 10 min | Toggle order with refresh between, manual ADL creation, 3 PDFs Status=Ready |
| 2 | Construir Electra Auto Concierge | 55 min | 13 pasos, 3 subagents, 5 actions, AQWK recovery instruction inline, Activate |
| 3 | Conversation Preview testing | 20 min | 4 canónicos green, ≥3/4 adversariales handled, Reasoning panel inspection |
| 4 | Experience Cloud + MIAW | 40 min | Activate ESD, embed snippet in Site Builder Head Markup, guest smoke test |

Anexo A = 4 canónicos + 4 adversariales (extended). Anexo B = 7-row troubleshooting matrix. Anexo C = ES↔EN glossary. Anexo D = créditos.

## Decisions taken (load-bearing)

1. **Disjoint per-ejercicio fan-out is the right axis for guide review.** Splitting the 725-line draft into `guia-sections/ej{0..4}.md` + `anexos.md` let 5 Sonnets edit in parallel with zero merge conflicts. Each owned ≤270 lines (Ej 2 was the heaviest at 245 lines pre-edit, 269 post-edit). All 5 returned within ~2-9 min, cumulative wall time ≈ 9 min vs. estimated ~25 min sequential.

2. **`STYLE_GUIDE.md` + `GLOSSARY.md` as load-bearing inputs prevented register drift.** Without those, 5 independent Sonnets would have produced 5 slightly different "voseo informals" — one might write "haz click" → "haces clic", another "hace click" → "hacé clic", another would forget the acute on "podés". Single source of truth for voseo conjugations, UI-label policy, and EXACT welcome / off-topic copy meant zero post-merge drift.

3. **Validation in each subagent prompt must be runnable bash, not "check that…".** The reviewer prompts included `grep -nE '\b(tú|Usted|Ud\.)\b' "$SECTION" || echo "OK"` literally. All 5 reviewers ran their own validations and reported exit codes. Opus then re-ran the same validations on the merged file — zero violations. Cheap belt-and-suspenders.

4. **Chrome for Testing hangs on `--print-to-pdf` on this machine; regular Chrome.app works.** Same hang seen in Phase 7 visual verify. Pattern: CFT spawns and idles even with `--virtual-time-budget=10000`. Switched to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` with `--user-data-dir=/tmp/chrome-electra-pdf-stable` and got a clean 1MB PDF in <30s. Documented in script.

5. **pandoc inline CSS via `-H <(printf '<style>...</style>' "$CSS")` produces print-ready HTML in one shot.** No standalone CSS file, no template clutter. Brand colors hardcoded (`#4723EB` purple primary, `#F0EBFD` light, `#261089` dark). Headings get page-break-after:avoid; tables and pre blocks get page-break-inside:avoid. 27-page result has no orphaned headers.

6. **"Header" section was never separate.** First pass after the split looked like `_header.md` + `ej0..ej4` + `anexos`, but the ej0 section in the draft already contained TOC + Acerca + Qué vas a construir + Ejercicio 0 (lines 1-132). Concatenating ej0..anexos in order reproduces the full guide. No header file needed.

## Validations (all passed on merged file)

```
voseo violations (tú/Usted/Ud.)         : 0
"haz/has clic"                          : 0
bullets >140 chars in code blocks       : 0
Welcome message canonical instances     : 4
Off-topic redirect canonical instances  : 2
Subagent name underscores               : 18
Action name occurrences                 : 41
Checkpoint blocks (✅)                  : 8
plural-formal (les/hagan/ustedes)       : 0
```

PDF: 27 pages, Letter, 1.06MB, all 11 sections present in TOC and body.

## Open threads (deferred to Phase 9)

- **Drift round 1.** 5 Sonnet capture agents drive Playwright through ej0-ej4 on the live `Electra_Auto` org with their own Chrome profiles (`/tmp/chrome-electra-ej0..ej4`). Each captures screenshots + reports drift to `docs/drift-ej{N}.md`. Opus triages → `docs/GUIA_DRIFT.md`.
- **Snippet embed pedagogy.** Ej 4 currently describes the Site Builder → Head Markup snippet paste step but has no live snippet text — the participant gets one from their own ESD. Acceptable; that's the pattern.
- **Screenshots in PDF.** Current PDF has zero screenshots. Phase 9 drift round will produce screenshots that get inserted into the markdown before the final-final PDF regen. Workshop facilitators traditionally annotate by hand; we do better.

## [SKILL-CANDIDATE]

- **WORKFLOW pattern:** *Per-ejercicio Sonnet fan-out for participant guides.* Split the markdown by section, give each Sonnet a disjoint file path, supply STYLE_GUIDE + GLOSSARY as load-bearing inputs, run identical bash validations in each prompt. Opus merges via `cat` and re-runs validations globally. ~3x speedup over sequential review with zero drift cost. Add to `WORKFLOW_AND_PATTERNS.md`.
- **WORKFLOW pattern:** *Style + glossary canonicals as load-bearing reviewer inputs.* Two cheap files that prevent N parallel reviewers from drifting in N different directions. The cost is one-time (≈10 min Opus authoring); the benefit compounds across every reviewer call. Generalizes to any multi-author Spanish prose project. Add to `WORKFLOW_AND_PATTERNS.md`.
- **GOTCHA:** *Chrome for Testing `--print-to-pdf` hangs on this MDM-managed Mac; regular Chrome.app works.* Same surface as the Phase 7 visual-verify hang. Both use throwaway `--user-data-dir=/tmp/chrome-electra-*-stable` profiles. Add to workspace `CLAUDE.md` headless-browser section if not already there. Reference: `Projects/05-2026/Automotive-Workshop/scripts/generate-guia-pdf.sh`.
- **GOTCHA:** *pandoc emits a default CSS that overrides inline `-H` styles unless you pass `-V "css="` to clear it.* Without that, the `<style>` injected via `-H` competes with pandoc's pastel default and headings render light blue, not Electra purple. Add to `LEARNINGS.md`.
- **MODEL-SWITCH boundary:** Phase 8 = Opus orchestrate + author + final-pass + PDF. Sonnet handles the per-section prose-tightening fan-out. The boundary is clean: prose AT-SCALE is Opus (cohesion across 700+ lines), prose-WITHIN-A-SECTION is Sonnet (5 parallel ≤270-line edits). Add to `MODEL_SWITCH_BOUNDARIES.md`.
- **PARALLELISM-LEDGER row:** Phase 8 reviewer fan-out: 5 Sonnets, disjoint section files, STYLE_GUIDE+GLOSSARY shared, 5/5 returned in ≤9 min wall, 0 merge conflicts, 0 drift after global re-validation. **Worked.** Add to `PARALLELISM_LEDGER.md`.

## Next: Phase 9 — Drift round 1 with Playwright

▶︎5 Sonnet capture agents drive Playwright through one ejercicio each on the live org with disjoint `--user-data-dir` profiles. Each captures screenshots + reports drift to per-ejercicio `docs/drift-ej{N}.md`. Opus triages all 5 → `docs/GUIA_DRIFT.md`. Apply fixes, regenerate PDF.

OrgFarm 2-interstitial first-run handling + Field Service Setup popup dismissal + NEW Builder direct URL all already documented in workspace CLAUDE.md and project CLAUDE.md sections 5+6.

One drift round only (per Plan-agent recommendation).
