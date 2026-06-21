// Open the Builder, click toolbar Commit Version to surface the dialog,
// then leave the browser open. User clicks the modal Commit Version manually.
// After commit, this script polls the bundle list until version _2 appears,
// then closes Chrome.

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ORG = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const fd = JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG, '-p', '/lightning/n/standard-AgentforceStudio?c__nav=agents', '--json'], { encoding: 'utf8' })).result.url;

(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/cft-electra-enable', {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(30000);

  console.log('=== Opening Builder ===');
  await p.goto(fd, { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  await p.evaluate(() => {
    function w(r) { for (const a of r.querySelectorAll('a,button,*[role="button"]')) { if ((a.textContent || '').trim() === 'Take Me There') { a.click(); return; } } for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot); }
    w(document);
  });
  await sleep(5000);
  await p.goto('https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC', { waitUntil: 'domcontentloaded' });
  await sleep(15000);

  console.log('=== Clicking toolbar Commit Version (top-right) ===');
  await p.evaluate(() => {
    function w(r) { for (const a of r.querySelectorAll('button,*[role="button"]')) { if ((a.textContent || '').trim() === 'Commit Version') { a.click(); return; } } for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot); }
    w(document);
  });
  await sleep(7000);

  console.log('\n>>> ACTION REQUIRED <<<');
  console.log('A "Commit this version?" dialog should now be visible.');
  console.log('Please CLICK the black "Commit Version" button in the dialog.');
  console.log('I will detect when commit completes (a version 2 appears in bundle list)');
  console.log('and close the browser automatically.');
  console.log('Polling every 10s for up to 4 minutes...');

  const start = Date.now();
  const MAX_WAIT = 4 * 60 * 1000;
  let committed = false;
  while (Date.now() - start < MAX_WAIT) {
    await sleep(10000);
    try {
      const list = execFileSync('sf', ['org', 'list', 'metadata', '-m', 'AiAuthoringBundle', '-o', ORG, '--json'], { encoding: 'utf8' });
      const bundles = JSON.parse(list).result.filter((r) => r.fullName.startsWith('ElectraAI_Auto'));
      const names = bundles.map((b) => b.fullName).sort();
      console.log(`[poll t+${Math.floor((Date.now() - start) / 1000)}s] bundles: ${names.join(', ')}`);
      if (names.some((n) => n.endsWith('_2') || n.endsWith('_3'))) {
        console.log('\n[detected] Commit succeeded — new version found.');
        committed = true;
        break;
      }
    } catch (e) {
      console.log('[poll error]', e.message);
    }
  }

  if (!committed) {
    console.log('\n[timeout] No new version detected in 4 min. Closing anyway.');
  }

  await sleep(2000);
  await ctx.close();
  process.exit(committed ? 0 : 1);
})();
