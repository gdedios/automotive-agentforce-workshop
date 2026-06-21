// Phase 6b step 45: real Playwright mouse.click at exact Data row coords with chevron offset.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_V3 = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FrC5UAK`;

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
    await p.goto(CANVAS_V3, { waitUntil: 'domcontentloaded' });
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '310-before.png'), fullPage: true });

    // Data row is at top=546, height=15. Center y = 553.75.
    // The chevron expand toggle is to the LEFT of the text. Try x positions:
    //  - 22 (well into chevron column)
    //  - 30 (between chevron and text)
    //  - 58 (text center)
    // Try them one at a time.
    const cy = 553;

    for (const cx of [22, 30, 58]) {
      console.log(`clicking at (${cx}, ${cy})`);
      await p.mouse.click(cx, cy);
      await sleep(2500);
      // Check if Data Library appeared
      const found = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('*'))) {
              const directText = Array.from(el.childNodes)
                .filter(n => n.nodeType === 3)
                .map(n => n.textContent.trim())
                .join('');
              if (directText === 'Data Library' && el.offsetParent !== null) {
                const rect = el.getBoundingClientRect();
                if (rect.left < 250) return { found: true, rect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height } };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return { found: false };
      });
      console.log(`  → Data Library visible: ${found.found}`);
      if (found.found) {
        await p.screenshot({ path: path.join(SHOTS, `311-expanded-at-${cx}.png`), fullPage: true });
        // Click Data Library
        const cx2 = found.rect.left + found.rect.w / 2;
        const cy2 = found.rect.top + found.rect.h / 2;
        console.log(`clicking Data Library at (${cx2}, ${cy2})`);
        await p.mouse.click(cx2, cy2);
        await sleep(6000);
        await p.screenshot({ path: path.join(SHOTS, '312-dl-pane.png'), fullPage: true });

        // Probe pane
        const probe = await p.evaluate(() => {
          const out = { headings: [], buttons: [], libs: [], texts: [] };
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
                const t = (h.textContent || '').trim();
                if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
              }
              for (const b of Array.from(r.querySelectorAll('button'))) {
                const t = (b.textContent || '').trim();
                if (t && t.length < 60 && !out.buttons.find(x => x.text === t)) {
                  out.buttons.push({ text: t.slice(0, 60), disabled: b.disabled || false });
                }
              }
              for (const e of Array.from(r.querySelectorAll('span, div, label'))) {
                const t = (e.textContent || '').trim();
                if (/Electra FAQ Library|Show Sources|Add Library|Available Knowledge|Selected/i.test(t) && t.length < 100) {
                  if (!out.texts.includes(t)) out.texts.push(t);
                }
              }
              for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
            } catch {}
          }
          out.buttons = out.buttons.slice(0, 30);
          return out;
        });
        console.log('DL pane probe:', JSON.stringify(probe, null, 2));
        fs.writeFileSync(path.join(SHOTS, '312-probe.json'), JSON.stringify(probe, null, 2));
        break;
      }
    }
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '45-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
