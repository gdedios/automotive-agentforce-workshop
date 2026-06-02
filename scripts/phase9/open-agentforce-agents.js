// Navigate to the "Agentforce Agents" setup node via Quick Find click (not URL guessing).
// Capture whether there's an enablement toggle / "Get Started" and its state.
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

async function clickQuickFindResult(page, term, linkText){
  await page.evaluate((t) => {
    function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
    for (const n of walk(document)){
      if (n.tagName==='INPUT' && /Quick Find|Search Setup/i.test(n.placeholder||'')){
        n.focus(); n.value=t; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); return;
      }
    }
  }, term);
  await sleep(2500);
  const clicked = await page.evaluate((lt) => {
    function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
    for (const n of walk(document)){
      if (n.tagName==='A' && (n.textContent||'').trim().startsWith(lt)){ n.click(); return true; }
    }
    return false;
  }, linkText);
  return clicked;
}

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: true, viewport:{width:1440,height:900}, args:['--no-sandbox','--disable-gpu'] });
  const report = {};
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    await page.goto(frontdoor('lightning/setup/SetupOneHome/home'), { waitUntil:'domcontentloaded', timeout:30000 });
    await sleep(9000);
    report.clickedAgents = await clickQuickFindResult(page, 'Agentforce', 'Agentforce Agents');
    await sleep(10000);
    report.urlAfter = page.url();
    let txt=''; try{ txt = await page.evaluate(()=>{ const m=document.querySelector('[role="main"],.setupcontent')||document.body; return m?m.innerText:''; }); }catch{}
    report.contentSample = txt.slice(0,1500);
    report.toggles = await page.evaluate(()=>{ function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } } const out=[]; for (const n of walk(document)){ if (n.classList?.contains('slds-checkbox_toggle')){ const cb=n.querySelector('input[type="checkbox"]'); out.push({text:(n.textContent||'').trim().slice(0,80),checked:cb?cb.checked:null}); } } return out; });
    report.buttons = await page.evaluate(()=>{ function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } } const out=[]; for (const n of walk(document)){ if (n.tagName==='BUTTON'){ const t=(n.textContent||'').trim(); if(t&&t.length<40)out.push(t);} } return [...new Set(out)].slice(0,30); });
    await page.screenshot({ path: path.join(OUT_DIR,'agentforce-agents-node.png'), fullPage:true });
    console.log('clickedAgents:', report.clickedAgents, '| url:', report.urlAfter);
    console.log('\nCONTENT:\n', report.contentSample);
    console.log('\nTOGGLES:', JSON.stringify(report.toggles));
    console.log('\nBUTTONS:', JSON.stringify(report.buttons));
  } finally {
    fs.writeFileSync(path.join(OUT_DIR,'agentforce-agents-report.json'), JSON.stringify(report,null,2));
    await ctx.close();
  }
  console.log('\nDONE.');
})();
