// Phase 6b step 44: deeply inspect the "Data" Explorer node — what tag, attrs, parent.

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

    // Find any element whose direct/inner text is exactly "Data" (and is in left Explorer)
    const candidates = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const directText = Array.from(el.childNodes)
              .filter(n => n.nodeType === 3)
              .map(n => n.textContent.trim())
              .join('');
            if (directText === 'Data' && el.offsetParent !== null) {
              const rect = el.getBoundingClientRect();
              if (rect.left < 250 && rect.top > 200 && rect.top < 700) {
                let parent = el;
                let chain = [];
                for (let i = 0; i < 5; i++) {
                  if (!parent) break;
                  chain.push({
                    tag: parent.tagName,
                    role: parent.getAttribute('role'),
                    cls: (parent.className || '').toString().slice(0, 80),
                    expanded: parent.getAttribute('aria-expanded'),
                  });
                  parent = parent.parentElement;
                }
                out.push({
                  tag: el.tagName,
                  cls: (el.className || '').toString().slice(0, 80),
                  rect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height },
                  chain,
                });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('Data candidates:', JSON.stringify(candidates, null, 2));
    fs.writeFileSync(path.join(SHOTS, '300-candidates.json'), JSON.stringify(candidates, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
