// Phase 6b step 57: confirm Commit Version dialog → wait → click Activate.

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

async function findEnabledButton(p, label, opts = {}) {
  const minLeft = opts.minLeft || 0;
  return await p.evaluate(({ lbl, minLeft }) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const b of Array.from(r.querySelectorAll('button'))) {
          const t = (b.textContent || '').trim();
          if (t === lbl && !b.disabled && b.offsetParent !== null) {
            const rc = b.getBoundingClientRect();
            if (rc.left >= minLeft) {
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  }, { lbl: label, minLeft });
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
    await p.screenshot({ path: path.join(SHOTS, '430-canvas-loaded.png'), fullPage: true });

    // Save first to ensure latest state is persisted
    let saveBtn = await findEnabledButton(p, 'Save');
    if (saveBtn) {
      console.log('clicking Save first...');
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(6000);
    }

    // Click Commit Version (header)
    let cvBtn = await findEnabledButton(p, 'Commit Version');
    if (!cvBtn) {
      console.log('Commit Version not enabled — checking state');
      await p.screenshot({ path: path.join(SHOTS, '431-no-commit.png'), fullPage: true });
      throw new Error('Commit Version button not enabled');
    }
    console.log('clicking header Commit Version at', cvBtn);
    await p.mouse.click(cvBtn.l + cvBtn.w / 2, cvBtn.t + cvBtn.h / 2);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '432-commit-modal.png'), fullPage: true });

    // The dialog has a "Commit Version" button (the modal confirm button) — we need the one INSIDE the modal.
    // It appears at higher x (around 1133) and lower y (around 570) per screenshot 425.
    // Use minLeft filter to get the modal one (header one is at 1410).
    // Actually looking at 425-commit-modal.png, modal Commit Version is at center-ish around (1133, 570).
    // The header button stays visible too at (1410, 9). Filter by min top > 200 instead.
    const modalCvBtn = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Commit Version' && !b.disabled && b.offsetParent !== null) {
              const rc = b.getBoundingClientRect();
              if (rc.top > 200) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('modal Commit Version at:', modalCvBtn);
    if (!modalCvBtn) throw new Error('Modal Commit Version button not found');
    await p.mouse.click(modalCvBtn.l + modalCvBtn.w / 2, modalCvBtn.t + modalCvBtn.h / 2);
    await sleep(15000); // commit takes time
    await p.screenshot({ path: path.join(SHOTS, '433-after-commit.png'), fullPage: true });

    // After commit, the page should reload showing Version 3 (Committed) with Activate button enabled.
    const postCommit = await p.evaluate(() => {
      const out = { title: document.title, url: location.href, headings: [], buttons: [] };
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
            if (t && t.length < 50 && b.offsetParent !== null && !out.buttons.find(x => x.text === t)) {
              const rc = b.getBoundingClientRect();
              out.buttons.push({ text: t, disabled: b.disabled || false, l: Math.round(rc.left), t: Math.round(rc.top) });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      // Also look for version status text
      const allTextRoots = [document];
      const seen = new Set();
      const versionText = [];
      while (allTextRoots.length) {
        const root = allTextRoots.shift(); if (!root || seen.has(root)) continue; seen.add(root);
        try {
          for (const el of Array.from(root.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (/Version \d+ \(.+\)/.test(t) && t.length < 80 && !versionText.includes(t)) versionText.push(t);
          }
          for (const el of root.querySelectorAll('*')) if (el.shadowRoot) allTextRoots.push(el.shadowRoot);
        } catch {}
      }
      out.versions = versionText;
      return out;
    });
    console.log('post-commit state:', JSON.stringify(postCommit, null, 2));
    fs.writeFileSync(path.join(SHOTS, '433-probe.json'), JSON.stringify(postCommit, null, 2));

    // Click Activate if visible
    const activateBtn = await findEnabledButton(p, 'Activate');
    if (activateBtn) {
      console.log('clicking Activate at', activateBtn);
      await p.mouse.click(activateBtn.l + activateBtn.w / 2, activateBtn.t + activateBtn.h / 2);
      await sleep(4000);
      await p.screenshot({ path: path.join(SHOTS, '434-activate-modal.png'), fullPage: true });

      // Confirm activate modal
      const modalActivate = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Activate' && !b.disabled && b.offsetParent !== null) {
                const rc = b.getBoundingClientRect();
                if (rc.top > 200) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('modal Activate at:', modalActivate);
      if (modalActivate) {
        await p.mouse.click(modalActivate.l + modalActivate.w / 2, modalActivate.t + modalActivate.h / 2);
        await sleep(15000);
        await p.screenshot({ path: path.join(SHOTS, '435-after-activate.png'), fullPage: true });
      }
    } else {
      console.log('Activate not yet visible after commit');
    }

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '57-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
