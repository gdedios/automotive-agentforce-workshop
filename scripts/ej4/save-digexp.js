// Clean save: check the box in the VF frame, click Save, wait for reload, verify. No cross-frame locators.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path=require('path'); const fs=require('fs');
const ORG='Electra_Ej4';
const CFT='/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT=path.resolve(__dirname,'..','..','docs','ej4_probe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fd=p=>JSON.parse(execFileSync('sf',['org','open','-o',ORG,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url;
const vf=page=>page.frames().find(f=>/_ui\/networks\/setup\/NetworkSetti/.test(f.url()));
const CB='#thePage\\:theForm\\:setDomainPB\\:enableNetworkPrefId';
(async()=>{
  const ctx=await chromium.launchPersistentContext('/tmp/cft-electra-ej4',{executablePath:CFT,headless:true,viewport:{width:1440,height:1000},args:['--no-sandbox','--disable-gpu']});
  const rep={};
  try{
    const page=ctx.pages()[0]||await ctx.newPage();
    await page.goto(fd('lightning/setup/NetworkSettings/home'),{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(10000);
    let frame=null;
    for(let i=0;i<15;i++){ frame=vf(page); if(frame && await frame.locator(CB).count().catch(()=>0)>0)break; await sleep(2000); }
    if(!frame){ rep.error='no VF frame'; throw new Error('no frame'); }
    rep.before=await frame.locator(CB).isChecked().catch(()=>null);
    if(rep.before!==true){ await frame.locator(CB).check({force:true}).catch(async()=>{await frame.locator(CB).click({force:true});}); await sleep(2000); }
    rep.checked=await frame.locator(CB).isChecked().catch(()=>null);
    // Click Save inside the frame, then wait for the navigation/reload it triggers
    const saveBtn=frame.locator('input[type=button][value="Save"], input[type=submit][value="Save"]').first();
    rep.saveVisible=await saveBtn.isVisible().catch(()=>false);
    await Promise.all([
      page.waitForLoadState('domcontentloaded',{timeout:30000}).catch(()=>{}),
      saveBtn.click({force:true,timeout:10000}).catch(e=>rep.saveErr=String(e).slice(0,80)),
    ]);
    await sleep(12000); // provisioning settle
    await page.screenshot({path:path.join(OUT,'digexp-saved.png'),fullPage:true});
    // re-read after reload
    const f2=vf(page);
    rep.afterSaveChecked = f2 ? await f2.locator(CB).isChecked().catch(()=>'?') : 'frame-gone';
    rep.bodyHasEnabled = await page.evaluate(()=>/digital experiences is enabled|already enabled|My Domain/i.test(document.body.innerText)).catch(()=>null);
  }catch(e){ rep.error=(rep.error||'')+' '+String(e).slice(0,150); }
  finally{ fs.writeFileSync(path.join(OUT,'digexp-saved-result.json'),JSON.stringify(rep,null,2)); await ctx.close(); }
  console.log(JSON.stringify(rep,null,2));
})();
