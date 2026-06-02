// Patient probe of EinsteinAgentSetup/home (the Agentforce setup page) on the DRIFT org.
// Long settle, dump all toggle labels + states through shadow roots, screenshot.
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
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/EinsteinAgentSetup/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    // Patient settle: up to 40s waiting for non-skeleton content
    let txt='';
    for (let i=0;i<40;i++){
      await sleep(1000);
      try { txt = await page.evaluate(()=>{ const m=document.querySelector('[role="main"],.setupcontent,.slds-template_default')||document.body; return m?m.innerText:''; }); } catch { continue; }
      if (/Agentforce|Einstein Bots|agent|Service Agent|Turn on/i.test(txt) && txt.length > 60) break;
    }
    await sleep(4000);
    await page.screenshot({ path: path.join(OUT_DIR,'agent-setup-settled.png'), fullPage:true });
    const toggles = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      const out=[];
      for (const n of walk(document)){
        if (n.classList?.contains('slds-checkbox_toggle')){
          const cb=n.querySelector('input[type="checkbox"]');
          out.push({ text:(n.textContent||'').trim().slice(0,80), checked: cb?cb.checked:null });
        }
      }
      return out;
    });
    fs.writeFileSync(path.join(OUT_DIR,'agent-setup-content.txt'), txt);
    fs.writeFileSync(path.join(OUT_DIR,'agent-setup-toggles.json'), JSON.stringify(toggles,null,2));
    console.log('CONTENT (first 1800):\n', txt.slice(0,1800));
    console.log('\nTOGGLES:', JSON.stringify(toggles,null,2));
  } finally { await ctx.close(); }
  console.log('DONE.');
})();
