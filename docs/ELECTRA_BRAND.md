# Electra — Brand Reference (durable)

This is the canonical brand reference for the Electra Automotive Workshop. It captures the full content of the Salesforce Slack canvas (`F0B6EN9RPN0`) and the Holodeck Auto|Electra template (Google Slides `1_xYTZ2IQAiUDm4whpQzEKExLlcLeqTev9uqCIAqWhrE`) so future Claude sessions can `/compact` away those sources without losing fidelity.

**Treat this as the source of truth.** If you find yourself needing to re-fetch the Slack canvas or the Slides, this file is incomplete — fix it.

---

## Brand at a glance

**Electra** is Salesforce's official **Automotive industry demo brand**. It is a fictional EV (electric vehicle) automaker. Demos position Electra as a **modern, premium EV brand** with a direct-to-consumer + dealer hybrid model, mid-to-high-end vehicles, and a strong digital/connected-car narrative.

**One-line voice:** Modern, confident, sustainability-forward, premium without being aloof. Think "Lucid Motors meets Tesla but more inclusive and customer-obsessed."

---

## Color palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | **Electra Purple** | `#4723EB` | Primary CTAs, brand accents, highlight links, badge backgrounds |
| Primary | **Charcoal** | `#393942` | Body text, secondary surfaces, navigation |
| Primary | **Light** | `#F0EBFD` | Page backgrounds, hover states, soft separators |
| Secondary | **Black** | `#050516` | Headings, hero text, footer |
| Secondary | **Purple Dark** | `#261089` | Pressed/active states, strong emphasis, dark-mode CTAs |

**On Salesforce surfaces:**
- Lightning App branding header → `#4723EB` (primary purple)
- Experience Cloud LWR site primary → `#4723EB` with `#F0EBFD` page background
- Hero buttons → `#4723EB` background, white text, hover → `#261089`
- Body copy → `#393942` on `#FFFFFF` / `#F0EBFD`
- Headings → `#050516`

**Accessibility:** `#4723EB` on `#FFFFFF` = AAA for normal text. `#393942` on `#F0EBFD` = AAA. `#050516` on white = AAA. Confirmed pre-build.

---

## Typography (slides reference)

The Holodeck slides use **Salesforce Sans / SF Pro** as the corporate face. For Experience Cloud and the Guía PDF we use system stacks that approximate it without licensing complexity:

- **Headings:** `"SF Pro Display", "Salesforce Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Body:** `"SF Pro Text", "Salesforce Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Code/data:** `"SF Mono", "Menlo", monospace`

For the PDF Guía generated via Chrome for Testing, lean on `-apple-system` + `BlinkMacSystemFont` first — they render correctly on macOS Chrome and degrade well in Adobe Reader on Windows.

---

## Logo + visual motifs

The Holodeck deck uses:
- A bold lowercase `electra` wordmark in Electra Purple `#4723EB` on white, or white on Charcoal `#393942`
- A circular "lightning bolt in arc" mark for icon-only contexts
- Hero vehicle photography with the EV in three-quarter view, neutral studio lighting, with purple ambient gradient backdrop
- Charging-station and connected-app iconography for digital-touch demos

For the workshop:
- Site Builder hero block uses the wordmark + Charcoal `#393942` background + a stock EV three-quarter photograph (or the Holodeck-provided hero asset, exported)
- Lightning App utility bar branding uses the wordmark only

We do **not** ship the full Holodeck PNG library in `force-app/`. The site uses **inline SVG for the wordmark** + one ContentAsset hero image (`Electra-Hero-ECruiser.png` — sourced from Holodeck slide 12 export) per workspace CLAUDE.md `feedback_lwr_html_editor.md` (LWR htmlEditor strips `<style>` and external CSS — but inline SVG and `<img src="/sfsites/c/.../assets/...">` survive sanitization).

---

## Voice + tone

