# Parallelism Ledger — Electra Automotive Workshop

> **Populated continuously.** Each phase that uses fan-out logs the actual outcome. Phase 11 transforms the table into the skill's `assets/parallelism-ledger.md`.
>
> The point of this file: future Claude orchestrating the next industry workshop reads this to know which phases parallelize *cleanly* vs which collapsed back to sequential and *why*.

---

## Ledger

| Phase | Planned fan-out | Subagents launched | Disjoint folders held? | Wall-time savings vs sequential | Regressions caught later | Verdict |
|---|---|---|---|---|---|---|
| 0 | 1 (Opus solo) | n/a | n/a | n/a | n/a | (Phase 0 in flight) |
| 1 | 1 (Opus solo) | n/a | n/a | n/a | two-org strategy decided here | ✅ Opus-solo correct. Auth + Atlas verify + cleanliness gate is judgment, not fan-out. |
| 2 | 3 (objects / permset+app+tabs / flexipage) | 3 | yes — `objects/`, `permissionsets/+applications/+tabs/`, `flexipages/` | not measured (single Opus deploy after, green — commit 11698a7) | permset needed 2-wave deploy (refs flows/Apex not yet present) | ✅ clean disjoint fan-out. Gotcha: permset deploys AFTER its referenced metadata. |
| 3 | 3 (read flows / write flows / screen flows) | 3 | yes — all under `flows/` but disjoint FILES | not measured (green — commit fb19e13) | flow XML element-ordering errors (LRN-013-adjacent) needed reorder script | ✅ fan-out held; recovery = `reorder_flow_xml.py` before deploy. |
| 4 | 3 (seeder / reset / tests) | 3 | yes — disjoint `.cls` files | not measured (green — commit fb19e13) | `@InvocableMethod` inner-class param rejection (LRN-013) | ✅ clean. One `@InvocableMethod` per class held. |
| 4.5 | 1 (smoke) | 1 | n/a | n/a | n/a | ✅ smoke test caught nothing new — flows already validated by then. |
| 5 | 1 (sequential — agent authoring) | 0 (Opus/adlc sequential) | n/a | n/a | Einstein-off publish block; AQWK token; hidden safety subagents (LRN-002) | ✅ correctly NOT fanned out — `.agent` is one document; AQWK gotcha needs Opus branching recovery. |
| 6a | 3 (3 PDFs) | 3 | yes — 3 disjoint `*.md` in `data/seed-pdfs/` | not measured (green) | table-RAG brittleness surfaced later in 6c (LRN-007) | ✅ clean disjoint fan-out; content authoring parallelizes well. |
| 6b | 1 (sequential — Data Library wiring) | 0 (Opus drove Builder Commit dance directly) | n/a | n/a | n/a | ✅ correct call — single-threaded Builder UI clicks; AQWK Asset Library modal + commit + activate cannot fan out (one canvas, one user session) |
| 6c | 1 (Opus solo — table-RAG battery) + 1 Sonnet for prose rewrite | 1 (tables-to-prose, disjoint folder=`data/seed-pdfs/`) | yes (only `*.md` in seed-pdfs) | ~25 min vs Opus rewriting 5 tables across 3 files | none yet (validation: `grep -c "^|"` = 0; numeric spot-check 55 hits preserved) | ✅ clean disjoint fan-out. Sonnet held budget (<5min), strike count 0, validation passed |
| 7 | 1 (sequential — Experience Cloud + MIAW) | 1 Sonnet + Opus audit | n/a (UI-state-dependent) | not measured (site live — commit 605055c) | LWR site auto-suffix `Name>1` (LRN-014); provision-then-deploy ordering | ✅ correctly sequential — Site Builder UI + LWR htmlEditor sanitization can't fan out. NOT re-verified on a clean org (open thread). |
| 8 | 1 draft + 5 review | 5 (one per ejercicio section) | yes — disjoint section `*.md` files | ~3x vs sequential review | zero register drift (STYLE_GUIDE + GLOSSARY as inputs) | ✅ BEST review-fan-out pattern. Load-bearing canonicals prevent N-way drift. Opus drafts, Sonnet tightens. |
| 9 | 5 (per-ejercicio drift) | 0 (Opus solo, sequential) | n/a | n/a | n/a | ⚠️ COLLAPSED to sequential by design. Drift on a contaminated org + the real defects being *contract* drift (broken URLs, flow I/O names, empty-string bug) meant static checks + anon-Apex `Flow.Interview` contract tests beat 5-way Playwright fan-out. The high-value bug (empty catalog) needed Opus reasoning, not parallel screenshotting. Lesson: re-weight Ph9 toward contract tests; reserve fan-out for genuinely UI-only ejercicios. |
| 10 | 2 (manifest+install / handoff) | 3 (classes / reset.sh / handoff-doc) | yes — `classes/`, `scripts/reset.sh`, `docs/SESSION_HANDOFF.md` fully disjoint | ~10 min vs Opus authoring all 3 serially; each subagent 52s–200s | 10B summary regex hid output (Opus fixed); 10C written against pre-fix state (Opus reconciled) | ✅ clean 3-way fan-out, 0 clobber, 0 BLOCKER. Small tasks (1-3 min) let Opus intercede instantly. Both regressions caught by the verify-against-reality rule, not the subagent summaries. |
| 11 | 1 (Opus solo — skill harvest) | 0 (Opus solo) | n/a | n/a | n/a | ✅ correctly Opus-solo — synthesis across 11 compression docs is cross-cutting judgment, not fan-out. |
| 12 | 1 (Opus solo — org cleanup) | 0 (Opus solo) | n/a | n/a | n/a | (in progress) — alias wipe + final commit, never delegated. |

