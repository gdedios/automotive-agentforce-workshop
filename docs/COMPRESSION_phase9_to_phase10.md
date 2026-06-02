# COMPRESSION phase9 → phase10

**Status:** Phase 9 (drift round 1) GREEN. Install path + 4 backing flows validated; guide + install.sh fixed; PDF regenerated (27pp).

## Orgs
- Build: `Electra_Auto` `00DgK00000Q8aKJUAZ` (orgfarm) — catalog fix deployed here too.
- Drift: `Electra_Auto_Drift` `00DgK00000Ox4o9UAB` (DE, contaminated merchant/Kenton template; install still clean). Wipe both in Phase 12.

## What was validated on drift org
- `sf project deploy start --manifest manifest/package.xml` → 45/45 clean (no collision w/ preloaded sc_ext__/shield_ext__).
- Permset assigns; seeder = 5 models / 30 slots / 3 dealers / 3 leads; idempotent (sentinel works).
- `Get_Vehicle_Detail(ECRU)` / `Schedule_Test_Drive(preview)` / `Get_Test_Drive_Status` match canonical-prompt assertions.

## Drift findings (8) → all triaged in docs/GUIA_DRIFT.md
- **DRIFT-2.1 BUG (FIXED both orgs):** `Get_Vehicle_Catalog` empty-string filter returned 0 models. Root cause: decision on `segmentFilter IsNull` — "" is not null → filtered path w/ Type=''. Fix: formula `Has_Segment_Filter = NOT(ISBLANK(segmentFilter))`, route on it. Re-tested null/""/segment.
- **DRIFT-0.1 (guide fixed):** no managed package exists (`packageAliases` empty); rewrote Ej0 Paso2 → `install.sh` metadata deploy + student verifies objects/flows.
- **DRIFT-0.2 (guide fixed):** GitHub raw PDF URLs all 404 (repo doesn't exist). Rewrote Ej1 Paso3 → PDFs already in Files via installer ContentVersion upload.
- **DRIFT-2.2 (guide fixed):** guide flow I/O names wrong. catalogText→vehicleSummaries, detailText→detail, confirmationText→confirmation, slotId→bookedSlotId, statusText→status, input vehicleType→segmentFilter.
- **DRIFT-0.3 (guide fixed):** "~20 turnos"→"~30"; Vehicle_Inventory__c never seeded (noted).
- **DRIFT-0.5 (install.sh fixed):** removed step-6 `sf agent activate` (agent is built by students Ej2, not shipped — not in manifest). Header + NEXT STEPS rewritten.

## Files changed (commit these)
- force-app/main/default/flows/Get_Vehicle_Catalog.flow-meta.xml (bug fix)
- docs/guia-participante-draft.md + .html (5 fixes); PDF regen (gitignored)
- scripts/install.sh (DRIFT-0.1/0.2/0.5)
- docs/GUIA_DRIFT.md (findings), scripts/phase9/* (drift probes)

## Open for Phase 10
- Build-org catalog fix already deployed — but do a `sf project retrieve` round-trip clean check.
- Decide Vehicle_Inventory__c: seed rows or drop tab from Ej0 checkpoint.
- Ej2/Ej3 NEW-Builder UI labels NOT re-verified via Playwright (skipped — authored from Phase 5/8 live session, high confidence). Ej4 ExpCloud deferred to clean org.

## [SKILL-CANDIDATE]
- **Drift without UI: validate the answer-key flows via `Flow.Interview` anon-Apex, not Playwright.** Caught the highest-severity bug (empty catalog) + 2 guide-name mismatches in minutes, no browser. Future workshops: a "flow-contract test" pass (execute every agent-backing flow against seeded data, assert against the guide's stated outputs) is higher ROI than Builder-clicking.
- **`IsNull` ≠ `ISBLANK` for LLM-supplied string inputs.** LLMs fill unmentioned optional inputs with `""`, not null. Any Flow decision gating an optional agent-action input MUST use `NOT(ISBLANK())`, never `IsNull`. Add to metadata-authoring checklist + the agentscript action guidance.
- **Static drift checks are free wins.** `curl` the guide's external URLs and grep the guide's API names vs the actual flow XML BEFORE any org work — caught the 404 repo + the no-package-exists blocker with zero org time.
- **Guide-vs-reality contract drift is the dominant failure class**, not UI-label drift. v2 over-invested in Playwright UI capture; the real bugs were broken external deps + flow I/O name mismatches + an empty-string edge case. Re-weight Phase 9 toward contract tests.
- **A contaminated pool org still validates the org-independent 80%.** Deploy mechanics, seeder, flow contracts, capability-gate timeline all held on a merchant-template DE org. Only Ej0-package-URL and Ej4-ExpCloud truly need a pristine org. Don't block all of Phase 9 on org purity.
