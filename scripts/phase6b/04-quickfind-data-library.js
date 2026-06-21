// Phase 6b step 4: type "Data Library" in Quick Find, list matching results.
// Confirms the actual setup node name on this org.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

async function safeEval(p, fn, arg) {
  for (let i = 0; i < 3; i++) {
    try { return await p.evaluate(fn, arg); } catch (e) {
      if (/Execution context|Target closed|destroyed/.test(e.message)) { await sleep(1000); continue; }
      throw e;
    }
  }
}

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(45000);

  try {
    if (FRONTDOOR) {
      await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
      await sleep(8000);
    }
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/SetupOneHome/home`, { waitUntil: 'domcontentloaded' });
    await sleep(10000);

    // Find Quick Find input — it's a normal input on the Setup page top-left.
    const qfFound = await safeEval(p, () => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const qf = inputs.find(i => /quick find|search setup/i.test(i.placeholder || ''));
      if (qf) {
        qf.scrollIntoView();
        qf.focus();
        return { tag: qf.tagName, placeholder: qf.placeholder, present: true };
      }
      return { present: false, count: inputs.length, placeholders: inputs.map(i => i.placeholder).slice(0, 10) };
    });
    console.log('quickfind probe:', qfFound);

    // Type via keyboard
    await p.keyboard.type('Data Library', { delay: 60 });
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '04-quickfind-data-library.png'), fullPage: true });

    // Read the matching setup links
    const matches = await safeEval(p, () => {
      const links = Array.from(document.querySelectorAll('a, span, li')).filter(el => /data library/i.test(el.textContent || ''));
      return links.map(l => ({
        tag: l.tagName,
        text: (l.textContent || '').trim().slice(0, 80),
        href: l.href || null,
      })).slice(0, 30);
    });
    console.log('matches:');
    console.log(JSON.stringify(matches, null, 2));
    fs.writeFileSync(path.join(SHOTS, '04-matches.json'), JSON.stringify(matches, null, 2));

    // Try a broader search — "Library"
    await safeEval(p, () => {
      const qf = Array.from(document.querySelectorAll('input')).find(i => /quick find|search setup/i.test(i.placeholder || ''));
      if (qf) { qf.value = ''; qf.focus(); }
    });
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Delete');
    await p.keyboard.type('Library', { delay: 60 });
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '04b-quickfind-library.png'), fullPage: true });

    const matches2 = await safeEval(p, () => {
      const links = Array.from(document.querySelectorAll('a')).filter(el => /library/i.test(el.textContent || ''));
      return links.map(l => ({
        text: (l.textContent || '').trim().slice(0, 80),
        href: l.href,
      })).slice(0, 30);
    });
    console.log('library matches:');
    console.log(JSON.stringify(matches2, null, 2));
    fs.writeFileSync(path.join(SHOTS, '04b-library-matches.json'), JSON.stringify(matches2, null, 2));

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '04-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
