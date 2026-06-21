// Phase 6c step 68: V4 has WRONG action (Add Case Comment) bound to Estado y FAQ.
// Need to:
// 1) Deactivate V4
// 2) New Version → V5 Draft
// 3) Click Estado y FAQ → in pane, find Add Case Comment row → delete it
// 4) Click + Add action to subagent → Add from Asset Library
// 5) Click Select on the AQWK card (3rd column of row 1, coords ~1133, 396)
// 6) Click Add to Agent
// 7) Save → Commit V5 → Activate

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

    // We are on V3 by default. Switch to V4 (Active) so we can deactivate.
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
    await p.screenshot({ path: path.join(SHOTS, '1000-on-v4-active.png'), fullPage: true });

    // Deactivate V4
    const deact = await findEnabledExact(p, 'Deactivate');
    if (deact) {
      console.log('clicking Deactivate');
      await p.mouse.click(deact.l + deact.w / 2, deact.t + deact.h / 2);
      await sleep(2500);
      const modalDeact = await findEnabledExact(p, 'Deactivate', { minTop: 200 });
      if (modalDeact) {
        await p.mouse.click(modalDeact.l + modalDeact.w / 2, modalDeact.t + modalDeact.h / 2);
        await sleep(8000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '1001-after-deactivate.png'), fullPage: true });

    // New Version → V5
    const nv = await findEnabledExact(p, 'New Version');
    if (nv) {
      console.log('clicking New Version');
      await p.mouse.click(nv.l + nv.w / 2, nv.t + nv.h / 2);
      await sleep(3500);
      const modalCreate = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button'))) {
              const t = (b.textContent || '').trim();
              if (/^(Create|New Version|Save|Confirm|OK)$/.test(t) && !b.disabled && b.offsetParent !== null) {
                const rc = b.getBoundingClientRect();
                if (rc.top > 200) return { text: t, l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('modal create btn:', modalCreate);
      if (modalCreate) {
        await p.mouse.click(modalCreate.l + modalCreate.w / 2, modalCreate.t + modalCreate.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '1002-after-new-version.png'), fullPage: true });

    // Switch to V5 if not already on it
    const verTrigger2 = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, a, [aria-haspopup]'))) {
            const t = (el.textContent || '').trim();
            if (/^Version \d+ \(/.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top < 100 && rc.left < 600) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('current ver after new:', verTrigger2);
    if (verTrigger2 && !/^Version 5/.test(verTrigger2.text)) {
      await p.mouse.click(verTrigger2.l + verTrigger2.w / 2, verTrigger2.t + verTrigger2.h / 2);
      await sleep(1500);
      const v5 = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button'))) {
              const t = (el.textContent || '').trim();
              if (/^Version 5/.test(t) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      if (v5) { await p.mouse.click(v5.l + v5.w / 2, v5.t + v5.h / 2); await sleep(8000); }
    }

    // Click Estado y FAQ tree node
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
    await p.mouse.click(estado.l + estado.w / 2, estado.t + estado.h / 2);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '1003-estado-on-v5.png'), fullPage: true });

    // Find "Add Case Comment" row in pane → look for its trash/X icon
    // Better: find Add Case Comment node in the LEFT TREE under Estado y FAQ subagent and right-click or show options
    const addCaseTreeNode = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('span, a'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Add Case Comment' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 400) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Add Case Comment tree node:', addCaseTreeNode);
    if (addCaseTreeNode) {
      // Hover it to reveal "Show options" 3-dot button
      await p.mouse.move(addCaseTreeNode.l + addCaseTreeNode.w / 2, addCaseTreeNode.t + addCaseTreeNode.h / 2);
      await sleep(1500);
      await p.screenshot({ path: path.join(SHOTS, '1004-hover-add-case.png'), fullPage: true });

      // Find "Show options" button on its row
      const showOpts = await p.evaluate(({ row }) => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('button, [role="button"]'))) {
              const aria = el.getAttribute('aria-label') || '';
              if (/Show options/i.test(aria) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (Math.abs(rc.top - row) < 25 && rc.left < 400) {
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      }, { row: addCaseTreeNode.t });
      console.log('Show options btn:', showOpts);
      if (showOpts) {
        await p.mouse.click(showOpts.l + showOpts.w / 2, showOpts.t + showOpts.h / 2);
        await sleep(2000);
        await p.screenshot({ path: path.join(SHOTS, '1005-options-menu.png'), fullPage: true });

        // Click "Remove" or "Delete" or "Remove from subagent"
        const removeBtn = await p.evaluate(() => {
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const el of Array.from(r.querySelectorAll('a, li, button, [role="menuitem"]'))) {
                const t = (el.textContent || '').trim();
                if (/^(Remove|Delete|Remove from subagent|Remove Action|Delete Action)$/i.test(t) && el.offsetParent !== null) {
                  const rc = el.getBoundingClientRect();
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
                }
              }
              for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
            } catch {}
          }
          return null;
        });
        console.log('Remove btn:', removeBtn);
        if (removeBtn) {
          await p.mouse.click(removeBtn.l + removeBtn.w / 2, removeBtn.t + removeBtn.h / 2);
          await sleep(3000);
          await p.screenshot({ path: path.join(SHOTS, '1006-after-remove.png'), fullPage: true });
          // Possible confirm modal
          const confirmRemove = await findEnabledExact(p, 'Remove', { minTop: 200 })
            || await findEnabledExact(p, 'Delete', { minTop: 200 })
            || await findEnabledExact(p, 'Confirm', { minTop: 200 });
          if (confirmRemove) {
            await p.mouse.click(confirmRemove.l + confirmRemove.w / 2, confirmRemove.t + confirmRemove.h / 2);
            await sleep(4000);
          }
        }
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '1007-after-remove-flow.png'), fullPage: true });

    // Re-click Estado y FAQ then hover
    const estado2 = await p.evaluate(() => {
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
    await p.mouse.click(estado2.l + estado2.w / 2, estado2.t + estado2.h / 2);
    await sleep(2000);
    await p.mouse.move(estado2.l + estado2.w / 2, estado2.t + estado2.h / 2);
    await sleep(1500);

    // Click + Add action to subagent
    const addBtn = await p.evaluate(({ etop }) => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, [role="button"]'))) {
            const aria = el.getAttribute('aria-label') || '';
            if (/Add action to subagent/i.test(aria) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (Math.abs(rc.top - etop) < 20) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    }, { etop: estado2.t });
    await p.mouse.click(addBtn.l + addBtn.w / 2, addBtn.t + addBtn.h / 2);
    await sleep(2500);

    // Click "Add from Asset Library"
    const fromLib = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, button, [role="menuitem"]'))) {
            const t = (el.textContent || '').trim();
            if (/^Add from Asset Library$/i.test(t) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    await p.mouse.click(fromLib.l + fromLib.w / 2, fromLib.t + fromLib.h / 2);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '1008-asset-library.png'), fullPage: true });

    // The third Select button on row 1 IS for AQWK (3rd column).
    // Coordinates from prior screenshot: approximately (1133, 396).
    // Better: find "Answer Questions" text in the modal, then walk up to find the Select button in same card.
    const aqwkSelect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const text = (el.textContent || '').trim();
            // Match the truncated card title
            if (/^Answer Questions with Knowle/i.test(text) && text.length < 50 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              // Walk up to card container, then find Select button below it
              let card = el.parentElement;
              for (let i = 0; i < 6 && card; i++) {
                const buttons = card.querySelectorAll ? card.querySelectorAll('button') : [];
                for (const b of buttons) {
                  const bt = (b.textContent || '').trim();
                  if (bt === 'Select' && b.offsetParent !== null) {
                    const brc = b.getBoundingClientRect();
                    return { l: brc.left, t: brc.top, w: brc.width, h: brc.height, source: `walk depth ${i}` };
                  }
                }
                card = card.parentElement;
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('AQWK Select btn:', aqwkSelect);
    if (!aqwkSelect) {
      // Hard-code 3rd Select on row 1: from screenshot 982, coords (1133, 396)
      console.log('falling back to hard-coded coord (1133, 396)');
      await p.mouse.click(1133, 396);
    } else {
      await p.mouse.click(aqwkSelect.l + aqwkSelect.w / 2, aqwkSelect.t + aqwkSelect.h / 2);
    }
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '1009-aqwk-selected.png'), fullPage: true });

    // Click Add to Agent
    const addToAgent = await findEnabledExact(p, 'Add to Agent');
    if (addToAgent) {
      console.log('clicking Add to Agent');
      await p.mouse.click(addToAgent.l + addToAgent.w / 2, addToAgent.t + addToAgent.h / 2);
      await sleep(6000);
    }
    await p.screenshot({ path: path.join(SHOTS, '1010-after-add-to-agent.png'), fullPage: true });

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '1011-after-save.png'), fullPage: true });

    // Commit Version
    const cv = await findEnabledExact(p, 'Commit Version');
    if (cv) {
      await p.mouse.click(cv.l + cv.w / 2, cv.t + cv.h / 2);
      await sleep(3000);
      const modalCv = await findEnabledExact(p, 'Commit Version', { minTop: 200 });
      if (modalCv) {
        await p.mouse.click(modalCv.l + modalCv.w / 2, modalCv.t + modalCv.h / 2);
        await sleep(20000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '1012-after-commit.png'), fullPage: true });

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
    await p.screenshot({ path: path.join(SHOTS, '1013-after-activate.png'), fullPage: true });

    console.log('STEP 68 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '68-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
