// Phase 5c+5d: click "Commit Version" to activate, then run 4 canonical
// Spanish prompts in the right-side Conversation Preview panel.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-enable';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_preview');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Phase flags: SKIP_COMMIT=1 to skip commit step (assumes agent already committed)
//              SKIP_PROMPTS=1 to skip prompt run (commit only)
const SKIP_COMMIT = process.env.SKIP_COMMIT === '1';
const SKIP_PROMPTS = process.env.SKIP_PROMPTS === '1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROMPTS = [
  { id: 'p1-prueba-cruiser', text: 'Hola, soy Sofía Vega — quiero probar el E-Cruiser este sábado en Palermo. Mi email es sofia.vega@example.com.ar' },
  { id: 'p2-sedan-50m', text: '¿Qué modelos tienen disponibles en sedán bajo 50 millones de pesos?' },
  { id: 'p3-status', text: 'Mi email es sofia.vega@example.com.ar — ¿cómo va mi prueba de manejo?' },
  { id: 'p4-rag-charging', text: '¿Cuánto tarda en cargarse el E-Sport en una estación rápida?' },
];

function frontdoor(setupPath) {
  const out = execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', setupPath, '--json'], {
    encoding: 'utf8',
  });
  return JSON.parse(out).result.url;
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  console.log(`[shot] ${file}`);
  return file;
}

async function deepClickByText(page, regex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function walk(root) {
      for (const b of root.querySelectorAll('a, button, *[role="button"]')) {
        const t = (b.textContent || '').trim();
        if (t && re.test(t)) {
          b.click();
          return t;
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const r = walk(n.shadowRoot);
          if (r) return r;
        }
      }
      return null;
    }
    return walk(document);
  }, regex.source).catch(() => null);
}

// Locate a dialog button by exact text WITHIN a modal/dialog and return its
// bounding box, so the caller can do a real Playwright mouse click (which fires
// pointerdown/up + click and triggers LWC onclick handlers — `.click()` from
// inside evaluate() often doesn't).
async function findDialogButton(page, buttonRegex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function findDialog(root) {
      const cands = [];
      for (const el of root.querySelectorAll('*[role="dialog"], *[aria-modal="true"], section.modal, *[class*="slds-modal__container"], *[class*="dialog"]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 100 && r.height > 100) cands.push(el);
      }
      if (cands.length) return cands[cands.length - 1];
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const f = findDialog(n.shadowRoot);
          if (f) return f;
        }
      }
      return null;
    }
    function walk(root) {
      for (const b of root.querySelectorAll('button, *[role="button"]')) {
        const t = (b.textContent || '').trim();
        if (t && re.test(t)) {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: t };
          }
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const r = walk(n.shadowRoot);
          if (r) return r;
        }
      }
      return null;
    }
    const dlg = findDialog(document);
    if (!dlg) return null;
    return walk(dlg);
  }, buttonRegex.source).catch(() => null);
}

// Click a button by exact text WITHIN a modal/dialog (any role=dialog/aria-modal,
// or *[class*="modal"] container). Returns the dialog's heading + button text on success.
async function clickInsideDialog(page, buttonRegex) {
  return page.evaluate((rx) => {
    const re = new RegExp(rx, 'i');
    function findDialog(root) {
      // Look for elements that look like a modal/dialog
      const candidates = [];
      for (const el of root.querySelectorAll('*[role="dialog"], *[aria-modal="true"], section.modal, *[class*="slds-modal__container"], *[class*="dialog"]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 100 && r.height > 100) candidates.push(el);
      }
      if (candidates.length) return candidates[candidates.length - 1]; // top-most usually last
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const found = findDialog(n.shadowRoot);
          if (found) return found;
        }
      }
      return null;
    }
    function clickInside(dialog) {
      // Walk dialog subtree (dialog itself is top-level, no shadow inside usually)
      function walk(root) {
        for (const b of root.querySelectorAll('button, *[role="button"]')) {
          const t = (b.textContent || '').trim();
          if (t && re.test(t)) {
            b.click();
            return t;
          }
        }
        for (const n of root.querySelectorAll('*')) {
          if (n.shadowRoot) {
            const r = walk(n.shadowRoot);
            if (r) return r;
          }
        }
        return null;
      }
      return walk(dialog);
    }
    const dlg = findDialog(document);
    if (!dlg) return { error: 'no dialog found' };
    const heading = (dlg.querySelector('h1, h2, h3, *[role="heading"]')?.textContent || '').trim().slice(0, 80);
    const clicked = clickInside(dlg);
    return { heading, clicked };
  }, buttonRegex.source).catch(() => null);
}

