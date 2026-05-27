# COMPRESSION — Phase 2 → Phase 3 handoff

**Phase 2 status:** COMPLETE. 3 custom objects + permset + app + flexipage deployed to `Electra_Auto`. Ready for Phase 3 (flows).

## What was deployed (verified via `sf data query EntityDefinition` + `sf org list metadata`)

| Type | Members | Status |
|---|---|---|
| CustomObject | `Vehicle_Model__c`, `Test_Drive_Slot__c`, `Vehicle_Inventory__c` | ✅ Created |
| CustomField | 9 on Vehicle_Model__c, 6 on Test_Drive_Slot__c, 4 on Vehicle_Inventory__c, 3 on Lead, 2 on Account | ✅ Created |
| ListView | All on each custom object | ✅ Created |
| CustomTab | Vehicle_Model__c, Test_Drive_Slot__c, Vehicle_Inventory__c | ✅ Created |
| PermissionSet | `Electra_Auto_Workshop_Participant` (object/field perms only — no flow/class refs yet) | ✅ Created |
| FlexiPage | `Electra_Sales_Home` (4 regions, brand-styled `flexipage:richText`) | ✅ Created |
| CustomApplication | `Electra_Sales_Studio` (actionOverride routing standard-home → flexipage) | ✅ Created |

## What was NOT deployed (cut during Phase 2 audit)

