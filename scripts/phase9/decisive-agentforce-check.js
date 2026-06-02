// Decisive: search "Agentforce" exactly in Quick Find; click "Agentforce Data Library"
// node if present; and check Einstein Setup for an "Agents"/"Agentforce" section that
// may have appeared after enabling Einstein. Capture everything.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto_Drift';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-drift-probe';
const PROJECT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(PROJECT, 'docs', 'phase9_probe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function frontdoor(p){ return JSON.parse(execFileSync('sf',['org','open','-o',ORG_ALIAS,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url; }

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: true, viewport:{width:1440,height:900}, args:['--no-sandbox','--disable-gpu'] });
  const report = {};
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/SetupOneHome/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(9000);

    // Type "Agentforce" into quick find
    await page.evaluate((t) => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      for (const n of walk(document)){
        if (n.tagName==='INPUT' && /Quick Find|Search Setup/i.test(n.placeholder||'')){
          n.focus(); n.value=t; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); return;
        }
      }
    }, 'Agentforce');
    await sleep(2500);
    report.agentforceLinks = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      const out=[]; for (const n of walk(document)){ if (n.tagName==='A'){ const t=(n.textContent||'').trim(); if(t) out.push(t); } }
      return [...new Set(out)].filter(l=>/agent|bot|einstein|generative|copilot/i.test(l));
    });
    await page.screenshot({ path: path.join(OUT_DIR,'quickfind-agentforce.png') });
    console.log('Quick Find "Agentforce" links:\n', report.agentforceLinks.join('\n'));

    // Try the App Launcher search for "Agent" to see if Agentforce Studio app exists
    await page.goto(frontdoor('lightning/setup/SetupOneHome/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(6000);

    // Re-read Einstein Setup full text for any "Agent" mentions / new sections
    await page.goto(frontdoor('lightning/setup/EinsteinGPTSetup/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(10000);
    const einsteinText = await page.evaluate(()=>{ const m=document.querySelector('[role="main"],.setupcontent')||document.body; return m?m.innerText:''; });
    report.einsteinSetupMentionsAgent = /agent/i.test(einsteinText);
    report.einsteinSetupSections = einsteinText.split('\n').filter(l=>/^(Turn on|Agent|Einstein|Prompt|Global|Allow|Deploy|Service|Bot)/i.test(l.trim())).slice(0,25);
    console.log('\nEinstein Setup sections:\n', report.einsteinSetupSections.join('\n'));
    console.log('\nMentions "agent":', report.einsteinSetupMentionsAgent);
  } finally {
    fs.writeFileSync(path.join(OUT_DIR,'decisive-report.json'), JSON.stringify(report,null,2));
    await ctx.close();
  }
  console.log('\nDONE.');
})();
