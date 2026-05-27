// Visit /lightning/setup/EinsteinCopilot/home and find the Agentforce platform toggle.
const { chromium } = require('playwright');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-toggles-v2';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_enable', 'einstein-copilot');
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

  await page.goto(frontdoor('/lightning/setup/EinsteinCopilot/home'), { waitUntil: 'domcontentloaded' });
  await sleep(20000);
  await page.screenshot({ path: path.join(OUT_DIR, '01-loaded.png'), fullPage: true });
  console.log('[url]', page.url());

  // Enumerate all toggles
  const allToggles = await page.evaluate(() => {
    const out = [];
    function walk(root) {
      const cbs = root.querySelectorAll('input[type="checkbox"], input[role="switch"], button[role="switch"]');
      for (const cb of cbs) {
        let scope = cb.parentElement;
        let label = '';
        for (let i = 0; i < 5 && scope; i++) {
          const h = scope.querySelector('h1,h2,h3,h4,h5,strong,label,p');
          if (h) {
            label = (h.innerText || h.textContent || '').trim().slice(0, 250);
            if (label) break;
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
  console.log('\n[all toggles on EinsteinCopilot/home]:');
  allToggles.forEach((t, i) => console.log(`  ${i}. checked=${t.checked} disabled=${t.disabled} label="${t.label.replace(/\n/g, ' | ')}"`));

  // Also capture all headings on page
  const headings = await page.evaluate(() => {
    const out = [];
    function walk(root) {
      for (const h of root.querySelectorAll('h1,h2,h3,h4')) {
        const t = (h.innerText || h.textContent || '').trim();
        if (t && t.length < 200) out.push(t);
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return [...new Set(out)].slice(0, 30);
  });
  console.log('\n[headings]:');
  headings.forEach((h) => console.log('  -', h));

  fs.writeFileSync(path.join(OUT_DIR, 'toggles.json'), JSON.stringify({ allToggles, headings, url: page.url() }, null, 2));

  // If there's a "Turn on Agentforce" / similar toggle that's currently OFF and not disabled, click it
  const target = allToggles.find((t) => !t.checked && !t.disabled && /agentforce|copilot|einstein|turn on|enable/i.test(t.label));
  console.log('\n[target toggle]', target);

  if (target) {
    const click = await page.evaluate((targetLabel) => {
      function walk(root) {
        const cbs = root.querySelectorAll('input[type="checkbox"], input[role="switch"], button[role="switch"]');
        for (const cb of cbs) {
          let scope = cb.parentElement;
          let label = '';
          for (let i = 0; i < 5 && scope; i++) {
            const h = scope.querySelector('h1,h2,h3,h4,h5,strong,label,p');
            if (h) {
              label = (h.innerText || h.textContent || '').trim().slice(0, 250);
              if (label) break;
            }
            scope = scope.parentElement;
          }
          if (label === targetLabel) {
            cb.click();
            return { clicked: true, label };
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
    }, target.label);
    console.log('[click]', click);
    await sleep(3000);
    // Confirm modal?
    await page.evaluate(() => {
      function walk(root) {
        const buttons = root.querySelectorAll('button');
        for (const b of buttons) {
          const t = (b.innerText || b.textContent || '').trim().toLowerCase();
          if (/^(yes|enable|turn on|confirm|aceptar|sí|ok|got it)/i.test(t) && b.offsetParent !== null) {
            b.click();
            return { clicked: true, label: t };
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
    });
    await sleep(8000);
    await page.screenshot({ path: path.join(OUT_DIR, '02-after-click.png'), fullPage: true });
  }

  console.log('\n[done]');
  await sleep(3000);
  await ctx.close();
})();
