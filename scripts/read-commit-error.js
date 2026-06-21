// Open the Builder, click Commit Version (toolbar) + Commit Version (modal),
// then capture the full text of the error banner that appears.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_commit_error');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fd = JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', '/lightning/n/standard-AgentforceStudio?c__nav=agents', '--json'], { encoding: 'utf8' })).result.url;

async function deepClick(page, regex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function walk(root) {
      for (const b of root.querySelectorAll('a, button, *[role="button"]')) {
        const t = (b.textContent || '').trim();
        if (t && re.test(t)) { b.click(); return t; }
      }
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const r = walk(n.shadowRoot); if (r) return r; }
      return null;
    }
    return walk(document);
  }, regex.source).catch(() => null);
}

async function findDialogButton(page, regex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function findDialog(root) {
      const cands = [];
      for (const el of root.querySelectorAll('*[role="dialog"], *[aria-modal="true"], *[class*="slds-modal__container"]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 100 && r.height > 100) cands.push(el);
      }
      if (cands.length) return cands[cands.length - 1];
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const f = findDialog(n.shadowRoot); if (f) return f; }
      return null;
    }
    function walk(root) {
      for (const b of root.querySelectorAll('button, *[role="button"]')) {
        const t = (b.textContent || '').trim();
        if (t && re.test(t)) {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
      }
      for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const f = walk(n.shadowRoot); if (f) return f; }
      return null;
    }
    const dlg = findDialog(document);
    if (!dlg) return null;
    return walk(dlg);
  }, regex.source).catch(() => null);
}

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, { executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 }, args: ['--no-first-run'] });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(60000);
  try {
    await page.goto(fd, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await deepClick(page, /^Take Me There$/);
    await sleep(6000);
    await page.goto('https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC', { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    // Click toolbar Commit Version
    await deepClick(page, /^Commit Version$/);
    await sleep(8000);
    // The Assign-user modal is already past this point (user provisioned earlier),
    // so this should immediately open "Commit this version?" dialog.
    // Real mouse click on dialog Commit Version
    const btn = await findDialogButton(page, /^Commit Version$/);
    console.log('[btn]', btn);
    if (btn) {
      await page.mouse.click(btn.x, btn.y);
      console.log('[clicked]');
    }
    await sleep(15000);
    await page.screenshot({ path: path.join(OUT_DIR, 'after-commit-error.png'), fullPage: true });

    // Capture all "long" text content for error banner candidates
    const errors = await page.evaluate(() => {
      const out = [];
      function walk(root) {
        for (const el of root.querySelectorAll('*')) {
          const t = (el.textContent || '').trim();
          if (t && t.length > 80 && t.length < 4000 && /couldn|error|invalid|persisted|retrieved|Generative AI|Schedule_Test|LightningType/i.test(t)) {
            if (!out.some(x => x.slice(0, 60) === t.slice(0, 60))) out.push(t);
          }
        }
        for (const n of root.querySelectorAll('*')) if (n.shadowRoot) walk(n.shadowRoot);
      }
      walk(document);
      return out.slice(0, 5);
    });
    console.log('=== ERROR BANNER TEXT ===');
    errors.forEach((e, i) => console.log(`[${i}]`, e));
    fs.writeFileSync(path.join(OUT_DIR, 'errors.json'), JSON.stringify(errors, null, 2));
  } finally {
    await sleep(2000);
    await ctx.close();
  }
})();
