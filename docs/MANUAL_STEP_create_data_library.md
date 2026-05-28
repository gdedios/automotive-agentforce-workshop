# MANUAL STEP — Create the Agentforce Data Library

**Why manual:** every attempt to create + upload via Playwright (scripts 16–22) hit
"We couldn't upload your file. Please create a new data library and try again." on
two consecutive libraries. The same procedure performed by hand in the UI works
on the first try. Root cause is unclear — likely a Salesforce backend session/timing
issue specific to programmatic clicks. We are NOT going to keep burning attempts at
this; library creation is officially a user-driven step.

**Where this lives:** this file is referenced by:
- `scripts/phase6b/*.js` — header comments tell you to do this step in Setup
- `docs/guia-participante-draft.md` Phase 8 Ej 1 (when the Guía is written, the
  same step block goes there)

---

## Canonical naming (USE EXACTLY)

| Field | Value |
|---|---|
| Library Name | `Electra FAQ Library` |
| API Name | `Electra_FAQ_Library` (auto-derived from the name — verify it matches) |
| Description | `Electra Auto Concierge knowledge — catálogo, garantías, guía de carga y mantenimiento.` |
| Data Space | `default` |
| Data Type | **Files** (cannot be changed after creation) |

These names are referenced by the agent's `knowledge:` block and downstream Apex /
test code. If you rename the library, the agent's `Estado_y_FAQ` topic + AQWK action
will not bind correctly.

---

## Steps (one-time per org)

1. Setup → Quick Find: **Data Library** → **Agentforce Data Library**.
2. If `Test` (or any non-canonical-name library) exists from earlier troubleshooting,
   click the row's caret menu → **Delete**. Confirm.
3. Click **New Library**.
4. Fill the form:
   - Library Name: `Electra FAQ Library`
   - API Name: confirm it auto-fills `Electra_FAQ_Library`
   - Description: `Electra Auto Concierge knowledge — catálogo, garantías, guía de carga y mantenimiento.`
5. Click **Save**.
6. On the new library detail page, under **Add Data Sources**:
   - Data Type: **Files**
   - Data Space: **default**
7. Under **Add Files Data** → click **Select Files**.
8. Pick all 3 PDFs from:
   ```
   /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/
   ├── Electra-Catalogo-Vehiculos-Argentina.pdf   (~18 kB)
   ├── Electra-Politicas-de-Garantia.pdf           (~17 kB)
   └── Electra-Guia-Carga-y-Mantenimiento.pdf      (~18 kB)
   ```
9. The 3 files appear in the file list with status `Pending`.
10. Click **Upload** at the bottom-right of the page (sticky footer).
11. The "Upload Files" modal opens — wait until "3 of 3 files uploaded" with green
    checkmarks. Click **Done**.
12. The detail page now shows Status: **In Progress** with the banner *"We're
    building your data library… This process can take several minutes to several
    hours. Check back later."*
13. **Tell Claude when this is done.** Claude will poll the status and proceed with
    Phase 6b downstream steps once Status flips to **Success**.

---

## What success looks like

Library detail page header shows:
- **Status:** `Success` (green badge)
- 3 files in the table, each with `Status: Indexed` (or equivalent)
- Feature Assignments: still `Unassigned` (we add it via the agent in the next step)

If Status is still `In Progress` after 30 minutes, refresh the page; the badge does
not auto-update.

---

## Skill candidates

`[SKILL-CANDIDATE]` Future workshops: **mark ADL creation as a one-time manual UI
step in the Guía, never script it.** Even with a logged-in browser session and
identical selectors, programmatic creation can fail with "We couldn't upload your
file" while the same flow done by a human succeeds. Don't fight this — make it
a labeled student step in the workshop and document the canonical names + PDFs
they should pick.

`[SKILL-CANDIDATE]` Workshop interview question: **"For RAG-bearing workshops, are
students comfortable with one Setup-UI bootstrap step that can't be packaged?"**
Some workshops want fully-packaged installs. ADL setup breaks that promise.
