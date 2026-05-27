# Electra Automotive Workshop — Lead-to-Test-Drive Sales Agent

A Salesforce **Agentforce hands-on workshop** for the Automotive industry, fictional brand **Electra**. Targets **LATAM customers** (technical + business audience) on a **fresh Agentforce-NOW Atlas trial org**. Students build an end-to-end Spanish-language **Service Agent** for a B2C **Lead-to-Test-Drive** sales journey, following a thoroughly screenshot-annotated PDF Guía in Spanish.

This is the third workshop in a series. Workshop v1 (`Projects/04-2026/oil-and-gas-workshop/`) and v2 (`Projects/04-2026/oil-and-gas-workshop-2/`) shipped Kenton (Oil & Gas) field-ops and customer-support agents, respectively. v3 (this project) is **Electra Automotive Sales** — and it is the first build that will deliberately extract its build process into a **reusable Claude Code skill** (`skill-creation/`) so future industry workshops (Healthcare, Retail, etc.) take 2–3 days instead of 2 weeks.

---

## Target end state

After running `bash scripts/install.sh -o <orgAlias>` on a fresh Agentforce-NOW Atlas trial org, a facilitator gets:

- **3 custom objects:** `Vehicle_Model__c`, `Test_Drive_Slot__c`, `Vehicle_Inventory__c` + field overrides on `Lead` and `Event`
- **6 flows:** 4 agent-backing autolaunched (`Get_Vehicle_Catalog`, `Get_Vehicle_Detail`, `Schedule_Test_Drive`, `Get_Test_Drive_Status`) + 2 student-facing screen flows (`Seed_Workshop_Data`, `Reset_Workshop_Data`)
- **2 Apex classes:** `Electra_Workshop_Data_Seeder` and `Electra_Workshop_Data_Reset` (`@InvocableMethod`, idempotent, system-mode DML)
- **Lightning App** `Electra_Sales_Studio` + Home flexipage with one-click **Sembrar / Resetear** buttons
- **Permission set** `Electra_Auto_Workshop_Participant`
- **Atlas Agent Script bundle** `ElectraAI_Auto_Concierge` with 3 topics + 4 flow actions, in Spanish (tú register), Latamized to Argentine context
- **3 Spanish PDFs** uploaded as `ContentVersion` for a Data Library FAQ source
- **Experience Cloud LWR site** `Electra_Customer_Portal` with **MIAW** chat widget for guest users
- **AI evaluation suite** with 4 canonical + ~30 adversarial prompts

The Guía PDF (`docs/guia-participante.pdf`) walks students click-by-click through 5 ejercicios on a fresh org, building the agent, Data Library, and Experience Cloud surface themselves. The **bootstrap package** (everything in the unmanaged-package install) gives students objects, flows, Apex, app, and seed data — they author the agent, eval suite, Data Library, and chat surface during the workshop.

---

## Persona, surface, and use case

- **Persona:** Sofía Vega, prospective EV buyer in Buenos Aires interested in the Electra E-Cruiser
- **Surface:** Public Experience Cloud site + MIAW chat as **guest user** (no login)
- **Use case:** B2C **Lead-to-Test-Drive (Sales)**
  - Topic 1: Vehicle Discovery (`Get_Vehicle_Catalog`, `Get_Vehicle_Detail`)
  - Topic 2: Test Drive Scheduling (`Schedule_Test_Drive` — write flow with FK validation + ask-before-create gate)
  - Topic 3: FAQ + Pre-Qualification (Data Library RAG over 3 PDFs) + `Get_Test_Drive_Status`
- **Integrations:** All mocked — no real DMS, CRM-X, or dealer systems. Custom objects + Apex seeder + flow actions only

---

## How to continue this build

1. Read `docs/PLAN.md` — the approved phase-by-phase plan (phases 0–12, ~1 week target)
2. Read `CLAUDE.md` — the subagent supervision contract (load-bearing rules: Opus orchestrates, Sonnet authors in disjoint folders, ≤5 min budgets, 3-strike rule, compression docs at every phase boundary)
3. Read `docs/ELECTRA_BRAND.md` — durable brand reference (colors, personas, voice, demo themes, products) — this exists so `/compact` can safely drop the Slack canvas and Holodeck slide context
4. Read `docs/V2_REFERENCES.md` — pointers to v2 Kenton patterns we treat as **read-only templates**, never copy-paste
5. Read `skill-creation/` — 7 stub files that are populated continuously throughout the build. Phase 11 harvests them into a reusable skill outline

After Phase 0 (this session), Phase 1 starts with org auth. Resume command is documented at the end of this README.

---

## Resume command (after `/compact`)

```
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
claude --resume
```

Then prompt:

> Resume the Electra Automotive Workshop build per `docs/PLAN.md`. Phase 0 is complete. Start Phase 1 (auth + verify Atlas org). Read `CLAUDE.md` and `docs/ELECTRA_BRAND.md` first.

---

## Directory layout

```
Automotive-Workshop/
├── CLAUDE.md                    # subagent contract + project rules
├── README.md                    # this file
├── sfdx-project.json            # API 66.0, package "Electra Auto Workshop Bootstrap"
├── manifest/package.xml         # populated phase-by-phase
├── scripts/                     # install.sh, reset.sh, generate_pdfs.py, visual-verify.sh
├── force-app/main/default/      # all metadata
├── data/seed-pdfs/              # 3 markdown sources + generated PDFs
├── docs/
│   ├── PLAN.md                  # approved phase plan
│   ├── ELECTRA_BRAND.md         # durable brand reference
│   ├── V2_REFERENCES.md         # v2 Kenton pointers (read-only)
│   ├── COMPRESSION_phase{N}_to_phase{N+1}.md  # phase-boundary handoffs
│   ├── guia-participante.md + .pdf  # the workshop Guía
│   ├── GUIA_DRIFT.md            # Phase 9 drift findings
│   └── SESSION_HANDOFF.md       # Phase 10 final handoff
├── tests/                       # AiEvaluationDefinition test specs
├── skill-creation/              # 7 stubs harvested in Phase 11
└── assets/                      # screenshots, branding assets, deliverables
```
