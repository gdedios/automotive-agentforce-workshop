# Subagent Report: Create First Experience Cloud Site (Ej4)

**Status:** BLOCKED — Experience Cloud not available on org  
**Attempts:** 2 full tries  
**Budget used:** ~5 min  

---

## Goal
Create the FIRST Experience Cloud site via Setup UI:
- Site name: `Electra Customer Portal`
- Template: `Build Your Own (LWR)`  
- URL path: `electra`

---

## Blocker

**Digital Experiences / Experience Cloud is NOT available on this org.**

### Evidence

1. **SOQL query fails:**
   ```bash
   sf data query -q "SELECT Id FROM DigitalExperienceConfig LIMIT 1" -o Electra_Ej4
   ```
   Returns: `INVALID_TYPE: sObject type 'DigitalExperienceConfig' is not supported`

2. **Setup navigation:** 
   - Frontdoor to `/lightning/setup/SetupNetworks/home` (All Sites page) → "Page not found"
   - Frontdoor to `/lightning/setup/DigitalExperiences/home` (Settings page) → "Page not found"

3. **Org details:**
   ```
   OrganizationType: Enterprise Edition
   TrialExpirationDate: 2026-07-03
   Name: Salesforce Trial Org Request & Manage
   ```

### Root cause

This is an **Enterprise Edition trial org** provisioned WITHOUT the Experience Cloud feature enabled. The "Page not found" errors indicate the feature doesn't exist in this org instance — it's not just a toggle/permission issue.

Enterprise Edition CAN include Experience Cloud, but this particular trial org was provisioned WITHOUT it (possibly a generic trial vs an Experience Cloud-specific trial template).

---

## What was attempted

### Attempt 1: Direct wizard navigation
- Script: `scripts/ej4/create-first-site.js`
- Tried frontdoor to `/lightning/setup/SetupNetworks/home` → Page not found
- Adjusted to use Quick Find navigation from Setup home → "All Sites" link not found

### Attempt 2: Enable Digital Experiences first
- Script: `scripts/ej4/enable-digital-experiences.js`
- Navigated to `/lightning/setup/DigitalExperiences/home` → Page not found
- No enable button/toggle visible (because the feature doesn't exist)

### Attempt 3: Probe multiple Setup paths
- Script: `scripts/ej4/probe-setup-navigation.js`
- Searched Quick Find for: Sites, Communities, Experience Cloud, Digital Experiences, All Sites, Feature
- Screenshots saved but sidebar too small to read clearly
- None of the search terms yielded a valid navigation path (all lead to Page not found)

---

## Screenshots saved

All in `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/ej4_probe/`:

- `ERROR_2026-06-03T16-12-11.png` — All Sites page not found
- `ERROR_2026-06-03T16-13-33.png` — Setup home after failed Quick Find nav
- `digexp_01_settings_page_2026-06-03T16-14-56.png` — Digital Experiences settings page not found
- `probe_00_setup_home_2026-06-03T16-16-16.png` — Setup home before Quick Find searches
- `probe_01_sites_2026-06-03T16-16-18.png` — Quick Find: "Sites"
- `probe_02_communities_2026-06-03T16-16-20.png` — Quick Find: "Communities"
- `probe_03_experience_cloud_2026-06-03T16-16-22.png` — Quick Find: "Experience Cloud"
- `probe_04_digital_experiences_2026-06-03T16-16-24.png` — Quick Find: "Digital Experiences"
- `probe_05_all_sites_2026-06-03T16-16-26.png` — Quick Find: "All Sites"
- `probe_06_feature_2026-06-03T16-16-28.png` — Quick Find: "Feature"

---

## Recommended next steps

1. **User must enable Experience Cloud on the org:**
   - Option A: Contact Salesforce Support or OrgFarm to provision a new trial WITH Experience Cloud
   - Option B: Enable Experience Cloud via "Add Features" in Setup (if available) — requires manual user action
   - Option C: Use a different org that already has Experience Cloud enabled

2. **Validation check before retrying:**
   After any enablement attempt, verify with:
   ```bash
   sf data query -q "SELECT Id FROM DigitalExperienceConfig LIMIT 1" -o Electra_Ej4
   ```
   If this query succeeds (returns records OR no rows but NO INVALID_TYPE error), then Experience Cloud is enabled and site creation can proceed.

3. **Once enabled, re-run:** `scripts/ej4/create-first-site.js`

---

## Scripts written (ready to use once feature is enabled)

- `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/scripts/ej4/create-first-site.js` — Full site creation wizard automation
- `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/scripts/ej4/enable-digital-experiences.js` — Enable toggle (if available)
- `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/scripts/ej4/probe-setup-navigation.js` — Quick Find probe

All scripts use:
- Org: `Electra_Ej4`
- CFT: `/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
- Profile: `/tmp/cft-electra-ej4`
- NODE_PATH: `/Users/gdedios/.npm/_npx/9833c18b2d85bc59/node_modules`

---

**Escalating to Opus.**
