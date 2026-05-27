# Subagent Report 3C — Screen Flows (Seed + Reset)

**Status:** ✅ COMPLETE
**Budget:** ~2 min (well under 5 min)
**Files touched:** 2 flow-meta.xml files

---

## Files Created

1. `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/force-app/main/default/flows/Seed_Workshop_Data.flow-meta.xml`
   - Type: Screen Flow (processType=Flow)
   - API version: 66.0
   - Status: Active
   - Run mode: SystemModeWithoutSharing
   - 3 screens: Confirm → Apex action → Result
   - Apex action: `Electra_Workshop_Data_Seeder` (no inputs, auto-store outputs)
   - Spanish labels (Argentine register): "Sembrar Datos del Taller Electra", button "Sembrar"
   - Confirm screen: brand-styled header with 🌱 emoji, explains the 5 models + 3 dealers + ~20 slots + 3 sample leads
   - Result screen: displays `{!Run_Seeder.summary}` in main DisplayText, conditionally displays `{!Run_Seeder.errorMessage}` in red if non-null
   - References Electra agent: "Ya podés empezar a chatear con el agente Electra Auto Concierge"

2. `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/force-app/main/default/flows/Reset_Workshop_Data.flow-meta.xml`
   - Type: Screen Flow (processType=Flow)
   - API version: 66.0
   - Status: Active
   - Run mode: SystemModeWithoutSharing
   - 4 elements: Confirm screen → Decision node (validates checkbox) → Apex action → Result screen
   - Apex action: `Electra_Workshop_Data_Reset` (no inputs, auto-store outputs)
   - Confirm screen: ⚠ warning header, facilitator-only language, **required checkbox** "Sí, entiendo lo que estoy haciendo"
   - Decision node: checks `Confirmation_Checkbox == true` before proceeding to action; loops back to Confirm if unchecked (though required=true already enforces this)
   - Result screen: same pattern as Seed (summary + conditional error in red)

---

## Validation

**Command:**
```bash
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop && find force-app/main/default/flows -name "Seed_Workshop_Data.flow-meta.xml" -o -name "Reset_Workshop_Data.flow-meta.xml" | xargs -I{} xmllint --noout {}
```

**Exit code:** 0 ✅  
**Output:** (none — validation passed silently)

Both flows are well-formed XML and conform to Flow metadata schema structure.

---

## Blockers

**None.** Both flows authored successfully.

**Phase 4 dependency note:**  
These flows reference Apex classes (`Electra_Workshop_Data_Seeder`, `Electra_Workshop_Data_Reset`) that do NOT exist yet. The flows will deploy fine (Flow metadata does not validate Apex references at deploy time), but will fail at runtime with "Apex class not found" until Phase 4 deploys the classes.

The Apex classes are expected to follow the `@InvocableMethod` pattern with:
- Class: `Electra_Workshop_Data_Seeder` (separate from Reset per "one @InvocableMethod per class" rule)
- Class: `Electra_Workshop_Data_Reset`
- Each returns a collection of Result objects with `@InvocableVariable` fields:
  - `summary` (Text) — human-readable summary of what was created/deleted
  - `errorMessage` (Text) — null if success, error detail if failure

The flows reference these outputs via `{!Run_Seeder.summary}` and `{!Run_Seeder.errorMessage}` (for Seed) and `{!Run_Reset.summary}` / `{!Run_Reset.errorMessage}` (for Reset).

---

## Differences from v2 Kenton Reference

