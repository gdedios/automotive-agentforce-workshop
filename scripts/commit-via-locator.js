// Use Playwright's getByRole locator (which natively pierces shadow DOM and uses
// accessibility tree) to click the Commit Version button inside the dialog.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_commit_via_locator');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fd = JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', '/lightning/n/standard-AgentforceStudio?c__nav=agents', '--json'], { encoding: 'utf8' })).result.url;

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(30000);

  try {
    await page.goto(fd, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await page.evaluate(() => {
      function w(r){for(const a of r.querySelectorAll('a,button,*[role="button"]')){if((a.textContent||'').trim()==='Take Me There'){a.click();return;}}for(const n of r.querySelectorAll('*'))if(n.shadowRoot)w(n.shadowRoot);} w(document);
    });
    await sleep(6000);
    await page.goto('https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC', { waitUntil: 'domcontentloaded' });
    await sleep(15000);
    await page.screenshot({ path: path.join(OUT_DIR, '01-loaded.png'), fullPage: true });

    // Click toolbar Commit Version using getByRole
    console.log('=== getByRole approach ===');
    const allButtons = page.getByRole('button', { name: /^Commit Version$/, exact: true });
    const cnt = await allButtons.count();
    console.log('found', cnt, 'Commit Version buttons via getByRole');

    if (cnt === 0) {
      throw new Error('no Commit Version buttons found via getByRole');
    }

    // Click the first one (toolbar)
    await allButtons.first().click({ timeout: 10000 });
    console.log('toolbar Commit Version clicked');
    await sleep(8000);
    await page.screenshot({ path: path.join(OUT_DIR, '02-after-toolbar-click.png'), fullPage: true });

    // Now there should be at least 2 — one in toolbar, one in dialog
    const after = await allButtons.count();
    console.log('after toolbar click:', after, 'Commit Version buttons');

    if (after >= 2) {
      // Click the LAST one (dialog button always renders last — modal mounts after toolbar)
      await allButtons.last().click({ timeout: 10000 });
      console.log('modal Commit Version clicked');
      await sleep(15000);
      await page.screenshot({ path: path.join(OUT_DIR, '03-after-modal-click.png'), fullPage: true });
    } else {
      console.log('only', after, 'Commit Version buttons after toolbar click — modal didn\'t open');
    }

    // Final state
    await sleep(5000);
    await page.screenshot({ path: path.join(OUT_DIR, '04-final.png'), fullPage: true });

    // Read any error banner text
    const errors = await page.evaluate(() => {
      const out = [];
      function walk(root) {
        // Look for explicit error/banner regions
        for (const el of root.querySelectorAll('*[class*="error" i], *[role="alert"], *[class*="banner" i], *[class*="toast" i]')) {
          const t = (el.textContent || '').trim();
          if (t && t.length > 30 && t.length < 1500 && !out.some(x => x.slice(0,40) === t.slice(0,40))) {
            out.push(t);
          }
        }
        for (const n of root.querySelectorAll('*')) if (n.shadowRoot) walk(n.shadowRoot);
      }
      walk(document);
      return out;
    });
    console.log('=== ERROR/ALERT TEXT ===');
    errors.forEach((e, i) => console.log(`[${i}]`, e.slice(0, 500)));
    fs.writeFileSync(path.join(OUT_DIR, 'errors.json'), JSON.stringify(errors, null, 2));
  } catch (err) {
    console.error('[FATAL]', err.message);
    await page.screenshot({ path: path.join(OUT_DIR, 'fatal.png'), fullPage: true });
  } finally {
    await sleep(2000);
    await ctx.close();
  }
})();
