// Decisive check: type "Agent" into Setup Quick Find and capture the matching nav links.
// Also expand the Einstein sidebar node. Tells us definitively whether this DE org
// exposes any Agentforce/Agents/Bots enablement node at all.
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

async function search(page, term){
  // Find the Quick Find input through shadow roots and type
  const typed = await page.evaluate((t) => {
    function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
    for (const n of walk(document)){
      if (n.tagName==='INPUT' && /Quick Find|Search Setup/i.test(n.placeholder||'')){
        n.focus(); n.value=t; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true}));
        return true;
      }
    }
    return false;
  }, term);
  await sleep(2500);
  const links = await page.evaluate(() => {
    function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
    const out=[]; for (const n of walk(document)){ if (n.tagName==='A'){ const t=(n.textContent||'').trim(); if(t && t.length<50) out.push(t); } }
    return [...new Set(out)];
  });
  return { typed, links };
}

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: true, viewport:{width:1440,height:900}, args:['--no-sandbox','--disable-gpu'] });
  const report = {};
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/SetupOneHome/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(9000);
    for (const term of ['Agent','Bot','Einstein']){
      const r = await search(page, term);
      // Filter to relevant-looking links
      const relevant = r.links.filter(l => /agent|bot|einstein|copilot|generative/i.test(l));
      report[term] = { typed:r.typed, relevantLinks: relevant };
      console.log(`\n== Quick Find "${term}" ==  (typed:${r.typed})`);
      console.log(relevant.join('\n') || '(no relevant links)');
      await page.screenshot({ path: path.join(OUT_DIR,`quickfind-${term}.png`) });
    }
  } finally {
    fs.writeFileSync(path.join(OUT_DIR,'quickfind-report.json'), JSON.stringify(report,null,2));
    await ctx.close();
  }
  console.log('\nDONE.');
})();
