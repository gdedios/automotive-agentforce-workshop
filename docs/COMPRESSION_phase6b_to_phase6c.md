# Phase 6b → 6c compression

Written 2026-05-27 by Opus orchestrator. < 2KB target.

## Org / agent state
- Alias: `Electra_Auto` (epic.c6fb0dbb14e4@orgfarm.salesforce.com)
- Agent: `ElectraAI_Auto_Concierge`, BotId `0XxgK000001bMtpSAE`
- Active version: V3
- Project IDs: `1bYgK00000081TaUAI` / V3 versionId `1bZgK000000FrC5UAK`
- Data Library: `Electra_FAQ_Library`, ARFPC `ARFPC_1JDgK000007MWZtWAO`

## Phase 6b done
- V2 deactivated → V3 Draft created via Builder UI
- Electra FAQ Library wired to V3 Data → Save toast confirmed
- AQWK action added to `Estado_y_FAQ` subagent via Asset Library modal
- V3 Committed + Activated
- Retrieved `.agent` confirms `rag_feature_config_id: "ARFPC_1JDgK000007MWZtWAO"` resolved to literal ID (no `@knowledge.rag_feature_config_id` token)
- AQWK does NOT serialize as a textual subagent action in retrieved `.agent` — it lives via the global `knowledge:` block + Builder runtime

## Phase 6c eval results
- Adversarial 34-case suite: Topic 100% / Outcome 82.35% (28/34). Of 6 outcome fails: 3 rubric-stale, 3 real (Get_Test_Drive_Status fabrication, segmentFilter not invoked on "ver solo sedanes", VIN response over-verbose).
- Table-RAG 10-case battery: **5/10 PASS** (below 7/10 threshold). Failure pattern: row-level retrieval misses on table format. Triggered remediation per plan.

## Remediation in flight
- Sonnet subagent converted all 5 markdown tables in 3 PDF source files into prose paragraphs (1 row = 1+ sentences with row identifier). Numbers preserved verbatim. `grep -c "^|"` returns 0 on all 3 files.
- PDFs regenerated via `scripts/generate_pdfs.py` (17/16/16 KB each).
- USER MANUAL STEP: replace files in Electra FAQ Library Setup UI (CLAUDE.md rule #8 — never automate ADL upload).
- After re-upload + re-test target ≥7/10, Phase 6c is done.

## [SKILL-CANDIDATE]
- **AQWK Builder-Commit gotcha resolved end-to-end.** Strip AQWK action from `.agent` source, keep `knowledge:` block, CLI publish, then add AQWK via Builder Asset Library modal in NEW canvas. Builder resolves ARFPC token correctly. Retrieved `.agent` shows literal ARFPC ID, AQWK is implicit (not textual action).
- **Table-RAG retrieval is brittle.** Markdown tables in PDFs index poorly — row-level recall <60% on numeric columns. Fix: rewrite tables as prose with row identifier-leading sentences ("**E-Cruiser**: el E-Cruiser tiene una autonomía WLTP de 520 km..."). Don't collapse multi-spec rows into comma lists; one fact per sentence.
- **Eval rubric staleness.** When AQWK is wired AFTER initial eval suite is authored, expectations like "agent should admit no info" become FAIL when the agent successfully retrieves. Mark such test cases for rubric refresh after Phase 6b instead of blaming the agent.
- **Builder UI automation pattern that works.** Direct chevron click via `p.mouse.click(rect.left - 22, rect.top + h/2)` for tree expand. Hardcoded modal coords are sometimes faster than DOM walk for SLDS card layouts. Synthesized PointerEvent/MouseEvent sequence required for `javascript:void(0)` anchors that React onClick-bound.
