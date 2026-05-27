# Subagent Report 3A — Read Flows (Get_Vehicle_Catalog + Get_Vehicle_Detail)

**Status:** ✅ COMPLETE  
**Budget used:** ~2 min, ~40K tokens  
**Strike count:** 0

---

## Files Touched

Both files created from scratch (Electra-specific naming, no verbatim copy from v2):

1. `force-app/main/default/flows/Get_Vehicle_Catalog.flow-meta.xml`
2. `force-app/main/default/flows/Get_Vehicle_Detail.flow-meta.xml`

---

## Validation

**Command:**
```bash
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop && \
find force-app/main/default/flows -name "Get_Vehicle_*.flow-meta.xml" -exec xmllint --noout {} \;
```

**Exit code:** 0  
**Result:** Both flows pass XML schema validation

---

## Implementation Summary

### Get_Vehicle_Catalog.flow-meta.xml
- **Type:** AutoLaunchedFlow, API 66.0, Active
- **Input:** `segmentFilter` (Text, optional) — filters by `Vehicle_Model__c.Type__c` (picklist values: "Sedan family", "Coupé", "Wagon / station", "Pickup", "Hatchback compact")
- **Output:** `vehicleSummaries` (Text) — formatted multi-line catalog
- **Logic:**
  1. Decision: has segmentFilter? → two branches (Get_Filtered_Models vs Get_All_Models)
  2. Both queries filter `Active__c=true`, sort by `Position__c ASC`
  3. Merge collections → Decision: has results?
  4. If yes → Loop with Assign building:
     ```
     • {Name} ({Code}) — {Type}
       Autonomía {Range} km · 0–100 en {Accel}s · carga {Charging} min · ARS ${Price}
     ```
  5. If no → "No encontré modelos que coincidan con tu búsqueda. ¿Querés ver todo el catálogo?"
  6. Prefix with "📋 Catálogo Electra:\n\n" on success

### Get_Vehicle_Detail.flow-meta.xml
- **Type:** AutoLaunchedFlow, API 66.0, Active
- **Input:** `modelCode` (Text, required)
- **Output:** `detail` (Text) — full spec sheet or error
- **Logic:**
  1. Get Records on `Vehicle_Model__c` WHERE `Code__c == modelCode` (limit 1)
  2. Decision: found?
  3. If no → "No encontré el modelo \"{modelCode}\" en nuestro catálogo. Probá con E-Cruiser, E-Sport, E-Wagon, E-Truck o E-City."
  4. If yes → Build detail string:
     ```
     🚗 {Name} ({Code})
     Tipo: {Type}
     Autonomía: {Range} km (ciclo combinado WLTP)
     Aceleración 0–100 km/h: {Accel} segundos
     Carga rápida (10–80%): {Charging} min a {Power} kW
     Precio: ARS ${Price}

     ¿Querés agendar una prueba de manejo o ver otro modelo para comparar?
     ```

Both flows follow the v2 shape reference pattern (Get Records → Loop → Assign string buffer) but use Electra-specific:
- Object/field API names (`Vehicle_Model__c.Code__c` not `Invoice__c.Invoice_Number__c`)
- Argentine Spanish prose ("Autonomía", "¿Querés agendar…?")
- Model codes (ECRU, ESPT, EWGN, ETRK, ECTY)
- Domain-specific fields (Range_Km__c, Charging_Time_Min__c, etc.)

---

## Blockers

None.

---

## [SKILL-CANDIDATE]

### Pattern: AutoLaunchedFlow string buffer construction for LLM consumption

**Context:** Agent actions that return formatted text summaries need flows that build multi-line strings via Loop → Assign-with-Add pattern. This is more maintainable than formula concatenation when strings include newlines and field references.

**Shape:**
1. Get Records (collection, sorted)
2. Decision: collection IsNull?
3. If not null → Init buffer with header → Loop → Append lines via Assign-Add → Finalize buffer
4. If null → Set "not found" message

**Key XML attributes:**
- `<processType>AutoLaunchedFlow</processType>` (NO `<runInMode>`)
- `<assignmentItems>` with `<operator>Add</operator>` for concatenation
- String literals can contain `\n` for line breaks (Flow preserves them)
- Loop uses `<collectionReference>` + `<nextValueConnector>` + `<noMoreValuesConnector>`

**When to use:** Agent actions that return > 1 record as formatted text (catalog, list, multi-line detail). Alternative (formula) breaks at ~100 chars or when newlines + field refs both needed.

**Industry-agnostic gotcha:** Do NOT use `<isOutput>true</isOutput>` on the buffer variable itself — only on the final output variable. Buffer is internal.

**Automotive-specific nuance:** The 5 model codes (ECRU/ESPT/EWGN/ETRK/ECTY) should be in the error message for Get_Vehicle_Detail — helps the agent self-correct when user misspells or fabricates a code.

**Workshop pedagogy angle:** This flow can be shown in the Guía as a "no-code data retrieval" example — students see it in Lightning Flow Builder UI, which demystifies how agents call Salesforce data without writing Apex.
