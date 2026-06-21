// Flip the "Agentforce" master toggle ON at EinsteinCopilot/home (Agentforce Agents page).
// V2: increased waits + body text capture for debugging.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Ej4';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-ej4';
const PROJECT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(PROJECT, 'docs', 'ej4_probe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function frontdoor(p){ return JSON.parse(execFileSync('sf',['org','open','-o',ORG_ALIAS,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url; }

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: true, viewport:{width:1440,height:900}, args:['--no-sandbox','--disable-gpu'] });
  const result = { step:'enable-agentforce', clicked:false, confirmed:null, afterChecked:null };
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/EinsteinCopilot/home'), { waitUntil:'domcontentloaded', timeout:40000 });
    console.log('Page loaded, waiting for content...');

    // Longer initial wait and more retries
    await sleep(12000);
    let bodyText = '';
    for (let i=0;i<30;i++){
      await sleep(1000);
      try{
        bodyText = await page.evaluate(()=>document.body?.innerText||'');
        console.log(`Wait ${i}: text length=${bodyText.length}, has "Agentforce"=${/Agentforce/i.test(bodyText)}`);
        if(/Agentforce Agents/i.test(bodyText))break;
      }catch(e){
        console.log(`Wait ${i}: evaluate error: ${e.message}`);
        continue;
      }
    }
    await sleep(3000);

    // Capture body text for debug
    result.bodyTextLength = bodyText.length;
    result.bodyTextSnippet = bodyText.slice(0, 500).replace(/\s+/g, ' ');

    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-before-v2.png'), fullPage:true });

    const clickRes = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      const toggles = [];
      for (const n of walk(document)){
        if (n.classList?.contains('slds-checkbox_toggle')){
          toggles.push({ text: (n.textContent||'').trim().slice(0,80), hasCheckbox: !!n.querySelector('input[type="checkbox"]') });
          const cb = n.querySelector('input[type="checkbox"]');
          if (cb && cb.checked) return { ok:true, already:true, togglesFound: toggles.length };
          const faux = n.querySelector('.slds-checkbox_faux, label, .slds-checkbox_toggle__label') || cb;
          faux.click();
          return { ok:true, clicked:true, cls: faux.className?.toString().slice(0,50), togglesFound: toggles.length };
        }
      }
      return { ok:false, why:'no toggle', togglesFound: toggles.length, togglesList: toggles };
    });
    result.clicked = clickRes.ok && !clickRes.already;
    result.clickDetail = clickRes;
    console.log('Click result:', JSON.stringify(clickRes));

    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-midclick-v2.png') });

    // Confirmation modal (Agentforce enable often shows a terms / Turn On dialog)
    for (const label of ['Turn On','Enable','Agree','Accept','Confirm','OK','Yes','I Accept']) {
      try {
        const b = page.locator(`button:has-text("${label}")`).last();
        if (await b.isVisible({ timeout: 1000 })) { await b.click({ timeout: 2000 }); result.confirmed=label; await sleep(3500); break; }
      } catch {}
    }
    await sleep(4000);
    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-after-v2.png'), fullPage:true });

    result.afterChecked = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      for (const n of walk(document)){ if (n.classList?.contains('slds-checkbox_toggle')){ const cb=n.querySelector('input[type="checkbox"]'); return cb?cb.checked:null; } }
      return null;
    });
    console.log('RESULT:', JSON.stringify(result,null,2));
  } catch(e){ result.error=String(e).slice(0,500); console.log('ERROR:', result.error); }
  finally { fs.writeFileSync(path.join(OUT_DIR,'enable-agentforce-result-v2.json'), JSON.stringify(result,null,2)); await ctx.close(); }
  console.log('DONE.');
})();
