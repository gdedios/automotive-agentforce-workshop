// Phase 5b/c/d driver: navigate to Electra Auto Concierge detail, inspect topics/actions,
// activate it, run Conversation Preview against canonical Spanish prompts.
//
// Strategy:
// 1. Open Agentforce Studio agents list (frontdoor URL)
// 2. Read href from "Electra Auto Concierge" row link, navigate directly
// 3. Capture topics + actions in agent canvas
// 4. Find Activate button, click, confirm
// 5. Open Conversation Preview, fire each prompt, capture response

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_drive');
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
  return file;
}

// Find an element by text (deep, including shadow roots) and return a unique CSS selector path
async function findHrefByText(page, text) {
  return page.evaluate((needle) => {
    function walk(root) {
      for (const a of root.querySelectorAll('a')) {
        if ((a.textContent || '').trim() === needle) {
          return { href: a.href, text: a.textContent.trim() };
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
  }, text).catch(() => null);
}

// Deep query for buttons matching regex
async function findButtonsMatching(page, regex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    const found = [];
    function walk(root) {
      for (const b of root.querySelectorAll('button, *[role="button"], lightning-button button')) {
        const t = (b.textContent || '').trim();
        if (t && re.test(t) && t.length < 60) {
          found.push({ text: t, disabled: b.disabled || b.getAttribute('aria-disabled') === 'true' });
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return found;
  }, regex.source).catch(() => []);
}

async function deepClickByText(page, regex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function walk(root) {
      for (const b of root.querySelectorAll('a, button, *[role="button"], lightning-button button')) {
        const t = (b.textContent || '').trim();
        if (t && re.test(t)) {
          b.click();
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
  }, regex.source).catch(() => null);
}

async function captureCanvas(page) {
  return page.evaluate(() => {
    const out = { topics: [], actions: [], textHits: [] };
    const TOPIC_RE = /(Descubrimiento.de.Veh|Prueba.de.Manejo|Estado.y.FAQ|Agent Router|escalation|off.topic|ambiguous)/i;
    const ACTION_RE = /(Get_Vehicle_Catalog|Get_Vehicle_Detail|Schedule_Test_Drive|Get_Test_Drive_Status)/i;
    function walk(root) {
      for (const el of root.querySelectorAll('*')) {
        const t = (el.textContent || '').trim();
        if (t && t.length > 3 && t.length < 120) {
          if (TOPIC_RE.test(t) && !out.topics.includes(t)) out.topics.push(t);
          if (ACTION_RE.test(t) && !out.actions.includes(t)) out.actions.push(t);
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return out;
  }).catch(() => ({ topics: [], actions: [] }));
}

(async () => {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  const summary = { steps: [] };

  try {
    // ---- 1) Open Studio agents list ----
    console.log('\n=== 1) Open Studio ===');
    const url = frontdoor('/lightning/n/standard-AgentforceStudio?c__nav=agents');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    const tmt = await deepClickByText(page, /^Take Me There$/);
    if (tmt) { console.log('[click] Take Me There'); await sleep(15000); }
    await shot(page, '01-studio-list');

    // ---- 2) Find row href + navigate ----
    console.log('\n=== 2) Read agent href ===');
    const link = await findHrefByText(page, 'Electra Auto Concierge');
    console.log('[link]', link);
    summary.steps.push({ step: 'find-link', link });
    if (!link) throw new Error('agent link not found in Studio list');

    console.log('[goto]', link.href);
    await page.goto(link.href, { waitUntil: 'domcontentloaded' });
    await sleep(20000);
    await shot(page, '02-agent-detail');

    // ---- 3) Capture canvas ----
    console.log('\n=== 3) Capture topics + actions ===');
    const canvas = await captureCanvas(page);
    console.log('[canvas]', JSON.stringify(canvas, null, 2));
    summary.steps.push({ step: 'capture-canvas', canvas });

    // ---- 4) Find Activate button ----
    console.log('\n=== 4) Activation candidate buttons ===');
    const buttons = await findButtonsMatching(page, /^(activate|activar|enable|publish|deactivate|desactivar)$/i);
    console.log('[buttons]', buttons);
    summary.steps.push({ step: 'find-activate', buttons });

    // Scroll the page to ensure Activate is visible (it's usually top-right toolbar)
    if (buttons.find(b => /^activate$/i.test(b.text) || /^activar$/i.test(b.text))) {
      const clicked = await deepClickByText(page, /^(activate|activar)$/i);
      console.log('[click activate]', clicked);
      summary.steps.push({ step: 'click-activate', clicked });
      await sleep(8000);
      await shot(page, '03-after-activate');

      // Sometimes a confirm dialog appears
      const confirm = await deepClickByText(page, /^(activate|activar|confirm|confirmar|continue|continuar)$/i);
      if (confirm) {
        console.log('[click confirm]', confirm);
        await sleep(20000);
        await shot(page, '04-after-confirm');
      }

      // Re-scan for state
      const after = await findButtonsMatching(page, /^(deactivate|desactivar|active|activo)$/i);
      console.log('[post-state]', after);
      summary.steps.push({ step: 'post-activate-state', after });
    } else {
      console.log('[no activate button visible — agent may already be active or button is in a menu]');
    }

    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('\n[done]', path.join(OUT_DIR, 'summary.json'));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal');
    process.exitCode = 1;
  } finally {
    await sleep(3000);
    await context.close();
  }
})();
