# Electra Automotive Workshop — Plan

This is the canonical copy of the approved plan from the planning session on 2026-05-26. The original lives at `~/.claude/plans/i-want-to-create-woolly-perlis.md`. This file is the durable, in-repo copy. Treat it as authoritative.

---

## Context

We are building a Salesforce **Agentforce hands-on workshop** for the **Automotive industry**, fictional brand **Electra**, in `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/`. The workshop teaches LATAM customers (technical + business) to build a Spanish-language **Service Agent** end-to-end on a fresh Agentforce-NOW trial org. Students follow a thoroughly screenshot-annotated PDF Guía in Spanish. The agent + supporting metadata + data + flows ship as an unmanaged package students install via URL.

**Why this build is different from v2 Kenton (Oil & Gas):** v2 took 2 weeks running sequentially on one model. This time the user wants ~1 week using **Opus 4.7 max as orchestrator/auditor** with **parallel Sonnet 4.6 subagents** for fan-outable work, and to **extract a reusable Claude Code skill** at the end so future industry workshops (Healthcare, Retail, etc.) take 2-3 days.

**Locked decisions (from interview):**
- **Use case:** B2C **Lead-to-Test-Drive (Sales)** — driver/prospect chats with the agent on the Electra consumer site, gets vehicle info, schedules a test drive, gets pre-qualification estimates, asks FAQ. Different shape from v2 Kenton (Sales not Customer-Support) → tests skill portability.
- **Org base:** Clean **Agentforce NOW Atlas trial** (orgfarm pool); we ignore any preloaded use case via `.forceignore`. Reuses the v2 path that's already proven.
- **Duration:** ~1 week comfortable with aggressive parallelism, full 30-prompt adversarial suite, polished facilitator handoff, skill-extraction time at the end.
- **Brand:** Electra — Primary Purple `#4723EB`, Primary Charcoal `#393942`, Primary Light `#F0EBFD`, Secondary Black `#050516`, Secondary Purple Dark `#261089`. Latamized to Argentine context (matching v2 register).
- **Persona:** **Sofía Vega**, prospective EV buyer in Buenos Aires interested in Electra E-Cruiser.
- **Topics (3) and actions (4):**
  1. Vehicle Discovery → `Get_Vehicle_Catalog` (read flow), `Get_Vehicle_Detail` (read flow)
  2. Test Drive Scheduling → `Schedule_Test_Drive` (write flow: create Lead + Event)
  3. FAQ + Pre-Qualification (Data Library RAG over 3 Spanish PDFs) + `Get_Test_Drive_Status` (read flow, lookup by email)
- **Surface:** Electra consumer site (Experience Cloud LWR) + MIAW chat widget, accessible to a guest user.
- **Integrations:** All mocked (no real DMS / CRM-X / dealer systems). Custom objects + Apex seeder + Flow actions only. Apex is reserved for seed/reset only — agent **actions are flows only** (workshop pedagogy).

---

## Subagent supervision contract (load-bearing rules)

Codified in the project `CLAUDE.md`. All Sonnet subagents follow these rules; Opus enforces them.

1. **Opus is the only orchestrator + only committer.** Subagents author files; Opus audits via `git diff --stat` and reads actual XML/cls before declaring success — never trusting subagent summaries.
2. **Disjoint-folder fan-out only.** Parallel subagents may not write to the same file or directory. Phase 2 fans out by metadata-type folder (`objects/`, `permissionsets/`, `flexipages/`); Phase 9 drift fans out by ejercicio.
3. **Per-subagent budget:** ≤ 5 min and ≤ 50K tokens. 30s–1min for trivial tasks. Strike-1 retry, **strike-2 produces `BLOCKER.md` and pauses (no retry)**, strike-3 escalates to user or back to Opus.
4. **Subagents NEVER deploy** — they author + validate locally. All `sf project deploy start` runs are Opus-only, sequential, after fan-out completes.
5. **Subagent reports.** Each Sonnet thread ends with a `subagent-report.md` (files touched, validation cmd + exit code, blockers). Opus distills N reports into the next `docs/COMPRESSION_phaseN_to_phaseN+1.md`.
6. **Skill-extraction discipline (continuous, not a phase).** Every compression doc and learning ends with a `## [SKILL-CANDIDATE]` section. Phase 11 harvests, doesn't synthesize from scratch.
7. **Compaction discipline.** Before each Opus→Sonnet handoff and at every model switch, the outgoing model writes a `<2KB` compression doc; then Opus runs `/compact` with a phase-targeted instruction so Sonnet picks up cold from a curated brief, not raw history.

