// Enable Einstein + Agentforce on Electra_Auto via Setup UI toggles.
// v2: polls for actual Setup content to clear Spring '26 splash, finds toggle by label text,
// re-mints frontdoor URL between steps to avoid stale-session issues.
//
// Run: node scripts/enable-einstein-agentforce-v2.js
// Output: docs/screenshots/phase5_enable/v2/*.png

const { chromium } = require('playwright');
const { execSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-toggles-v2';
const PROJECT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT, 'docs', 'screenshots', 'phase5_enable', 'v2');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(setupPath) {
  const out = execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', setupPath, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out).result.url;
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  console.log(`[shot] ${name}.png`);
  return file;
}

// Poll until Setup chrome has rendered past the Spring '26 splash.
// Splash = white bg + .loadingHolder; real Setup has .setupContent / oneSetupSetup / .pageHeader.
async function waitForSetupReady(page, maxMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const status = await page.evaluate(() => {
      // Check for splash indicators
      const splash = document.querySelector('.loadingHolder, .auraLoadingBox, .spinnerContainer');
      const splashText = (document.body && document.body.innerText) || '';
      const stillLoading = /^(Loading|Cargando|Spring '26)\s*$/i.test(splashText.trim().slice(0, 50));
      // Check for real Setup content
      const setup = document.querySelector('one-setup-app, .setup-app, .setupContainer, .pageHeader, .slds-page-header');
      // Walk shadow DOM for forceForceCommunityContainer / oneSetupCenter
      function deepFind(root, sel) {
        if (root.querySelector(sel)) return true;
        for (const n of root.querySelectorAll('*')) {
          if (n.shadowRoot && deepFind(n.shadowRoot, sel)) return true;
        }
        return false;
      }
      const deepHas = deepFind(document, 'forceforcecommunitycontainer, force-aloha-setup-app, .setup-page-content, .setupcontent, [data-aura-class*="Setup"]');
      // body text contains a known Setup marker like "Quick Find" or "Einstein Setup"
      const hasMarker = /Quick Find|Einstein Setup|Agentforce|Generative AI/i.test(splashText);
      return { stillLoading, hasSetup: !!setup || deepHas, hasMarker, len: splashText.length };
    }).catch(() => ({ stillLoading: true, hasSetup: false, hasMarker: false, len: 0 }));
    if ((status.hasSetup || status.hasMarker) && !status.stillLoading) {
      console.log(`[ready] Setup rendered after ${Math.round((Date.now() - t0) / 1000)}s (markers: setup=${status.hasSetup} marker=${status.hasMarker})`);
      return true;
    }
    await sleep(2000);
  }
  console.log(`[ready] TIMEOUT after ${maxMs}ms`);
  return false;
}

