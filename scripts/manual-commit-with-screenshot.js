// Open Builder, click toolbar Commit Version, screenshot the modal so user
// can see the exact button location, leave browser open & poll for new version.
// Hard-bounded at 4.5 min total.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ORG = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const BUILDER_URL = 'https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC';
const OUT = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots/manual_commit';
fs.mkdirSync(OUT, { recursive: true });
const fd = JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG, '-p', '/lightning/n/standard-AgentforceStudio?c__nav=agents', '--json'], { encoding: 'utf8' })).result.url;

function vers() {
  try {
    return JSON.parse(execFileSync('sf', ['org', 'list', 'metadata', '-m', 'AiAuthoringBundle', '-o', ORG, '--json'], { encoding: 'utf8' }))
      .result.filter((r) => r.fullName.startsWith('ElectraAI_Auto')).map((b) => b.fullName).sort();
  } catch { return []; }
}

(async () => {
  const start = Date.now();
  const HARD_LIMIT = 4.5 * 60 * 1000;
  const ctx = await chromium.launchPersistentContext('/tmp/cft-electra-enable', {
    executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 }, args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(20000);

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

  console.log('versions before:', vers().join(', '));

  // click toolbar Commit Version
  console.log('=== clicking toolbar Commit Version ===');
  await p.evaluate(() => {
    function w(r, out) {
      for (const a of r.querySelectorAll('button,*[role="button"]')) if ((a.textContent || '').trim() === 'Commit Version') out.push(a);
      for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot, out);
    }
    const out = []; w(document, out);
    if (out.length) out[0].click();
  });
  await sleep(7000);

  // screenshot to confirm dialog is up
  await p.screenshot({ path: path.join(OUT, 'dialog.png'), fullPage: false });
  const cnt = await p.evaluate(() => {
    function w(r, out) {
      for (const a of r.querySelectorAll('button,*[role="button"]')) if ((a.textContent || '').trim() === 'Commit Version') out.push(a);
      for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot, out);
    }
    const out = []; w(document, out); return out.length;
  });
  console.log(`'Commit Version' button count on page: ${cnt} (1=dialog NOT up; 2=dialog up — click black one)`);

  console.log('\n>>> ACTION REQUIRED <<<');
  console.log('Look at the Chrome window. If a "Commit this version?" dialog is visible,');
  console.log('CLICK the BLACK "Commit Version" button in the dialog now.');
  console.log('Browser will stay open and I will detect when commit completes.\n');

  let committed = false;
  while (Date.now() - start < HARD_LIMIT) {
    await sleep(8000);
    const v = vers();
    console.log(`[t+${Math.floor((Date.now() - start) / 1000)}s] ${v.join(', ')}`);
    if (v.some((n) => n.endsWith('_2') || n.endsWith('_3'))) { committed = true; break; }
  }
  if (committed) console.log('\n>>> COMMIT DETECTED — closing <<<');
  else console.log('\n[timeout] no new version. closing.');
  await sleep(2000);
  await ctx.close();
  process.exit(committed ? 0 : 1);
})();
