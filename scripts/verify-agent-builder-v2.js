// v2 — click "Take Me There" to enter Agentforce Studio app, then list agents.

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

async function deepClickByText(page, matcher) {
  return page.evaluate((m) => {
    const re = new RegExp(m, 'i');
    function walk(root) {
      for (const el of root.querySelectorAll('a, button, *[role="button"], lightning-button')) {
        const t = (el.textContent || '').trim();
        if (t && re.test(t)) {
          el.click();
          return t;
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const r = walk(n.shadowRoot);
          if (r) return r;
        }
      }
      return null;
    }
    return walk(document);
  }, matcher).catch(() => null);
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
    const url = frontdoor('/lightning/n/standard-AgentforceStudio?c__nav=agents');
    console.log('[goto] AgentforceStudio');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    const tookMeThere = await deepClickByText(page, '^Take Me There$');
    console.log('[take-me-there click]:', tookMeThere);
    await sleep(15000);
    await shot(page, '3-after-take-me-there');

    // Now look for an Agents listing — collect all visible text matching agent label patterns
    const findings = await page.evaluate(() => {
      const labels = new Set();
      const allText = [];
      function walk(root) {
        for (const el of root.querySelectorAll('a, button, span, td, th, h1, h2, h3, lightning-formatted-text, lightning-formatted-text *')) {
          const t = (el.textContent || '').trim();
          if (t && t.length < 120) allText.push(t);
          if (t && t.length < 80 && /electra|customer.support|concierge|assistant/i.test(t)) {
            labels.add(t);
          }
        }
        for (const n of root.querySelectorAll('*')) {
          if (n.shadowRoot) walk(n.shadowRoot);
        }
      }
      walk(document);
      return { labels: [...labels], count: allText.length, sample: allText.slice(0, 80) };
    }).catch(() => ({ labels: [], count: 0, sample: [] }));
    console.log('[matched]', findings.labels);
    console.log('[sample]', findings.sample.slice(0, 40));

    fs.writeFileSync(path.join(OUT_DIR, 'verify-results-v2.json'), JSON.stringify({ url: page.url(), ...findings }, null, 2));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal-v2');
    process.exitCode = 1;
  } finally {
    await sleep(3000);
    await context.close();
  }
})();