---

## Phase map (~1 week target, with parallelism annotations)

> **Legend:** `🧠 Opus` | `🔵 Sonnet (claude subagent_type, model="sonnet")` | `📦 adlc-*` (Agentforce ADLC pre-built) | `▶︎N` = N parallel subagents | `⏹` = STOP/COMPRESS/audit gate

### Phase 0 — Scaffold + brand file (🧠 Opus, ~30 min, THIS SESSION after ExitPlanMode)
- `mkdir` standard subdirs: `force-app/main/default/`, `manifest/`, `scripts/`, `docs/`, `tests/`, `data/seed-pdfs/`, `skill-creation/`, `assets/`
- Copy structural-only from v2: `sfdx-project.json`, `scripts/install.sh` skeleton, `.forceignore`, `.gitignore`. **Wipe v2 metadata-specific names** (`Kenton_*` → `Electra_*`, `KenAI_*` → `ElectraAI_*`, etc.)
- Author fresh `README.md`, `manifest/package.xml` skeleton (API 66.0), `docs/PLAN.md` (this plan), `docs/V2_REFERENCES.md` (v2 file pointers as templates only)
- Write **`CLAUDE.md`** for this folder codifying subagent contract, skill-extraction discipline, brand-file canonical reference, v2-as-template-not-copy rule, parallelism pitfalls
- Write **`docs/ELECTRA_BRAND.md`** capturing everything from the Slack canvas + Holodeck slides (color palette, personas, demo themes, products, voice, Argentine localization) — this is durable so `/compact` can drop the Slack/Slides context
- Write **`skill-creation/`** stubs: `LEARNINGS.md`, `WORKFLOW_AND_PATTERNS.md`, `INTERVIEW_TEMPLATE.md`, `SKILL_OUTLINE.md`, `BRAND_FILE_TEMPLATE.md`, `PARALLELISM_LEDGER.md`, `MODEL_SWITCH_BOUNDARIES.md` (each is empty with section headers — populated continuously)
- Update memory `MEMORY.md` index with new project entry
- ⏹ Print exact next-session resume prompt and **end this session** so user can run `/compact` and start Phase 1 fresh

### Phase 1 — Auth + verify Atlas org (🧠 Opus, ~15 min)
- User runs `sf org login web -a Electra_Auto -r https://login.salesforce.com` (orgfarm credential or fresh trial); tells Claude the alias
- Claude: `sf org display`, `sf org list metadata -m AiAuthoringBundle --json` (Atlas gate; **must NOT error**), `sf data query` to count `CustomObject`/`ApexClass`/`Flow` (must be ~0 to confirm clean, otherwise reject org per workspace CLAUDE.md "Pool aliases can mislead" lesson)
- Verify ExperienceCloud + MessagingChannel availability
- ⏹ Write `docs/COMPRESSION_phase1_to_phase2.md` (org alias, ID, capabilities) → `/compact` to Sonnet handoff brief

### Phase 2 — Metadata authoring + deploy (▶︎3 🔵 Sonnet authoring + 🧠 Opus deploy, ~60 min)
**Authoring fan-out (parallel, disjoint folders):**
- Sonnet A: 3 custom objects (`Vehicle_Model__c`, `Test_Drive_Slot__c`, optional `Vehicle_Inventory__c`) + field overrides on Lead/Event/Account/Contact (writes to `force-app/main/default/objects/`)
- Sonnet B: Permission set `Electra_Auto_Workshop_Participant`, Lightning App `Electra_Sales_Studio`, 3 Tabs (writes to `force-app/main/default/{permissionsets,applications,tabs}/`)
- Sonnet C: Flexipage `Electra_Sales_Home` with Flow buttons via `flexipage:richText` + `<a href="/flow/...">` (workspace CLAUDE.md lesson — never `flexipage:flow`); also `actionOverrides` block on app routing `standard-home` to flexipage (writes to `force-app/main/default/flexipages/`)

