// Phase 6b step 6: navigate to /lightning/setup/EinsteinDataLibrary/home,
// click "New Library", fill the form, save.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

const LIBRARY_NAME = 'Electra FAQ Library';
const LIBRARY_API_NAME = 'Electra_FAQ_Library';
const LIBRARY_DESC = 'Electra Auto Concierge knowledge — catálogo, garantías, guía de carga y mantenimiento.';

async function safeEval(p, fn, ...args) {
  for (let i = 0; i < 3; i++) {
    try { return await p.evaluate(fn, ...args); } catch (e) {
      if (/Execution context|Target closed|destroyed/.test(e.message)) { await sleep(1000); continue; }
      throw e;
    }
  }
}

async function waitForText(p, regex, maxSeconds = 60, label = 'wait') {
  for (let i = 0; i < maxSeconds; i++) {
    await sleep(1500);
    const txt = await safeEval(p, () => {
      const collect = (root, depth) => {
        if (depth > 4 || !root) return '';
        let s = root.body ? (root.body.textContent || '') : '';
        try {
          const frs = root.querySelectorAll('iframe');
          for (const f of frs) try { s += '\n' + collect(f.contentDocument, depth+1); } catch {}
        } catch {}
        return s;
      };
      return collect(document, 0).slice(0, 30000);
    });
    if (txt && regex.test(txt)) {
      console.log(`[${label}] matched at t+${(i+1)*1.5}s`);
      return true;
    }
    if (i % 4 === 0) console.log(`[${label}] t+${(i+1)*1.5}s waiting…`);
  }
  return false;
}

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

    const ready = await waitForText(p, /New Library|Get ready for Agentforce|libraries available/i, 90, 'data-library-landing');
    console.log('landing ready?', ready);
    await p.screenshot({ path: path.join(SHOTS, '08-landing.png'), fullPage: true });

    if (!ready) {
      console.error('Could not load Data Library landing page');
      process.exit(1);
    }

    // Click "New Library"
    console.log('clicking New Library button');
    const clicked = await safeEval(p, () => {
      const collect = (root, depth, acc) => {
        if (depth > 4 || !root) return;
        try {
          const candidates = Array.from(root.querySelectorAll('button, a[role="button"], lightning-button'));
          for (const b of candidates) {
            if (/^New Library/i.test((b.textContent || '').trim())) acc.push(b);
          }
          const frs = root.querySelectorAll('iframe');
          for (const f of frs) try { collect(f.contentDocument, depth+1, acc); } catch {}
        } catch {}
      };
      const acc = [];
      collect(document, 0, acc);
      if (acc[0]) {
        acc[0].scrollIntoView();
        acc[0].click();
        return { count: acc.length, clicked: true };
      }
      return { count: 0, clicked: false };
    });
    console.log('new-library click:', clicked);
    if (!clicked.clicked) {
      console.error('New Library button not found');
      process.exit(1);
    }

    // Wait for the New Library modal/form to appear
    const modalReady = await waitForText(p, /Create a Data Library|Library Name|API Name|Data Space|New Library/i, 30, 'new-library-modal');
    console.log('modal ready?', modalReady);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '09-new-library-modal.png'), fullPage: true });

    // Fill the form. Salesforce uses LWC shadow DOMs so walk into them.
    const filled = await safeEval(p, (data) => {
      const out = { steps: [] };
      const findInputs = (root, depth) => {
        if (depth > 6 || !root) return [];
        let inputs = [];
        try {
          inputs = Array.from(root.querySelectorAll('input[type="text"], input:not([type]), textarea'));
          // Walk shadow roots
          const all = root.querySelectorAll('*');
          for (const el of all) {
            if (el.shadowRoot) inputs = inputs.concat(findInputs(el.shadowRoot, depth+1));
          }
        } catch {}
        return inputs;
      };
      const allInputs = findInputs(document, 0);
      out.totalInputs = allInputs.length;
      out.placeholders = allInputs.map(i => i.placeholder || i.name || i.id || '?').slice(0, 20);

      // Pick the first text input — assumed Library Name
      const setValue = (el, val) => {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      // Heuristic: Name = first input with label "Library Name" or first text input
      const nameInput = allInputs.find(i => /name/i.test(i.name || i.id || i.placeholder || '')) || allInputs[0];
      if (nameInput) {
        nameInput.focus(); setValue(nameInput, data.name);
        out.steps.push(`name set: ${nameInput.name || nameInput.id}`);
      }
      const descInput = allInputs.find(i => /description|desc/i.test(i.name || i.id || i.placeholder || ''));
      if (descInput) {
        descInput.focus(); setValue(descInput, data.desc);
        out.steps.push(`desc set: ${descInput.name || descInput.id}`);
      }
      return out;
    }, { name: LIBRARY_NAME, desc: LIBRARY_DESC });
    console.log('fill probe:', JSON.stringify(filled, null, 2));
    await sleep(2000);
    await p.screenshot({ path: path.join(SHOTS, '10-form-filled.png'), fullPage: true });

    // Click Save
    const saved = await safeEval(p, () => {
      const findBtn = (root, depth) => {
        if (depth > 6 || !root) return null;
        try {
          const btns = root.querySelectorAll('button, a[role="button"]');
          for (const b of btns) {
            const t = (b.textContent || '').trim();
            if (/^Save$/i.test(t)) return b;
          }
          const all = root.querySelectorAll('*');
          for (const el of all) {
            if (el.shadowRoot) {
              const r = findBtn(el.shadowRoot, depth+1);
              if (r) return r;
            }
          }
        } catch {}
        return null;
      };
      const b = findBtn(document, 0);
      if (b) { b.scrollIntoView(); b.click(); return true; }
      return false;
    });
    console.log('save clicked?', saved);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '11-after-save.png'), fullPage: true });

    // Check whether library was created — wait for next step (Add Data Sources / Files)
    const nextStep = await waitForText(p, /Add Data Sources|Files|Knowledge Articles|Web pages|Source Type/i, 60, 'add-sources');
    console.log('next-step (Add Data Sources) ready?', nextStep);
    await p.screenshot({ path: path.join(SHOTS, '12-add-sources.png'), fullPage: true });

    // Final dump
    const dump = await safeEval(p, () => {
      const out = [];
      const visit = (doc, depth) => {
        if (depth > 4 || !doc) return;
        try {
          out.push({
            depth,
            url: doc.location?.href, title: doc.title,
            h1: Array.from(doc.querySelectorAll('h1,h2,h3')).map(h => (h.textContent||'').trim()).filter(t=>t).slice(0,8),
            buttons: Array.from(doc.querySelectorAll('button,a[role="button"]')).map(b=>(b.textContent||'').trim()).filter(t=>t&&t.length<60).slice(0,30),
            snippet: (doc.body ? doc.body.textContent : '').replace(/\s+/g,' ').slice(0, 1500),
          });
          const frs = doc.querySelectorAll('iframe');
          for (const f of frs) try { visit(f.contentDocument, depth+1); } catch {}
        } catch {}
      };
      visit(document, 0);
      return out;
    });
    fs.writeFileSync(path.join(SHOTS, '12-add-sources-dump.json'), JSON.stringify(dump, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '06-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
