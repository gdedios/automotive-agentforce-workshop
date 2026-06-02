// Find where the Agentforce master toggle lives on the DRIFT (DE) org now that Einstein is ON.
// Try several known setup paths; for each, dump heading + any toggle labels; screenshot.

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

const CANDIDATES = [
  { name: 'agents-setup',          path: 'lightning/setup/EinsteinAgentSetup/home' },
  { name: 'agentforce-studio-nav', path: 'lightning/n/standard-AgentforceStudio' },
  { name: 'einstein-agent',        path: 'lightning/setup/EinsteinAgent/home' },
  { name: 'bot-setup',             path: 'lightning/setup/EinsteinAgentforceOnboarding/home' },
  { name: 'einstein-copilot-svc',  path: 'lightning/setup/CopilotSetup/home' },
  { name: 'agentforce-agents',     path: 'lightning/setup/AiAgentMgmt/home' },
];

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: true, viewport:{width:1440,height:900}, args:['--no-sandbox','--disable-gpu'] });
  const results = {};
  try {
    const page = ctx.pages()[0] || await ctx.newPage();
    for (const c of CANDIDATES){
      try {
        await page.goto(frontdoor(c.path), { waitUntil:'domcontentloaded', timeout:30000 });
        await sleep(7000);
        let txt=''; try{ txt = await page.evaluate(()=>{ const m=document.querySelector('[role="main"],.setupcontent,.slds-template_default')||document.body; return m?m.innerText:''; }); }catch{}
        const notFound = /Page not found|doesn't support|don't have permission|Insufficient Privileges/i.test(txt);
        const toggleLabels = await page.evaluate(() => {
          function* walk(root){ for (const n of root.querySelectorAll('*')){ yield n; if (n.shadowRoot) yield* walk(n.shadowRoot); } }
          const labels=[]; for (const n of walk(document)){ if (n.classList?.contains('slds-checkbox_toggle')){ const t=(n.textContent||'').trim().slice(0,70); if(t) labels.push(t); } }
          return [...new Set(labels)];
        });
        results[c.name] = { path:c.path, url:page.url(), notFound, head: txt.slice(0,400).replace(/\n{2,}/g,'\n'), toggleLabels };
        await page.screenshot({ path: path.join(OUT_DIR, `find-${c.name}.png`) });
        console.log(`\n== ${c.name} (${c.path}) ==`);
        console.log('notFound:', notFound, '| toggles:', JSON.stringify(toggleLabels));
        console.log('head:', txt.slice(0,300).replace(/\n{2,}/g,' / '));
      } catch(e){ results[c.name]={ path:c.path, error:String(e).slice(0,200) }; console.log(`\n== ${c.name} ERROR ==`, String(e).slice(0,150)); }
    }
  } finally {
    fs.writeFileSync(path.join(OUT_DIR,'find-agentforce-results.json'), JSON.stringify(results,null,2));
    await ctx.close();
  }
  console.log('\nDONE.');
})();
