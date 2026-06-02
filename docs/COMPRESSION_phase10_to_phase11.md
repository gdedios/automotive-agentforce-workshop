# COMPRESSION phase10 → phase11

**Status:** Phase 10 (cleanup + handoff) GREEN. Inventory gap closed, reset.sh authored, SESSION_HANDOFF.md written, round-trip clean check passed. All verified on both orgs.

## Orgs
- Build: `Electra_Auto` `00DgK00000Q8aKJUAZ` — now has catalog ISBLANK fix + inventory seeding; 4 Apex tests green.
- Drift: `Electra_Auto_Drift` `00DgK00000Ox4o9UAB` — same; full seed→reset→re-seed cycle verified (5 models / 15 inventory / 30 slots). Wipe both Phase 12.

## What Phase 10 did (Opus-orchestrated, 3 Sonnet subagents, disjoint folders)
- **10A (Sonnet→classes/):** seeder now creates 15 `Vehicle_Inventory__c` (3 dealers × 5 models, qty 2–8 via `2+Math.mod(d*5+m,7)`, no Math.random); test asserts 15. Reset already deleted inventory (Step 3), so cycle is symmetric.
- **10B (Sonnet→scripts/reset.sh):** 69-line companion to install.sh; calls `Electra_Workshop_Data_Reset` via anon Apex, idempotent, no metadata uninstall. Opus fixed the summary-surfacing regex (anchor `\|DEBUG\|RESET_SUMMARY:`, flatten `\n`→` · `).
- **10C (Sonnet→docs/SESSION_HANDOFF.md):** 10-section facilitator doc. Opus reconciled it to post-fix reality (DRIFT-0.1/0.2/2.2 marked FIXED, inventory gap RESOLVED, corrected the sentinel = PALERMO dealer not a model).
- **Opus-only:** all deploys, the RunSpecifiedTests runs, and the `sf project retrieve` round-trip.

## Round-trip clean check (Opus)
`sf project retrieve --manifest manifest/package.xml -o Electra_Auto --output-dir pkg-verify` (must be IN-PROJECT — `/tmp` throws OutputDirOutsideProjectError; `pkg-verify/` is gitignored). 50 files retrieved. Catalog ISBLANK fix + inventory seeding confirmed present in org. All 6 flows Active. Diffs vs source are BENIGN org-added metadata only: `<areMetricsLoggedToDataCloud>`, screen-flow `<styleProperties>/<verticalAlignment>/<width>`, normalized var `<description>`, XML-decl ordering. No semantic drift — source tree is faithful.

## Files changed (committed this phase)
- force-app/main/default/classes/Electra_Workshop_Data_Seeder.cls (inventory seeding)
- force-app/main/default/classes/Electra_Workshop_Data_Test.cls (assert 15)
- scripts/reset.sh (new)
- docs/SESSION_HANDOFF.md (new)

## Open for Phase 11 (skill synthesis) + Phase 12 (org cleanup)
- Phase 11: harvest [SKILL-CANDIDATE] lines from all COMPRESSION_*.md + skill-creation/*.md into the 7 skill-creation files. LRN-011/012 already in LEARNINGS.md; PARALLELISM_LEDGER needs the Phase 10 3-way fan-out row (it WORKED — disjoint folders, no clobber).
- Phase 12: wipe `Electra_Auto` + `Electra_Auto_Drift` aliases; final commit.
- Ej4 Experience Cloud still unverified on a clean org (deferred — contaminated drift org).

## [SKILL-CANDIDATE]
- **Small-task subagent fan-out is the cost/latency sweet spot.** Phase 10's 3 Sonnet subagents each finished in ~1-3 min (52s, 72s, 200s) on disjoint folders (classes/, scripts/reset.sh, docs/SESSION_HANDOFF.md) — Opus checked + interceded immediately (fixed reset.sh regex, reconciled handoff doc) without waiting 15-30 min. Model routing: Sonnet for authoring/Playwright, Haiku for screenshot-read+transcribe, Opus orchestrates+checks+deploys only. Memorialize in WORKFLOW_AND_PATTERNS + MODEL_SWITCH_BOUNDARIES.
- **Subagents author, Opus verifies against reality — always.** All 3 subagent summaries claimed success; 2 needed Opus correction (10B regex hid the summary; 10C was written against pre-fix state). The `git diff --stat` + read-the-actual-file rule caught both. Never commit on a subagent's word.
- **A subagent that writes a doc can't know what changed AFTER its source snapshot.** 10C correctly described the repo as it read it, but commit 5f0de53 (same session) had already fixed the drifts it flagged as open. Orchestrator must reconcile doc-authoring subagent output against intervening commits.
- **Round-trip clean check needs a semantic diff, not byte diff.** Orgs inject `areMetricsLoggedToDataCloud`, canvas style props, normalized descriptions on retrieve. Compare by grepping load-bearing markers (the fix, the field refs) + confirming Active status, not `diff -q`. A byte-equal expectation produces false "drift" alarms.
- **`sf project retrieve --output-dir` must be inside the project root** (OutputDirOutsideProjectError on /tmp). Use a gitignored in-project dir like `pkg-verify/`.
