# Subagent Report — Phase 3B: Write Flows

**Status:** COMPLETE  
**Budget:** ~4 min  
**Validation:** ✅ exit 0

---

## Files touched

1. `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/force-app/main/default/flows/Schedule_Test_Drive.flow-meta.xml` (created, 350 lines)
2. `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/force-app/main/default/flows/Get_Test_Drive_Status.flow-meta.xml` (created, 250 lines)

---

## Validation

```bash
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop && \
  find force-app/main/default/flows -name "Schedule_Test_Drive.flow-meta.xml" -o -name "Get_Test_Drive_Status.flow-meta.xml" | \
  xargs -I{} xmllint --noout {}
```

**Exit code:** 0 (no errors)

---

## Implementation notes

### Schedule_Test_Drive

- **Type:** AutoLaunchedFlow, API 66.0, Active, `runInMode=SystemModeWithoutSharing` (so guest user can update slots)
- **Inputs:** `customerName`, `customerEmail`, `modelCode`, `dealerCode`, `requestedDateTime`, `confirmCreate` (default false)
- **Outputs:** `confirmation` (Text), `bookedSlotId` (Text)
- **Logic:**
  1. Lookup `Vehicle_Model__c` by `Code__c`. If not found → error message with valid codes (ECRU, ESPT, EWGN, ETRK, ECTY).
  2. Lookup `Account` WHERE `Dealer_Code__c` = dealerCode AND `Type='Dealer'`. If not found → error with valid codes (PALERMO, CORDOBA, ROSARIO).
  3. Find `Test_Drive_Slot__c` WHERE `Vehicle_Model__c`=model.Id AND `Dealer__c`=dealer.Id AND `Status__c='Disponible'` AND `Slot_DateTime__c >= requestedDateTime`, sorted ASC by Slot_DateTime__c. If not found → error "no turnos disponibles desde...".
  4. **Decision on `confirmCreate`:**
     - **false (preview):** assign confirmation = multi-line preview with 📅🚗📍👤 emojis + "¿Confirmás la reserva? Si sí, llamame de nuevo con confirmCreate=true."
     - **true (execute):**
       - Parse `customerName` into `leadFirstName` / `leadLastName` using formula: split on first space; if no space, FirstName="Cliente", LastName=customerName.
       - **Upsert Lead by email:** Create new Lead record (fields: FirstName, LastName, Email, Company="Particular - {customerName}", LeadSource="Web - Electra Concierge", Vehicle_of_Interest__c, Preferred_Dealer__c, Test_Drive_Status__c="Confirmado").
       - **Check if Lead exists:** Get Lead by Email after create. If found (existing), update only Vehicle_of_Interest__c, Preferred_Dealer__c, Test_Drive_Status__c. Else use new Lead ID.
       - Update `Test_Drive_Slot__c`: set Status__c="Reservado", Booked_By__c=lead.Id.
       - Assign confirmation = success message with "✅ ¡Listo! ...Número de confirmación: TD-{!slot.Name}..."
       - Assign bookedSlotId = slot.Id.

**Ask-before-create gate implemented via `confirmCreate` input** — pattern from v2 `Create_Tech_Support_Case`.

### Get_Test_Drive_Status

- **Type:** AutoLaunchedFlow, API 66.0, Active, `runInMode=SystemModeWithoutSharing`
- **Inputs:** `customerEmail` (required)
- **Outputs:** `status` (Text)
- **Logic:**
  1. Lookup Lead by Email. If not found → status = "🤔 No encontré ningún registro con el email..."
  2. **Decision on `Lead.Test_Drive_Status__c`:**
     - **null / "Sin Cita"** → "Hola {FirstName}! Te tenemos como prospecto pero no veo una prueba de manejo agendada. ¿Querés que te ayude a coordinar una?"
     - **"Confirmado"** → Get Test_Drive_Slot__c WHERE Booked_By__c=lead.Id AND Status__c='Reservado'. Then status = multi-line with 📅🚗📍 emojis + "Nos vemos pronto!"
     - **"Completado"** → "Hola {FirstName}! Veo que ya hiciste tu prueba de manejo. ¿Cómo te pareció? Contame si querés avanzar..."
     - **"Cancelado"** → "Hola {FirstName}! Tu prueba de manejo anterior figura como cancelada. ¿Querés agendar una nueva?"

