// Phase 6b step 12: open Data Type combobox, pick "Files", upload 3 PDFs.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const PDFS = [
  '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/Electra-Catalogo-Vehiculos-Argentina.pdf',
  '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/Electra-Politicas-de-Garantia.pdf',
  '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/Electra-Guia-Carga-y-Mantenimiento.pdf',
];

async function getSetupFrame(p, maxSeconds = 30) {
  for (let i = 0; i < maxSeconds; i++) {
    const f = p.frames().find(f => /salesforce-setup\.com.*lightning\/setup\//.test(f.url()));
    if (f) return f;
    await sleep(1000);
  }
  return null;
}

// Walk EVERYTHING (light + shadow + iframes within the same origin) and find any element
// whose trimmed text equals or contains targetText.
const FIND_BY_TEXT = `(args) => {
  const { targetText, exact } = args;
  const queue = [document];
  const visited = new Set();
  while (queue.length) {
    const root = queue.shift();
    if (!root || visited.has(root)) continue;
    visited.add(root);
    let nodes;
    try { nodes = Array.from(root.querySelectorAll('*')); } catch { continue; }
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (exact ? t === targetText : (t.length < 80 && t.includes(targetText))) {
        // Found; prefer the deepest element with this text.
        // Keep walking children to find the most specific match.
        let candidate = el;
        const children = Array.from(el.children);
        for (const c of children) {
          const ct = (c.textContent || '').trim();
          if (exact ? ct === targetText : (ct.length < 80 && ct.includes(targetText))) {
            candidate = c;
          }
        }
        return candidate;
      }
      if (el.shadowRoot) queue.push(el.shadowRoot);
    }
  }
  return null;
}`;

(async () => {
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(60000);

  try {
    await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/EinsteinDataLibrary/home`, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    const setupFrame = await getSetupFrame(p);
    console.log('frame:', setupFrame?.url());

    // Open library
    await setupFrame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          const links = Array.from(root.querySelectorAll('a, button'));
          for (const a of links) if ((a.textContent || '').trim() === 'Electra FAQ Library') return a;
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const a = find(document, 0);
      if (a) a.click();
    });
    await sleep(8000);

    // Open Data Type combobox
    const opened = await setupFrame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          const inputs = Array.from(root.querySelectorAll('input'));
          for (const i of inputs) {
            if (/data type/i.test(i.getAttribute('aria-label') || '') || /select a data type/i.test(i.placeholder || '')) return i;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const inp = find(document, 0);
      if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); inp.click(); return true; }
      return false;
    });
    console.log('combobox opened:', opened);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '60-combo-open.png'), fullPage: true });

    // Pick "Files" via global text walk in setup frame
    const pickedFiles = await setupFrame.evaluate((args) => {
      const { targetText } = args;
      const queue = [document];
      const visited = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || visited.has(root)) continue;
        visited.add(root);
        let nodes;
        try { nodes = Array.from(root.querySelectorAll('*')); } catch { continue; }
        for (const el of nodes) {
          const t = (el.textContent || '').trim();
          if (t === targetText) {
            // Try to find nearest clickable ancestor (LI, DIV with role=option, A, BUTTON)
            let target = el;
            for (let depth = 0; depth < 6 && target; depth++) {
              const tag = target.tagName;
              const role = target.getAttribute && target.getAttribute('role');
              if (tag === 'LI' || tag === 'BUTTON' || tag === 'A' || role === 'option') break;
              target = target.parentElement;
            }
            target = target || el;
            target.scrollIntoView({ block: 'center' });
            target.click();
            return { clicked: true, tag: target.tagName, role: target.getAttribute && target.getAttribute('role') };
          }
          if (el.shadowRoot) queue.push(el.shadowRoot);
        }
      }
      return { clicked: false };
    }, { targetText: 'Files' });
    console.log('Files pick:', pickedFiles);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '61-after-files.png'), fullPage: true });

    // After picking Files, the upload area should appear. Find file input.
    let fiHandles = await setupFrame.$$('input[type="file"]');
    console.log('file inputs after Files:', fiHandles.length);

    if (fiHandles.length === 0) {
      // Try a Continue/Next button
      const cont = await setupFrame.evaluate(() => {
        const find = (root, depth) => {
          if (depth > 14 || !root) return null;
          try {
            const btns = Array.from(root.querySelectorAll('button, a'));
            for (const b of btns) {
              const t = (b.textContent || '').trim();
              if (/^(Continue|Next|Add|Save)$/i.test(t)) return b;
            }
            const all = Array.from(root.querySelectorAll('*'));
            for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
          } catch {}
          return null;
        };
        const b = find(document, 0);
        if (b) { b.scrollIntoView({block:'center'}); b.click(); return (b.textContent||'').trim().slice(0,40); }
        return null;
      });
      console.log('continue click:', cont);
      await sleep(6000);
      await p.screenshot({ path: path.join(SHOTS, '62-after-continue.png'), fullPage: true });
      fiHandles = await setupFrame.$$('input[type="file"]');
      console.log('file inputs after continue:', fiHandles.length);
    }

    if (fiHandles.length === 0) {
      console.error('No <input type=file> found — something else needs clicking. Check 61/62 screenshots.');
      // Print buttons available
      const dump = await setupFrame.evaluate(() => {
        const out = [];
        const collect = (root, depth) => {
          if (depth > 14 || !root) return;
          try {
            for (const b of Array.from(root.querySelectorAll('button, a, [role="button"]'))) {
              const t = (b.textContent || '').trim();
              if (t && t.length < 80) out.push(t);
            }
            const all = Array.from(root.querySelectorAll('*'));
            for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
          } catch {}
        };
        collect(document, 0);
        return Array.from(new Set(out));
      });
      console.log('buttons available:', dump);
      fs.writeFileSync(path.join(SHOTS, '62-buttons.json'), JSON.stringify(dump, null, 2));
      process.exit(1);
    }

    // Upload all 3 PDFs to first file input
    console.log('uploading', PDFS.length, 'PDFs...');
    try {
      await fiHandles[0].setInputFiles(PDFS);
      console.log('setInputFiles OK');
    } catch (err) {
      console.error('setInputFiles error:', err.message);
    }
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '63-after-upload.png'), fullPage: true });

    // After upload, hit Done / Save / Add
    const finalize = await setupFrame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          const btns = Array.from(root.querySelectorAll('button'));
          for (const b of btns) {
            const t = (b.textContent || '').trim();
            if (/^(Done|Save|Add|Submit|Finish|Upload)$/i.test(t)) return b;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const b = find(document, 0);
      if (b) { b.scrollIntoView({block:'center'}); b.click(); return (b.textContent||'').trim().slice(0,40); }
      return null;
    });
    console.log('finalize click:', finalize);
    await sleep(15000);
    await p.screenshot({ path: path.join(SHOTS, '64-after-finalize.png'), fullPage: true });

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '12-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