// Find a checkbox/switch input near a heading containing keyword (deep shadow walk).
// Returns the toggle nearest to the heading. Falls back to first one found.
async function getToggleInfo(page, keyword) {
  return page.evaluate((kw) => {
    const kwLower = (kw || '').toLowerCase();
    const candidates = [];
    function walk(root) {
      // Find headings/labels that match the keyword
      const headers = root.querySelectorAll('h1,h2,h3,h4,h5,label,p,span,div,strong');
      for (const h of headers) {
        const t = (h.innerText || h.textContent || '').trim();
        if (!t || t.length > 200) continue;
        if (kwLower && t.toLowerCase().includes(kwLower)) {
          // Look for a sibling/nearby checkbox/switch
          let scope = h.closest('div,section,article,li,tr') || h.parentElement;
          for (let i = 0; i < 4 && scope; i++) {
            const cb = scope.querySelector('input[type="checkbox"], input[role="switch"], button[role="switch"], lightning-input[type="toggle"]');
            if (cb) {
              candidates.push({ cb, headerText: t, distance: i });
              break;
            }
            scope = scope.parentElement;
          }
        }
      }
      // Recurse into shadow DOM
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    // Sort by closest distance
    candidates.sort((a, b) => a.distance - b.distance);
    if (candidates.length === 0) {
      // Fallback: any checkbox in main body (skip header chrome)
      function fallback(root) {
        const cbs = root.querySelectorAll('input[type="checkbox"], input[role="switch"], button[role="switch"]');
        for (const cb of cbs) {
          const labelText = (cb.closest('label')?.innerText || cb.getAttribute('aria-label') || cb.parentElement?.innerText || '').trim();
          if (labelText.length > 0 && labelText.length < 300) {
            return { cb, label: labelText };
          }
        }
        for (const n of root.querySelectorAll('*')) {
          if (n.shadowRoot) {
            const r = fallback(n.shadowRoot);
            if (r) return r;
          }
        }
        return null;
      }
      const fb = fallback(document);
      if (fb) candidates.push({ cb: fb.cb, headerText: fb.label, distance: 99 });
    }
    if (candidates.length === 0) return { found: false };
    const { cb, headerText, distance } = candidates[0];
    const checked = cb.checked || cb.getAttribute('aria-checked') === 'true';
    const disabled = cb.disabled || cb.getAttribute('aria-disabled') === 'true';
    // Also report total candidate count for diagnostics
    return { found: true, checked, disabled, headerText: headerText.slice(0, 120), tag: cb.tagName, role: cb.getAttribute('role'), distance, candidateCount: candidates.length };
  }, keyword).catch((e) => ({ found: false, error: e.message }));
}

// Click the toggle near a heading containing keyword.
async function clickToggle(page, keyword) {
  return page.evaluate((kw) => {
    const kwLower = (kw || '').toLowerCase();
    const candidates = [];
    function walk(root) {
      const headers = root.querySelectorAll('h1,h2,h3,h4,h5,label,p,span,div,strong');
      for (const h of headers) {
        const t = (h.innerText || h.textContent || '').trim();
        if (!t || t.length > 200) continue;
        if (kwLower && t.toLowerCase().includes(kwLower)) {
          let scope = h.closest('div,section,article,li,tr') || h.parentElement;
          for (let i = 0; i < 4 && scope; i++) {
            const cb = scope.querySelector('input[type="checkbox"], input[role="switch"], button[role="switch"], lightning-input[type="toggle"]');
            if (cb) {
              candidates.push({ cb, distance: i, headerText: t });
              break;
            }
            scope = scope.parentElement;
          }
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    candidates.sort((a, b) => a.distance - b.distance);
    if (candidates.length === 0) return { clicked: false, reason: 'no-candidate' };
    const { cb, headerText } = candidates[0];
    // For lightning-input[type=toggle], click the inner label/span; for input, click directly
    cb.click();
    return { clicked: true, headerText: headerText.slice(0, 80), checked: cb.checked || cb.getAttribute('aria-checked') === 'true' };
  }, keyword);
}

// Handle confirm modal if it appears (Salesforce's "Yes, enable" / "Aceptar").
async function dismissConfirmModal(page) {
  return page.evaluate(() => {
    function walk(root) {
      const buttons = root.querySelectorAll('button');
      for (const b of buttons) {
        const t = (b.innerText || b.textContent || '').trim().toLowerCase();
        if (/^(yes|enable|turn on|confirm|aceptar|sí|ok)/i.test(t) && b.offsetParent !== null) {
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
    return walk(document) || { clicked: false };
  });
}

async function probeAtlas() {
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
    executablePath: CFT,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(60000);

  const results = { einstein: null, agentforce: null, atlas: null };

  try {
    // ===== STEP 1: EINSTEIN SETUP =====
    console.log('\n=== STEP 1/4: Einstein Setup ===');
    const einUrl = frontdoor('/lightning/setup/EinsteinGPTSetup/home');
    await page.goto(einUrl, { waitUntil: 'domcontentloaded' });
    console.log('[goto] EinsteinGPTSetup — waiting for Setup chrome to render...');
    await waitForSetupReady(page);
    await sleep(4000);
    await shot(page, '1-einstein-loaded');

    const before = await getToggleInfo(page, 'turn on einstein');
    console.log('[einstein] before:', JSON.stringify(before).slice(0, 250));

    if (before.found && !before.checked) {
      const click = await clickToggle(page, 'turn on einstein');
      console.log('[einstein] clicked:', click);
      await sleep(2500);
      const modalA = await dismissConfirmModal(page);
      if (modalA.clicked) console.log('[einstein] confirm modal:', modalA.label);
      await sleep(6000);
      await shot(page, '2-einstein-after-click');
      const after = await getToggleInfo(page);
      console.log('[einstein] after:', JSON.stringify(after).slice(0, 200));
      results.einstein = { before, after, action: 'clicked' };
    } else if (before.found && before.checked) {
      console.log('[einstein] already ON');
      results.einstein = { before, action: 'already-on' };
    } else {
      console.log('[einstein] WARN: no toggle found');
      results.einstein = { before, action: 'no-toggle' };
    }

    // ===== STEP 2: REFRESH (per user direction "and then refreshing") =====
    console.log('\n=== STEP 2/4: Refresh Einstein page ===');
    const einUrl2 = frontdoor('/lightning/setup/EinsteinGPTSetup/home');
    await page.goto(einUrl2, { waitUntil: 'domcontentloaded' });
    await waitForSetupReady(page);
    await sleep(3000);
    await shot(page, '3-einstein-after-refresh');
    const persisted = await getToggleInfo(page, 'turn on einstein');
    console.log('[einstein] persisted:', JSON.stringify(persisted).slice(0, 250));
    results.einstein.persisted = persisted;

    // ===== STEP 3: AGENTFORCE AGENTS =====
    console.log('\n=== STEP 3/4: Agentforce Agents ===');
    const afUrl = frontdoor('/lightning/setup/AgentforceSetup/home');
    try {
      await page.goto(afUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.log('[agentforce] nav warn:', e.message.slice(0, 80));
    }
    console.log('[goto] AgentforceAgents — waiting for Setup chrome to render...');
    await waitForSetupReady(page);
    await sleep(4000);
    await shot(page, '4-agentforce-loaded');

    const afBefore = await getToggleInfo(page, 'agentforce');
    console.log('[agentforce] before:', JSON.stringify(afBefore).slice(0, 250));

    if (afBefore.found && !afBefore.checked) {
      const click = await clickToggle(page, 'agentforce');
      console.log('[agentforce] clicked:', click);
      await sleep(2500);
      const modalB = await dismissConfirmModal(page);
      if (modalB.clicked) console.log('[agentforce] confirm modal:', modalB.label);
      await sleep(8000);
      await shot(page, '5-agentforce-after-click');
      const afAfter = await getToggleInfo(page, 'agentforce');
      console.log('[agentforce] after:', JSON.stringify(afAfter).slice(0, 250));
      results.agentforce = { before: afBefore, after: afAfter, action: 'clicked' };
    } else if (afBefore.found && afBefore.checked) {
      console.log('[agentforce] already ON');
      results.agentforce = { before: afBefore, action: 'already-on' };
    } else {
      console.log('[agentforce] WARN: no toggle found');
      results.agentforce = { before: afBefore, action: 'no-toggle' };
    }

    // ===== STEP 4: Probe Atlas gate =====
    console.log('\n=== STEP 4/4: Probe Atlas gate ===');
    await sleep(20000); // backend propagation
    let probe = probeAtlas();
    if (!probe.ok && probe.invalidType) {
      console.log('[probe] INVALID_TYPE — retry in 30s...');
      await sleep(30000);
      probe = probeAtlas();
    }
    results.atlas = probe;
    console.log(`[probe] Atlas: ${probe.ok ? 'OK ✓' : 'STILL BLOCKED'}`);
    if (!probe.ok) console.log('[probe]', probe.out);

    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
    console.log('\n[done] results written:', path.join(OUT_DIR, 'results.json'));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal');
    process.exitCode = 1;
  } finally {
    await sleep(2000);
    await ctx.close();
  }
})();