**Opus aggregation:** read all three subagent reports → `git diff --stat` audit → finalize `manifest/package.xml` → single deploy → verify with `sf sobject describe`
- ⏹ Compression doc → `/compact` for Phase 3

### Phase 3 — Flows (▶︎3 🔵 Sonnet authoring + 🧠 Opus deploy, ~60 min)
**Authoring fan-out:**
- Sonnet A: read flows — `Get_Vehicle_Catalog` (input: optional segment filter; output: collection of vehicle summaries), `Get_Vehicle_Detail` (input: model code; output: spec text)
- Sonnet B: write flow — `Schedule_Test_Drive` (inputs: vehicle of interest, dealer, requested datetime, contact info; output: confirmation number; **with FK validation + ask-before-create gate** per v2 lesson) + `Get_Test_Drive_Status` (input: email; output: appointment status)
- Sonnet C: 2 screen flows — `Seed_Workshop_Data` + `Reset_Workshop_Data` (each = confirm screen → Apex action → result screen)

**Opus aggregation:** deploy + smoke each flow via `sf flow execute`
- ⏹ Compression doc → handoff for Phase 4

### Phase 4 — Apex seeder + reset + tests (▶︎3 🔵 Sonnet, ~45 min)
- Sonnet A: `Electra_Workshop_Data_Seeder.cls` (`@InvocableMethod`, idempotent sentinel check, `Database.insert(..., AccessLevel.SYSTEM_MODE)`)
- Sonnet B: `Electra_Workshop_Data_Reset.cls` (separate class — workspace CLAUDE.md "one `@InvocableMethod` per class" rule)
- Sonnet C (after A+B return): tests for both classes → 75%+ coverage
- Latamized seed: ~5 vehicle models (E-Cruiser, E-Sport, E-Wagon, E-Truck, E-City), 3 dealer accounts (Concesionaria Buenos Aires, Concesionaria Córdoba, Concesionaria Rosario), ~20 test-drive slots, 3 sample leads
- Wire flexipage Home: 2 prominent flow-link buttons (Sembrar / Resetear) — already authored Phase 2C, just confirm
- Opus deploy + run all tests
- ⏹ Compression doc

### Phase 4.5 — Flow integration smoke test (▶︎1 🔵 Sonnet, ~15 min)
- Run all 4 flows via `sf flow execute` against seeded data
- Catches FK / shape / picklist drift BEFORE Phase 5 burns Opus tokens (v2 lesson: hit this at agent-test time, 2 hours wasted)

