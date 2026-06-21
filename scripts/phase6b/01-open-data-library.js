// Phase 6b step 1: open Setup → Agentforce Data Library, screenshot, dump page structure.
// Reuse the persistent CFT profile that's already MFA'd through.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';

// fresh frontdoor URL minted seconds ago — bypasses login interstitials
const FRONTDOOR = process.env.FRONTDOOR_URL || '';

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(30000);

  try {
    if (FRONTDOOR) {
      console.log('navigating via frontdoor');
      await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
    } else {
      console.log('navigating direct (assumes session)');
      await p.goto('https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com/lightning/setup/AgentforceDataLibrary/home', { waitUntil: 'domcontentloaded' });
    }

    // wait for Lightning to settle
    for (let i = 0; i < 12; i++) {
      await sleep(2000);
      const url = p.url();
      console.log(`t+${(i+1)*2}s url=${url}`);
      if (url.includes('lightning.force.com') && !url.includes('identity') && !url.includes('login')) break;
    }

    // dismiss "Try Field Service Setup" popup if present
    try {
      await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /dismiss/i.test(b.textContent || ''));
        if (btn) btn.click();
      });
    } catch {}
    await sleep(2000);

    const finalUrl = p.url();
    console.log('FINAL URL:', finalUrl);

    await p.screenshot({ path: path.join(SHOTS, '01-data-library-landing.png'), fullPage: true });

    // dump heading + table info
    const probe = await p.evaluate(() => {
      const h1 = document.querySelector('h1, .slds-page-header__title, .pageHeader');
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]')).map(b => (b.textContent || '').trim()).filter(t => t.length > 0 && t.length < 50);
      const rows = document.querySelectorAll('tr').length;
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      return {
        title: document.title,
        h1Text: h1 ? (h1.textContent || '').trim().slice(0, 200) : null,
        topButtons: buttons.slice(0, 25),
        rowCount: rows,
        iframes: iframes.slice(0, 5),
        bodySnippet: document.body.textContent.slice(0, 1500),
      };
    });
    console.log('PROBE:', JSON.stringify(probe, null, 2));

    // also probe inside any setup iframe
    const frames = p.frames();
    console.log(`frames count: ${frames.length}`);
    for (const f of frames) {
      const u = f.url();
      if (u && u.includes('salesforce')) {
        try {
          const fProbe = await f.evaluate(() => ({
            title: document.title,
            bodySnippet: document.body ? document.body.textContent.slice(0, 800) : null,
            buttons: Array.from(document.querySelectorAll('button,a[role="button"]')).map(b => (b.textContent||'').trim()).filter(t => t.length>0 && t.length<60).slice(0,15),
          })).catch(() => null);
          if (fProbe) {
            console.log('FRAME PROBE', u.slice(0, 80));
            console.log(JSON.stringify(fProbe, null, 2));
          }
        } catch {}
      }
    }

    fs.writeFileSync(path.join(SHOTS, '01-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done — screenshot at', path.join(SHOTS, '01-data-library-landing.png'));
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '01-FATAL.png'), fullPage: true }); } catch {}
    process.exit(1);
  } finally {
    await sleep(2000);
    await ctx.close();
  }
})();
