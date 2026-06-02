#!/usr/bin/env bash
# Electra Automotive Workshop — Lead-to-Test-Drive Sales Agent — install script
#
# Usage:
#   bash scripts/install.sh -o <targetOrgAlias>
#
# Requires:
#   - An Agentforce NOW (Atlas-capable) org
#   - Admin-level access (Profile: System Administrator)
#   - Authenticated via `sf org login web --alias <alias>`
#
# What this installs (deployed via metadata source — manifest/package.xml, NOT a managed package):
#   - 3 custom objects (Vehicle_Model__c, Test_Drive_Slot__c, Vehicle_Inventory__c) + field overrides on Lead/Event
#   - 4 agent-backing flows (Get_Vehicle_Catalog, Get_Vehicle_Detail, Schedule_Test_Drive, Get_Test_Drive_Status)
#   - 2 student-facing screen flows (Seed_Workshop_Data + Reset_Workshop_Data)
#   - 2 Apex classes (Electra Workshop Data Seeder + Reset, with @InvocableMethod)
#   - Lightning App + Home flexipage with one-click Sembrar / Resetear buttons
#   - Permission set Electra_Auto_Workshop_Participant
#   - 3 Spanish PDFs uploaded as ContentVersion (FAQ Data Library source for Ejercicio 1)
#
# What this does NOT do (by design — these are student exercises or separate deploys):
#   - Ship the ElectraAI_Auto_Concierge agent. Students BUILD it in Ejercicio 2 (NEW Builder).
#     The aiAuthoringBundles/ reference .agent is the answer key, NOT in manifest/package.xml.
#   - Create/wire the Data Library to the agent. Manual UI step (Ejercicios 1 + 2).
#   - Deploy or publish the Electra Customer Portal Experience Cloud site + MIAW.
#     Separate facilitator deploy (see Ejercicio 4 / SESSION_HANDOFF.md).
#   - Run a data import. Students click "Sembrar Datos" on the Home page instead.

set -euo pipefail

TARGET_ORG=""
while getopts "o:" opt; do
    case "$opt" in
        o) TARGET_ORG="$OPTARG" ;;
        *) echo "Usage: $0 -o <targetOrgAlias>" >&2; exit 1 ;;
    esac
done

if [ -z "$TARGET_ORG" ]; then
    echo "ERROR: -o <targetOrgAlias> required." >&2
    exit 1
fi

echo "================================================================"
echo "Electra Auto Concierge — Automotive Workshop — Installer"
echo "Target org: $TARGET_ORG"
echo "================================================================"

# Gate 1: verify we can talk to the org
echo ""
echo "[1/6] Verifying org connection..."
sf org display --json -o "$TARGET_ORG" >/dev/null || { echo "Cannot connect to $TARGET_ORG. Run: sf org login web --alias $TARGET_ORG"; exit 1; }

# Gate 2: confirm Agentforce NOW (Atlas) is provisioned
echo "[2/6] Checking Agentforce/Atlas provisioning..."
if ! sf org list metadata -m AiAuthoringBundle --json -o "$TARGET_ORG" >/dev/null 2>&1; then
    echo "ERROR: AiAuthoringBundle not supported on this org. Must be Agentforce NOW (Atlas-capable)."
    echo "       CDO orgs and plain Einstein-Bots orgs will NOT work. Abort."
    exit 1
fi
if ! sf data query --json --use-tooling-api -q "SELECT Count() FROM BotDefinition" -o "$TARGET_ORG" >/dev/null 2>&1; then
    echo "WARN: BotDefinition not queryable. Toggle Setup > Einstein Bots ON, then re-run."
fi

# Step 3: deploy all metadata
echo "[3/6] Deploying metadata (this takes ~3 minutes)..."
sf project deploy start \
    --manifest manifest/package.xml \
    --target-org "$TARGET_ORG" \
    --wait 15

# Step 4: assign the participant permission set to the current user
echo "[4/6] Assigning permission set..."
sf org assign permset --name Electra_Auto_Workshop_Participant --target-org "$TARGET_ORG" || echo "    (already assigned — OK)"

# Step 5: upload the 3 Spanish PDFs as ContentVersion records for the FAQ Data Library
echo "[5/6] Uploading PDFs to Content (Data Library source)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PDF_DIR="$SCRIPT_DIR/../data/seed-pdfs"

upload_pdf() {
    local title="$1"
    local filename="$2"
    local path="$PDF_DIR/$filename"
    if [ ! -f "$path" ]; then
        echo "    WARN: PDF not found at $path — skipping $title"
        return
    fi
    existing=$(sf data query --json \
        -q "SELECT Id FROM ContentVersion WHERE Title='$title' AND IsLatest=true LIMIT 1" \
        -o "$TARGET_ORG" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('result',{}).get('records',[])))" 2>/dev/null || echo "0")
    if [ "$existing" != "0" ]; then
        echo "    $title — already uploaded, skipping"
        return
    fi
    sf data create record \
        --sobject ContentVersion \
        --values "Title='$title' PathOnClient='$filename' VersionData='@$path'" \
        --target-org "$TARGET_ORG" \
        >/dev/null && echo "    Uploaded: $title" || echo "    WARN: Upload failed for $title"
}

upload_pdf "Electra-Catalogo-Vehiculos-Argentina"  "Electra-Catalogo-Vehiculos-Argentina.pdf"
upload_pdf "Electra-Politicas-de-Garantia"          "Electra-Politicas-de-Garantia.pdf"
upload_pdf "Electra-Guia-Carga-y-Mantenimiento"     "Electra-Guia-Carga-y-Mantenimiento.pdf"

# Step 6: agent NOT activated here — students BUILD the agent in Ejercicio 2.
# The agent bundle is deliberately NOT in manifest/package.xml (workshop pedagogy:
# the student authors ElectraAI_Auto_Concierge from scratch in the NEW Builder).
# The reference .agent under aiAuthoringBundles/ is the answer key, not a shipped artifact.
echo "[6/6] Agent: skipped (built by students in Ejercicio 2 — not pre-shipped)."

echo ""
echo "Install complete."
echo ""
echo "================================================================"
echo "NEXT STEPS FOR FACILITATOR (before students arrive):"
echo "  1. Enable Einstein (Setup > Einstein Setup), THEN Agentforce"
echo "     (Setup > Agentforce). Order matters — Agentforce page 404s until"
echo "     Einstein is on. Both toggles persist."
echo "  2. Confirm the 3 PDFs landed in Files (uploaded in step 5 above)."
echo "  3. (Optional demo org only) To deploy the Experience Cloud portal + MIAW,"
echo "     run the separate site deploy — NOT part of this installer. See"
echo "     SESSION_HANDOFF.md. Then Setup > Session Settings > UNCHECK"
echo "     'Enable secure and persistent browser caching'."
echo ""
echo "STUDENT EXPERIENCE (the workshop itself):"
echo "  Ej 0  App Launcher > Electra Sales Studio > Home > click 'Sembrar Datos'"
echo "  Ej 1  Create the Electra_FAQ_Library Data Library from the 3 PDFs"
echo "  Ej 2  BUILD the ElectraAI_Auto_Concierge agent in the NEW Agentforce Builder"
echo "  Ej 3  Test it in Conversation Preview (4 canonical + 4 adversarial prompts)"
echo "  Ej 4  Deploy to Experience Cloud + MIAW, chat as guest"
echo "================================================================"
