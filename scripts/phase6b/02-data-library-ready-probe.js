// Phase 6b step 2: open Setup → Agentforce Data Library, wait for full bootstrap, then probe.
// Tries Quick Find as a fallback if the direct URL is wrong.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;

async function safeEval(p, fn) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await p.evaluate(fn);
    } catch (e) {
      if (/Execution context|Target closed|destroyed/.test(e.message)) {
        await sleep(1500);
        continue;
      }
      throw e;
    }
  }
  return null;
}

async function waitForLightningReady(p, maxSeconds = 90) {
  let cssReloadCount = 0;
  for (let i = 0; i < maxSeconds; i++) {
    await sleep(1500);
    const state = await safeEval(p, () => {
      try {
        const splash = document.querySelector('.oneLoadingBox') || document.querySelector('img[src*="loading"]');
        const cssError = document.body && /Sorry to interrupt|CSS Error/.test(document.body.textContent || '');
        const setupPage = document.querySelector('.setupcontent, runtime_setup-master, one-app-nav-bar');
        const tabs = document.querySelectorAll('a[role="tab"], button[role="tab"]').length;
        const hasH1 = !!document.querySelector('h1');
        return {
          url: location.href,
          cssError,
          splashVisible: splash ? getComputedStyle(splash).display !== 'none' : false,
          setupPagePresent: !!setupPage,
          tabs,
          hasH1,
          bodyLen: (document.body.textContent || '').length,
        };
      } catch (err) {
        return { err: String(err) };
      }
    });
    if (!state) continue;
    if (i % 4 === 0) console.log(`t+${(i+1)*1.5}s`, JSON.stringify(state));
    if (state.cssError && i > 6 && cssReloadCount < 1) {
      cssReloadCount++;
      console.log('CSS Error — reloading once');
      await p.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await sleep(5000);
      continue;
    }
    if (!state.splashVisible && state.setupPagePresent && state.bodyLen > 5000) {
      console.log('lightning ready');
      return true;
    }
  }
  return false;
}

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(45000);

  try {
    if (FRONTDOOR) {
      await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
    } else {
      await p.goto('https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com/lightning/setup/AgentforceDataLibrary/home', { waitUntil: 'domcontentloaded' });
    }

    const ready = await waitForLightningReady(p, 60);
    console.log('ready=', ready, 'finalUrl=', p.url());

    // dismiss any popups
    try {
      await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /^dismiss$|^×$|got it/i.test((b.textContent || '').trim()));
        if (btn) btn.click();
      });
    } catch {}
    await sleep(2000);

    await p.screenshot({ path: path.join(SHOTS, '02-data-library-after-bootstrap.png'), fullPage: true });

    // Probe page contents
    const probe = await p.evaluate(() => {
      const text = (document.body.textContent || '').replace(/\s+/g, ' ').slice(0, 4000);
      const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map(h => (h.textContent||'').trim()).filter(t => t).slice(0, 20);
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]')).map(b => (b.textContent || '').trim()).filter(t => t.length > 0 && t.length < 60);
      const setupTitle = document.querySelector('.setup-page-title, [data-component-id*="setup"] h1, .pageHeader')?.textContent?.trim() || null;
      return {
        url: location.href,
        title: document.title,
        headings,
        topButtons: buttons.slice(0, 30),
        setupTitle,
        text,
      };
    });
    console.log('FINAL PROBE:');
    console.log(JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '02-probe.json'), JSON.stringify(probe, null, 2));

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '02-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
