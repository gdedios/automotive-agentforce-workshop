// Phase 6b step 34: click the Electra Auto Concierge link by href + probe agent canvas.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(60000);

  try {
    await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.goto(`${LIGHTNING_HOST}/lightning/n/standard-AgentforceStudio?c__nav=agents`, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    // Dismiss popups (Guidance + Meet)
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button, a'))) {
              if ((b.textContent || '').trim() === 'Dismiss') { b.click(); return; }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
      });
      await sleep(1500);
    }

    // Find and click the agent link by href pattern
    const agentLink = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a'))) {
            const t = (a.textContent || '').trim();
            if (t === 'Electra Auto Concierge') {
              a.scrollIntoView({block:'center'});
              a.click();
              return { clicked: true, href: a.href || '' };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('agent link click:', agentLink);
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '210-agent-canvas.png'), fullPage: true });
    console.log('url:', p.url());

    // Probe canvas
    const probe = await p.evaluate(() => {
      const out = { buttons: [], explorer: [], status: null, dataNode: false };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 60 && /Activate|Deactivate|New Version|Commit|Save|Add|Edit/i.test(t)
                && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, aria: b.getAttribute('aria-label') || '' });
            }
          }
          // Status: Active / Inactive badge
          for (const sp of Array.from(r.querySelectorAll('span, [class*="badge"]'))) {
            const t = (sp.textContent || '').trim();
            if (/^(Active|Inactive|Draft|Published)$/.test(t) && !out.status) out.status = t;
          }
          // Explorer tree items
          for (const li of Array.from(r.querySelectorAll('[role="treeitem"], a, span'))) {
            const t = (li.textContent || '').trim();
            if (/Topics|Subagents|System|Variables|Data|Knowledge|Estado_y_FAQ/.test(t) && t.length < 50
                && !out.explorer.find(x => x === t)) {
              out.explorer.push(t);
            }
            if (t === 'Data') out.dataNode = true;
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.explorer = [...new Set(out.explorer)].slice(0, 30);
      return out;
    });
    console.log('canvas probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '210-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '34-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
