// Phase 6c step 60: probe the "Add action to subagent" interaction on Estado_y_FAQ.
// V3 is currently active. Need to:
//   1. Open canvas
//   2. Deactivate V3 → create V4 Draft
//   3. Click Estado_y_FAQ subagent in tree
//   4. Find the "+ Add action to subagent" trigger
//   5. From the dropdown of EXISTING agent-level assets, find AnswerQuestionsWithKnowledge
//   6. Save → Commit V4 → Activate
//
// First run: just probe and screenshot.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6c_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_ROOT = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FrC5UAK`;

if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

async function findText(p, label, opts = {}) {
  const tag = opts.tag || 'button';
  return await p.evaluate(({ lbl, tag, exact }) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll(tag))) {
          const t = (el.textContent || '').trim();
          const match = exact ? t === lbl : t.includes(lbl);
          if (match && el.offsetParent !== null && !el.disabled) {
            const rc = el.getBoundingClientRect();
            return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t.slice(0, 60) };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  }, { lbl: label, tag, exact: opts.exact !== false });
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
    await p.goto(CANVAS_ROOT, { waitUntil: 'domcontentloaded' });
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '500-canvas-loaded.png'), fullPage: true });

    // Probe current version state
    const verState = await p.evaluate(() => {
      const out = { url: location.href, title: document.title, versionTexts: [], buttons: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (/Version \d+ \(.+\)/.test(t) && t.length < 80 && !out.versionTexts.includes(t)) out.versionTexts.push(t);
          }
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^(Deactivate|Activate|New Version|Commit Version|Save)$/.test(t) && !out.buttons.find(x => x.text === t)) {
              const rc = b.getBoundingClientRect();
              out.buttons.push({ text: t, disabled: b.disabled || false, l: Math.round(rc.left), t: Math.round(rc.top) });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('VERSION STATE:', JSON.stringify(verState, null, 2));
    fs.writeFileSync(path.join(SHOTS, '500-version-state.json'), JSON.stringify(verState, null, 2));

    // If V3 is active and there's no V4 Draft, we need to: Deactivate → New Version
    const isV3Active = verState.versionTexts.some(t => /Version 3 \(Active\)/.test(t));
    const hasV4 = verState.versionTexts.some(t => /Version 4/.test(t));
    console.log(`V3 active: ${isV3Active}, V4 exists: ${hasV4}`);

    if (isV3Active && !hasV4) {
      // Click Deactivate
      const deact = await findText(p, 'Deactivate');
      if (deact) {
        console.log('clicking Deactivate at', deact);
        await p.mouse.click(deact.l + deact.w / 2, deact.t + deact.h / 2);
        await sleep(3000);
        await p.screenshot({ path: path.join(SHOTS, '501-deactivate-modal.png'), fullPage: true });
        // Confirm modal — find Deactivate button with top > 200
        const modalDeact = await p.evaluate(() => {
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const b of Array.from(r.querySelectorAll('button'))) {
                const t = (b.textContent || '').trim();
                if (t === 'Deactivate' && !b.disabled && b.offsetParent !== null) {
                  const rc = b.getBoundingClientRect();
                  if (rc.top > 200) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
              }
              for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
            } catch {}
          }
          return null;
        });
        if (modalDeact) {
          console.log('confirming Deactivate at', modalDeact);
          await p.mouse.click(modalDeact.l + modalDeact.w / 2, modalDeact.t + modalDeact.h / 2);
          await sleep(8000);
        }
        await p.screenshot({ path: path.join(SHOTS, '502-after-deactivate.png'), fullPage: true });
      }

      // Click New Version
      const nv = await findText(p, 'New Version');
      if (nv) {
        console.log('clicking New Version at', nv);
        await p.mouse.click(nv.l + nv.w / 2, nv.t + nv.h / 2);
        await sleep(4000);
        await p.screenshot({ path: path.join(SHOTS, '503-new-version-modal.png'), fullPage: true });

        // Confirm modal — could be "Create" or "New Version" button at top > 200
        const modalCreate = await p.evaluate(() => {
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const b of Array.from(r.querySelectorAll('button'))) {
                const t = (b.textContent || '').trim();
                if (/^(Create|New Version|Save|Confirm)$/.test(t) && !b.disabled && b.offsetParent !== null) {
                  const rc = b.getBoundingClientRect();
                  if (rc.top > 200) return { text: t, l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
              }
              for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
            } catch {}
          }
          return null;
        });
        console.log('modal confirm button:', modalCreate);
        if (modalCreate) {
          await p.mouse.click(modalCreate.l + modalCreate.w / 2, modalCreate.t + modalCreate.h / 2);
          await sleep(15000);
        }
        await p.screenshot({ path: path.join(SHOTS, '504-after-new-version.png'), fullPage: true });
      }
    }

    // Now we should have V4 Draft. Click Estado_y_FAQ in the subagents tree.
    // The tree is in left explorer panel. Estado_y_FAQ should be under Subagents.
    // Click it via DOM walk.
    const estadoNode = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, [role="treeitem"], li'))) {
            const t = (el.textContent || '').trim();
            // Match exact "Estado y FAQ" — there may be multiple, want the tree node
            if (t === 'Estado y FAQ' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 400) {  // left panel only
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Estado y FAQ tree node:', estadoNode);
    if (estadoNode) {
      await p.mouse.click(estadoNode.l + estadoNode.w / 2, estadoNode.t + estadoNode.h / 2);
      await sleep(4000);
    }
    await p.screenshot({ path: path.join(SHOTS, '510-estado-clicked.png'), fullPage: true });

    // Probe the Actions Available For Reasoning panel + look for "+ Add action" trigger
    const subagentProbe = await p.evaluate(() => {
      const out = { actionsAvailable: [], addTriggers: [], buttons: [], links: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // Look for "Actions Available For Reasoning" heading and items below it
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (/Actions Available For Reasoning/i.test(t) && t.length < 100) {
              // Get parent siblings containing action names
              const parent = el.parentElement;
              if (parent) {
                for (const sib of Array.from(parent.querySelectorAll('*'))) {
                  const st = (sib.textContent || '').trim();
                  if (st && st.length < 60 && st !== t && !out.actionsAvailable.includes(st) && /^[A-Za-z][\w_]*$/.test(st)) {
                    out.actionsAvailable.push(st);
                  }
                }
              }
            }
          }
          // Find Add action triggers — buttons, links, anchors
          for (const el of Array.from(r.querySelectorAll('a, button, [role="button"]'))) {
            const t = (el.textContent || '').trim();
            if (/Add action|Add Action|\+ Add|Add to subagent|Add reasoning/i.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (!out.addTriggers.find(x => x.text === t)) {
                out.addTriggers.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), tag: el.tagName });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('subagent probe:', JSON.stringify(subagentProbe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '510-subagent-probe.json'), JSON.stringify(subagentProbe, null, 2));

    console.log('PROBE DONE — review screenshots + JSON before next step');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '60-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
