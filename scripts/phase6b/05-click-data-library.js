// Phase 6b step 5: search "Data Library" in Setup global search, click the
// "Agentforce Data Library" result, screenshot the landing page.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

async function safeEval(p, fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try { return await p.evaluate(fn, ...args); } catch (e) {
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
    await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/SetupOneHome/home`, { waitUntil: 'domcontentloaded' });
    await sleep(10000);

    // Focus Search Setup input and type
    await safeEval(p, () => {
      const inp = Array.from(document.querySelectorAll('input')).find(i => /search setup|quick find/i.test(i.placeholder || ''));
      if (inp) { inp.focus(); inp.click(); }
    });
    await p.keyboard.type('Agentforce Data Library', { delay: 50 });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '05-search-typed.png'), fullPage: true });

    // Click the matching entry — match exact text "Agentforce Data Library"
    const clicked = await safeEval(p, () => {
      const items = Array.from(document.querySelectorAll('a, li, span'));
      // Look for the LI which contains the text; clicking on it (or its anchor) should route
      for (const el of items) {
        const t = (el.textContent || '').trim();
        if (/^Agentforce Data Library/.test(t) && t.length < 60) {
          // Try to find clickable parent
          let target = el;
          while (target && target.tagName !== 'A' && target.tagName !== 'LI') target = target.parentElement;
          if (target) {
            target.click();
            return { clicked: true, tag: target.tagName, text: (target.textContent || '').trim().slice(0, 60) };
          }
        }
      }
      return { clicked: false };
    });
    console.log('click:', clicked);

    // Wait for navigation
    await sleep(8000);
    console.log('post-click URL:', p.url());
    await p.screenshot({ path: path.join(SHOTS, '06-post-click.png'), fullPage: true });

    // Wait for "New Library" or library list to appear
    let found = false;
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      const txt = await safeEval(p, () => (document.body.textContent || '').slice(0, 8000));
      if (/New Library|Agentforce Data Library|No data libraries|Add Data Sources/i.test(txt)) {
        found = true;
        console.log(`heading found at t+${(i+1)*2}s, url=${p.url()}`);
        break;
      }
    }
    console.log('library page found?', found);

    await p.screenshot({ path: path.join(SHOTS, '07-data-library-page.png'), fullPage: true });

    const fullDump = await safeEval(p, () => {
      const out = [];
      const visit = (doc, depth) => {
        if (depth > 4 || !doc) return;
        try {
          out.push({
            depth,
            url: doc.location ? doc.location.href : '?',
            title: doc.title,
            h1: Array.from(doc.querySelectorAll('h1,h2,h3')).map(h => (h.textContent||'').trim()).filter(t=>t).slice(0,8),
            buttons: Array.from(doc.querySelectorAll('button,a[role="button"]')).map(b=>(b.textContent||'').trim()).filter(t=>t&&t.length<60).slice(0,20),
            snippet: (doc.body ? doc.body.textContent : '').replace(/\s+/g,' ').slice(0, 1500),
          });
          const frs = doc.querySelectorAll('iframe');
          for (const f of frs) try { visit(f.contentDocument, depth+1); } catch {}
        } catch {}
      };
      visit(document, 0);
      return out;
    });
    fs.writeFileSync(path.join(SHOTS, '07-fulldump.json'), JSON.stringify(fullDump, null, 2));
    console.log('Top-level URL:', fullDump[0]?.url);
    console.log('All depths:', fullDump.map(f => `[${f.depth}] ${f.url?.slice(0,80)} title=${f.title}`).join('\n'));
    console.log('Buttons (deepest):', fullDump[fullDump.length-1]?.buttons);
    console.log('Snippet (deepest):', fullDump[fullDump.length-1]?.snippet?.slice(0, 600));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '05-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
