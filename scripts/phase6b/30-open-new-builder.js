// Phase 6b step 30: open NEW Builder, list agents, screenshot landing.
// Per workspace CLAUDE.md: URL must be /lightning/n/standard-AgentforceStudio?c__nav=agents
// (NOT /lightning/setup/EinsteinCopilot/home — that's the OLD legacy builder).
// Dismiss the "Try the new Field Service Setup" popup if present.

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
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

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
    await p.screenshot({ path: path.join(SHOTS, '170-builder-landing.png'), fullPage: true });
    console.log('current url:', p.url());

    // Dismiss "Try the new Field Service Setup" popup if present
    try {
      const dismissed = await p.evaluate(() => {
        for (const b of Array.from(document.querySelectorAll('button'))) {
          if ((b.textContent || '').trim() === 'Dismiss') { b.click(); return true; }
        }
        return false;
      });
      console.log('dismiss popup:', dismissed);
    } catch {}
    await sleep(2000);

    // Probe: list agents visible on the landing page
    const probe = await p.evaluate(() => {
      const out = { agents: [], frames: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a, span, h1, h2, h3, h4'))) {
            const t = (a.textContent || '').trim();
            if (/Electra Auto Concierge|ElectraAI/.test(t) && t.length < 80) {
              out.agents.push({ tag: a.tagName, text: t.slice(0, 80), href: a.href || '' });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('agent probe:', JSON.stringify(probe, null, 2));
    await p.screenshot({ path: path.join(SHOTS, '171-builder-after-dismiss.png'), fullPage: true });
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '30-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
