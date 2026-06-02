# GUIA_DRIFT.md — Phase 9 drift findings (Electra Automotive Workshop)

**Drift org:** `Electra_Auto_Drift` — `trailsignup.196142edab996b@salesforce.com`, OrgId `00DgK00000Ox4o9UAB`, instance `trailsignup-5fdea91b76c256-dev-ed`, **Developer Edition**.

> ⚠️ **CONTAMINATION CAVEAT.** This drift org is **NOT a pristine trial.** It came preloaded as a **merchant/Kenton template**: 2 pre-existing agents (`Merchant_Management_Agent` InternalCopilot, `Merchant_Support_Agent` ExternalCopilot, both "Trail User" May 05 2026) and **94 custom objects** (managed packages `sc_ext__*` + `shield_ext__*` = Shield Accelerator; unmanaged `Review__c`/`Refund__c`). Findings below are split into **ORG-INDEPENDENT** (trustworthy: toggle flow, Builder UI, Preview UI) and **ORG-DEPENDENT** (must re-verify on a clean OrgFarm Agentforce-NOW trial: package install Ej 0, Experience Cloud Ej 4).

---

## Capability gate timeline (ORG-INDEPENDENT — high confidence)

| State | AiAuthoringBundle | Bot | GenAiPlannerBundle |
|---|---|---|---|
| Fresh (both toggles off) | INVALID_TYPE | INVALID_TYPE | INVALID_TYPE |
| After **Einstein ON** | INVALID_TYPE | INVALID_TYPE | **SUPPORTED** |
| After **Agentforce ON** | **SUPPORTED** | **SUPPORTED** | **SUPPORTED** |

**Lesson:** `INVALID_TYPE: AiAuthoringBundle` on a fresh trial = toggles OFF, confirmed empirically. It is NOT a wrong-org-type signal. Matches `feedback_atlas_trial_activation_blocker` memory.

---

## Ejercicio 1 — Habilitar Einstein + Agentforce (ORG-INDEPENDENT — high confidence)

### DRIFT-1.1 — Toggle ORDER is load-bearing (BLOCKER if wrong)
**Finding:** Before Einstein is ON, navigating to the Agentforce page (`/lightning/setup/EinsteinCopilot/home`) returns **"Page not found."** Only after **Turn on Einstein** is enabled does that URL resolve to the **Agentforce Agents** page with its master toggle.
**Guide must say:** Enable **Einstein FIRST** (Setup → **Einstein Setup**), THEN enable **Agentforce**. Hard dependency, not a suggestion. (Mirrors v2 Drift 1.1.)
**Status:** verify guide Ej 1 states this order explicitly.

### DRIFT-1.2 — Exact toggle locations (verified by screenshot)
- **Einstein:** Setup → Quick Find "Einstein Setup" → `EinsteinGPTSetup/home`. Toggle label: **"Turn on Einstein"** (top card). On-click shows green toast **"Einstein is on."** No confirm modal.
- **Agentforce:** Setup → Quick Find "Agentforce Agents" → resolves to `EinsteinCopilot/home`. Heading: **SETUP › AGENTFORCE STUDIO / Agentforce Agents**. Toggle label: **"Agentforce"** (top-right). No confirm modal; flips on directly. A **+ New Agent** button and a **"Try the new Agentforce Builder! → Let's Go"** card appear once ON.
**Guide check:** ensure Ej 1 references Quick Find "Agentforce Agents" (not the legacy "Einstein Copilot" wording), and notes the green confirmation toasts.

### DRIFT-1.3 — Data Library node naming
**Finding:** Quick Find "Agent" / "Agentforce" surfaces **"Agentforce Data Library"** under **Einstein**. Confirms the Ej 1 Data Library step's nav label is current.

---

## Ejercicio 0 — Instalación + Sembrar Datos (mixed; install path validated 2026-06-02)

