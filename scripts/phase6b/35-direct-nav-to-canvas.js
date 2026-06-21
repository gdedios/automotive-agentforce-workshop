// Phase 6b step 35: direct-navigate to the agent authoring URL captured from
// the Electra Auto Concierge link href, since click-nav didn't work in step 34.
// URL pattern: /AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=...&projectVersionId=...

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_URL = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FnBhUAK`;

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

    // Direct nav into canvas
    console.log('navigating to canvas:', CANVAS_URL);
    await p.goto(CANVAS_URL, { waitUntil: 'domcontentloaded' });
    await sleep(25000);
    console.log('after nav url:', p.url());
    await p.screenshot({ path: path.join(SHOTS, '220-canvas-direct.png'), fullPage: true });

    // Dismiss any popups
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button, a'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Dismiss' || t === 'Skip' || t === 'Close') { b.click(); return; }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
      });
      await sleep(1500);
    }
    await p.screenshot({ path: path.join(SHOTS, '221-canvas-dismissed.png'), fullPage: true });

    // Probe canvas controls deeply
    const probe = await p.evaluate(() => {
      const out = {
        url: location.href,
        title: document.title,
        buttons: [],
        explorer: [],
        statusBadges: [],
        headings: [],
        agentName: null,
      };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // Buttons
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 80 && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({
                text: t.slice(0, 80),
                aria: b.getAttribute('aria-label') || '',
                disabled: b.disabled || false,
              });
            }
          }
          // Status / version badges (often in spans)
          for (const sp of Array.from(r.querySelectorAll('span, [class*="badge"], [class*="status"], [class*="version"]'))) {
            const t = (sp.textContent || '').trim();
            if (/^(Active|Inactive|Draft|Published|Version \d+)$/i.test(t)
                && !out.statusBadges.includes(t)) {
              out.statusBadges.push(t);
            }
          }
          // Explorer tree items
          for (const li of Array.from(r.querySelectorAll('[role="treeitem"], [class*="explorer"], [class*="tree"]'))) {
            const t = (li.textContent || '').trim();
            if (t && t.length < 60 && !out.explorer.includes(t)) {
              out.explorer.push(t);
            }
          }
          // Headings
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          // Agent name (often in title-bar)
          if (!out.agentName) {
            for (const e of Array.from(r.querySelectorAll('[class*="title"], [class*="agentName"], [class*="header"] span'))) {
              const t = (e.textContent || '').trim();
              if (/Electra Auto Concierge/i.test(t) && t.length < 60) {
                out.agentName = t;
                break;
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.buttons = out.buttons.slice(0, 40);
      out.explorer = [...new Set(out.explorer)].slice(0, 40);
      out.headings = out.headings.slice(0, 20);
      return out;
    });
    console.log('canvas probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '221-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '35-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
