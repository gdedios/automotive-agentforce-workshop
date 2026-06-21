// Phase 6b step 33: in Agentforce Studio, dismiss popups, click into Electra Auto Concierge.
// Then probe what controls are present (Deactivate / New Version / Add Action / Data Library).

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

async function clickShadowText(p, text) {
  return await p.evaluate((t) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll('button, a, [role="button"], span'))) {
          if ((el.textContent || '').trim() === t) {
            let target = el;
            for (let d = 0; d < 4; d++) {
              if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'menuitem') break;
              if (target.parentElement) target = target.parentElement; else break;
            }
            target.scrollIntoView({block:'center'});
            target.click();
            return { clicked: true, tag: target.tagName };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return { clicked: false };
  }, text);
}

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
    await p.screenshot({ path: path.join(SHOTS, '200-agents-landing.png'), fullPage: true });

    // Dismiss popups
    let d1 = await clickShadowText(p, 'Dismiss');
    console.log('dismiss 1:', d1);
    await sleep(1500);
    let d2 = await clickShadowText(p, 'Dismiss');
    console.log('dismiss 2:', d2);
    await sleep(2000);
    await p.screenshot({ path: path.join(SHOTS, '201-dismissed.png'), fullPage: true });

    // Click "Electra Auto Concierge"
    const open = await clickShadowText(p, 'Electra Auto Concierge');
    console.log('open agent:', open);
    await sleep(15000);
    await p.screenshot({ path: path.join(SHOTS, '202-agent-detail.png'), fullPage: true });

    // Probe agent detail page — what buttons / nav items are present?
    const probe = await p.evaluate(() => {
      const out = { buttons: [], statusBadge: null, tabs: [], explorer: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 60 && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t.slice(0, 60), aria: b.getAttribute('aria-label') || '' });
            }
          }
          // Status badge
          for (const sp of Array.from(r.querySelectorAll('span, [class*="badge"], [class*="status"]'))) {
            const t = (sp.textContent || '').trim();
            if (/^(Active|Inactive|Draft|Published)$/i.test(t) && !out.statusBadge) out.statusBadge = t;
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.buttons = out.buttons.slice(0, 30);
      return out;
    });
    console.log('agent page probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '202-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '33-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