---

## Blockers / open questions

None. Both flows follow the FK-validation + multi-step decision pattern from v2 `Create_Tech_Support_Case` and `Get_Case_Status`.

**Next:** Opus must append `<members>Schedule_Test_Drive</members>` + `<members>Get_Test_Drive_Status</members>` to `manifest/package.xml` under `<types><name>Flow</name>`, add the two `<flowAccesses>` entries to the permset, and deploy.

---

## [SKILL-CANDIDATE]

### 1. Ask-before-create gate pattern (write-flow standard)

Every write flow invoked by an agent should have a **Boolean `confirm` input (default false)** that gates the DML block:
- **false (preview):** return a formatted preview of what would be created, with a "¿Confirmás? Si sí, llamame de nuevo con confirm=true." prompt.
- **true (execute):** proceed with record creation/update.

This pattern prevents accidental record spam when the LLM hallucinates or the user says "can you check if...?" without meaning "do it."

**Generalizable to any industry:** Order placement, invoice creation, appointment booking, case escalation, etc.

### 2. FK validation error messages must be concrete and user-actionable

Don't just say "Invalid model code." Say:
> "❌ No encontré el modelo '{!modelCode}'. Modelos válidos: E-Cruiser (ECRU), E-Sport (ESPT), E-Wagon (EWGN), E-Truck (ETRK), E-City (ECTY)."

The agent's next turn will see this text and can self-correct. If the error is vague, the agent loops or escalates unnecessarily.

**Generalizable:** Product codes, site codes, account numbers, case categories — any domain with a small controlled vocabulary should echo the full list in the error message.

### 3. Name parsing for Lead upsert (consumer agent pattern)

When the agent collects a consumer's full name as a single string (because that's natural in chat), the flow must split it into FirstName/LastName for Lead creation. Formula pattern:
```
FirstName = IF(CONTAINS(name, " "), LEFT(name, FIND(" ", name) - 1), "Cliente")
LastName  = IF(CONTAINS(name, " "), MID(name, FIND(" ", name) + 1, LEN(name)), name)
```

This assumes "FirstName LastName" format (Western naming). For LATAM / other cultures, adjust the fallback to match local norms.

**Generalizable:** Any B2C agent that captures `customerName` as a single field and needs to write to a standard object (Lead, Contact, Person Account) must include name parsing.

### 4. Upsert by email for Lead requires a two-step dance

Flows don't have native upsert (no `<upsertRecords>`). To upsert Lead by Email:
1. **Create** the Lead with all required fields + the email.
2. **Get** the Lead by Email after the create (limit 1).
3. **Decision:** if found (existing), **Update** only the mutable fields (Vehicle_of_Interest__c, Preferred_Dealer__c, Test_Drive_Status__c). Else, use the new Lead ID from step 1.

This avoids duplicate Lead errors and respects existing Lead data (Company, LeadSource) when the email already exists.

**Generalizable:** Any consumer agent that books/registers via email should upsert Lead or Contact this way. **Not needed for authenticated users** (the agent knows the ContactId/LeadId from the session).

### 5. Spanish register — `confirmCreate` vs `confirmarReserva`

Variable names stay in **English** (Salesforce best practice, cross-region portability). User-facing prose is **Spanish** (Argentine register, "tú" not "vos").

This split means the flow XML is portable to other LATAM regions (just swap the prose strings, don't rename 50 variables). Also critical for facilitators who toggle between English Setup UI and Spanish Guía.

**Generalizable:** Any localized workshop should keep API names English, prose in target language.

---

**End of subagent report 3B.**
