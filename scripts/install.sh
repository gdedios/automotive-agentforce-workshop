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
# What this installs (target end state):
#   - 3 custom objects (Vehicle_Model__c, Test_Drive_Slot__c, Vehicle_Inventory__c) + field overrides on Lead/Event
#   - 4 agent-backing flows (Get_Vehicle_Catalog, Get_Vehicle_Detail, Schedule_Test_Drive, Get_Test_Drive_Status)
#   - 2 student-facing screen flows (Seed_Workshop_Data + Reset_Workshop_Data)
#   - 2 Apex classes (Electra Workshop Data Seeder + Reset, with @InvocableMethod)
#   - Lightning App + Home flexipage with one-click Sembrar / Resetear buttons
#   - Permission set Electra_Auto_Workshop_Participant
#   - ElectraAI_Auto_Concierge agent (AiAuthoringBundle, Atlas Agent Script)
#   - 3 Spanish PDFs uploaded as ContentVersion for FAQ Data Library
#   - Electra Customer Portal Experience Cloud LWR site + MIAW chat widget
#
# What this does NOT do:
#   - Run a data import. Students click "Sembrar Datos" on the Home page instead.
#   - Wire the Data Library to the agent. Manual UI step (see post-install notes).
#   - Publish the Experience Cloud site. Manual UI step.

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

# Step 6: activate the agent (after Phase 5 build)
echo "[6/6] Activating ElectraAI_Auto_Concierge agent..."
sf agent activate --json --api-name ElectraAI_Auto_Concierge --target-org "$TARGET_ORG" \
    && echo "    Agent activated." \
    || echo "    WARN: Agent activation failed — activate manually in Setup > Agentforce Agents."

echo ""
echo "Install complete."
echo ""
echo "================================================================"
echo "NEXT STEPS FOR FACILITATOR (manual UI clicks):"
echo "  1. Setup > Digital Experiences > Sites > Electra Customer Portal > Publish site"
echo "  2. Setup > Agentforce Agents > Electra Auto Concierge > Bot Channels >"
echo "     bind Electra_MIAW messaging channel"
echo "  3. Setup > Agentforce > Data Libraries > Create library, upload PDFs,"
echo "     wire to ElectraAI_Auto_Concierge agent (FAQ topic)"
echo "  4. Setup > Session Settings > UNCHECK 'Enable secure and persistent browser caching'"
echo "  5. Verify public site loads at:"
echo "     https://<your-org>.my.site.com/electraportal"
echo ""
echo "STUDENT EXPERIENCE:"
echo "  1. Log into the org"
echo "  2. App Launcher > Electra Sales Studio"
echo "  3. On Home, click 'Sembrar Datos' to load Latamized Argentine records"
echo "  4. Navigate to the public Customer Portal site URL"
echo "  5. Chat as guest with Electra Auto Concierge — try the 4 canonical prompts"
echo "================================================================"
