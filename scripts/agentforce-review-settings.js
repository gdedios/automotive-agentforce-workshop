// Click "Review Settings" on AgentforceSetup to find the actual platform-enable toggle.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-toggles-v2';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_enable', 'review');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(p) {
  return JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', p, '--json'], { encoding: 'utf8' })).result.url;
}

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT, headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(30000);

  await page.goto(frontdoor('/lightning/setup/AgentforceSetup/home'), { waitUntil: 'domcontentloaded' });
  await sleep(15000);
  await page.screenshot({ path: path.join(OUT_DIR, '01-loaded.png'), fullPage: true });

  // Find and click "Review Settings"
  const click = await page.evaluate(() => {
    function walk(root) {
      const links = root.querySelectorAll('a, button');
      for (const a of links) {
        const t = (a.innerText || a.textContent || '').trim();
        if (/review settings/i.test(t)) {
          a.click();
          return { clicked: true, text: t, href: a.getAttribute('href') };
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
    return walk(document) || { clicked: false };
  });
  console.log('[review] click:', click);
  await sleep(8000);
  await page.screenshot({ path: path.join(OUT_DIR, '02-after-review.png'), fullPage: true });
  console.log('[url]', page.url());

  // Walk for all toggles + their headers
  const allToggles = await page.evaluate(() => {
    const out = [];
    function walk(root) {
      const cbs = root.querySelectorAll('input[type="checkbox"], input[role="switch"], button[role="switch"]');
      for (const cb of cbs) {
        let scope = cb.parentElement;
        let label = '';
        for (let i = 0; i < 5 && scope; i++) {
          const h = scope.querySelector('h1,h2,h3,h4,h5,strong,label');
          if (h) {
            label = (h.innerText || h.textContent || '').trim().slice(0, 200);
            break;
          }
          scope = scope.parentElement;
        }
        out.push({
          checked: cb.checked || cb.getAttribute('aria-checked') === 'true',
          disabled: cb.disabled || cb.getAttribute('aria-disabled') === 'true',
          label,
          tag: cb.tagName,
          role: cb.getAttribute('role'),
        });
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return out;
  });
  console.log('\n[all toggles found on AgentforceSetup]:');
  allToggles.forEach((t, i) => console.log(`  ${i}. checked=${t.checked} disabled=${t.disabled} label="${t.label}"`));

  fs.writeFileSync(path.join(OUT_DIR, 'toggles.json'), JSON.stringify(allToggles, null, 2));

  console.log('\n[done]');
  await sleep(3000);
  await ctx.close();
})();
