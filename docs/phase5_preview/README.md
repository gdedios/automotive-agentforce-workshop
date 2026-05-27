# Phase 5d — Canonical Spanish prompts (preview transcripts)

**Org:** epic.c6fb0dbb14e4@orgfarm.salesforce.com (`Electra_Auto`)
**Agent:** ElectraAI_Auto_Concierge v2 (Active)
**Session:** 019e6a08-a83a-75a9-8d88-5c4275b26888
**Date:** 2026-05-27

All 4 canonical prompts PASS end-to-end against live actions on a fully-seeded org.

| # | File | Topic | Action | Result |
|---|---|---|---|---|
| 1 | `01-catalog.json` | Descubrimiento | Get_Vehicle_Catalog | Lists 5 EV models with specs in ARS |
| 2 | `02-detail.json` | Descubrimiento | Get_Vehicle_Detail (ECRU) | Full E-Cruiser ficha técnica |
| 3 | `03-schedule-preview.json` | Prueba de Manejo | Schedule_Test_Drive (confirmCreate=False) | Shows preview, asks for confirmation |
| 3b | `03b-confirm.json` | Prueba de Manejo | Schedule_Test_Drive (confirmCreate=True) | Books slot, returns confirmation TD-TDS-0006 |
| 4 | `04-status.json` | Estado y FAQ | Get_Test_Drive_Status | Returns Sofía's confirmed status |

## Pre-flight findings (Phase 5d gotchas)

1. **Agent user needs the participant permset.** First catalog attempt errored — agent runs as `agent.user.e34d4d1c9ff9@orgfarm.salesforce.com`, which by default has no access to `Vehicle_Model__c`. Fixed: `sf org assign permset -n Electra_Auto_Workshop_Participant -b agent.user.e34d4d1c9ff9@orgfarm.salesforce.com`. Workshop install script must do this for the facilitator's chosen agent user.

2. **State-country picklist enforcement on fresh OrgFarm.** Seeder failed inserting Accounts with `BillingState='Buenos Aires'` (FIELD_INTEGRITY_EXCEPTION). Removed `BillingState`/`BillingCountry` from dealer Accounts — all dealer info already lives in custom `City_AR__c` field. Workshop doesn't depend on standard state/country.
