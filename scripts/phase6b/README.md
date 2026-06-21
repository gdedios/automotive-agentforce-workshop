# Phase 6b — Data Library scripts (DEPRECATED for creation)

## DO NOT RUN scripts 01–22 to CREATE the Data Library

Library creation + initial PDF upload is a **MANUAL STEP**. See:
**`docs/MANUAL_STEP_create_data_library.md`**

Why: every Playwright attempt at programmatic creation hit the Salesforce backend
"We couldn't upload your file" error on two consecutive libraries. The same flow
performed by hand in the UI works on the first try. We are not going to keep
burning attempts at this — request the user to do it.

## What these scripts ARE still useful for

- **Library status polling** — `15-recover-and-status.js` reads the Status badge
  and file table without modifying state. Safe to run.
- **Visual verification post-AQWK-add** — once Status flips to `Success` and AQWK
  is added via Builder, scripts that just navigate + screenshot are fine.
- **Reference for selector patterns** — the LWC shadow-DOM walks + cross-origin
  iframe handling here are reusable for Phase 7 (MIAW + Experience Cloud).

## Going forward in this phase

1. **User** does manual library creation per `docs/MANUAL_STEP_create_data_library.md`.
2. **Claude** polls Status until `Success` (script 15 or a thin wrapper).
3. **Claude** drives NEW Builder UI to do the AQWK Commit dance (task #35) —
   this is the part that has to be UI-automated because there's no CLI / metadata
   way to add AQWK with a resolved `@knowledge.rag_feature_config_id`.
