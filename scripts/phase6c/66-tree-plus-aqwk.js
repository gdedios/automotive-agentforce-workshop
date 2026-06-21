// Phase 6c step 66: hover Estado y FAQ in tree → click the small + icon
// that appears next to the node name (right side). That opens "Add Action" / picker.

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

async function findEnabledExact(p, label, opts = {}) {
  const tag = opts.tag || 'button';
  const minTop = opts.minTop ?? -Infinity;
  return await p.evaluate(({ lbl, tag, minTop }) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll(tag))) {
          const t = (el.textContent || '').trim();
          if (t === lbl && !el.disabled && el.offsetParent !== null) {
            const rc = el.getBoundingClientRect();
            if (rc.top >= minTop) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  }, { lbl: label, tag, minTop });
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
    await p.goto(CANVAS_V3, { waitUntil: 'domcontentloaded' });
    await sleep(20000);

    // Switch to V4
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
      if (v4) { await p.mouse.click(v4.l + v4.w / 2, v4.t + v4.h / 2); await sleep(8000); }
    }

    // Find Estado y FAQ tree node, hover it to reveal the + icon
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
    console.log('Estado:', estado);

    // hover (mouse.move) to reveal the + icon next to it
    await p.mouse.move(estado.l + estado.w / 2, estado.t + estado.h / 2);
    await sleep(1500);
    await p.screenshot({ path: path.join(SHOTS, '970-estado-hover.png'), fullPage: true });

    // Now find a + icon button on the SAME ROW (dy < 20) as Estado y FAQ
    const treePlus = await p.evaluate(({ estadoTop, estadoLeft }) => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, [role="button"], a'))) {
            const t = (el.textContent || '').trim();
            const aria = el.getAttribute('aria-label') || el.getAttribute('title') || '';
            if (el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 400 && rc.width > 8 && rc.width < 30 && rc.height > 8 && rc.height < 30) {
                const dy = Math.abs(rc.top - estadoTop);
                if (dy < 25 && rc.left > estadoLeft) {
                  out.push({ l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), dy, aria, text: t });
                }
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out.sort((a,b) => a.dy - b.dy);
    }, { estadoTop: estado.t, estadoLeft: estado.l });
    console.log('tree plus candidates:', JSON.stringify(treePlus.slice(0,5), null, 2));
    fs.writeFileSync(path.join(SHOTS, '970-tree-plus.json'), JSON.stringify(treePlus, null, 2));

    if (!treePlus.length) {
      // Fallback: click coords from screenshot 951 — visible + at ~(125, 234)
      console.log('falling back to coord (125, 234)');
      await p.mouse.click(125, 234);
    } else {
      // Pick the leftmost + icon (the + button is the first one revealed on hover, before "...")
      const candidates = treePlus.filter(c => /add|plus|create|action/i.test(c.aria) || c.text === '');
      const target = candidates[0] || treePlus[0];
      console.log('clicking tree +:', target);
      await p.mouse.click(target.l + target.w / 2, target.t + target.h / 2);
    }
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '971-after-tree-plus.png'), fullPage: true });

    // Probe what menu appeared
    const menuItems = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, button, [role="menuitem"], [role="option"]'))) {
            const t = (el.textContent || '').trim();
            if (t && t.length > 2 && t.length < 100 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top > 100 && !out.find(x => x.text === t)) {
                out.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top) });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out.filter(x => /Action|Knowledge|Answer|Asset|Library|Add|Existing|Available|Topic|Subagent|Reasoning/i.test(x.text));
    });
    console.log('menu items:', JSON.stringify(menuItems, null, 2));
    fs.writeFileSync(path.join(SHOTS, '971-menu.json'), JSON.stringify(menuItems, null, 2));

    // Click "Add Action" or similar
    const addAction = menuItems.find(x => /^(Add Action|Add an action|Add Existing Action|Add from Library|Add from Asset Library)$/i.test(x.text))
      || menuItems.find(x => /^Action$/i.test(x.text))
      || menuItems.find(x => /Add.*Action/i.test(x.text));
    if (addAction) {
      console.log('clicking', addAction);
      await p.mouse.click(addAction.l + 40, addAction.t + 10);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '972-after-add-action.png'), fullPage: true });
    }

    // Now find AQWK option in dropdown / search box
    let aqwk = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, button, span, [role="option"], [role="menuitem"]'))) {
            const t = (el.textContent || '').trim();
            if (/Answer Questions with Knowledge|AnswerQuestionsWithKnowledge/i.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('AQWK direct:', aqwk);

    if (!aqwk) {
      // try typing
      await p.keyboard.type('Answer', { delay: 80 });
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '973-typed-answer.png'), fullPage: true });
      aqwk = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, button, span, [role="option"], [role="menuitem"]'))) {
              const t = (el.textContent || '').trim();
              if (/Answer Questions with Knowledge|AnswerQuestionsWithKnowledge/i.test(t) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('AQWK after typing:', aqwk);
    }

    if (!aqwk) {
      console.log('AQWK still not found — keep browser open for inspection');
      await sleep(60000);
      throw new Error('AQWK not found');
    }

    await p.mouse.click(aqwk.l + aqwk.w / 2, aqwk.t + aqwk.h / 2);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '974-aqwk-selected.png'), fullPage: true });

    // If a confirmation dialog appears, look for "Add" / "Save" button
    const addConfirm = await findEnabledExact(p, 'Add', { minTop: 200 });
    if (addConfirm) {
      console.log('clicking Add confirm');
      await p.mouse.click(addConfirm.l + addConfirm.w / 2, addConfirm.t + addConfirm.h / 2);
      await sleep(4000);
    }
    await p.screenshot({ path: path.join(SHOTS, '975-after-add-confirm.png'), fullPage: true });

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '976-after-save.png'), fullPage: true });

    // Commit Version
    const cv = await findEnabledExact(p, 'Commit Version');
    if (cv) {
      await p.mouse.click(cv.l + cv.w / 2, cv.t + cv.h / 2);
      await sleep(3000);
      const modalCv = await findEnabledExact(p, 'Commit Version', { minTop: 200 });
      if (modalCv) {
        await p.mouse.click(modalCv.l + modalCv.w / 2, modalCv.t + modalCv.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '977-after-commit.png'), fullPage: true });

    // Activate
    const act = await findEnabledExact(p, 'Activate');
    if (act) {
      await p.mouse.click(act.l + act.w / 2, act.t + act.h / 2);
      await sleep(3000);
      const modalAct = await findEnabledExact(p, 'Activate', { minTop: 200 });
      if (modalAct) {
        await p.mouse.click(modalAct.l + modalAct.w / 2, modalAct.t + modalAct.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '978-after-activate.png'), fullPage: true });

    console.log('STEP 66 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '66-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
