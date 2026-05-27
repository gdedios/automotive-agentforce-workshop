// Open the NEW Agentforce Builder and screenshot the agent list to confirm
// ElectraAI_Auto_Concierge is published + visible.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_verify');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(setupPath) {
  const out = execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', setupPath, '--json'], {
    encoding: 'utf8',
  });
  return JSON.parse(out).result.url;
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  console.log(`[shot] ${file}`);
}

(async () => {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // NEW Agentforce Studio (not the legacy /lightning/setup/EinsteinCopilot/home)
    const url = frontdoor('/lightning/n/standard-AgentforceStudio?c__nav=agents');
    console.log('[goto] AgentforceStudio (NEW Builder)');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(15000);
    await shot(page, '1-studio-landed');

    // Dismiss "Try Field Service Setup" popup if present
    const dismissed = await page.evaluate(() => {
      for (const b of document.querySelectorAll('button')) {
        if ((b.textContent || '').trim().toLowerCase() === 'dismiss') {
          b.click();
          return true;
        }
      }
      return false;
    }).catch(() => false);
    if (dismissed) console.log('[popup] dismissed');
    await sleep(3000);

    await shot(page, '2-studio-final');

    // Extract any agent labels visible on the page (deep DOM walk including shadow roots)
    const agentLabels = await page.evaluate(() => {
      const labels = new Set();
      function walk(root) {
        for (const el of root.querySelectorAll('a, button, span, td, lightning-formatted-text, *[data-aura-class*="agent"]')) {
          const t = (el.textContent || '').trim();
          if (t && t.length < 80 && /electra|customer.support|concierge|assistant/i.test(t)) {
            labels.add(t);
          }
        }
        for (const n of root.querySelectorAll('*')) {
          if (n.shadowRoot) walk(n.shadowRoot);
        }
      }
      walk(document);
      return [...labels];
    }).catch(() => []);
    console.log('[matched labels]', agentLabels);

    fs.writeFileSync(path.join(OUT_DIR, 'verify-results.json'), JSON.stringify({ url: page.url(), agentLabels }, null, 2));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal');
    process.exitCode = 1;
  } finally {
    await sleep(3000);
    await context.close();
  }
})();
