// Phase 9 capability probe for the DRIFT org (Electra_Auto_Drift).
// Question: is Agentforce/Einstein available-but-OFF, or genuinely ABSENT on this DE org?
// Strategy: frontdoor into EinsteinGPTSetup + EinsteinCopilot setup pages, screenshot,
// and dump visible text so Opus can read the actual state instead of guessing.
//
// Run: NODE_PATH=/Users/gdedios/.npm/_npx/e41f203b7505f1fb/node_modules \
//      node scripts/phase9/probe-agentforce-capability.js
// Hard time budget: ~120s total. Never hangs the session.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto_Drift';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-drift-probe';
const PROJECT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(PROJECT, 'docs', 'phase9_probe');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(setupPath) {
  const out = execFileSync('sf', ['org', 'open', '-o', ORG_ALIAS, '-p', setupPath, '--url-only', '--json'], { encoding: 'utf8' });
  return JSON.parse(out).result.url;
}

const PAGES = [
  { name: 'einstein-gpt', path: 'lightning/setup/EinsteinGPTSetup/home' },
  { name: 'agentforce-copilot', path: 'lightning/setup/EinsteinCopilot/home' },
  { name: 'agents-studio', path: 'lightning/setup/EinsteinAgentforce/home' },
];

(async () => {
  const results = {};
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT,
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-gpu'],
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    for (const p of PAGES) {
      try {
        const url = frontdoor(p.path);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Wait for either Lightning to settle or login to resolve; cap at 18s.
        for (let i = 0; i < 18; i++) {
          await sleep(1000);
          const u = page.url();
          if (u.includes('lightning.force.com') || u.includes('/setup/')) break;
        }
        await sleep(4000); // let setup content paint
        const finalUrl = page.url();
        const bodyText = (await page.evaluate(() => document.body ? document.body.innerText : '')).slice(0, 4000);
        const shot = path.join(OUT_DIR, `${p.name}.png`);
        await page.screenshot({ path: shot, fullPage: false });
        results[p.name] = {
          requested: p.path,
          finalUrl,
          onLogin: /login\.salesforce\.com|\/login|verification/.test(finalUrl),
          textSample: bodyText,
          screenshot: shot,
        };
        console.log(`\n===== ${p.name} =====`);
        console.log('finalUrl:', finalUrl);
        console.log('textSample:\n', bodyText.replace(/\n{2,}/g, '\n'));
      } catch (e) {
        results[p.name] = { requested: p.path, error: String(e).slice(0, 300) };
        console.log(`\n===== ${p.name} ERROR =====\n`, String(e).slice(0, 300));
      }
    }
  } finally {
    fs.writeFileSync(path.join(OUT_DIR, 'probe-results.json'), JSON.stringify(results, null, 2));
    await ctx.close();
  }
  console.log('\nDONE. Screenshots + probe-results.json in', OUT_DIR);
})();
