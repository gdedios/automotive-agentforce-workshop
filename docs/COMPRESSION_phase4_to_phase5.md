# COMPRESSION — Phase 3 + 4 + 4.5 + 6a → Phase 5 handoff

**Status:** Phases 3, 4, 4.5, 6a complete. Org `Electra_Auto` is fully seeded with 5 vehicle models, 3 dealers, 30 test-drive slots, 3 leads. All 4 agent flows verified end-to-end via `sf apex run`. 3 Spanish RAG PDFs generated. Next: Phase 5 — author the agent.

## Org alias + identity

- Alias: `Electra_Auto`
- Username: `trailsignup.2b50747127e9f2@salesforce.com`
- Org Id: `00DHp00000KQ9b7MAD`
- Atlas-confirmed (`AiAuthoringBundle` retrievable; org list metadata returned 0 errors)

## What was deployed (47 components, all green, 4/4 tests passing)

| Type | Members | Phase |
|---|---|---|
| CustomObject | Vehicle_Model__c, Test_Drive_Slot__c, Vehicle_Inventory__c | 2 |
| CustomField | 24 fields (9+6+4+3+2 across 5 objects, no Event) | 2 |
| ListView/CustomTab/PermissionSet/FlexiPage/CustomApplication | per object + Electra_Sales_Studio | 2 |
| Flow (AutoLaunched) | Get_Vehicle_Catalog, Get_Vehicle_Detail, Schedule_Test_Drive, Get_Test_Drive_Status | 3 |
| Flow (Screen) | Seed_Workshop_Data, Reset_Workshop_Data | 4 |
| ApexClass | Electra_Workshop_Data_Seeder, Electra_Workshop_Data_Reset, Electra_Workshop_Data_Test | 4 |

## Phase 4.5 smoke test results (all green)

```
Get_Vehicle_Catalog        → 521-char Spanish catalog
Get_Vehicle_Detail (ECRU)  → 250-char ECRU detail (E-Cruiser specs)
Get_Test_Drive_Status      → Sofía: Confirmado, Tomás: Completado, unknown: Not-found
Schedule_Test_Drive        → preflight + write path both green; FK validation rejects bogus model code
```

Seed: `5 modelos / 3 concesionarias (Palermo, Córdoba, Rosario) / 30 turnos / 3 leads (Sofía Vega Confirmado, Tomás Iriarte Completado, Camila Ruiz Sin Cita)`. Sofía's slot is auto-booked (Status=Reservado, Booked_By__c=Sofía).

## Phase 6a artifacts (3 Spanish PDFs ready for Data Library upload)

- `data/seed-pdfs/Electra-Catalogo-Vehiculos-Argentina.pdf` (7 pages, 18 KB, 2 tables)
- `data/seed-pdfs/Electra-Politicas-de-Garantia.pdf` (6 pages, 16 KB, 2 tables, 9 FAQs)
- `data/seed-pdfs/Electra-Guia-Carga-y-Mantenimiento.pdf` (6 pages, 17 KB, 2 tables, 8 FAQs)

Generated via `scripts/generate_pdfs.py` using reportlab. **NOT** Chrome — Chrome headless hung on this MDM-enrolled laptop after the first PDF (enrollment-domain annotation appears in Chrome args). Reportlab path is reliable + reproducible.

## [SKILL-CANDIDATE]

- **`@InvocableMethod` cannot accept user-defined inner-class types.** Apex compiles the class fine, but deploy rejects with `InvocableMethod methods do not support parameter type of List<X.Empty>`. Use `List<String> inputs` (a placeholder param the flow ignores) instead of an `Empty` marker class. Same fix on Seeder + Reset.
- **Flow XML element ordering is alphabetical-by-element-name AND contiguous.** Sonnet authoring drifts toward "logical flow order" which deploys with `Element decisions is duplicated at this location` errors. `scripts/reorder_flow_xml.py` is the recovery script — apply post-authoring before deploy.
- **`Position__c` (LongTextArea) is not sortable in flow Get Records.** Use a Text/Text-area field for sort keys. Substituted `Code__c` for `Position__c` in `Get_Vehicle_Catalog`.
- **Cross-object dotted references in flow assignments need `<queriedFields>` AND** sometimes still fault if the lookup uses `assignNullValuesIfNoRecordsFound=true` and the parent isn't loaded. Avoid `{!Get_Booked_Slot.Vehicle_Model__r.Name}` in messages — query the field directly or simplify the message. (This was the Get_Test_Drive_Status fault.)
- **MDM-enrolled Chrome hangs on `--print-to-pdf` after first call.** Symptom: first PDF works, second hangs forever, kill -9 needed. Workaround: reportlab Python path. Brand colors apply via reportlab Paragraph styles. Add to MODEL_SWITCH_BOUNDARIES: PDFs from markdown → reportlab on Mac MDM, Chrome on clean machines.
- **Schedule_Test_Drive ask-before-create gate via Boolean input** is the right shape: agent first calls with `confirmCreate=false`, gets the preview, asks the user, then calls with `confirmCreate=true` to commit. This pattern is reusable for any write-flow in agents — preview vs commit phase.

