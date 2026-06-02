// Phase 9: detailed Einstein GPT setup probe on the DRIFT org.
// Waits longer, dismisses Spring'26 splash, screenshots the settled page,
// and dumps the main content area text (not the chrome) to read the real toggle state.

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

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT, headless: true, viewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-gpu'],
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    const url = frontdoor('lightning/setup/EinsteinGPTSetup/home');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // The Setup domain probe redirects once or twice early. Let it settle first.
    await sleep(8000);
    // Settle loop: wait up to 30s for real content (look for a toggle or heading text)
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      let txt = '';
      try { txt = await page.evaluate(() => document.body ? document.body.innerText : ''); }
      catch { await sleep(1500); continue; } // navigation in flight; retry
      if (/Einstein Generative AI|Turn on Einstein|Einstein Setup|Agentforce|generative/i.test(txt)) break;
    }
    // Dismiss any splash/popup
    for (const label of ['Dismiss', 'Skip', 'Got it', 'Close', 'Done']) {
      try {
        const b = page.locator(`button:has-text("${label}")`).first();
        if (await b.isVisible({ timeout: 800 })) { await b.click({ timeout: 1500 }); await sleep(1500); }
      } catch {}
    }
    await sleep(3000);
    await page.screenshot({ path: path.join(OUT_DIR, 'einstein-gpt-settled.png'), fullPage: true });

    // Pull the main content region text, excluding nav chrome
    const mainText = await page.evaluate(() => {
      const main = document.querySelector('.setupcontent, .oneConsoleTab, [role="main"], .slds-template_default') || document.body;
      return main ? main.innerText : '';
    });
    fs.writeFileSync(path.join(OUT_DIR, 'einstein-gpt-content.txt'), mainText);

    // Look for toggles and their state
    const toggles = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('input[type="checkbox"], lightning-input, .slds-checkbox_toggle').forEach((el) => {
        const lbl = (el.getAttribute('aria-label') || el.closest('lightning-input')?.getAttribute('label') || el.textContent || '').trim().slice(0, 80);
        const checked = el.checked !== undefined ? el.checked : null;
        if (lbl) out.push({ label: lbl, checked });
      });
      return out.slice(0, 20);
    });
    fs.writeFileSync(path.join(OUT_DIR, 'einstein-gpt-toggles.json'), JSON.stringify(toggles, null, 2));

    console.log('MAIN CONTENT TEXT (first 2500 chars):\n');
    console.log(mainText.slice(0, 2500));
    console.log('\n\nTOGGLES FOUND:', JSON.stringify(toggles, null, 2));
  } finally {
    await ctx.close();
  }
  console.log('\nDONE.');
})();
