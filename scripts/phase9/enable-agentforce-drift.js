// Flip the "Agentforce" master toggle ON at EinsteinCopilot/home (Agentforce Agents page).
// Only one slds toggle on this page. Click its faux span, handle confirm, verify.
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
  const result = { step:'enable-agentforce', clicked:false, confirmed:null, afterChecked:null };
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/EinsteinCopilot/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(9000);
    for (let i=0;i<20;i++){ await sleep(1000); let t=''; try{t=await page.evaluate(()=>document.body?.innerText||'');}catch{continue;} if(/Agentforce Agents/i.test(t))break; }
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-before.png') });

    const clickRes = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      for (const n of walk(document)){
        if (n.classList?.contains('slds-checkbox_toggle')){
          const cb = n.querySelector('input[type="checkbox"]');
          if (cb && cb.checked) return { ok:true, already:true };
          const faux = n.querySelector('.slds-checkbox_faux, label, .slds-checkbox_toggle__label') || cb;
          faux.click();
          return { ok:true, clicked:true, cls: faux.className?.toString().slice(0,50) };
        }
      }
      return { ok:false, why:'no toggle' };
    });
    result.clicked = clickRes.ok && !clickRes.already;
    result.clickDetail = clickRes;
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-midclick.png') });

    // Confirmation modal (Agentforce enable often shows a terms / Turn On dialog)
    for (const label of ['Turn On','Enable','Agree','Accept','Confirm','OK','Yes','I Accept']) {
      try {
        const b = page.locator(`button:has-text("${label}")`).last();
        if (await b.isVisible({ timeout: 1000 })) { await b.click({ timeout: 2000 }); result.confirmed=label; await sleep(3500); break; }
      } catch {}
    }
    await sleep(3500);
    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-after.png'), fullPage:true });

    result.afterChecked = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      for (const n of walk(document)){ if (n.classList?.contains('slds-checkbox_toggle')){ const cb=n.querySelector('input[type="checkbox"]'); return cb?cb.checked:null; } }
      return null;
    });
    console.log('RESULT:', JSON.stringify(result,null,2));
  } catch(e){ result.error=String(e).slice(0,300); console.log('ERROR:', result.error); }
  finally { fs.writeFileSync(path.join(OUT_DIR,'enable-agentforce-result.json'), JSON.stringify(result,null,2)); await ctx.close(); }
  console.log('DONE.');
})();
