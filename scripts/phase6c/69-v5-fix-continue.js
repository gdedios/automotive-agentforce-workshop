// Phase 6c step 69: V5 Draft now exists. Switch to V5, remove Add Case Comment from Estado y FAQ,
// add AQWK using a TEXT-based card identification (since the search input only shows results matching).

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

async function switchToVersion(p, n) {
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
  if (!verTrigger) return false;
  await p.mouse.click(verTrigger.l + verTrigger.w / 2, verTrigger.t + verTrigger.h / 2);
  await sleep(1500);
  const target = await p.evaluate((n) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button'))) {
          const t = (el.textContent || '').trim();
          if (new RegExp(`^Version ${n}( |$)`).test(t) && el.offsetParent !== null) {
            const rc = el.getBoundingClientRect();
            return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  }, n);
  if (target) {
    await p.mouse.click(target.l + target.w / 2, target.t + target.h / 2);
    await sleep(8000);
    return true;
  }
  return false;
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

    // Switch to V5
    const ok = await switchToVersion(p, 5);
    console.log('switched to V5:', ok);
    await p.screenshot({ path: path.join(SHOTS, '1100-on-v5.png'), fullPage: true });

    // Click Estado y FAQ
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

    // Find "Add Case Comment" tree node, hover to reveal "..." options
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
    console.log('Add Case Comment node:', addCaseTreeNode);
    if (addCaseTreeNode) {
      await p.mouse.move(addCaseTreeNode.l + addCaseTreeNode.w / 2, addCaseTreeNode.t + addCaseTreeNode.h / 2);
      await sleep(1500);

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
        await p.screenshot({ path: path.join(SHOTS, '1101-options-menu.png'), fullPage: true });

        const removeBtn = await p.evaluate(() => {
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const el of Array.from(r.querySelectorAll('a, li, button, [role="menuitem"]'))) {
                const t = (el.textContent || '').trim();
                if (/^(Remove from this Subagent|Remove|Delete|Remove Action|Delete Action)$/i.test(t) && el.offsetParent !== null) {
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
          // confirm
          const conf = await findEnabledExact(p, 'Remove', { minTop: 200 })
            || await findEnabledExact(p, 'Delete', { minTop: 200 })
            || await findEnabledExact(p, 'Confirm', { minTop: 200 });
          if (conf) {
            await p.mouse.click(conf.l + conf.w / 2, conf.t + conf.h / 2);
            await sleep(4000);
          }
        }
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '1102-after-remove.png'), fullPage: true });

    // Re-click Estado y FAQ then hover to add AQWK
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

    const addBtn = await p.evaluate(({ etop }) => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, [role="button"]'))) {
            const aria = el.getAttribute('aria-label') || '';
            if (/Add action to subagent/i.test(aria) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (Math.abs(rc.top - etop) < 20) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    }, { etop: estado2.t });
    await p.mouse.click(addBtn.l + addBtn.w / 2, addBtn.t + addBtn.h / 2);
    await sleep(2500);

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
    await p.screenshot({ path: path.join(SHOTS, '1103-asset-modal.png'), fullPage: true });

    // Type "Answer Q" into the modal's search box
    // The modal "Search actions..." input is at coord ~(700, 161)
    await p.mouse.click(700, 161);
    await sleep(500);
    await p.keyboard.type('Answer', { delay: 80 });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '1104-modal-search.png'), fullPage: true });

    // Now find the AQWK card's Select button
    const aqwkSelect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // Find the "Answer Questions with Knowle..." text
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const text = (el.textContent || '').trim();
            if (/^Answer Questions with Knowle/i.test(text) && text.length < 50 && el.offsetParent !== null) {
              // Walk up looking for nearby Select button
              let card = el.parentElement;
              for (let i = 0; i < 8 && card; i++) {
                const buttons = card.querySelectorAll ? card.querySelectorAll('button') : [];
                for (const b of buttons) {
                  const bt = (b.textContent || '').trim();
                  if (bt === 'Select' && b.offsetParent !== null) {
                    const brc = b.getBoundingClientRect();
                    return { l: brc.left, t: brc.top, w: brc.width, h: brc.height };
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
    console.log('AQWK Select btn after search:', aqwkSelect);
    if (!aqwkSelect) {
      // fallback to first Select button after filter (should be only AQWK)
      const allSel = await p.evaluate(() => {
        const out = [];
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Select' && b.offsetParent !== null) {
                const rc = b.getBoundingClientRect();
                if (rc.top > 200) out.push({ l: rc.left, t: rc.top, w: rc.width, h: rc.height });
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return out.sort((a,b)=>a.t-b.t);
      });
      console.log('Select btns after filter:', allSel);
      if (allSel.length === 1) {
        await p.mouse.click(allSel[0].l + allSel[0].w/2, allSel[0].t + allSel[0].h/2);
      } else if (allSel.length > 1) {
        // multiple matches — pick first
        await p.mouse.click(allSel[0].l + allSel[0].w/2, allSel[0].t + allSel[0].h/2);
      } else {
        throw new Error('No Select btn found');
      }
    } else {
      await p.mouse.click(aqwkSelect.l + aqwkSelect.w / 2, aqwkSelect.t + aqwkSelect.h / 2);
    }
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '1105-aqwk-selected.png'), fullPage: true });

    // Add to Agent
    const addToAgent = await findEnabledExact(p, 'Add to Agent');
    if (addToAgent) {
      await p.mouse.click(addToAgent.l + addToAgent.w / 2, addToAgent.t + addToAgent.h / 2);
      await sleep(6000);
    }
    await p.screenshot({ path: path.join(SHOTS, '1106-after-add.png'), fullPage: true });

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '1107-after-save.png'), fullPage: true });

    // Commit
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
    await p.screenshot({ path: path.join(SHOTS, '1108-after-commit.png'), fullPage: true });

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
    await p.screenshot({ path: path.join(SHOTS, '1109-after-activate.png'), fullPage: true });

    console.log('STEP 69 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '69-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