## Phase 5 dispatch contract (Opus single-thread, NOT fanned out)

Per `CLAUDE.md` rule §3.7: agent authoring is sequential. The `@knowledge.rag_feature_config_id` AQWK gotcha and the publish-vs-Builder commit dance both demand single-threading.

### 5.1 — Generate authoring bundle skeleton

```
sf agent generate authoring-bundle --no-spec \
  --name "Electra Auto Concierge" \
  --api-name ElectraAI_Auto_Concierge \
  -o Electra_Auto
```

### 5.2 — Hand-author `.agent` YAML

- 3 topics + 4 flow actions:
  1. **Vehicle Discovery** → `Get_Vehicle_Catalog`, `Get_Vehicle_Detail`
  2. **Test Drive Scheduling** → `Schedule_Test_Drive` (ask-before-create gate via `confirmCreate` boolean)
  3. **FAQ + Status** → `Get_Test_Drive_Status` + Data Library RAG (added in 6b, NOT here)
- Spanish "tú" register (matching v2 voice). English UI labels in instructions (e.g. "Use the catalog action when…").
- Hard-wrap all Reasoning Instructions to ≤140 chars per line (workspace CLAUDE.md Drift 2.19 lesson).
- `agent_type: "AgentforceServiceAgent"` + `default_agent_user: <facilitator username>` — the username `trailsignup.2b50747127e9f2@salesforce.com` is the facilitator.
- **Strip the AQWK action from `.agent` source** but keep `knowledge:` block (workspace CLAUDE.md `feedback_agent_publish_knowledge_token.md`). AQWK gets added Phase 6b via Builder commit.
- FK validation already lives in the Schedule flow → don't duplicate in agent instructions.
- Anti-fabrication: instruct the agent to NEVER invent VINs, dealer codes, or model codes — only use Catalog/Detail outputs.

### 5.3 — Validate + preview + publish + activate

```
sf agent validate authoring-bundle -o Electra_Auto
sf agent preview ...   # iterate against 4 canonical Spanish prompts
sf agent publish authoring-bundle -o Electra_Auto
sf agent activate ...
```

**4 canonical Spanish prompts:**
1. "Hola, soy Sofía Vega — quiero probar el E-Cruiser este sábado en Palermo."
2. "¿Qué modelos tienen disponibles en sedán familiar bajo 50 millones de pesos?"
3. "Mi email es sofia.vega@example.com.ar — ¿cómo va mi prueba de manejo?"
4. "¿Cuánto tarda en cargarse el E-Sport en una estación rápida?" (RAG FAQ — won't work until Phase 6b)

### 5.4 — BLOCKING acceptance gate

Visual verification via headless Chrome (adapted from `Projects/05-2026/assist-110258-comfandi/scripts/visual-verify.sh`). If both visual + Tooling API fall back fail → **PAUSE AND ASK USER**, do not proceed past this point overnight.

### 5.5 — Author `aiEvaluationDefinitions/ElectraAI_Auto_Concierge_Tests`

- 4 canonical + 30 adversarial prompts (off-topic, prompt-injection in test-drive description, language switch, fake VINs)
- `sf agent test run` → must pass 4 canonical + ≥75% of 30 adversarial

## Outstanding / deferred until user awakes

- **Phase 5.4 visual gate:** requires user-driven Chrome session; CANNOT be safely automated overnight on this MDM laptop (per Phase 6a Chrome hang). Pause for user.
- **Phase 6b Data Library wiring:** sequential UI clicks in Setup. Cannot be automated.
- **Phase 7 Experience Cloud + MIAW:** blocked on second visual-verify org user has not provided.

## Resume command

```
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
claude --resume
```

Prompt:
> Resume Electra Automotive Workshop. Phase 4 + 4.5 + 6a complete (see `docs/COMPRESSION_phase4_to_phase5.md`). All 47 components deployed; 4/4 tests pass; 4 flows smoke-tested green; 3 RAG PDFs generated. Next: Phase 5 agent authoring (sequential, Opus-only). Org alias `Electra_Auto`.
