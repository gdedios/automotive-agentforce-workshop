# COMPRESSION phase7 → phase8

## Status: Phase 7 GREEN

Public Spanish LWR site is live, branded, and renders the seeded hero copy. MIAW + EmbeddedServiceConfig metadata is deployed. Chat snippet wiring into the site theme is left as workshop Ej 4.

## Live artifacts (Electra_Auto org)

| Artifact | API name | Notes |
|---|---|---|
| Network (Community) | `Electra Customer Portal` | Status=`Live`, Id=`0DBgK0000015cfBWAQ` |
| CustomSite (LWR) | `Electra_Customer_Portal1` | UrlPath=`electra`, SiteType=`ChatterNetworkPicasso` |
| CustomSite (vforce) | `Electra_Customer_Portal` | UrlPath=`electravforcesite`, auto-paired |
| DigitalExperienceConfig | `Electra_Customer_Portal1` | label=`Electra Customer Portal`, space=`site/Electra_Customer_Portal1` |
| DigitalExperienceBundle | `site/Electra_Customer_Portal1` | 28 view/route/style files, hero localized to es-AR |
| MessagingChannel | `Electra_Customer_MIAW` | EmbeddedMessaging, Spanish keywords, queue=`Unqualified_Leads`, sessionHandlerAsa=`ElectraAI_Auto_Concierge` |
| BrandingSet | `EmbeddedServiceConfig_BrandingSet_Electra` | 56 color properties, primary=`#4723EB` |
| EmbeddedServiceConfig | `Electra_Customer_MIAW` | site=`Electra_Customer_Portal1`, branding linked |

Public URL: `https://orgfarm-2ff7de0f2c-dev-ed.develop.my.site.com/electra`

## Decisions taken (load-bearing)

1. **Provisioning path: `sf community create` THEN `sf project deploy start`.** v2 Kenton's bundle assumed the Network/Site already existed. Source-only deploy fails with "no Network named X found" because `DigitalExperienceConfig` requires an existing Network. Workaround: `sf community create --template-name "Build Your Own (LWR)" --url-path-prefix electra` first; community job materializes both `Electra_Customer_Portal1` (picasso) + `Electra_Customer_Portal` (vforce) sites and the Network. Then deploy bundle.

2. **API-name suffix `1` is forced by Salesforce.** `sf community create --name "Electra Customer Portal"` produces `Electra_Customer_Portal1` for the LWR picasso site (the non-suffixed name is reserved for the auto-paired vforce site). Bundle dir + DigitalExperienceConfig + EmbeddedServiceConfig `<site>` field all must use `Electra_Customer_Portal1`.

3. **EmbeddedServiceConfig `<site>` field MUST be the LWR ChatterNetworkPicasso site name.** Initially tried `Electra_Customer_Portal` → "This field requires the site type ChatterNetworkPicasso." Fix: use `Electra_Customer_Portal1` (the picasso variant).

4. **MessagingKeyword language scope is global.** Existing `Merchant_Support_Agent` channel had `<language>en_US</language>` keywords (cancel/stop/...). New channel with same English keywords + `<language>es</language>` errored: "Another language is already using these keywords." Fix: replaced with actual Spanish keywords (baja/cancelar/fin/parar/salir/terminar; ayuda).

5. **Network status flip done via metadata, not Setup UI.** Retrieved Network XML, edited `<status>UnderConstruction</status>` → `<status>Live</status>`, redeployed. Single-component deploy succeeds.

6. **`.forceignore` Phase 7 override.** Commented out 4 lines (digitalExperiences, messagingChannels, EmbeddedServiceConfig, brandingSets, plus added digitalExperienceConfigs + networks). Restore after package ship.

## Verification

- `sf data query` confirms Network=Live
- `curl https://...../electra` returns HTTP 200, 44KB LWR bootstrap with `@salesforce/community/Id=0DBgK0000015cfBWAQ`
- Headless Chrome screenshot shows: ELECTRA logo (purple), hero "Tu próximo auto eléctrico te espera.", CTA "Hablar con ElectraAI", three feature tiles (Catálogo / Garantía y Carga / Pruebas de Manejo), CTA section "¿Tenés alguna consulta? Disponible 24/7", footer with 5 vehicle models + services + company.

## Open threads (deferred)

- **MIAW chat-bubble injection on LWR site.** Not auto-injected. Standard Salesforce workshop pattern: students embed the ESD snippet via Builder UI in Ej 4. Snippet template: `https://orgfarm-2ff7de0f2c-dev-ed.develop.my.salesforce-scrt.com/embeddedservice/v1/esw.min.js` (URL pattern; actual path materializes after first ESD publish via Setup UI). NOT automating; workshop content.
- **Guest user profile sharing rules.** Need: Vehicle_Model__c read, Lead create, Event read. Currently network has profile=admin only. Not blocking site render but blocks anonymous chat → flow execution. Address in Phase 9 drift round if guest-flow chains fail; otherwise add to Guía Ej 4.
- **EmbeddedServiceConfig publish-to-deployment.** Setup UI offers "Activate Deployment" toggle that creates the hosted JS bundle. Metadata-only deploy makes the config exist but doesn't publish the live deployment. Workshop Ej 4 covers this UI step.

## [SKILL-CANDIDATE]

- **WORKFLOW pattern:** *Provision-then-deploy for sites.* For any future industry workshop, the LWR site pre-provisioning step belongs BEFORE the bundle deploy. `sf community create` + poll `BackgroundOperation` + then deploy bundle + DigitalExperienceConfig together. Add to `WORKFLOW_AND_PATTERNS.md` as "Phase 7 site bootstrap."
- **GOTCHA:** *Salesforce auto-suffixes LWR site api-names with `1`.* When the desired api-name conflicts with the auto-paired vforce site, you get `<Name>1`. Bundle directory + `<space>` + `<site>` references all must use the suffixed name. Add to `LEARNINGS.md`.
- **GOTCHA:** *MessagingKeywords are language-global.* If the org has a pre-existing channel with English keywords on en_US, you cannot reuse those keyword strings on a different language. Use vernacular Spanish keywords. Add to `LEARNINGS.md`.
- **GOTCHA:** *EmbeddedServiceConfig `<site>` must be the picasso variant, not vforce.* Add to `LEARNINGS.md`.
- **MODEL-SWITCH boundary:** Phase 7 = Opus only. The chicken-and-egg between community provisioning + bundle deploy + Network status flip needed live decision-making across 3 deploy attempts. Sonnet authoring fan-out would have produced reports faster but Opus would have re-done the integration anyway.

## Next: Phase 8 — Guía de Participante

Opus drafts `docs/guia-participante-draft.md` with 5 ejercicios. Then 5 Sonnet reviewers in parallel (one per ejercicio) for Spanish-prose tightening + UI-label drift check.

5 ejercicios:
- Ej 0: Setup + Sembrar Datos (10 min) — drives `Seed_Workshop_Data` flow
- Ej 1: Habilitar Einstein + Agentforce + Data Library (10 min) — apply v2 Drift 1.1 fix, deterministic toggle order
- Ej 2: Construir agente en NEW Builder — 3 topics + 4 flow actions + Data Library (55 min). Bullets ≤140 chars per Builder Reasoning Instructions line (v2 Drift 2.19)
- Ej 3: Conversation Preview con 4 prompts canónicos + 4 adversariales (20 min)
- Ej 4: Desplegar en Experience Cloud + MIAW (40 min) — Activate ESD, embed snippet on Electra Customer Portal, smoke-test as guest

Brand canonical: `docs/ELECTRA_BRAND.md`. Voice register: tuteo informal, español rioplatense.
