// Ej4 drift step: turn ON "Turn on Einstein" on the Electra_Ej4 org.
// Target identified via DOM inspection: the slds toggle whose label text starts
// with "Turn on Einstein" (first checkbox, id like checkbox-toggle-NNN).
// Click the toggle's <label> (slds pattern), handle confirm modal, verify checked.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Ej4';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-ej4';
const PROJECT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(PROJECT, 'docs', 'ej4_probe');
fs.mkdirSync(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function frontdoor(p){ return JSON.parse(execFileSync('sf',['org','open','-o',ORG_ALIAS,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url; }

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: true, viewport:{width:1440,height:900}, args:['--no-sandbox','--disable-gpu'] });
  const result = { step: 'enable-einstein', clicked: false, confirmed: null, afterChecked: null };
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/EinsteinGPTSetup/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(10000);
    for (let i=0;i<15;i++){ await sleep(1000); let t=''; try{t=await page.evaluate(()=>document.body?.innerText||'');}catch{continue;} if(/Turn on Einstein/i.test(t))break; }
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT_DIR,'einstein-before.png') });

    // Click the toggle label for "Turn on Einstein" — deep shadow walk.
    const clickRes = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      // Find the slds toggle container whose text starts with "Turn on Einstein"
      let container = null;
      for (const n of walk(document)){
        if (n.classList?.contains('slds-checkbox_toggle') && /^Turn on Einstein/.test((n.textContent||'').trim())){ container = n; break; }
      }
      if (!container) return { ok:false, why:'toggle container not found' };
      const cb = container.querySelector('input[type="checkbox"]');
      if (cb && cb.checked) return { ok:true, already:true };
      // The clickable part of an slds toggle is the <label> with class slds-checkbox_faux_container or the faux span
      const faux = container.querySelector('.slds-checkbox_faux, label, .slds-checkbox_toggle__label');
      const target = faux || cb;
      if (!target) return { ok:false, why:'no clickable target' };
      target.click();
      return { ok:true, clickedTag: target.tagName, clickedClass: target.className?.toString().slice(0,60) };
    });
    result.clicked = clickRes.ok && !clickRes.already;
    result.clickDetail = clickRes;
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR,'einstein-midclick.png') });

    // Confirmation modal: "Turn On" is the usual confirm button label
    for (const label of ['Turn On','Enable','Turn on','Confirm','OK','Yes','Save']) {
      try {
        const b = page.locator(`button:has-text("${label}")`).last();
        if (await b.isVisible({ timeout: 1000 })) { await b.click({ timeout: 2000 }); result.confirmed = label; await sleep(3000); break; }
      } catch {}
    }
    await sleep(3000);
    await page.screenshot({ path: path.join(OUT_DIR,'einstein-after.png') });

    // Verify
    result.afterChecked = await page.evaluate(() => {
      function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
      for (const n of walk(document)){
        if (n.classList?.contains('slds-checkbox_toggle') && /^Turn on Einstein/.test((n.textContent||'').trim())){
          const cb = n.querySelector('input[type="checkbox"]'); return cb ? cb.checked : null;
        }
      }
      return null;
    });
    console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch (e) {
    result.error = String(e).slice(0,300);
    console.log('ERROR:', result.error);
  } finally {
    fs.writeFileSync(path.join(OUT_DIR,'enable-einstein-result.json'), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  console.log('DONE.');
})();
