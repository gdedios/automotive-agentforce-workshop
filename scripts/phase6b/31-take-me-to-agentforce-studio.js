// Phase 6b step 31: Pronto app is the default; click "Take Me There" to switch to
// Agentforce Studio app, then list agents.

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

    // Click "Take Me There"
    const tmt = await p.evaluate(() => {
      for (const b of Array.from(document.querySelectorAll('button, a'))) {
        const t = (b.textContent || '').trim();
        if (t === 'Take Me There') { b.scrollIntoView({block:'center'}); b.click(); return true; }
      }
      return false;
    });
    console.log('Take Me There:', tmt);
    await sleep(15000);
    console.log('after click url:', p.url());
    await p.screenshot({ path: path.join(SHOTS, '180-after-take-me.png'), fullPage: true });

    // Navigate again to the nav URL now that we're in the right app
    await p.goto(`${LIGHTNING_HOST}/lightning/n/standard-AgentforceStudio?c__nav=agents`, { waitUntil: 'domcontentloaded' });
    await sleep(12000);
    await p.screenshot({ path: path.join(SHOTS, '181-agents-list.png'), fullPage: true });

    // Probe agents
    const probe = await p.evaluate(() => {
      const out = { agents: [], firstClickable: null };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a, span, h1, h2, h3, h4'))) {
            const t = (a.textContent || '').trim();
            if (/Electra Auto Concierge|ElectraAI/.test(t) && t.length < 80 && t.length > 3) {
              out.agents.push({ tag: a.tagName, text: t.slice(0, 80), href: a.href || '' });
              if (a.tagName === 'A' && !out.firstClickable) out.firstClickable = a.href;
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('agent probe:', JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '31-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
