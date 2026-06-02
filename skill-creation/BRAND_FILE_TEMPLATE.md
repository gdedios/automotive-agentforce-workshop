# Brand File Template — `docs/<BRAND>_BRAND.md`

> **Populated continuously.** Treat this file as the *schema* for any future industry's brand file. After Electra completes, this becomes `assets/brand-file-template.md` in the skill.
>
> The schema is derived from `docs/ELECTRA_BRAND.md`. Sections marked "REQUIRED" are non-negotiable; sections marked "OPTIONAL" stay only when relevant to the surface.

---

## Schema (sections required for any brand file)

### REQUIRED — Header
- One-line: who is the brand, what's the use case at a glance
- One-line voice descriptor

### REQUIRED — Color palette
Table of 3-5 colors with role, hex, and explicit usage on Salesforce surfaces (Lightning App brand color, LWR site primary, button bg, body text on each background, AAA-confirmed contrast).

### REQUIRED — Typography
System-stack-friendly fonts only (no licensed font drops in `force-app/`). Headings + body + code/data stacks.

### OPTIONAL — Logo + visual motifs
- Wordmark format (inline SVG vs ContentAsset PNG)
- Hero photography style description
- Iconography motifs

### REQUIRED — Voice + tone
- 3-5 voice principles (consistent across all surfaces)
- 4-6 tone variations by context (chat default vs spec-heavy vs scheduling vs FAQ)

### REQUIRED — Spanish register decisions
- Latam Spanish: `tú` vs `vos` (default `tú` for cross-LATAM resonance)
- 3 right-examples
- 3 wrong-examples (too formal, wrong-country slang, English-leaking)
- Localization choices baked into seed data

### REQUIRED — Personas
Minimum two: **primary B2C/B2B agent consumer** + **facilitator/student**. Optional third: **demo presenter**.

For each: age (or relevant role qualifier), location, role, current state, why-now, anxiety, goals (in order), friction points the workshop demonstrates.

### REQUIRED — Demo themes
List 3-5 industry-specific Salesforce sales angles. Mark which 1-3 the workshop covers.

### REQUIRED — Products / inventory
Table of 3-7 mock products/SKUs/services with relevant numeric specs. The seeder populates a `<Brand>_<Product>__c` custom object from this.

### REQUIRED — Locations / geography (if relevant)
For B2C with physical surface: 2-4 locations (concesionarias, branches, clinics, stores). For pure-digital: skip.

### REQUIRED — Sample customer/lead records
Minimum 3 records covering: happy-path lookup, edge-case (already-served / completed / churned), no-record empty-state.

### REQUIRED — Surface inventory
Two columns: **What we build for real** and **What we mock**. Explicit boundary.

### REQUIRED — Workshop-specific brand decisions
- App display name + label
- Agent display name + api-name + persona one-line
- Permission set name
- Package name
- Data Library name (no spaces)
- MIAW channel name
- Site name + URL slug

### REQUIRED — What's NOT in this file
Explicit list of what was deliberately omitted (raw source markup, stock images, regulatory copy). Justifies the file's boundary.

---

## Field-level checklist (to validate a filled-in brand file)

- [ ] Color palette: 5 colors max, all with AAA contrast verified
- [ ] At least 2 personas (1 agent consumer + 1 student)
- [ ] At least 3 mock product records
- [ ] At least 3 sample lead/customer records
- [ ] Spanish register choice declared (`tú` or `vos`) with ≥3 examples each (right + wrong)
- [ ] Surface inventory has at least 5 rows in "build for real" and at least 3 rows in "mock"
- [ ] Workshop brand decisions cover all 9 named entities (app, agent, permset, package, data library, MIAW, site, URL slug, agent api-name)
- [ ] "What's NOT in this file" lists the source artifacts that can be `/compact`-dropped

## How to populate this for the next industry

1. Run the interview (`INTERVIEW_TEMPLATE.md`)
2. Fetch the brand source artifacts (Slack canvas, Holodeck deck, marketing folder)
3. For each REQUIRED section, write the corresponding subsection
4. For each OPTIONAL section, write only if the surface uses it
5. Validate against the field-level checklist above
6. Confirm the file is self-contained — i.e., `/compact` can drop the source artifacts without losing fidelity

## Lessons from filling Electra's (harvested Phase 11)

- **Phase 0 — drafting from Slack canvas + Slides:** the durable-brand-file move paid off exactly as intended. After Phase 0, `docs/ELECTRA_BRAND.md` was self-contained enough that every subsequent `/compact` safely dropped the Slack/Slides sources without losing fidelity. Easy: colors, personas, voice. Hard: pinning the EXACT welcome/off-topic messages — these turned out load-bearing (the agent's actual welcome drifted from the canonical, caught in drift). **Add an explicit "verbatim agent messages" field.**
- **Brand decisions that surfaced AFTER the file was "done":**
  - The **exact agent welcome + off-topic strings** belong in the brand file as verbatim canonicals, not paraphrases — the GLOSSARY ended up carrying them because the brand file didn't. Promote them.
  - **Currency formatting** ("ARS 48.000.000" vs "$48,000,000") is a brand/locale decision that silently varied between the seeder, the flows, and the guide. Add a "number/currency/date formatting" field.
  - **Which UI labels stay in English** (Setup, App Launcher, Agentforce Studio…) vs translated is a brand-voice decision worth pinning once, centrally. The GLOSSARY carried this; the brand file should own the rule and the GLOSSARY just the list.
- **Phase 11 — schema fields I'd add if starting over:**
  1. **Verbatim agent strings** (welcome, error, off-topic, escalation) — quoted exactly.
  2. **Formatting conventions** (currency, dates, units, phone) for the locale.
  3. **UI-label translation policy** (which English terms stay English) — one rule + a short list.
  4. **Knowledge-asset inventory** (the FAQ/PDF source files + their single source of truth for the install) — would have pre-empted the GitHub-404 drift.
  5. **Sentinel/idempotency values** the seeder keys on (e.g., dealer code `PALERMO`) — so the reset and seeder stay in sync as a documented contract.
