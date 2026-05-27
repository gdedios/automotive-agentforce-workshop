// Click the Agentforce Agents toggle at /lightning/setup/EinsteinCopilot/home.
// This is the page that gates AiAuthoringBundle metadata type.
const { chromium } = require('playwright');
const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-toggles-v2';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_enable', 'agentforce-final');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(p) {
  return JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', p, '--json'], { encoding: 'utf8' })).result.url;
}

function probeAtlas() {
  try {
    const out = execSync(`sf org list metadata -m AiAuthoringBundle -o ${ORG_ALIAS} --json 2>&1`, { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, out: out.slice(0, 300) };
  } catch (e) {
    const stderr = (e.stdout || '') + (e.stderr || '');
    return { ok: false, invalidType: /INVALID_TYPE/.test(stderr), out: stderr.slice(0, 300) };
  }
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
  await page.screenshot({ path: path.join(OUT_DIR, '01-before.png'), fullPage: true });

  // Click the only enabled+unchecked toggle on the page (the Agentforce master switch)
  const click = await page.evaluate(() => {
    function walk(root) {
      const cbs = root.querySelectorAll('input[type="checkbox"], input[role="switch"], button[role="switch"]');
      for (const cb of cbs) {
        const checked = cb.checked || cb.getAttribute('aria-checked') === 'true';
        const disabled = cb.disabled || cb.getAttribute('aria-disabled') === 'true';
        if (!checked && !disabled) {
          cb.click();
          return { clicked: true, tag: cb.tagName, role: cb.getAttribute('role'), checkedAfter: cb.checked || cb.getAttribute('aria-checked') === 'true' };
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
  console.log('[click]', click);
  await sleep(3000);

  // Confirm modal? Try to dismiss/accept it
  for (let i = 0; i < 3; i++) {
    const modal = await page.evaluate(() => {
      function walk(root) {
        const buttons = root.querySelectorAll('button');
        for (const b of buttons) {
          const t = (b.innerText || b.textContent || '').trim();
          // Avoid clicking Cancel/Close/Got It buttons; only click confirmation buttons
          if (/^(Yes|Enable|Turn On|Activate|Confirm|Aceptar|Sí|Activar)$/i.test(t) && b.offsetParent !== null) {
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
    if (modal && modal.clicked) {
      console.log(`[modal-${i}]`, modal);
      await sleep(3000);
    } else {
      break;
    }
  }

  await sleep(8000);
  await page.screenshot({ path: path.join(OUT_DIR, '02-after-click.png'), fullPage: true });

  // Refresh + verify
  await page.goto(frontdoor('/lightning/setup/EinsteinCopilot/home'), { waitUntil: 'domcontentloaded' });
  await sleep(15000);
  await page.screenshot({ path: path.join(OUT_DIR, '03-after-refresh.png'), fullPage: true });

  const verify = await page.evaluate(() => {
    function walk(root) {
      const cbs = root.querySelectorAll('input[type="checkbox"], input[role="switch"], button[role="switch"]');
      for (const cb of cbs) {
        return { checked: cb.checked || cb.getAttribute('aria-checked') === 'true', disabled: cb.disabled || cb.getAttribute('aria-disabled') === 'true' };
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
  console.log('[verify]', verify);

  // Probe Atlas
  console.log('\n[probe Atlas after 30s wait]...');
  await sleep(30000);
  let probe = probeAtlas();
  if (!probe.ok && probe.invalidType) {
    console.log('[probe] INVALID_TYPE — retry in 30s...');
    await sleep(30000);
    probe = probeAtlas();
  }
  console.log(`[probe] Atlas: ${probe.ok ? 'OK ✓' : 'STILL BLOCKED'}`);
  if (!probe.ok) console.log('[probe out]', probe.out);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ click, verify, probe }, null, 2));
  console.log('\n[done]');
  await sleep(2000);
  await ctx.close();
})();
