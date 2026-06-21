// Opus: find the correct Setup node for Digital Experiences "All Sites" via Quick Find.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path=require('path'); const fs=require('fs');
const ORG='Electra_Ej4';
const CFT='/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT=path.resolve(__dirname,'..','..','docs','ej4_probe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fd=p=>JSON.parse(execFileSync('sf',['org','open','-o',ORG,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url;
(async()=>{
  const ctx=await chromium.launchPersistentContext('/tmp/cft-electra-ej4',{executablePath:CFT,headless:true,viewport:{width:1500,height:1000},args:['--no-sandbox','--disable-gpu']});
  const rep={};
  try{
    const page=ctx.pages()[0]||await ctx.newPage();
    await page.goto(fd('lightning/setup/SetupOneHome/home'),{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(10000);
    // type into Quick Find
    await page.evaluate(()=>{
      function* walk(root){ for(const n of root.querySelectorAll('*')){ yield n; if(n.shadowRoot) yield* walk(n.shadowRoot); } }
      for(const n of walk(document)){ if(n.tagName==='INPUT' && /Quick Find|Search Setup/i.test(n.placeholder||'')){ n.focus(); n.value='Digital'; n.dispatchEvent(new Event('input',{bubbles:true})); return; } }
    });
    await sleep(3000);
    // collect all nav links + their hrefs that match digital/site/experience/network
    rep.links=await page.evaluate(()=>{
      function* walk(root){ for(const n of root.querySelectorAll('*')){ yield n; if(n.shadowRoot) yield* walk(n.shadowRoot); } }
      const out=[]; for(const n of walk(document)){ if(n.tagName==='A'){ const t=(n.textContent||'').trim(); const h=n.getAttribute('href')||''; if(/digital|site|experience|network|communit/i.test(t+h) && t) out.push({t:t.slice(0,40),h:h.slice(0,80)}); } }
      const seen=new Set(); return out.filter(x=>{const k=x.t+x.h; if(seen.has(k))return false; seen.add(k); return true;});
    });
    await page.screenshot({path:path.join(OUT,'find-sites-node.png')});
  }catch(e){ rep.error=String(e).slice(0,200); }
  finally{ fs.writeFileSync(path.join(OUT,'find-sites-node.json'),JSON.stringify(rep,null,2)); await ctx.close(); }
  console.log(JSON.stringify(rep,null,2).slice(0,2000));
})();
