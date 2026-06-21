// Phase 6b step 32: shadow-walk to find "Take Me There" button OR use App Launcher.

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

    // Shadow-walk click on "Take Me There"
    const tmt = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button, a, [role="button"]'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Take Me There') {
              b.scrollIntoView({block:'center'});
              b.click();
              return { clicked: true, tag: b.tagName };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('Take Me There (shadow walk):', tmt);
    await sleep(15000);
    console.log('after click url:', p.url());
    await p.screenshot({ path: path.join(SHOTS, '190-after-take-me-shadow.png'), fullPage: true });

    // Probe app context
    const appName = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const e of Array.from(r.querySelectorAll('span, h1, [class*="appName"]'))) {
            const t = (e.textContent || '').trim();
            if (/Agentforce Studio|Merchant Management/.test(t) && t.length < 50) return t;
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('current app:', appName);

    // If still in Pronto, force-navigate via App Launcher
    if (!appName || /Merchant/.test(appName)) {
      console.log('still in Pronto, opening App Launcher');
      // Direct URL to launch Agentforce Studio app via setupAppName param
      await p.goto(`${LIGHTNING_HOST}/lightning/app/standard__AgentforceStudio`, { waitUntil: 'domcontentloaded' });
      await sleep(12000);
      await p.screenshot({ path: path.join(SHOTS, '191-direct-app.png'), fullPage: true });
      console.log('after direct app url:', p.url());

      // Try the agents nav again
      await p.goto(`${LIGHTNING_HOST}/lightning/n/standard-AgentforceStudio?c__nav=agents`, { waitUntil: 'domcontentloaded' });
      await sleep(12000);
      await p.screenshot({ path: path.join(SHOTS, '192-agents-list.png'), fullPage: true });
    }

    // Probe: list visible agents
    const probe = await p.evaluate(() => {
      const out = { agents: [], links: [], headings: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a'))) {
            const t = (a.textContent || '').trim();
            if (t && t.length > 2 && t.length < 80) {
              if (/Electra|Concierge|ElectraAI/i.test(t)) out.agents.push({ text: t, href: a.href || '' });
              if (out.links.length < 10) out.links.push({ text: t.slice(0, 50), href: (a.href || '').slice(0, 100) });
            }
          }
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80) out.headings.push(t);
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.headings = [...new Set(out.headings)].slice(0, 10);
      return out;
    });
    console.log('probe:', JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '32-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
