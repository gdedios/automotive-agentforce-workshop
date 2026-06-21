// Final attempt: click toolbar Commit Version, then click modal Commit Version
// using multiple click strategies in sequence (locator.click + dispatchEvent +
// pointer sequence). Polls bundle list for _2 to appear. Bounded at 4 min total.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ORG = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const BUILDER_URL = 'https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC';
const fd = JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG, '-p', '/lightning/n/standard-AgentforceStudio?c__nav=agents', '--json'], { encoding: 'utf8' })).result.url;

function bundleVersions() {
  try {
    const list = execFileSync('sf', ['org', 'list', 'metadata', '-m', 'AiAuthoringBundle', '-o', ORG, '--json'], { encoding: 'utf8' });
    return JSON.parse(list).result
      .filter((r) => r.fullName.startsWith('ElectraAI_Auto'))
      .map((b) => b.fullName)
      .sort();
  } catch (e) { return []; }
}

(async () => {
  const startTotal = Date.now();
  const HARD_LIMIT = 4 * 60 * 1000;

  const ctx = await chromium.launchPersistentContext('/tmp/cft-electra-enable', {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(20000);

  try {
    console.log('=== loading Builder ===');
    await p.goto(fd, { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    await p.evaluate(() => {
      function w(r) { for (const a of r.querySelectorAll('a,button,*[role="button"]')) { if ((a.textContent || '').trim() === 'Take Me There') { a.click(); return; } } for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot); }
      w(document);
    });
    await sleep(4000);
    await p.goto(BUILDER_URL, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    console.log('versions before:', bundleVersions().join(', '));

    // ---- step 1: click toolbar Commit Version ----
    console.log('=== clicking toolbar Commit Version ===');
    const toolbarClicked = await p.evaluate(() => {
      function findAll(r, out) {
        for (const a of r.querySelectorAll('button,*[role="button"]')) {
          if ((a.textContent || '').trim() === 'Commit Version') out.push(a);
        }
        for (const n of r.querySelectorAll('*')) if (n.shadowRoot) findAll(n.shadowRoot, out);
      }
      const out = []; findAll(document, out);
      if (out.length === 0) return { ok: false, count: 0 };
      out[0].click();
      return { ok: true, count: out.length };
    });
    console.log('toolbar:', JSON.stringify(toolbarClicked));
    await sleep(6000);

    // ---- step 2: click modal Commit Version ----
    // dialog has its own Commit Version button; index >= 1 in DOM order
    console.log('=== attempting modal Commit Version click (multi-strategy) ===');
    const tries = [
      // A: dispatch a real click event chain on the LAST matching button
      async () => p.evaluate(() => {
        function findAll(r, out) {
          for (const a of r.querySelectorAll('button,*[role="button"]')) {
            if ((a.textContent || '').trim() === 'Commit Version') out.push(a);
          }
          for (const n of r.querySelectorAll('*')) if (n.shadowRoot) findAll(n.shadowRoot, out);
        }
        const out = []; findAll(document, out);
        if (out.length < 2) return { strategy: 'A', ok: false, count: out.length };
        const btn = out[out.length - 1];
        btn.scrollIntoView({ block: 'center' });
        for (const t of ['pointerdown','mousedown','pointerup','mouseup','click']) {
          btn.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window, button: 0 }));
        }
        return { strategy: 'A', ok: true, count: out.length };
      }),

      // B: real Playwright mouse click at the LAST button's bbox center
      async () => {
        const box = await p.evaluate(() => {
          function findAll(r, out) {
            for (const a of r.querySelectorAll('button,*[role="button"]')) {
              if ((a.textContent || '').trim() === 'Commit Version') out.push(a);
            }
            for (const n of r.querySelectorAll('*')) if (n.shadowRoot) findAll(n.shadowRoot, out);
          }
          const out = []; findAll(document, out);
          if (out.length < 2) return null;
          const r = out[out.length - 1].getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
        });
        if (!box) return { strategy: 'B', ok: false, reason: 'no second btn' };
        await p.mouse.move(box.x, box.y);
        await sleep(80);
        await p.mouse.down();
        await sleep(60);
        await p.mouse.up();
        return { strategy: 'B', ok: true, box };
      },

      // C: focus + keyboard Enter
      async () => {
        const focused = await p.evaluate(() => {
          function findAll(r, out) {
            for (const a of r.querySelectorAll('button,*[role="button"]')) {
              if ((a.textContent || '').trim() === 'Commit Version') out.push(a);
            }
            for (const n of r.querySelectorAll('*')) if (n.shadowRoot) findAll(n.shadowRoot, out);
          }
          const out = []; findAll(document, out);
          if (out.length < 2) return false;
          out[out.length - 1].focus();
          return true;
        });
        if (!focused) return { strategy: 'C', ok: false };
        await p.keyboard.press('Enter');
        await sleep(200);
        await p.keyboard.press('Space');
        return { strategy: 'C', ok: true };
      },
    ];

    for (const fn of tries) {
      const result = await fn();
      console.log('strategy:', JSON.stringify(result));
      await sleep(3500);
      // poll for new version
      const v = bundleVersions();
      if (v.some((n) => n.endsWith('_2') || n.endsWith('_3'))) {
        console.log('[detected after strategy] versions:', v.join(', '));
        break;
      }
    }

    // ---- step 3: poll up to 60s more for new version ----
    const pollEnd = Math.min(startTotal + HARD_LIMIT, Date.now() + 60000);
    let committed = false;
    while (Date.now() < pollEnd) {
      const v = bundleVersions();
      console.log(`[poll t+${Math.floor((Date.now() - startTotal) / 1000)}s] ${v.join(', ')}`);
      if (v.some((n) => n.endsWith('_2') || n.endsWith('_3'))) { committed = true; break; }
      await sleep(7000);
    }

    if (committed) {
      console.log('\n>>> COMMIT SUCCEEDED <<<');
    } else {
      console.log('\n>>> AUTOMATED CLICK FAILED — leaving browser open for manual click <<<');
      console.log('Click the BLACK "Commit Version" button in the dialog now.');
      console.log('I will NOT close the browser. Polling for 90s more.');
      const manEnd = Math.min(startTotal + HARD_LIMIT, Date.now() + 90000);
      while (Date.now() < manEnd) {
        const v = bundleVersions();
        console.log(`[manual-wait t+${Math.floor((Date.now() - startTotal) / 1000)}s] ${v.join(', ')}`);
        if (v.some((n) => n.endsWith('_2') || n.endsWith('_3'))) { committed = true; break; }
        await sleep(8000);
      }
    }

    process.exitCode = committed ? 0 : 2;
  } finally {
    await sleep(2000);
    await ctx.close();
  }
})();
