// Phase 6b step 51: deep-probe Estado y FAQ tab — find ALL buttons + their positions
// to identify how to Add Action / AnswerQuestionsWithKnowledge.

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

    // Click Estado y FAQ
    const efaqRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (t === 'Estado y FAQ' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 300) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (efaqRect) await p.mouse.click(efaqRect.l + efaqRect.w / 2, efaqRect.t + efaqRect.h / 2);
    await sleep(6000);

    // Scroll to bottom of canvas to see Actions section fully
    await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = (el.textContent || '').trim();
            if (/Actions Available For Reasoning/i.test(t)) {
              el.scrollIntoView({ block: 'start' });
              return;
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
    });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '370-efaq-actions-scrolled.png'), fullPage: true });

    // Probe ALL buttons + visible plus icons near Actions section
    const probe = await p.evaluate(() => {
      const out = { allButtons: [], inputs: [], plusIcons: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            const aria = b.getAttribute('aria-label') || '';
            if (b.offsetParent !== null) {
              const rc = b.getBoundingClientRect();
              out.allButtons.push({
                text: t.slice(0, 80),
                aria: aria.slice(0, 80),
                disabled: b.disabled || false,
                rect: { l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) },
              });
            }
          }
          for (const inp of Array.from(r.querySelectorAll('input, [role="combobox"]'))) {
            if (inp.offsetParent !== null) {
              const ph = inp.getAttribute('placeholder') || '';
              const aria = inp.getAttribute('aria-label') || '';
              if (ph || aria) {
                const rc = inp.getBoundingClientRect();
                out.inputs.push({ ph: ph.slice(0, 80), aria: aria.slice(0, 80), rect: { l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) } });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    fs.writeFileSync(path.join(SHOTS, '370-probe.json'), JSON.stringify(probe, null, 2));
    console.log('all buttons (top 60):');
    probe.allButtons.slice(0, 60).forEach(b => {
      console.log(`  [${b.rect.l},${b.rect.t}] ${b.disabled ? 'D ' : '  '}${(b.text || '<' + b.aria + '>').slice(0, 60)}`);
    });
    console.log('inputs:');
    probe.inputs.forEach(i => console.log(`  [${i.rect.l},${i.rect.t}] ph="${i.ph}" aria="${i.aria}"`));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '51-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