**Voice (consistent):**
- Confident but not arrogant. We *know* electric is the future; we don't have to gloat.
- Customer-obsessed. The vehicle is in service of the buyer's life, not a status symbol.
- Sustainability is implicit. We don't need to lecture about emissions; the product speaks.
- Premium without being aloof. Friendly humans run the dealerships, friendly humans answer the chat.

**Tone (varies by context):**
- **Marketing site / chat agent default:** warm, direct, helpful. "Te ayudo a encontrar tu Electra ideal." (NOT "Permítame asistirle…")
- **Spec-heavy responses:** crisp, precise, table-friendly. Numbers first, prose second.
- **Test-drive scheduling:** concrete, low-friction. Confirm one detail at a time, ask before creating records.
- **FAQ / warranty / charging:** patient, never condescending, links out to the appropriate PDF source when the data is dense.

---

## Spanish register (Argentine)

The agent and the Guía both use **Argentine Spanish ("tú" register, NOT "vos" — matching v2 Kenton's choice for clean cross-LATAM resonance)**. UI element names stay in English (e.g., "Setup", "Agentforce Builder", "Topic", "Action") because that's what students see on screen. Body prose is Spanish.

**Examples (right):**
- "Te ayudo a encontrar el Electra que mejor se adapte a tu día a día."
- "¿Querés agendar una prueba de manejo? Solo necesito tu nombre, tu email y la concesionaria que te queda más cerca."
- "El E-Cruiser tiene una autonomía de 520 km en ciclo combinado WLTP y carga al 80 % en 28 minutos con un cargador rápido de 150 kW."

**Examples (wrong — too formal / too Mexican / English-leaking):**
- ❌ "Permítame asistirle con su consulta sobre vehículos eléctricos."
- ❌ "¿Te late agendar un test drive?" (too Mexican)
- ❌ "Agenda tu test drive ahora." (English noun pollution; use "prueba de manejo")

**Localization choices baked into the seed data:**
- Concesionarias in Buenos Aires (Palermo, Belgrano), Córdoba (Nueva Córdoba), Rosario (Centro)
- Pricing in ARS with US$ reference for export-leasing scenario
- Charging-station references include YPF Ruta and Edenor partner network names (fictional)

---

## Personas

### Sofía Vega — primary B2C customer (consumer of the agent)

- **Age:** 34
- **Lives:** Palermo, Buenos Aires
- **Role:** Senior product designer at a SaaS startup, hybrid work
- **Drives today:** A 2019 Volkswagen Golf, paid off, she's been thinking about going electric for 18 months
- **Why now:** Her building installed a charger in the parking, her partner is on board, she's saving for a 2-year purchase horizon
- **Anxiety:** Charging in long road trips (Buenos Aires → Mar del Plata is the test case), warranty on the battery, depreciation
- **Vehicle of interest:** **Electra E-Cruiser** (the family-sedan flagship)
- **Channel:** Lands on `electra.com.ar` (the consumer site), opens chat, identifies as Sofía
- **Goals (in order):** (1) Compare E-Cruiser vs E-Wagon range; (2) Know warranty + charging-network coverage on Ruta 2; (3) Schedule a test drive at Concesionaria Palermo Saturday 11 AM
- **Friction points the workshop demonstrates:** ambiguity ("dame opciones"), language switch attempts, prompt injection in the test-drive notes field

### Marcela Páez — facilitator / partner instructor (consumer of the workshop)

- **Role:** Salesforce admin or pre-sales SE at a Salesforce partner in LATAM
- **Knows:** Lightning, Flow basics, Apex *enough to be dangerous*, has shipped a customer-support Service Cloud install
- **Doesn't know:** Agentforce Atlas, NEW Builder, Data Library, MIAW. This workshop is her first end-to-end agent build.
- **Goals:** (1) Walk away with a working public chat agent; (2) Understand what's "magic" vs "deterministic"; (3) Be able to deliver a similar workshop to her own customer next month
- **Reads:** the Spanish PDF Guía. Does NOT open a terminal. The bootstrap package install is the only `sf` command she's expected to run, and it's framed as "click this URL".

### Diego Romero — facilitator (delivers the workshop in front of customers)

- **Role:** Salesforce SE running a 1-hour or 1-day session
- **Wants:** A working end-state demo running on his own org so he can mirror the screens
- **Uses:** `scripts/install.sh` to provision his demo org so the agent + Data Library + site are pre-wired
- **Doesn't want:** to debug 30 unrelated metadata pieces while customers wait

---

## Demo themes (the Salesforce sales angles Electra surfaces)

The Holodeck deck positions Electra around 5 themes. The workshop hits #1, #2, and #5 (the Lead-to-Test-Drive use case is built around these). The skill-creation interview should ask future industry clients to pick 1-3 themes the workshop will cover.

1. **Connected Customer** — agent on the consumer site recognizes returning visitors, knows their saved configurations, helps them progress without friction. *(Workshop covers via guest user → lead capture; Sofía can return as a known lead in Phase 7 demo.)*
2. **AI-First Sales** — agent qualifies, recommends, schedules without a human until commitment. *(Workshop core — `Get_Vehicle_Catalog` + `Get_Vehicle_Detail` + `Schedule_Test_Drive`.)*
3. **Connected Vehicle** — telematics, OTA updates, in-vehicle service. *(Out of workshop scope; mocked references only.)*
4. **Dealer Network Empowerment** — service centers, parts, warranty workflows. *(Out of workshop scope; mocked.)*
5. **Sustainability + Trust** — warranty transparency, charging network reliability, lifecycle. *(Workshop covers via Data Library RAG over warranty + charging guide PDFs.)*

---

## Products (the Electra lineup)

Five vehicles, all electric, mock specs for the workshop. The seeder populates `Vehicle_Model__c` with these.

| Model | Type | Range (WLTP) | 0–100 | Charging (10–80%) | Price (ARS) | Position |
|---|---|---|---|---|---|---|
| **E-Cruiser** | Sedan family | 520 km | 6.8 s | 28 min @ 150 kW | $48M ARS | Flagship, premium, family |
| **E-Sport** | Coupé | 480 km | 4.2 s | 30 min @ 150 kW | $58M ARS | Performance, halo |
| **E-Wagon** | Wagon / station | 510 km | 7.4 s | 28 min @ 150 kW | $46M ARS | Family, dog-friendly, road-trip |
| **E-Truck** | Pickup | 460 km | 7.0 s | 35 min @ 150 kW | $62M ARS | Work / lifestyle, 700kg payload |
| **E-City** | Hatchback compact | 360 km | 9.1 s | 25 min @ 100 kW | $32M ARS | Entry, urban, first-EV buyer |

**Note for agent training:** Sofía's persona maps to E-Cruiser (primary) with E-Wagon as the comparison. The workshop's 4 canonical prompts and ~30 adversarial prompts use E-Cruiser, E-Wagon, and an off-lineup fabricated VIN as the spine.

---

## Dealers (concesionarias)

Three dealers, one per major Argentine city. The seeder populates them as `Account` records with `Type = "Dealer"`.

| DeveloperName | Display name | City | Address (mock) | Hours |
|---|---|---|---|---|
| `Concesionaria_Palermo` | Concesionaria Electra Palermo | Buenos Aires (Palermo) | Av. Córdoba 4500, CABA | Lun–Sáb 9–19 |
| `Concesionaria_Cordoba` | Concesionaria Electra Córdoba | Córdoba (Nueva Córdoba) | Bv. Chacabuco 850 | Lun–Sáb 10–19 |
| `Concesionaria_Rosario` | Concesionaria Electra Rosario | Rosario (Centro) | Córdoba 1200 | Lun–Sáb 9–18 |

---

## Test drive slots (mock availability)

The seeder creates ~20 `Test_Drive_Slot__c` records spanning the next 14 days, distributed across the 3 dealers and 5 models. Slot times: 10:00, 11:30, 14:00, 15:30, 17:00 each day. Slot duration: 60 min.

The `Schedule_Test_Drive` flow is FK-validated against these slots. If Sofía asks for "tomorrow at 9 AM" and 9 AM doesn't exist as a slot, the agent should propose the closest available — never fabricate.

---

## Sample leads (warm vs cold)

The seeder creates 3 leads to demonstrate `Get_Test_Drive_Status`:

1. **Sofía Vega** (`sofia.vega@example.com.ar`) — has an upcoming test drive (status: Confirmado) at Concesionaria Palermo for E-Cruiser, Saturday 11:00. The "happy path" lookup target.
2. **Tomás Iriarte** (`tomas.iriarte@example.com.ar`) — has a past completed test drive (status: Completado) at Concesionaria Córdoba for E-Sport. Tests "I already did mine, what now?" flow.
3. **Camila Ruiz** (`camila.ruiz@example.com.ar`) — has no test drive (status: not found). Tests the "no record" empty-state.

---

## Surface inventory — what we build, what we mock

### What we build for real
- `Vehicle_Model__c`, `Test_Drive_Slot__c`, `Vehicle_Inventory__c` (custom objects)
- 4 autolaunched flows + 2 screen flows
- 2 Apex `@InvocableMethod` classes (seed + reset)
- Lightning App `Electra_Sales_Studio`
- Permission set `Electra_Auto_Workshop_Participant`
- Atlas Agent Script bundle `ElectraAI_Auto_Concierge`
- 3 Spanish PDFs (catálogo, garantía, carga + mantenimiento) → Data Library
- Experience Cloud LWR site `Electra_Customer_Portal`
- MIAW chat widget bound to the agent

### What we mock (no real integration)
- DMS (Dealer Management System) — `Vehicle_Inventory__c` is the mock
- CRM-X (existing CRM) — Lead is the mock
- Telematics / connected vehicle — out of scope, the agent does not access vehicle state
- Pricing engine — flat values in `Vehicle_Model__c.Price__c`
- Credit pre-qualification — Data Library FAQ only, no live calculation
- Inventory availability by VIN — `Vehicle_Inventory__c` is keyed by model + dealer + count, no per-VIN tracking

This mock-vs-real boundary matters for the agent instructions: the agent should **never** claim to "check live inventory at the dealer" or "run a credit check" — those are explicit don'ts in the system message.

---

## Workshop-specific brand decisions

- **App name:** `Electra Sales Studio` (English, Title Case — matches Salesforce app-naming convention; students see this label in App Launcher)
- **Agent display name:** `Electra Auto Concierge` (English UI label, Spanish behavior — agent persona is "Tu concierge automotriz")
- **Agent api-name:** `ElectraAI_Auto_Concierge` (matches `KenAI_*` convention from v2 — `<BrandPrefix>AI_<Persona>`)
- **Permission set:** `Electra_Auto_Workshop_Participant`
- **Package:** `Electra Auto Workshop Bootstrap`
- **Data Library:** `Electra_FAQ_Library` (no spaces — workspace CLAUDE.md AQWK lesson)
- **MIAW channel:** `Electra_MIAW`
- **Site:** `Electra_Customer_Portal` (display: "Electra")
- **Site URL slug:** `/electraportal` (so public URL is `https://<org>.my.site.com/electraportal`)

---

## What's NOT in this file (and why)

- **Slack canvas raw markup.** Captured in essence above; verbatim canvas is regeneratable from `F0B6EN9RPN0` if ever needed.
- **Holodeck slide images.** Hero exports go in `assets/` when needed; this file references them by description.
- **Pricing methodology, market sizing, regulatory fine print.** Not relevant to the agent's behavior; the workshop's mock pricing is "what the seeder writes" and that's enough.
- **Customer logos / partner brands from the Holodeck deck.** Not used in the workshop surface (Electra is fictional; we don't drop Mercedes/BMW logos).

If a brand decision is missing here, **add it.** The whole point of this file is that `/compact` can drop the Slack canvas and Slides without losing fidelity.