Metadata deploy + permset + seeder were exercised end-to-end on the drift org (`sf project deploy start --manifest manifest/package.xml`, then anonymous-Apex seeder run). 45/45 components deployed clean **even on the contaminated merchant org** — no API-name collision with the preloaded `sc_ext__`/`shield_ext__` packages. This part is **ORG-INDEPENDENT-ish** (the deploy mechanics don't depend on the preload).

### DRIFT-0.1 — Guide says "install via managed-package URL" but NO package exists (BLOCKER)
**Finding:** Ej 0 Paso 2 instructs the student to open `https://login.salesforce.com/packaging/installPackage.apexp?p0=<PACKAGE_ID>` and confirm **Electra Auto Workshop Bootstrap** under Installed Packages. But `sfdx-project.json` has **empty `packageAliases`** — no 1GP/2GP package was ever created. The real, working install path is the **metadata source deploy** in `scripts/install.sh` (`sf project deploy start --manifest manifest/package.xml`).
**Fix options:** (a) actually create + upload an unmanaged package and fill `<PACKAGE_ID>`, OR (b) rewrite Ej 0 Paso 2 to "facilitator runs `bash scripts/install.sh -o <alias>`" (matches reality today). Recommend (b) unless a package is genuinely cut before delivery.
**Status:** ORG-INDEPENDENT. Guide + install.sh disagree with repo reality.

### DRIFT-0.2 — GitHub raw PDF URLs 404 (BLOCKER for Ej 1 Data Library)
**Finding:** Ej 1 Paso 3 links 3 PDFs at `https://raw.githubusercontent.com/gdedios/automotive-workshop/main/*.pdf`. **All three return HTTP 404** and the `gdedios/automotive-workshop` repo itself is 404 (does not exist publicly). A student literally cannot download the FAQ PDFs as written. Meanwhile the PDFs exist locally in `data/seed-pdfs/` and `install.sh` step 5 already uploads them as ContentVersion — so the "download from GitHub → upload to Files" instruction is both **broken and redundant** with the installer.
**Fix options:** (a) push PDFs to a real public repo and fix URLs, OR (b) rely on install.sh's ContentVersion upload and rewrite Ej 1 Paso 3 to "los PDFs ya están en Files (los subió el instalador) — verificá que aparezcan en Files → Owned by Me". Recommend (b).
**Status:** ORG-INDEPENDENT. External dependency broken.

### DRIFT-0.3 — Seeder creates 30 slots, guide says "~20"; Vehicle_Inventory__c never populated
**Finding:** `Electra_Workshop_Data_Seeder` creates **30** `Test_Drive_Slot__c` (guide Ej 0 Paso 4 says "~20 turnos"). Also `Vehicle_Inventory__c` (object + tab + listview shipped) stays at **0 rows** — the seeder never populates it, but the guide lists the **Vehicle Inventory** tab as a Home checkpoint, implying it has content.
**Fix:** change guide "~20 turnos" → "~30 turnos"; either seed a few `Vehicle_Inventory__c` rows or drop the empty tab from the Ej 0 checkpoint wording.
**Status:** ORG-INDEPENDENT.

### DRIFT-0.4 — Seeder idempotency + naming VERIFIED (positive finding)
Second seeder run correctly detected the sentinel ("Datos ya sembrados — operación idempotente, no se duplicaron registros."), counts unchanged (5 models / 30 slots). Dealers seeded as **Concesionaria Electra Palermo / Córdoba / Rosario** and leads **Sofía Vega, Tomás Iriarte, Camila Ruiz** — matches guide. Lead statuses differ slightly from guide prose (Vega "Open - Not Contacted" vs guide's "Confirmado"; that's Lead.Status, not test-drive status — low severity).

### DRIFT-0.5 — install.sh step 6 activates a non-shipped agent
**Finding:** `install.sh` step 6 runs `sf agent activate --api-name ElectraAI_Auto_Concierge`, but the agent bundle is **deliberately NOT in `manifest/package.xml`** (students build it in Ej 2). On a fresh install this step always WARNs/fails. Pedagogically correct that the agent isn't pre-shipped — but the install script shouldn't claim to activate it.
**Fix:** remove step 6 from install.sh (or guard it behind a "facilitator demo org only" flag).
**Status:** ORG-INDEPENDENT.

---

## Ejercicio 2 / 3 — Backing flows validated against seeded data (2026-06-02)

All 4 agent-backing flows were executed via `Flow.Interview` against seeded records. This validates the actions a student wires in Ej 2 and the golden-path assertions in Ej 3.

### DRIFT-2.1 — Get_Vehicle_Catalog returned EMPTY on empty-string filter (BUG — FIXED)
**Finding:** `Get_Vehicle_Catalog`'s `Check_Segment_Filter` decision routed on `segmentFilter IsNull = false`. An **empty string is not null**, so a blank `segmentFilter` ("") fell into the *filtered* branch (`Type__c = ''`) → **zero models**, returning only the header "📋 Catálogo Electra:". Canonical prompt #1 ("¿qué modelos eléctricos tienen disponibles?") has no segment, and LLMs very commonly fill an unmentioned optional input with `""` instead of leaving it null → the first golden-path prompt would silently return an empty catalog.
**Fix (applied):** added Boolean formula `Has_Segment_Filter = NOT(ISBLANK({!segmentFilter}))` and routed the decision on it. Re-tested on drift org: null→5 models (521 chars), ""→5 models (521 chars), "Pickup"→only E-Truck. **Deployed to drift org; pending redeploy to build org `Electra_Auto`.**
**Status:** ORG-INDEPENDENT, highest-severity finding of Phase 9.

### DRIFT-2.2 — Guide names flow outputs differently than the flows expose
**Finding:** Ej 2 instructs students to set "Show in conversation" on outputs named `catalogText` / `detailText` / `confirmationText` / `slotId` / `statusText`. The actual flow output variables are `vehicleSummaries` / `detail` / `confirmation` / `bookedSlotId` / `status`. A student following the guide verbatim will look for output names that don't exist in the Add-Action dialog.
**Fix:** reconcile guide Ej 2 output names to the real flow API names (or rename the flow variables — but the flows are already deployed/tested, so fix the guide).
**Status:** ORG-INDEPENDENT.

### DRIFT-2.3 — Get_Vehicle_Detail / Schedule_Test_Drive / Get_Test_Drive_Status VERIFIED (positive)
- `Get_Vehicle_Detail('ECRU')` → "520 km · 0–100 en 6.8s · carga 28 min · ARS $48,000,000, flagship" — **exactly matches** canonical #2 assertions.
- `Schedule_Test_Drive(confirmCreate=false)` → preview with date/model/dealer/name + "¿Confirmás la reserva?" and `bookedSlotId=null` — confirm-before-create gate works.
- `Get_Test_Drive_Status('sofia.vega@...')` → "Tu prueba de manejo está confirmada para el …, 10:00 AM" — works.

---

## Pending (capture via Playwright NEW Builder, ORG-INDEPENDENT)

- **Ej 2** (NEW Builder UI labels: + New Agent split button, Skip Ahead, Subagents tree, Add Action dialog) — capture via Agentforce Studio.
- **Ej 3** (Conversation Preview button + Reset Conversation) — capture via Builder.
- **Ej 4** (Experience Cloud + MIAW) — ORG-DEPENDENT, contaminated here; defer to clean org.

## Screenshots
`docs/phase9_probe/` — einstein-before/after, agentforce-before/after, agentforce-agents-node, quickfind-*.