- **Event field overrides** (`Event.Vehicle_Model__c`, `Event.Dealer__c`, `Event.Confirmation_Number__c`) + Event tab/permset entries — Atlas trial rejected `Event` standard-object extension with `Entity Enumeration Or ID: bad value for restricted picklist field: Event`. Activities feature dep missing in this trial. **Phase 3 impact:** `Schedule_Test_Drive` flow will store the booking on `Lead.Test_Drive_Status__c` + `Test_Drive_Slot__c.Status__c=Reservado` + `Test_Drive_Slot__c.Booked_By__c` instead of creating an Event record. Confirmation number stays in `Test_Drive_Slot__c` (we'll add a `Confirmation_Number__c` field on Slot in Phase 3 if needed) or as flow output only.
- **Permset entries for required fields** (`Vehicle_Model__c.Code__c`, `Test_Drive_Slot__c.Slot_DateTime__c/Vehicle_Model__c/Dealer__c/Status__c`, `Vehicle_Inventory__c.Vehicle_Model__c/Dealer__c`) — required fields cannot have explicit `fieldPermissions` entries; `Required = true` already grants edit access universally. Stripped from permset.
- **Permset entries for forward-referenced classes/flows** (`Electra_Workshop_Data_Seeder/Reset`, all 6 flows) — referenced metadata doesn't exist yet. Will add back in Phase 3 (flow grants) and Phase 4 (class grants) via incremental permset re-deploys.

## [SKILL-CANDIDATE]

- **`Event` is fragile in fresh Atlas trials.** Skip Activity-based booking metadata in workshops; lean on Lead status fields instead. Add to interview template: "Will the agent need to create Calendar Events, or can it use a custom record type?"
- **Permset must come AFTER its referenced metadata, not with it.** Deploy permset twice: once at the metadata-type wave with object/field perms only; once after flows + Apex with the flow/class entries appended. Three-strike-rule on first deploy: strip the unresolved refs, deploy, then re-author the full file post-flows.
- **Required fields = no permset entries.** `<required>true</required>` on a CustomField means it grants edit access universally; an explicit `<fieldPermissions>` entry on it triggers `You cannot deploy to a required field`. Filter required fields out of the permset author step.
- **`sf project deploy validate` always runs Apex tests in production-style mode**, even when nothing in the manifest is Apex. For trial orgs use `sf project deploy start` directly — it skips test runs when no Apex is being deployed.
- **`sf` JSON output is contaminated by the @salesforce/cli update warning** when piped to `python3 -c "import json"`. Use `tail` first or `--no-truncate` is irrelevant — pipe through `tr -d '\033[0-9;]*[a-zA-Z]'` to strip ANSI, or just trust the human-readable output and `grep` for state markers.

## Phase 3 dispatch contract (3 Sonnet subagents in parallel)

### Sonnet A — read flows
- Folder: `force-app/main/default/flows/Get_Vehicle_Catalog.flow-meta.xml` + `force-app/main/default/flows/Get_Vehicle_Detail.flow-meta.xml`
- Inputs/outputs:
  - `Get_Vehicle_Catalog`: input `segmentFilter` (Text, optional, "Sedan"/"Pickup"/etc); output `vehicleSummaries` (Text — formatted multi-line summary of `Active__c=true` vehicles, sorted by `Position__c`)
  - `Get_Vehicle_Detail`: input `modelCode` (Text, required); output `detail` (Text — full spec sheet for that model)
- Pattern: autolaunched flow, Get Records → Loop → Decision → Assign-string with `\n` joins
- Reference shape: `Projects/04-2026/oil-and-gas-workshop-2/force-app/main/default/flows/Get_Invoice_List.flow-meta.xml` (DO NOT copy verbatim)
- Validation: `xmllint --noout` on each .flow-meta.xml

### Sonnet B — write flows
- Folder: `force-app/main/default/flows/Schedule_Test_Drive.flow-meta.xml` + `force-app/main/default/flows/Get_Test_Drive_Status.flow-meta.xml`
- `Schedule_Test_Drive`: inputs `customerName/customerEmail/modelCode/dealerCode/requestedDateTime`; output `confirmation` (Text). Logic: Get matching `Test_Drive_Slot__c` (Status=Disponible, Vehicle_Model__c=lookup-by-Code, Dealer__c=lookup-by-Dealer_Code__c, Slot_DateTime__c≥requestedDateTime). If found → upsert Lead by email (set Vehicle_of_Interest__c, Preferred_Dealer__c, Test_Drive_Status__c=Confirmado), update Slot (Status=Reservado, Booked_By__c=Lead.Id), return confirmation `"TD-<slot-name>"`. **Ask-before-create gate via input `confirmCreate` (Boolean, default false)** — if false, return preview text only.
- `Get_Test_Drive_Status`: input `customerEmail`; output `status` (Text). Logic: Find Lead by email, find related Test_Drive_Slot via Booked_By__c, return formatted status.
- Reference shape: `oil-and-gas-workshop-2/.../Create_Tech_Support_Case.flow-meta.xml`

### Sonnet C — screen flows
- Folder: `force-app/main/default/flows/Seed_Workshop_Data.flow-meta.xml` + `force-app/main/default/flows/Reset_Workshop_Data.flow-meta.xml`
- Each = 3-screen flow: Confirm screen → Apex action (`Electra_Workshop_Data_Seeder.execute` / `Electra_Workshop_Data_Reset.execute`) → Result screen
- Apex classes don't exist yet — flows will deploy fine, fail at runtime until Phase 4 deploys classes
- Reference shape: `oil-and-gas-workshop-2/.../Seed_Workshop_Data.flow-meta.xml`

### Opus aggregation (after all 3 reports return)
1. `git status` + `git diff --stat`
2. `xmllint` validation across all 6 flows
3. Append flow members to `manifest/package.xml`:
   ```xml
   <types>
     <members>Get_Vehicle_Catalog</members>
     <members>Get_Vehicle_Detail</members>
     <members>Schedule_Test_Drive</members>
     <members>Get_Test_Drive_Status</members>
     <members>Seed_Workshop_Data</members>
     <members>Reset_Workshop_Data</members>
     <name>Flow</name>
   </types>
   ```
4. Re-add the 6 `<flowAccesses>` entries in permset
5. `sf project deploy start -x manifest/package.xml -o Electra_Auto --ignore-conflicts`
6. Smoke test each read flow: `sf flow execute -n Get_Vehicle_Catalog -o Electra_Auto` (will return empty since no seed data yet — that's expected)

## Resume command (next session, if a fresh session is needed)

```
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
claude --resume
```

Prompt:
> Resume Electra Automotive Workshop. Phase 2 complete (see `docs/COMPRESSION_phase2_to_phase3.md`). Read `CLAUDE.md` + this compression doc, then dispatch 3 Sonnet subagents per the Phase 3 contract. Org alias `Electra_Auto`.
