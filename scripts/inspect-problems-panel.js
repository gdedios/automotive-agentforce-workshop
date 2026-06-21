// Open the Builder, click Commit Version to surface validation, then read the
// "Problems" panel content + any red error decorations on subagents.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_problems');
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

async function deepClickByText(page, regex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function walk(root) {
      for (const b of root.querySelectorAll('a, button, *[role="button"], *[role="tab"]')) {
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

async function dumpProblems(page) {
  return page.evaluate(() => {
    const out = { problemsTabBadge: null, problems: [], explorerErrors: [], allRedText: [] };
    function walk(root) {
      // Anything that looks like a tab labeled "Problems"
      for (const t of root.querySelectorAll('*[role="tab"], button, span, div')) {
        const txt = (t.textContent || '').trim();
        if (/^Problems(\s*\d+)?$/i.test(txt) && txt.length < 40 && !out.problemsTabBadge) {
          out.problemsTabBadge = txt;
        }
      }
      // Explorer tree: nodes with class indicating error/red
      for (const el of root.querySelectorAll('*[class*="error" i], *[class*="invalid" i], *[aria-invalid="true"]')) {
        const t = (el.textContent || '').trim();
        if (t && t.length < 200 && !out.explorerErrors.includes(t)) out.explorerErrors.push(t);
      }
      // Anything with explicit red color via inline style
      for (const el of root.querySelectorAll('*')) {
        const style = (el.getAttribute && el.getAttribute('style')) || '';
        if (/color\s*:\s*(#?(b|c|d|e|f)[0-9a-f]{2,5}|red|rgb\(\s*[12][0-9][0-9])/i.test(style)) {
          const t = (el.textContent || '').trim();
          if (t && t.length > 3 && t.length < 200 && !out.allRedText.includes(t)) out.allRedText.push(t);
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return out;
  }).catch((e) => ({ error: String(e) }));
}

async function dumpProblemsPanelContent(page) {
  // After clicking the Problems tab, read the panel's list items
  return page.evaluate(() => {
    const out = { items: [] };
    function walk(root) {
      // Look for a panel that contains "Problems" header and a list
      for (const panel of root.querySelectorAll('*[class*="problems" i], *[role="tabpanel"]')) {
        const items = panel.querySelectorAll('li, *[role="treeitem"], *[role="row"], div[class*="row"]');
        for (const it of items) {
          const t = (it.textContent || '').trim();
          if (t && t.length > 5 && t.length < 600 && !out.items.includes(t)) out.items.push(t);
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return out;
  }).catch((e) => ({ error: String(e) }));
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

  try {
    const directUrl = `https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC`;
    const fd = frontdoor('/lightning/n/standard-AgentforceStudio?c__nav=agents');
    await page.goto(fd, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await deepClickByText(page, /^Take Me There$/);
    await sleep(6000);
    await page.goto(directUrl, { waitUntil: 'domcontentloaded' });
    await sleep(15000);
    await shot(page, '01-builder-loaded');

    // Cancel any open dialog from previous run
    await deepClickByText(page, /^Cancel$/);
    await sleep(2000);

    // Click the Problems tab at bottom-left
    const probTab = await deepClickByText(page, /^Problems(\s*\d+)?$/);
    console.log('[click Problems tab]:', probTab);
    await sleep(3000);
    await shot(page, '02-problems-panel-open');

    const panel = await dumpProblemsPanelContent(page);
    console.log('[panel items]:', JSON.stringify(panel, null, 2));

    const dump = await dumpProblems(page);
    console.log('[explorer errors]:', JSON.stringify(dump.explorerErrors, null, 2));
    console.log('[red text]:', JSON.stringify(dump.allRedText.slice(0, 30), null, 2));

    fs.writeFileSync(path.join(OUT_DIR, 'problems.json'), JSON.stringify({ panel, dump }, null, 2));
    console.log('[done]', path.join(OUT_DIR, 'problems.json'));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal');
    process.exitCode = 1;
  } finally {
    await sleep(2000);
    await context.close();
  }
})();
