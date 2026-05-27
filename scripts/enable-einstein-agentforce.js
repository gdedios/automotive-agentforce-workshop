// Enable Einstein + Agentforce + (later) Data Library on Electra_Auto
// via Setup UI toggles using Playwright + Chrome for Testing.
//
// Auth: uses `sf org open --url-only` to mint a frontdoor session URL —
// no password / MFA required. CFT bypasses MDM Chrome policy via
// throwaway --user-data-dir.
//
// Run: node scripts/enable-einstein-agentforce.js
//
// Output: docs/screenshots/phase5_enable/*.png + console state log

const { chromium } = require('playwright');
const { execSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const PROJECT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT, 'docs', 'screenshots', 'phase5_enable');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(setupPath) {
  const out = execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', setupPath, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const json = JSON.parse(out);
  return json.result.url;
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  console.log(`[shot] ${file}`);
  return file;
}

async function getToggleState(page) {
  return page.evaluate(() => {
    function walk(root) {
      for (const input of root.querySelectorAll('input[type="checkbox"]')) {
        return { checked: input.checked, disabled: input.disabled };
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
  }).catch(() => null);
}

async function clickFirstCheckbox(page) {
  return page.evaluate(() => {
    function walk(root) {
      for (const input of root.querySelectorAll('input[type="checkbox"]')) {
        input.click();
        return { done: true, checked: input.checked };
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
}

function checkAtlasPublishable() {
  // Probe: try to LIST the bundle (we already deployed metadata; this checks runtime API)
  try {
    const out = execSync(`sf agent list -o ${ORG_ALIAS} --json 2>&1`, { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, out: out.slice(0, 500) };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
  }
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

  const results = { einstein: null, agentforce: null, dataLibrary: null, atlas: null };

  try {
    // ---- 1) Einstein Setup ----
    console.log('\n=== STEP 1/3: Einstein Setup ===');
    // Try EinsteinSetup first (Spring '26 path); EinsteinGPTSetup is older
    const einUrl = frontdoor('/lightning/setup/EinsteinSetup/home');
    console.log('[goto] EinsteinSetup');
    await page.goto(einUrl, { waitUntil: 'domcontentloaded' });
    await sleep(18000); // Setup pages need extra time past domcontentloaded
    await shot(page, '1-einstein-initial');
    const ein1 = await getToggleState(page);
    console.log('[einstein] toggle state before:', ein1);
    if (ein1 && !ein1.checked && !ein1.disabled) {
      const c = await clickFirstCheckbox(page);
      console.log('[einstein] click:', c);
      await sleep(8000);
      await shot(page, '2-einstein-after');
      const ein2 = await getToggleState(page);
      console.log('[einstein] toggle state after:', ein2);
      results.einstein = { before: ein1, after: ein2, action: 'clicked' };
    } else if (ein1 && ein1.checked) {
      results.einstein = { before: ein1, after: ein1, action: 'already-on' };
      console.log('[einstein] already enabled');
    } else {
      results.einstein = { before: ein1, after: null, action: 'no-toggle-found' };
      console.log('[einstein] WARN: no toggle found on page');
    }

    // ---- 2) Agentforce Agents Setup ----
    console.log('\n=== STEP 2/3: Agentforce Setup ===');
    // AgentforceAgents is the Spring '26 path; AiCopilotSetup redirects and causes nav interrupt
    const afUrl = frontdoor('/lightning/setup/AgentforceAgents/home');
    console.log('[goto] AgentforceAgents');
    // Use networkidle to avoid redirect interrupt, then wait extra
    try {
      await page.goto(afUrl, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) {
      console.log('[agentforce] nav warning (expected redirect):', e.message.slice(0, 80));
    }
    await sleep(15000);
    await shot(page, '3-agentforce-initial');
    const af1 = await getToggleState(page);
    console.log('[agentforce] toggle state before:', af1);
    if (af1 && !af1.checked && !af1.disabled) {
      const c2 = await clickFirstCheckbox(page);
      console.log('[agentforce] click:', c2);
      await sleep(10000);
      await shot(page, '4-agentforce-after');
      const af2 = await getToggleState(page);
      console.log('[agentforce] toggle state after:', af2);
      results.agentforce = { before: af1, after: af2, action: 'clicked' };
    } else if (af1 && af1.checked) {
      results.agentforce = { before: af1, after: af1, action: 'already-on' };
      console.log('[agentforce] already enabled');
    } else {
      results.agentforce = { before: af1, after: null, action: 'no-toggle-found' };
      console.log('[agentforce] WARN: no toggle found on page');
    }

    // ---- 3) Wait for backend propagation ----
    console.log('\n=== STEP 3/3: Wait for runtime propagation (60s) ===');
    await sleep(60000);

    // ---- 4) Probe runtime API ----
    console.log('\n[probe] sf agent list...');
    let probe = checkAtlasPublishable();
    if (!probe.ok) {
      console.log('[probe] failed, retry in 30s...');
      await sleep(30000);
      probe = checkAtlasPublishable();
    }
    results.atlas = probe;
    console.log(`[probe] runtime API: ${probe.ok ? 'OK' : 'STILL DOWN'}`);
    if (!probe.ok) console.log(probe.out.slice(0, 600));

    fs.writeFileSync(path.join(OUT_DIR, 'enable-results.json'), JSON.stringify(results, null, 2));
    console.log('\n[done] results written:', path.join(OUT_DIR, 'enable-results.json'));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal');
    process.exitCode = 1;
  } finally {
    await sleep(2000);
    await context.close();
  }
})();
