// Phase 6b step 3: warm Lightning shell first via /lightning/page/home, then deep-link to Setup → Data Library.
// Probes inner setup iframe for "Agentforce Data Library" heading.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

async function safeEval(p, fn) {
  for (let i = 0; i < 3; i++) {
    try { return await p.evaluate(fn); } catch (e) {
      if (/Execution context|Target closed|destroyed/.test(e.message)) { await sleep(1000); continue; }
      throw e;
    }
  }
}

async function readPageText(p) {
  return await safeEval(p, () => {
    let allText = (document.body && document.body.textContent || '').slice(0, 600);
    // Also walk frames recursively to find text
    return { url: location.href, len: allText.length, snippet: allText };
  });
}

async function waitForText(p, regex, maxSeconds = 60, label = 'wait') {
  for (let i = 0; i < maxSeconds; i++) {
    await sleep(1500);
    const all = await safeEval(p, () => {
      const collect = (root, depth) => {
        if (depth > 3) return '';
        let s = root.body ? (root.body.textContent || '') : '';
        try {
          const frs = root.querySelectorAll('iframe');
          for (const f of frs) try { s += '\n' + collect(f.contentDocument, depth+1); } catch {}
        } catch {}
        return s;
      };
      return (collect(document, 0)).slice(0, 20000);
    });
    if (all && regex.test(all)) {
      console.log(`${label} matched at t+${(i+1)*1.5}s`);
      return true;
    }
    if (i % 4 === 0) console.log(`${label} t+${(i+1)*1.5}s waiting…`);
  }
  return false;
}

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(60000);

  try {
    if (FRONTDOOR) {
      console.log('[1] frontdoor → home (warm)');
      // override startURL to home so we land on lightning shell first
      const home = FRONTDOOR.replace(/startURL=[^&]*/, 'startURL=%2Flightning%2Fpage%2Fhome');
      await p.goto(home, { waitUntil: 'domcontentloaded' });
      await waitForText(p, /App Launcher|Search\.\.\.|Home|Setup/i, 60, 'home-warm');
      await sleep(3000);
    }

    console.log('[2] navigate to Setup → Agentforce Data Library');
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/AgentforceDataLibrary/home`, { waitUntil: 'domcontentloaded' });

    const found = await waitForText(p, /Agentforce Data Library|New Library|No data libraries|Data Library/i, 90, 'data-library');
    console.log('found heading?', found);

    // Dismiss popups if any
    try {
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dismiss = btns.find(b => /^dismiss$/i.test((b.textContent||'').trim()));
        if (dismiss) dismiss.click();
      });
    } catch {}

    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '03-data-library-warm.png'), fullPage: true });

    // Probe across all frames
    const fullDump = await safeEval(p, () => {
      const out = [];
      const visit = (doc, depth) => {
        if (depth > 4 || !doc) return;
        out.push({
          depth,
          url: doc.location ? doc.location.href : '(no-loc)',
          title: doc.title,
          h1: Array.from(doc.querySelectorAll('h1,h2,h3')).map(h => (h.textContent||'').trim()).filter(t=>t).slice(0,8),
          buttons: Array.from(doc.querySelectorAll('button,a[role="button"]')).map(b=>(b.textContent||'').trim()).filter(t=>t&&t.length<60).slice(0,15),
          snippet: (doc.body ? doc.body.textContent : '').replace(/\s+/g,' ').slice(0,800),
        });
        try {
          const frs = doc.querySelectorAll('iframe');
          for (const f of frs) try { visit(f.contentDocument, depth+1); } catch {}
        } catch {}
      };
      visit(document, 0);
      return out;
    });
    console.log('FULL DUMP:');
    console.log(JSON.stringify(fullDump, null, 2));
    fs.writeFileSync(path.join(SHOTS, '03-fulldump.json'), JSON.stringify(fullDump, null, 2));
    console.log('done — screenshot at', path.join(SHOTS, '03-data-library-warm.png'));
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '03-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