| Aspect | v2 Kenton | v3 Electra | Rationale |
|---|---|---|---|
| API version | 62.0 | 66.0 | Electra uses 66.0 per `sfdx-project.json` |
| Run mode | (not specified) | SystemModeWithoutSharing | Required per CLAUDE.md §3 so Apex runs in system context |
| Apex class names | `Kenton_Workshop_Data_Seeder/Reset` | `Electra_Workshop_Data_Seeder/Reset` | Electra naming convention |
| Apex invocable inputs | `dummy: "go"` (Text) | (none — auto-store only) | Cleaner; the Apex methods don't need dummy inputs |
| Apex output references | `{!Run_Seeder.message}` | `{!Run_Seeder.summary}` + `{!Run_Seeder.errorMessage}` | Matches v2's `@InvocableVariable` structure (v2 has both `message` and `errorMessage`; we use `summary` + `errorMessage` to align with compression doc) |
| Reset checkbox enforcement | (none) | Required checkbox + Decision node | Harder to accidentally run reset; aligns with "facilitator-only, dangerous operation" framing |
| Confirm screen text | Kenton-specific (franchises, invoices, tech cases) | Electra-specific (5 models, 3 dealers, test-drive slots, leads) | Domain change |
| Agent reference | "KenAI Customer Support" | "Electra Auto Concierge" | Brand change |
| Emoji in headers | ❌ (v2 doesn't use emoji) | 🌱 (Seed), ⚠ (Reset) | Improves visual scan in screen flow UI; aligns with Electra brand voice (modern, friendly) |

---

## [SKILL-CANDIDATE]

### Screen Flow Patterns for Workshop Bootstrap

**Pattern: 3-screen confirm → invoke → result for idempotent seed operations**

When building a workshop data seeder as a screen flow:
- **Screen 1 (Confirm):** Explain what will be created (entity counts, domain examples), emphasize idempotence ("no duplicates if re-run"), brand the header with an emoji (🌱 for seed, ⚠ for reset)
- **Action Call:** Apex `@InvocableMethod` that returns a collection with `summary` (Text) and `errorMessage` (Text) — use `storeOutputAutomatically=true`, no manual input bindings if the Apex method is parameterless
- **Screen 3 (Result):** Display `{!ActionName.summary}` unconditionally, conditionally display `{!ActionName.errorMessage}` in red only if non-null (use `visibilityRule` with `IsNull = false` check)

**Pattern: Required checkbox + Decision node for destructive operations**

For reset/delete flows that facilitators run (but students should never accidentally trigger):
- Add a **required checkbox** on the Confirm screen: "Sí, entiendo lo que estoy haciendo" (or locale equivalent)
- Add a **Decision node** after Confirm that checks `Checkbox == true` → proceed to action; default path loops back to Confirm
- This double-gates the destructive operation (required field + explicit flow decision)
- In practice, the `isRequired=true` attribute already prevents Next until checked, so the Decision node is defense-in-depth (and makes the flow graph clearer in Flow Builder)

**Gotcha: Flow references to Apex classes don't validate at deploy time**

Flows can reference Apex classes that don't exist yet via `<actionName>ClassName</actionName>`. The deploy succeeds (Flow metadata doesn't validate Apex refs), but the flow fails at runtime with "Apex class not found" until the Apex is deployed. This is expected and allows flows + Apex to be authored in parallel (as in Phase 3 fan-out), then deployed sequentially (flows in Phase 3, Apex in Phase 4).

**Gotcha: `runInMode=SystemModeWithoutSharing` is required for flows invoking System-mode Apex**

If the Apex `@InvocableMethod` uses `Database.insert(..., AccessLevel.SYSTEM_MODE)`, the flow must declare `<runInMode>SystemModeWithoutSharing</runInMode>` (API 49.0+) or the SYSTEM_MODE elevation won't take effect. Without this, the flow runs in user context and the Apex call inherits user perms, causing CRUD/FLS violations even though the Apex itself is SYSTEM_MODE.

**Workshop-specific: Argentine Spanish register in screen text**

For LATAM workshops, screen text uses **Argentine Spanish with "tú" register** (not "vos", which is too colloquial and region-locked; not "usted", which is too formal). Examples:
- ✅ "¿Listo para sembrar?" / "Ya podés empezar a chatear"
- ❌ "¿Estás listo para sembrar?" (too Mexican)
- ❌ "¿Está listo para sembrar?" (too formal)

Keep UI element names in English ("Setup", "Agentforce Builder") because that's what students see in the actual Salesforce UI — translating those causes confusion.

**Skill application boundary:**

This pattern applies to **any industry workshop** that needs:
1. A student-facing "load demo data" flow
2. A facilitator-facing "wipe demo data" flow
3. Idempotent seed logic (re-run safe)
4. Argentine (or LATAM) Spanish localization

Reusable across Automotive, Healthcare, FSI, Retail, Energy workshops. The domain-specific parts (entity names, counts, sample records) are parameterized in the Confirm screen text and the Apex seeder logic — the flow structure itself is invariant.

---

## Next Steps (Opus orchestration)

1. Opus should read this report + the 2 parallel Sonnet A/B reports (read flows + write flows)
2. Run `git status` + `git diff --stat` to verify all 6 flows are present
3. Run `xmllint` validation across all 6 flows
4. Append all 6 flow members to `manifest/package.xml` under `<types><name>Flow</name></types>`
5. Re-add the 6 `<flowAccesses>` entries to `Electra_Auto_Workshop_Participant` permission set
6. Deploy flows + updated permset: `sf project deploy start -x manifest/package.xml -o Electra_Auto --ignore-conflicts`
7. Smoke test: `sf flow execute -n Seed_Workshop_Data -o Electra_Auto` (expected to fail with "Apex class not found" — that's normal until Phase 4)

**Phase 4 handoff:** Apex classes must implement:
- `Electra_Workshop_Data_Seeder.execute()` returning `List<SeedResult>` where `SeedResult` has `@InvocableVariable` String `summary` + String `errorMessage`
- `Electra_Workshop_Data_Reset.execute()` returning `List<ResetResult>` with same shape
- Both use `Database.insert/delete(..., AccessLevel.SYSTEM_MODE)` for bypassing user perms
- Sentinel pattern for idempotence (e.g., `SELECT Id FROM Vehicle_Model__c WHERE Code__c = 'E-CRUISER-2026' LIMIT 1` before insert)
