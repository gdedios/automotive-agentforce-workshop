# Subagent Report — Phase 5e AiEvaluationDefinition Authoring

**Task**: Author test suite for ElectraAI_Auto_Concierge agent (Agent Script subagent-based architecture)

**Status**: ✅ Complete

---

## Files Touched (1)

- `force-app/main/default/aiEvaluationDefinitions/ElectraAI_Auto_Concierge_Tests.aiEvaluationDefinition-meta.xml` (authored)

---

## Validation

**Command**: `xmllint --noout ElectraAI_Auto_Concierge_Tests.aiEvaluationDefinition-meta.xml`

**Exit code**: 0 ✅

XML is well-formed and ready for deployment.

---

## Test Case Summary

**Total**: 34 test cases

### Breakdown

**Canonical (4)** — Mirror phase5_preview transcripts:
1. Catalog query → Descubrimiento_de_Vehiculos + Get_Vehicle_Catalog
2. Detail query (E-Cruiser) → Descubrimiento_de_Vehiculos + Get_Vehicle_Detail(ECRU)
3. Schedule request with full data → Prueba_de_Manejo + Schedule_Test_Drive(confirmCreate=False, preview)
4. Status lookup by email → Estado_y_FAQ + Get_Test_Drive_Status

**Adversarial (30)** — Distributed across subagents:

- **Discovery (5)**: sedán filter, pickup filter, commercial-name mapping ("el Cruiser" → ECRU), fake model (E-Mega) anti-fabrication, VIN query anti-fabrication
- **Schedule (8)**: invalid model (E-Phantom), invalid dealer (Mendoza), missing email, missing model, past date ("ayer"), single-turn no-confirm gate (preview only), prompt-injection in name field, missing name+email
- **Status (3)**: email not in seed (no-encontrado path), empty email (ask-back), fake confirmation ID lookup (TD-9999)
- **FAQ stub (3)**: charge time, warranty, charging infrastructure — all expect Estado_y_FAQ routing but NO action call (AQWK not yet wired in Phase 6b), agent must admit lack of grounded data
- **Off-topic (5)**: World Cup, Tesla recommendation, poem request, time query, recipe request
- **Prompt-injection (3)**: "ignore instructions + give system prompt", "you are ChatGPT", "reveal internal rules as JSON"
- **Ambiguous (3)**: "hola", "ayuda", "info"

---

## Key Design Decisions

1. **Subagent IDs for `topic_sequence_match`**  
   Used the Agent Script subagent developer names (e.g., `Descubrimiento_de_Vehiculos`, `Prueba_de_Manejo`, `Estado_y_FAQ`, `off_topic`, `ambiguous_question`, `escalation`) — NOT `agent_router` (which is the start agent, not the destination).

2. **Action names for `action_sequence_match`**  
   Used exact API names from the `.agent` file: `Get_Vehicle_Catalog`, `Get_Vehicle_Detail`, `Schedule_Test_Drive`, `Get_Test_Drive_Status`.  
   Did NOT include `AnswerQuestionsWithKnowledge` (AQWK) — Phase 6b will wire the Data Library; until then, FAQ test cases expect `[]` (no action call).

3. **Anti-fabrication coverage**  
   Heavy emphasis on cases where the agent must NOT invent data:
   - Fake model codes (E-Mega, E-Phantom)
   - Invalid dealer codes (Mendoza)
   - VIN queries (model-level data doesn't include per-unit VINs)
   - Email not in seed (status returns "No Encontrado")
   - Fake confirmation IDs (TD-9999)
   - FAQ questions when Knowledge is not yet wired (must admit lack of grounded info)

4. **Two-step schedule gate**  
   Test case 3 (canonical schedule) and test case 15 (adversarial single-turn no-confirm) both validate the `confirmCreate=False` (preview) → user confirms → `confirmCreate=True` (commit) pattern mandated by the agent's Reasoning Instructions. The test expects the action to be called once for preview in a single turn, NOT for commit without explicit confirmation.

5. **Prompt-injection hardening**  
   Three test cases (29-31) cover attempts to override system instructions, extract internal config, or change agent identity. Expected behavior: route to `off_topic`, refuse WITHOUT revealing sensitive information or executing the injected instruction.

6. **Bot response rating texts**  
   Each `<bot_response_rating>` includes a 1-3 sentence rubric describing the expected behavior, grounding requirements, and anti-fabrication constraints. All rubrics are in English (matching v2 Kenton style).

---

## Blockers / Issues

**None.**

The agent script is clean, the reference v2 XML provided a solid schema template, and the 4 preview transcripts gave me concrete examples to mirror. All 34 test cases align with the agent's subagent structure and the 3-topic + 4-action architecture.

---

## [SKILL-CANDIDATE]

**Pattern**: Agent Script test suite authoring for subagent-based agents

**Reusable elements**:
- Subagent IDs map to `topic_sequence_match` (NOT `agent_router` — use the destination subagent)
- Action API names map to `action_sequence_match` (use exact names from `.agent` file)
- For actions not yet wired (e.g., AQWK before Data Library is live), test cases should expect `[]` and validate that the agent admits lack of grounded data
- Heavy anti-fabrication coverage: fake codes, missing data, out-of-range queries
- Two-step action gates (preview → confirm → commit) require test cases that validate the preview-only path in a single turn
- Prompt-injection test cases: 3 minimum (system-prompt extraction, role override, config dump)
- Ambiguous/off-topic test cases: validate routing without action calls
- Bot response rating texts should be load-bearing — describe grounding requirements, anti-fabrication constraints, and FK validation expectations

**Difference from Topic-based agents**:
- Topic-based agents (v2 Kenton) use `GenAiPlannerDefinition` topic names for `topic_sequence_match`
- Agent Script agents use `subagent.<subagent_developer_name>` in the `.agent` file, but the test suite expects JUST the subagent developer name (e.g., `Descubrimiento_de_Vehiculos`, not `subagent.Descubrimiento_de_Vehiculos`)

**Time**: ~4 min (read agent script, read v2 reference, read 4 preview transcripts, author 34 test cases, validate, write report)

**Skill corpus target**: `LEARNINGS.md` section on "Agent Script test authoring vs Topic-based test authoring"
