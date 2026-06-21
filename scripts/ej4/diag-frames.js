// Opus diagnostic: dump frame structure + checkbox locations across ALL frames on NetworkSettings.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const ORG='Electra_Ej4';
const CFT='/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT=path.resolve(__dirname,'..','..','docs','ej4_probe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fd=p=>JSON.parse(execFileSync('sf',['org','open','-o',ORG,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url;
(async()=>{
  const ctx=await chromium.launchPersistentContext('/tmp/cft-electra-ej4',{executablePath:CFT,headless:true,viewport:{width:1440,height:1000},args:['--no-sandbox','--disable-gpu']});
  const rep={frames:[]};
  try{
    const page=ctx.pages()[0]||await ctx.newPage();
    await page.goto(fd('lightning/setup/NetworkSettings/home'),{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(12000);
    // wait for any checkbox to appear anywhere
    for(let i=0;i<15;i++){ const any=await page.locator('input[type=checkbox]').count().catch(()=>0); if(any>0)break; await sleep(2000); }
    for(const f of page.frames()){
      let cbCount=0, labels=[], url=f.url();
      try{ cbCount=await f.locator('input[type=checkbox]').count(); }catch{}
      try{
        labels=await f.evaluate(()=>{
          const out=[];
          document.querySelectorAll('input[type=checkbox]').forEach(cb=>{
            const lab=(cb.closest('label')?.innerText)||(cb.labels&&cb.labels[0]?.innerText)||cb.getAttribute('aria-label')||(cb.parentElement?.innerText||'').slice(0,60);
            out.push({checked:cb.checked,label:(lab||'').trim().slice(0,60),id:cb.id||'',name:cb.name||''});
          });
          return out;
        });
      }catch(e){ labels=['(evaluate failed: '+String(e).slice(0,60)+')']; }
      rep.frames.push({url:url.slice(0,90),checkboxCount:cbCount,checkboxes:labels});
    }
    await page.screenshot({path:path.join(OUT,'digexp-diag.png'),fullPage:true});
  }catch(e){ rep.error=String(e).slice(0,200); }
  finally{ fs.writeFileSync(path.join(OUT,'frame-diag.json'),JSON.stringify(rep,null,2)); await ctx.close(); }
  console.log(JSON.stringify(rep,null,2).slice(0,2500));
})();
