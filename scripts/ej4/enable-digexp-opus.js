// Opus fix: NetworkSettings checkbox is in the VF child iframe (/_ui/networks/setup/NetworkSetti).
// Click it there, fill the domain field that appears, Save, confirm.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'); const fs = require('fs');
const ORG='Electra_Ej4';
const CFT='/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT=path.resolve(__dirname,'..','..','docs','ej4_probe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fd=p=>JSON.parse(execFileSync('sf',['org','open','-o',ORG,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url;
const findFrame=page=>page.frames().find(f=>/_ui\/networks\/setup\/NetworkSetti/.test(f.url()));
(async()=>{
  const ctx=await chromium.launchPersistentContext('/tmp/cft-electra-ej4',{executablePath:CFT,headless:true,viewport:{width:1440,height:1000},args:['--no-sandbox','--disable-gpu']});
  const rep={};
  try{
    const page=ctx.pages()[0]||await ctx.newPage();
    await page.goto(fd('lightning/setup/NetworkSettings/home'),{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(10000);
    let frame=null;
    for(let i=0;i<15;i++){ frame=findFrame(page); if(frame){ const c=await frame.locator('#thePage\\:theForm\\:setDomainPB\\:enableNetworkPrefId').count().catch(()=>0); if(c>0)break;} await sleep(2000); }
    if(!frame){ rep.error='VF frame not found'; throw new Error(rep.error); }
    const cb=frame.locator('#thePage\\:theForm\\:setDomainPB\\:enableNetworkPrefId');
    rep.before=await cb.isChecked().catch(()=>null);
    await page.screenshot({path:path.join(OUT,'digexp-opus-before.png')});
    if(rep.before!==true){ await cb.check({force:true,timeout:8000}).catch(async()=>{await cb.click({force:true});}); }
    await sleep(2500);
    rep.afterCheck=await cb.isChecked().catch(()=>null);
    // A domain input typically appears after checking. Look for the domain text field in the frame.
    const domainSel='input[id*="domainName"], input[id*="DomainName"], input[type=text][id*="setDomainPB"]';
    const dCount=await frame.locator(domainSel).count().catch(()=>0);
    rep.domainFieldFound=dCount;
    if(dCount>0){
      const dval=await frame.locator(domainSel).first().inputValue().catch(()=>'');
      rep.domainPrefilled=dval;
      if(!dval){ await frame.locator(domainSel).first().fill('electra-ej4').catch(()=>{}); rep.domainTyped='electra-ej4'; }
    }
    await page.screenshot({path:path.join(OUT,'digexp-opus-mid.png')});
    // Click Save (VF button) in the frame
    let saved=false;
    for(const sel of ['input[type=button][value="Save"]','input[type=submit][value="Save"]','button:has-text("Save")','input[name*="save"]']){
      const b=frame.locator(sel).first();
      if(await b.count().catch(()=>0)>0 && await b.isVisible().catch(()=>false)){ await b.click({timeout:8000}).catch(()=>{}); saved=true; rep.saveSel=sel; break; }
    }
    rep.saveClicked=saved;
    await sleep(6000);
    // possible confirm dialog
    for(const sel of ['input[value="OK"]','button:has-text("OK")','input[value="Enable"]','button:has-text("Enable")']){
      const b=frame.locator(sel).first().or(page.locator(sel).first());
      try{ if(await b.isVisible({timeout:1500})){ await b.click({timeout:4000}); rep.confirmed=sel; await sleep(4000); break; } }catch{}
    }
    await sleep(8000);
    await page.screenshot({path:path.join(OUT,'digexp-opus-after.png'),fullPage:true});
    // re-read state (frame may have reloaded)
    const f2=findFrame(page);
    if(f2){ rep.afterSave=await f2.locator('#thePage\\:theForm\\:setDomainPB\\:enableNetworkPrefId').isChecked().catch(()=>'frame-reloaded'); }
  }catch(e){ rep.error=(rep.error||'')+' '+String(e).slice(0,200); }
  finally{ fs.writeFileSync(path.join(OUT,'digexp-opus-result.json'),JSON.stringify(rep,null,2)); await ctx.close(); }
  console.log(JSON.stringify(rep,null,2));
})();