// Find the Conversation Preview text input (placeholder = "Ask for help…")
async function fillPreviewInput(page, text) {
  return page.evaluate((t) => {
    function walk(root) {
      // Try contenteditable, textarea, or input with the right placeholder
      const sels = [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="describe"]',
        'input[placeholder*="Ask"]',
        '*[contenteditable="true"]',
        'textarea',
      ];
      for (const sel of sels) {
        for (const el of root.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          // Filter for the right-pane preview input (right half of screen, near bottom)
          if (r.x > 400 && r.bottom > 300) {
            el.focus();
            if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
              el.value = t;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              // contenteditable
              el.innerText = t;
              el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            }
            return { ok: true, tag: el.tagName, placeholder: el.placeholder, x: r.x, y: r.y };
          }
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const r = walk(n.shadowRoot);
          if (r) return r;
        }
      }
      return null;
    }
    return walk(document);
  }, text).catch(() => null);
}

// Read conversation messages — look ONLY in the right-most preview column
// (x > 1100) for paragraph-leaf elements with substantive text.
async function readConversation(page) {
  return page.evaluate(() => {
    const msgs = [];
    const seen = new Set();
    function walk(root) {
      for (const el of root.querySelectorAll('p, span, lightning-formatted-text, lightning-formatted-rich-text, *[role="article"], *[data-id]')) {
        const r = el.getBoundingClientRect();
        if (r.x < 1100 || r.right > 1700) continue;  // preview pane only
        if (r.width < 80 || r.height < 12) continue;
        const t = (el.innerText || el.textContent || '').trim();
        if (!t || t.length < 8 || t.length > 4000) continue;
        if (/^(Send|Reset|Hide|Show|Cancel|Ask for help|Agentforce|System|Error)$/i.test(t)) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        msgs.push(t);
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return msgs;
  }).catch(() => []);
}

(async () => {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  const log = { steps: [], prompts: [] };

  try {
    // Re-open the agent detail directly (URL captured from prior run)
    const directUrl = `https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC`;
    // First land via frontdoor to mint cookie
    const fd = frontdoor('/lightning/n/standard-AgentforceStudio?c__nav=agents');
    await page.goto(fd, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    const tmt = await deepClickByText(page, /^Take Me There$/);
    if (tmt) await sleep(8000);
    await page.goto(directUrl, { waitUntil: 'domcontentloaded' });
    await sleep(20000);
    await shot(page, '01-builder-loaded');

    if (SKIP_COMMIT) {
      console.log('\n=== SKIP_COMMIT=1 — assuming agent is already committed ===');
    } else {
    // ---- 5c) Commit Version ----
    // Flow: Commit Version (toolbar) -> "Assign user record" modal opens -> default tab "New User"
    //       (auto-provisions a Service Agent user) -> click Save (modal) -> wait -> the dialog
    //       transitions to "Commit this version?" with a "Commit Version" confirm button -> click it.
    // CRITICAL: confirm button text is also "Commit Version" — we MUST scope to the dialog or
    // we'd re-click the toolbar button. Use clickInsideDialog().
    console.log('\n=== 5c) Commit Version ===');
    const commitClicked = await deepClickByText(page, /^Commit Version$/);
    console.log('[click commit]:', commitClicked);
    log.steps.push({ step: 'commit', clicked: commitClicked });
    await sleep(8000);
    await shot(page, '02-after-commit-click');

    // First modal: "Assign user record" — click Save (inside the dialog) with default "New User" tab
    const saveUser = await clickInsideDialog(page, /^Save$/);
    console.log('[modal Save (assign user)]:', saveUser);
    log.steps.push({ step: 'assign-user-save', result: saveUser });
    // Wait for provisioning + dialog transition. Total wait under 5min budget.
    await sleep(20000);
    await shot(page, '03-after-user-provision');

    // After user provisioning, modal MAY transition directly to "Commit this version?",
    // OR it may close and require re-clicking Commit Version. Detect:
    let dlgState = await page.evaluate(() => {
      const dlgs = Array.from(document.querySelectorAll('*[role="dialog"], *[aria-modal="true"]'));
      const visible = dlgs.filter((d) => {
        const r = d.getBoundingClientRect();
        return r.width > 100 && r.height > 100;
      });
      if (!visible.length) return { state: 'none' };
      const heading = (visible[0].querySelector('h1, h2, h3, *[role="heading"]')?.textContent || '').trim();
      return { state: 'open', heading };
    }).catch(() => ({ state: 'unknown' }));
    console.log('[dialog after Save]:', dlgState);

    if (dlgState.state === 'none') {
      // Need to re-click the toolbar Commit Version
      const commit2 = await deepClickByText(page, /^Commit Version$/);
      console.log('[re-click toolbar Commit Version]:', commit2);
      await sleep(5000);
    }
    await shot(page, '04-commit-dialog');

    // Now we should see "Commit this version?" dialog with a "Commit Version" button.
    // Use a real Playwright mouse click — LWC button onclick handlers may not fire
    // for synthetic Element.click() from inside page.evaluate() (no pointer events).
    const btn = await findDialogButton(page, /^Commit Version$/);
    console.log('[modal Commit Version btn coords]:', btn);
    if (btn) {
      await page.mouse.move(btn.x, btn.y);
      await sleep(200);
      await page.mouse.click(btn.x, btn.y);
      console.log('[mouse click fired at', btn.x, btn.y, ']');
    } else {
      console.log('[no modal button found — fallback to evaluate click]');
      await clickInsideDialog(page, /^Commit Version$/);
    }
    log.steps.push({ step: 'final-commit', btn });
    await sleep(20000);
    await shot(page, '05-after-final-commit');

    // Wait for commit to settle (under 5min total budget)
    await sleep(10000);
    await shot(page, '06-post-commit');
    } // end if !SKIP_COMMIT

    if (SKIP_PROMPTS) {
      console.log('\n=== SKIP_PROMPTS=1 — done after commit ===');
      fs.writeFileSync(path.join(OUT_DIR, 'preview-log.json'), JSON.stringify(log, null, 2));
      return;
    }

    // ---- 5d) Run 4 prompts in Conversation Preview ----
    console.log('\n=== 5d) Run canonical prompts ===');
    for (let i = 0; i < PROMPTS.length; i++) {
      const p = PROMPTS[i];
      console.log(`\n--- Prompt ${i + 1}/4: ${p.id} ---`);
      console.log(`> ${p.text}`);

      const filled = await fillPreviewInput(page, p.text);
      console.log('[fill]:', filled);
      if (!filled) {
        console.log('[skip — input not found]');
        log.prompts.push({ ...p, error: 'input not found' });
        continue;
      }
      await sleep(1000);

      // Press Enter on the focused element
      await page.keyboard.press('Enter');
      console.log('[sent]');
      // Allow time for action calls + LLM response
      await sleep(40000);
      await shot(page, `06-prompt-${i + 1}-${p.id}`);

      const conv = await readConversation(page);
      const tail = conv.slice(-12);
      console.log('[tail]', tail);
      log.prompts.push({ ...p, tail });

      // Reset between prompts? We let context build up — agent should still answer.
      await sleep(2000);
    }

    fs.writeFileSync(path.join(OUT_DIR, 'preview-log.json'), JSON.stringify(log, null, 2));
    console.log('\n[done]', path.join(OUT_DIR, 'preview-log.json'));
  } catch (err) {
    console.error('[FATAL]', err);
    await shot(page, 'fatal');
    process.exitCode = 1;
  } finally {
    await sleep(3000);
    await context.close();
  }
})();
