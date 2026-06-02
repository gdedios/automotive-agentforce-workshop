// Inspect the DOM/shadow structure around "Turn on Einstein" to find a clickable toggle.
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
    await page.goto(frontdoor('lightning/setup/EinsteinGPTSetup/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(10000);
    for (let i=0;i<15;i++){ await sleep(1000); let t=''; try{t=await page.evaluate(()=>document.body?.innerText||'');}catch{continue;} if(/Turn on Einstein/i.test(t))break; }
    await sleep(2000);

    // Deep search through shadow roots for the toggle near "Turn on Einstein"
    const report = await page.evaluate(() => {
      const out = { checkboxes: [], toggleLabels: [], buttons: [] };
      function* walk(root){
        const nodes = root.querySelectorAll('*');
        for (const n of nodes){
          yield n;
          if (n.shadowRoot) yield* walk(n.shadowRoot);
        }
      }
      let idx = 0;
      for (const n of walk(document)){
        const tag = n.tagName?.toLowerCase();
        if (tag === 'input' && n.type === 'checkbox'){
          out.checkboxes.push({ i: idx, ariaLabel: n.getAttribute('aria-label'), name: n.name, checked: n.checked, id: n.id });
        }
        if (n.classList?.contains('slds-checkbox_toggle')){
          out.toggleLabels.push({ i: idx, text: (n.textContent||'').trim().slice(0,60) });
        }
        if (tag === 'button'){
          const tx = (n.textContent||'').trim();
          if (tx && tx.length < 30) out.buttons.push(tx);
        }
        idx++;
      }
      out.buttons = [...new Set(out.buttons)].slice(0, 25);
      return out;
    });
    fs.writeFileSync(path.join(OUT_DIR,'einstein-dom-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await ctx.close(); }
})();
