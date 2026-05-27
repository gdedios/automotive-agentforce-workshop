// Click into "Electra Auto Concierge" in Agentforce Studio and capture
// what the Builder sees: topics list, action list, activation button state.

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
      for (const el of root.querySelectorAll('a, button, span, td, *[role="link"], *[role="button"]')) {
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

    // Take Me There
    const tmt = await deepClickByText(page, '^Take Me There$');
    if (tmt) { console.log('[click] Take Me There'); await sleep(15000); }

    // Click "Electra Auto Concierge"
    const clicked = await deepClickByText(page, '^Electra Auto Concierge$');
    console.log('[click] Electra Auto Concierge:', clicked);
    if (!clicked) {
      await shot(page, 'inspect-no-link');
      throw new Error('agent link not found');
    }
    await sleep(15000);
    await shot(page, '4-agent-detail');

    // Look for Reasoning Instructions / Topics / Actions / Activate button
    const findings = await page.evaluate(() => {
      const out = {
        topics: [],
        actions: [],
        instructions: null,
        activateButton: null,
        activeFlag: null,
        pageHeader: null,
      };
      function walk(root) {
        // Header
        const h1 = root.querySelector('h1');
        if (h1 && !out.pageHeader) out.pageHeader = (h1.textContent || '').trim();

        // Activation indicator + button
        for (const b of root.querySelectorAll('button, *[role="button"]')) {
          const t = (b.textContent || '').trim();
          if (/^activate|activar|enable|publish|deploy/i.test(t) && !out.activateButton) {
            out.activateButton = { label: t, disabled: b.disabled || b.getAttribute('aria-disabled') === 'true' };
          }
        }
        for (const el of root.querySelectorAll('span, lightning-formatted-text, lightning-badge')) {
          const t = (el.textContent || '').trim();
          if (/^(active|inactive|draft|published|enabled|disabled)$/i.test(t) && !out.activeFlag) {
            out.activeFlag = t;
          }
        }
        // Topic / action labels — look for "Descubrimiento", "Prueba", "Estado", "Get_Vehicle", "Schedule_Test" anywhere
        for (const el of root.querySelectorAll('*')) {
          const t = (el.textContent || '').trim();
          if (t.length < 80 && t.length > 3) {
            if (/Descubrimiento|Prueba.de.Manejo|Estado.y.FAQ|Vehicle_Catalog|Vehicle_Detail|Schedule_Test|Test_Drive_Status/i.test(t)) {
              if (!out.topics.includes(t) && !out.actions.includes(t)) {
                if (/_/.test(t)) out.actions.push(t);
                else out.topics.push(t);
              }
            }
          }
        }
        for (const n of root.querySelectorAll('*')) {
          if (n.shadowRoot) walk(n.shadowRoot);
        }
      }
      walk(document);
      return out;
    });
    console.log('[findings]', JSON.stringify(findings, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'inspect-results.json'), JSON.stringify({ url: page.url(), ...findings }, null, 2));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'inspect-fatal');
    process.exitCode = 1;
  } finally {
    await sleep(3000);
    await context.close();
  }
})();
