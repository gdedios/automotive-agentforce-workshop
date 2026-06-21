// Phase 6c step 62: actually bind AQWK to Estado_y_FAQ.
// V4 Draft already exists. Click + button next to Actions Available For Reasoning,
// then pick AQWK from the menu. Save → Commit → Activate.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6c_screenshots';
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

    // Switch to V4 Draft
    const verTrigger = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, a, [aria-haspopup]'))) {
            const t = (el.textContent || '').trim();
            if (/^Version \d+ \(/.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top < 100 && rc.left < 600) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (verTrigger) {
      await p.mouse.click(verTrigger.l + verTrigger.w / 2, verTrigger.t + verTrigger.h / 2);
      await sleep(1500);
      const v4 = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button'))) {
              const t = (el.textContent || '').trim();
              if (/^Version 4/.test(t) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      if (v4) {
        await p.mouse.click(v4.l + v4.w / 2, v4.t + v4.h / 2);
        await sleep(8000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '700-on-v4.png'), fullPage: true });

    // Click Estado y FAQ subagent in tree
    const estado = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('span, a'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Estado y FAQ' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 400 && rc.width < 200) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (estado) {
      await p.mouse.click(estado.l + estado.w / 2, estado.t + estado.h / 2);
      await sleep(3000);
    }
    await p.screenshot({ path: path.join(SHOTS, '701-estado-pane.png'), fullPage: true });

    // Find the "+" button near "Actions Available For Reasoning" in the right pane.
    // From screenshot 603: the + button is at approximately (573, 432) — right of "Get Test Drive Status" pill
    // The button has aria-label like "Add" or just contains a + icon. Let's find it via DOM.
    const addPlus = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button'))) {
            const t = (el.textContent || '').trim();
            const aria = el.getAttribute('aria-label') || '';
            if ((t === '' || t === '+') && (/Add/i.test(aria) || /add action/i.test(aria)) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left > 300 && rc.left < 1200 && rc.top > 200) {
                out.push({ l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), aria });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('+ buttons in right pane:', JSON.stringify(addPlus, null, 2));
    fs.writeFileSync(path.join(SHOTS, '701-plus-buttons.json'), JSON.stringify(addPlus, null, 2));

    // If we have any candidates, click the bottom-most one (Actions section)
    let target = null;
    if (addPlus.length > 0) {
      target = addPlus.reduce((a, b) => (a.t > b.t ? a : b));
    } else {
      // Hardcoded fallback from screenshot 701: + button at right edge of Actions Available section
      // Visible at roughly (1175, 879) in fullPage shot but viewport is 1600x1000 — likely scrolled
      // Try multiple Y positions; the + is below "Actions Available For Reasoning" text near right edge of canvas
      // Look for any black square button at right side of canvas pane
      console.log('falling back to scan for square + button at right edge');
      const scan = await p.evaluate(() => {
        const out = [];
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('button, [role="button"]'))) {
              const t = (el.textContent || '').trim();
              if (t.length <= 2 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                // square-ish, positioned in right half of canvas
                if (rc.width > 18 && rc.width < 50 && rc.height > 18 && rc.height < 50 && rc.left > 800 && rc.left < 1300 && rc.top > 250 && rc.top < 950) {
                  out.push({ l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t });
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return out;
      });
      console.log('+ button scan:', JSON.stringify(scan, null, 2));
      if (scan.length > 0) {
        // Pick the bottom-most (closest to "Actions Available" section)
        target = scan.reduce((a, b) => (a.t > b.t ? a : b));
      } else {
        target = { l: 1175, t: 879, w: 24, h: 24 };
      }
    }
    console.log('clicking + at', target);
    await p.mouse.click(target.l + target.w / 2, target.t + target.h / 2);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '702-after-plus-click.png'), fullPage: true });

    // The dropdown should show options like "Add from Asset Library" or directly the AQWK / agent-level assets
    const menuItems = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, button, [role="option"], [role="menuitem"]'))) {
            const t = (el.textContent || '').trim();
            if (t && t.length > 2 && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              // Exclude header/sidebar items
              if (rc.top > 200 && rc.left > 200) {
                if (!out.find(x => x.text === t)) out.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top) });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      // Filter to anything mentioning Knowledge / Answer / Asset Library / Add
      return out.filter(x => /Knowledge|Answer|Asset Library|Existing|Add from|Available/i.test(x.text));
    });
    console.log('relevant menu items:', JSON.stringify(menuItems, null, 2));
    fs.writeFileSync(path.join(SHOTS, '702-menu-items.json'), JSON.stringify(menuItems, null, 2));

    // Click the AQWK option directly if visible
    const aqwk = menuItems.find(x => /Answer Questions with Knowledge|AnswerQuestionsWithKnowledge/i.test(x.text));
    const fromAvail = menuItems.find(x => /Available|Existing|Asset Library/i.test(x.text));

    if (aqwk) {
      console.log('clicking AQWK directly:', aqwk);
      await p.mouse.click(aqwk.l + 40, aqwk.t + 10);
      await sleep(4000);
    } else if (fromAvail) {
      console.log('clicking', fromAvail.text);
      await p.mouse.click(fromAvail.l + 40, fromAvail.t + 10);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '703-after-from-avail.png'), fullPage: true });
      // Now the AQWK pick should be visible
      const aqwk2 = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('*'))) {
              const t = (el.textContent || '').trim();
              if (/^(Answer Questions with Knowledge|AnswerQuestionsWithKnowledge)/i.test(t) && t.length < 60 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      if (aqwk2) {
        await p.mouse.click(aqwk2.l + aqwk2.w / 2, aqwk2.t + aqwk2.h / 2);
        await sleep(3000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '704-aqwk-attached.png'), fullPage: true });

    // Verify AQWK now in Actions Available For Reasoning
    const verifyAQWK = await p.evaluate(() => {
      const out = { aqwkVisible: false, actionsListed: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = (el.textContent || '').trim();
            if (/^(Answer Questions with Knowledge|AnswerQuestionsWithKnowledge|Knowledge)$/i.test(t) && t.length < 50 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top > 350 && rc.left > 400) {
                out.aqwkVisible = true;
                out.actionsListed.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top) });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('AQWK verified attached?', JSON.stringify(verifyAQWK, null, 2));
    fs.writeFileSync(path.join(SHOTS, '704-verify.json'), JSON.stringify(verifyAQWK, null, 2));

    console.log('STEP 62 PROBE COMPLETE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '62-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