### Phase 5 — Agent authoring + publish + activate (📦 adlc-orchestrator OR 🧠 Opus, ~90–120 min)
**Sequential, single-threaded (per Plan-agent's pitfall warning).** Use `adlc-orchestrator` subagent (which auto-loads `developing-agentforce`, `sf-ai-agentscript`, `testing-agentforce`) OR run on Opus main:
1. `sf agent generate authoring-bundle --no-spec --name "Electra Auto Concierge" --api-name ElectraAI_Auto_Concierge`
2. Hand-author 3 topics + 4 flow actions in `.agent` YAML (Spanish "tú" register, English UI labels in instructions)
3. Apply v2 adversarial findings preemptively: FK validation in `Schedule_Test_Drive` flow, ask-before-create gate, anti-fabrication for VINs/dealer codes, **hard-wrap all Reasoning Instructions to ≤140 chars** (v2 Drift 2.19 truncation lesson)
4. `agent_type: "AgentforceServiceAgent"` + `default_agent_user` → real facilitator username (NOT placeholder; v2 lesson)
5. **Strip the AQWK action from `.agent` source** but keep `knowledge:` block (workspace CLAUDE.md `feedback_agent_publish_knowledge_token.md` lesson). AQWK gets added Phase 6b via Builder commit.
6. `sf agent validate authoring-bundle` → `sf agent preview` (iterate against 4 canonical Spanish prompts) → `sf agent publish authoring-bundle` → `sf agent activate`
7. **Phase 5 acceptance gate (load-bearing):** Visual verification via headless Chrome adapted from `Projects/05-2026/assist-110258-comfandi/scripts/visual-verify.sh`. Fallback Tooling API query. Both fail → pause + ask user.
8. Author `aiEvaluationDefinitions/ElectraAI_Auto_Concierge_Tests` covering 4 canonical + 30 adversarial prompts (off-topic, prompt-injection in test-drive description, language switch, fake VINs, etc.) → `sf agent test run`
- ⏹ Compression doc

### Phase 6a — Spanish PDF authoring (▶︎3 🔵 Sonnet — runs IN PARALLEL with Phase 5)
- Sonnet X: `Electra-Catalogo-Vehiculos-Argentina.md` (specs of 5 EV models, charging info, ranges)
- Sonnet Y: `Electra-Politicas-de-Garantia.md` (warranty terms, coverage, claims process)
- Sonnet Z: `Electra-Guia-Carga-y-Mantenimiento.md` (charging at home/dealer/public, maintenance schedule)
- Each PDF includes ≥1 markdown table (RAG-stress test — see Phase 6c)
- Generate PDFs via reportlab (`scripts/generate_pdfs.py` adapted from v2's `generate_screenshots_pdf.py`) — sequential script run, no fan-out on PDF generation
- Save markdown source + PDF to `data/seed-pdfs/` AND `force-app/main/default/contentassets/` (folder-per-asset layout per workspace CLAUDE.md `feedback_contentasset_sfdx_layout.md`)

### Phase 6b — Data Library wiring (🧠 Opus, sequential UI clicks, ~30 min)
**Sequential, single-threaded** — handles the AQWK `@knowledge.rag_feature_config_id` gotcha:
1. Setup → Data Library → New → `Electra_FAQ_Library` (no spaces in name)
2. Upload 3 PDFs, **wait for `Status: Ready` AND each source individually indexed**
3. Open agent in NEW Builder (`/lightning/n/standard-AgentforceStudio?c__nav=agents` per workspace CLAUDE.md), Deactivate → New Version
4. Data → Data Library → select library, check Show Sources, Save
5. Open FAQ topic → Add Action → `Answer Questions with Knowledge` → leave inputs at auto-bound defaults (don't touch `ragFeatureConfigId` token)
6. Save → Commit Version. If commit fails with "Invalid ragFeatureConfigIds" → delete action, save, re-add fresh, recommit (v2 recovery procedure)
7. Activate
8. Verify with `sf project retrieve start --metadata "AiAuthoringBundle:..."` — confirm literal `ARFPC_...` ID in retrieved `.agent`

### Phase 6c — Table-RAG test battery (🧠 Opus, ~30 min)
- Run 10 table-targeted prompts against the agent (specs cross-row comparisons, response-time tables, status-meaning tables)
- If ≥3 FAILs → convert tables to prose in markdown, regenerate PDFs, re-upload, re-test
- ⏹ Compression doc

### Phase 7 — Experience Cloud + MIAW (🔵 Sonnet + 🧠 Opus audit, ~3 hours)
**Sequential** (UI-click-heavy; v2 burned ~150 scripts here). Opus pre-flight checkpoint before Sonnet starts.
- Create LWR Experience Cloud site `Electra_Customer_Portal` with Electra Primary Purple branding (Site Builder UI, NOT `sf project deploy` for media-backed CSS — workspace CLAUDE.md `feedback_lwr_html_editor.md`)
- Configure Embedded Service Deployment + MessagingChannel `Electra_MIAW`, link to agent
- Guest user profile + sharing rules (Vehicle_Model__c read, Lead create, Event read)
- Publish site (`sf community publish --name "Electra Customer Portal"`)
- Test as guest in incognito: chat widget loads → 4 prompts work end-to-end
- ⏹ Compression doc

### Phase 8 — Guía de Participante (🧠 Opus draft, ~3–4 hrs; ▶︎5 🔵 Sonnet review, ~30 min)
- Opus drafts `docs/guia-participante-draft.md` — 5 ejercicios:
  - Ej 0: Setup + Sembrar Datos (10 min)
  - Ej 1: Habilitar Einstein + Agentforce + Data Library (10 min) — apply v2 Drift 1.1 fix (browser refresh between toggles, deterministic order)
  - Ej 2: Construir agente en NEW Builder — 3 topics + 4 flow actions + Data Library (55 min). Bullets ≤140 chars per instruction line (v2 Drift 2.19)
  - Ej 3: Conversation Preview con 4 prompts canónicos + 4 adversariales (20 min)
  - Ej 4: Desplegar en Experience Cloud + MIAW (40 min)
- 5 Sonnet reviewers in parallel (one per ejercicio): Spanish-prose tightening + UI-label drift check. All 5 receive same `STYLE_GUIDE.md` + `GLOSSARY.md` snippet to prevent register drift. Opus does final pass to flatten residual drift.
- Generate PDF Guía via Chrome for Testing HTML→PDF (workspace CLAUDE.md "PDF generation via Chrome for Testing beats reportlab")
- ⏹ Compression doc

### Phase 9 — Drift round 1 with Playwright (▶︎5 🔵 Sonnet capture + 🧠 Opus triage, ~3–4 hrs)
**Highest-leverage parallelism win.** Each Sonnet drives Playwright through one ejercicio on the live org with **its own Chrome profile dir** (`/tmp/chrome-electra-ej0`, `ej1`, `ej2`, `ej3`, `ej4` — workspace CLAUDE.md "do not browser_close" + "use Chrome for Testing on MDM Macs"). Each captures screenshots + reports drift to a per-ejercicio `docs/drift-ej{N}.md`.
- Apply v2 lessons preemptively: NEW Builder URL direct, dismiss "Try Field Service Setup" popup, OrgFarm 2-interstitial first-run handling, Setup vs Lightning host swap
- Opus reads all 5 drift files → triage (fix in Guía / fix in metadata / accept-and-document) → produces `docs/GUIA_DRIFT.md` final
- Apply fixes to Guía → regenerate PDF
- ⏹ Compression doc. **One drift round only** (per Plan-agent's recommendation; v2's rounds 2 and 3 paid for unfamiliarity, not new findings)

### Phase 10 — Cleanup + handoff (▶︎2 🔵 Sonnet, ~45 min)
- Sonnet A: Finalize `manifest/package.xml` deploy order (objects → flows → Apex → permsets → flexipages → apps → aiAuthoringBundle → aiEvaluationDefinitions → contentassets → messagingChannel → networks → experienceBundle), finalize `scripts/install.sh` + `scripts/reset.sh`, do a `sf project retrieve` round-trip clean check
- Sonnet B: Write `docs/SESSION_HANDOFF.md` (mirroring v2 shape: critical findings, expected agent behavior, file map, deploy sequence, open threads)
- Opus reviews + commits

### Phase 11 — Skill extraction synthesis (🧠 Opus, ~1 hr)
**Continuous → final synthesis.** Throughout Phases 0-10, every compression doc has `[SKILL-CANDIDATE]` lines tagging patterns. Phase 11 harvests:
- Populate `skill-creation/LEARNINGS.md` (Automotive-specific gotchas distinct from v2)
- Populate `skill-creation/WORKFLOW_AND_PATTERNS.md` (the Opus-orchestrator + Sonnet-fanout phase choreography as portable template)
- Populate `skill-creation/INTERVIEW_TEMPLATE.md` (questions for future client: industry, B2C/B2B, persona, surface, integrations to mock, Spanish vs English, target duration)
- Populate `skill-creation/PARALLELISM_LEDGER.md` (table: phase / fan-out used / actually worked / regressed)
- Populate `skill-creation/MODEL_SWITCH_BOUNDARIES.md` (concrete signals: Spanish prose >300 words → Opus; bulk XML → Sonnet; agent auth → adlc-orchestrator)
- Populate `skill-creation/BRAND_FILE_TEMPLATE.md` (schema for the brand file — colors, personas, voice, surface, demo themes, products — that any future industry can fill)
- Populate `skill-creation/SKILL_OUTLINE.md` (proposed `SKILL.md` shape for future `/create-industry-workshop` skill)
- Update `MEMORY.md` with new project entry + Automotive-specific lessons

### Phase 12 — Org cleanup + final commit (🧠 Opus, ~15 min)
- `sf org list` → identify `Electra_Auto` + any test-org aliases used during build
- `sf org logout --no-prompt -o <alias>` for each (workspace CLAUDE.md "clean up disposable test org aliases" rule)
- Final git commit
- Print resume prompt for the eventual skill-creation session

---

## Critical files this plan creates

```
/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/
├── CLAUDE.md                                # subagent contract, skill-extraction, brand canonical
├── README.md
├── sfdx-project.json                        # API 66.0
├── manifest/package.xml
├── scripts/{install.sh, reset.sh, generate_pdfs.py, visual-verify.sh}
├── force-app/main/default/                  # all metadata (objects, flows, classes, agent bundle, Data Library content, etc.)
├── data/seed-pdfs/                          # 3 markdown sources + generated PDFs
├── docs/
│   ├── PLAN.md                              # copy of this plan
│   ├── ELECTRA_BRAND.md                     # durable brand reference (replaces Slack/Slides)
│   ├── V2_REFERENCES.md                     # pointers to v2 Kenton patterns
│   ├── COMPRESSION_phase{N}_to_phase{N+1}.md
│   ├── guia-participante-draft.md + final PDF
│   ├── GUIA_DRIFT.md                        # Phase 9 drift findings
│   └── SESSION_HANDOFF.md
├── tests/ElectraAI_Auto_Concierge-tests.yaml
├── skill-creation/                          # 7 files for future skill
│   ├── LEARNINGS.md
│   ├── WORKFLOW_AND_PATTERNS.md
│   ├── INTERVIEW_TEMPLATE.md
│   ├── SKILL_OUTLINE.md
│   ├── BRAND_FILE_TEMPLATE.md
│   ├── PARALLELISM_LEDGER.md
│   └── MODEL_SWITCH_BOUNDARIES.md
└── assets/                                  # screenshots, branding assets, final deliverables
```

**Reused-as-template paths from v2 Kenton (read-only references):**
- `Projects/04-2026/oil-and-gas-workshop-2/sfdx-project.json` — package shape
- `Projects/04-2026/oil-and-gas-workshop-2/scripts/install.sh` — gating skeleton
- `Projects/04-2026/oil-and-gas-workshop-2/docs/PLAN.md` — phase-doc shape
- `Projects/04-2026/oil-and-gas-workshop-2/docs/V1_REFERENCES.md` — references-doc shape
- `Projects/04-2026/oil-and-gas-workshop-2/docs/GUIA_DRIFT.md` — drift methodology
- `Projects/04-2026/oil-and-gas-workshop-2/force-app/main/default/aiAuthoringBundles/KenAI_Customer_Support/KenAI_Customer_Support.agent` — Service Agent .agent shape
- `Projects/04-2026/oil-and-gas-workshop-2/force-app/main/default/applications/Kenton_Customer_Support.app-meta.xml` — `actionOverrides` pattern
- `Projects/04-2026/oil-and-gas-workshop-2/force-app/main/default/flexipages/Kenton_Customer_Support_Home.flexipage-meta.xml` — `flexipage:richText` button pattern
- `Projects/05-2026/assist-110258-comfandi/scripts/visual-verify.sh` — headless Chrome verification

---

## Verification (how we know we're done)

- [ ] **Phase 1:** `sf org list metadata -m AiAuthoringBundle -o Electra_Auto` returns no error (Atlas confirmed)
- [ ] **Phase 4:** All Apex tests green, ≥75% coverage
- [ ] **Phase 4.5:** All 4 flows execute via `sf flow execute` against seeded data with expected outputs
- [ ] **Phase 5:** `sf agent test run` passes 4 canonical + ≥75% of 30 adversarial prompts; visual verification screenshot shows agent in Setup
- [ ] **Phase 6c:** Table-RAG battery ≥7/10 PASS (or tables converted to prose if <7)
- [ ] **Phase 7:** As a guest in incognito, chat widget loads on the public site URL; all 4 canonical prompts work end-to-end
- [ ] **Phase 9:** Drift round 1 reduces `docs/GUIA_DRIFT.md` findings to "all 5 ejercicios complete on a fresh OrgFarm pull without facilitator intervention"
- [ ] **Phase 10:** `sf project retrieve start -x manifest/package.xml --target-metadata-dir pkg-verify` returns clean diff vs source tree
- [ ] **Phase 11:** All 7 `skill-creation/*.md` files populated with content harvestable by a future Claude session
- [ ] **Phase 12:** `sf org list` shows no leftover Electra-build aliases; final git commit pushed