---

## Anti-patterns to memorialize (populate when we hit them)

### Concurrent metadata deploy attempts
- **Triggering condition:** Multiple subagents try to `sf project deploy start` against the same org
- **Why it fails:** SFDX serializes deploys server-side; client side it returns `(active deployment in progress)` errors. Worse: subagents disagree on `package.xml` state.
- **Fix:** Subagents NEVER deploy. Opus is the only deployer. Sequential, after fan-out completes.

### Two subagents writing to the same `package.xml`
- **Triggering condition:** Sonnet A adds `Vehicle_Model__c` to `<types>`; Sonnet B adds `Electra_FAQ_Library` at the same time. Last writer wins → first writer's entry vanishes.
- **Fix:** `package.xml` is **always** finalized by Opus, after subagent reports come back. Subagents append to a per-folder `.partial.xml` snippet that Opus merges.

### `aiAuthoringBundle` + same-time edits
- **Triggering condition:** Two flows being written into the same `.agent` topics block
- **Why it fails:** `.agent` YAML is a single document; concurrent edits clobber one another
- **Fix:** Phase 5 stays sequential. Always.

### Per-ejercicio drift fan-out using the SAME Chrome profile
- **Triggering condition:** All 5 Sonnets in Phase 9 use `/tmp/chrome-claude-profile`
- **Why it fails:** Chrome refuses to launch a second instance against the same profile dir; persistent-context state (Setup nav, dismissed popups) clobbers across ejercicios
- **Fix:** Per-ejercicio profile dir: `/tmp/chrome-electra-ej0`, `ej1`, `ej2`, `ej3`, `ej4`. Already in `.gitignore`.

### Spanish-prose drift across parallel reviewers
- **Triggering condition:** Phase 8 5-Sonnet review where each reviewer brings their own register (one drifts to "vos", one to neutral, one to formal)
- **Fix:** All 5 reviewers receive the same `STYLE_GUIDE.md` + `GLOSSARY.md` snippet. Opus does a final flatten pass.

### Subagent re-entering folder another subagent already wrote
- **Triggering condition:** Sonnet B finishes early, gets idle, "helps" Sonnet A's folder
- **Fix:** Hard rule in subagent prompt: "Write ONLY to `<exact path>`. Touching anything else = strike-2 BLOCKER.md."
