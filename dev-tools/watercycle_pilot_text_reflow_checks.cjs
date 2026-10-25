'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=async function({page,result,settle,capture,source,out,assert}){
  const r=result.textReflow={scope:'Production DOM/CSS with CSS text-spacing overrides and separately a computed-font-size 200% simulation. Text-only resizing is simulated and is not physical browser zoom. Supported practice starts and original-kernel collection supply states. No screen-reader certification or full WCAG-conformance claim.',layouts:[],focus:[],checks:[]};
  const verify=process.argv.includes('--verify');
  const check=(name,ok,evidence)=>{r.checks.push({name,ok,evidence});console.log('CHECK '+name+' '+ok);if(verify)assert(ok,name);};
  async function override(kind){
    await page.evaluate(kind=>{
      document.querySelector('#qaTextOverride')?.remove();
      const style=document.createElement('style');style.id='qaTextOverride';
      if(kind==='spacing')style.textContent='#slot :where(*){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#slot p{margin-bottom:2em!important}';
      else if(kind==='size200'){
        window.qaBaseFonts=window.qaBaseFonts||new WeakMap();
        const rows=[...document.querySelectorAll('#slot *')].map((e,i)=>{if(!window.qaBaseFonts.has(e))window.qaBaseFonts.set(e,parseFloat(getComputedStyle(e).fontSize));e.dataset.qaTextId=String(i);return [i,window.qaBaseFonts.get(e)*2];});
        style.textContent=rows.map(([i,n])=>'#slot [data-qa-text-id="'+i+'"]{font-size:'+n+'px!important}').join('');
      }
      document.head.append(style);
    },kind);await page.evaluate(()=>document.fonts.ready);await settle();
  }
  async function mount(width,compact=false,extra={}){
    await page.setViewportSize({width,height:1000});await page.evaluate(({compact,extra})=>{document.querySelector('#qaTextOverride')?.remove();window.qaBaseFonts=new WeakMap();mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true,hudCompact:compact,pauseAtChanges:true,navigationAssist:false,...extra}},'light');},{compact,extra});
    await page.waitForFunction(()=>waterReviewData?.pilot?.snapshot&&document.querySelector('#wcPilotCanvas'));await page.evaluate(()=>document.fonts.ready);await settle();
  }
  async function measure(label){
    await page.locator('.wc-pilot-stage').scrollIntoViewIfNeeded();await settle();
    const row=await page.evaluate(label=>{
      const stage=document.querySelector('.wc-pilot-stage'),sr=stage.getBoundingClientRect(),rect=e=>{const b=e.getBoundingClientRect();return{x:b.x-sr.x,y:b.y-sr.y,width:b.width,height:b.height,right:b.right-sr.x,bottom:b.bottom-sr.y};};
      const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>1&&b.height>1&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]');};
      const selector='.wc-pilot-camera-switch,.wc-pilot-hud-left,.wc-pilot-hud-right,.wc-pilot-route,.wc-pilot-pad,.wc-pilot-ladder,.wc-pilot-look-panel,.wc-pilot-notice,.wc-pilot-map';
      const groups=[...stage.querySelectorAll(selector)].filter(visible).map(e=>({class:e.className,box:rect(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,overflow:getComputedStyle(e).overflow,text:e.innerText}));
      const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
      const overlaps=[];for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)if(overlap(groups[i].box,groups[j].box))overlaps.push([groups[i].class,groups[j].class]);
      const hiddenClips=[],textOutsideElement=[],controlOverflow=[];
      const range=document.createRange(),walker=document.createTreeWalker(stage,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){
        const e=node.parentElement;if(!node.textContent.trim()||!visible(e)||e.closest('style,script,svg,.sr-only,[aria-hidden=true]'))continue;
        range.selectNodeContents(node);const boxes=[...range.getClientRects()].filter(b=>b.width>1&&b.height>1);const eb=e.getBoundingClientRect();
        if(boxes.some(b=>b.left<eb.left-2||b.right>eb.right+2))textOutsideElement.push({text:node.textContent.trim(),tag:e.tagName,class:e.className,id:e.id,element:rect(e),textWidth:Math.max(...boxes.map(b=>b.width))});
        let scrollY=false,scrollX=false;for(let a=e;a&&a!==stage.parentElement;a=a.parentElement){const s=getComputedStyle(a),b=a.getBoundingClientRect();scrollY=scrollY||(/auto|scroll/.test(s.overflowY)&&a.scrollHeight>a.clientHeight+1);scrollX=scrollX||(/auto|scroll/.test(s.overflowX)&&a.scrollWidth>a.clientWidth+1);const clippedX=(s.overflowX==='hidden'||s.overflowX==='clip')&&boxes.some(x=>x.left<b.left-2||x.right>b.right+2),clippedY=(s.overflowY==='hidden'||s.overflowY==='clip')&&boxes.some(x=>x.top<b.top-2||x.bottom>b.bottom+2);if(clippedX||clippedY){hiddenClips.push({text:node.textContent.trim(),class:e.className,id:e.id,ancestor:a.className,overflow:s.overflow,scrollable:(!clippedX||scrollX)&&(!clippedY||scrollY)});break;}}
      }
      for(const e of stage.querySelectorAll('button,select,input'))if(visible(e)&&e.scrollWidth>e.clientWidth+2)controlOverflow.push({text:e.textContent.trim(),id:e.id,class:e.className,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth});
      const pageOverflowNodes=[...document.querySelectorAll('#slot *')].filter(visible).filter(e=>{const b=e.getBoundingClientRect();return b.left< -1||b.right>innerWidth+1;}).map(e=>({tag:e.tagName,class:e.className,id:e.id,text:e.textContent.slice(0,120),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));
      const globalTextOverflow=[],allText=document.createTreeWalker(document.querySelector('#slot'),NodeFilter.SHOW_TEXT);let textNode;while(textNode=allText.nextNode()){const e=textNode.parentElement;if(!textNode.textContent.trim()||!visible(e)||e.closest('style,script,svg,.sr-only,[aria-hidden=true]'))continue;let bounded=false;for(let p=e;p&&p.id!=='slot';p=p.parentElement)if(/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)){bounded=true;break;}if(bounded)continue;range.selectNodeContents(textNode);const outside=[...range.getClientRects()].filter(b=>b.left< -1||b.right>innerWidth+1);if(outside.length)globalTextOverflow.push({text:textNode.textContent.trim(),tag:e.tagName,class:e.className,id:e.id,left:Math.min(...outside.map(b=>b.left)),right:Math.max(...outside.map(b=>b.right))});}
      const readoutLabels=[...stage.querySelectorAll('.wc-pilot-readouts dt')].filter(visible).map(e=>{const range=document.createRange();range.selectNodeContents(e);const parent=e.parentElement.getBoundingClientRect(),grid=e.closest('dl').getBoundingClientRect(),lines=[...range.getClientRects()];return{text:e.textContent,cell:rect(e.parentElement),insideCell:lines.every(b=>b.left>=parent.left-1&&b.right<=parent.right+1),cellInsideGrid:parent.left>=grid.left-1&&parent.right<=grid.right+1};});
      const readoutOverlaps=[];for(let i=0;i<readoutLabels.length;i++)for(let j=i+1;j<readoutLabels.length;j++)if(overlap(readoutLabels[i].cell,readoutLabels[j].cell))readoutOverlaps.push([readoutLabels[i].text,readoutLabels[j].text]);
      const cameraFont=getComputedStyle(document.querySelector('.wc-pilot-camera-btn')).fontSize;
      return{label,viewport:innerWidth,cameraFont,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},stage:{width:sr.width,height:sr.height,scrollWidth:stage.scrollWidth,clientWidth:stage.clientWidth},groups,overlaps,hiddenClips,textOutsideElement,controlOverflow,pageOverflowNodes,globalTextOverflow,readoutLabels,readoutOverlaps};
    },label);r.layouts.push(row);fs.writeFileSync(path.join(out,'layout-progress.json'),JSON.stringify(r,null,2));console.log('MEASURE '+label+' '+JSON.stringify({pageOverflow:row.document.scrollWidth>row.document.clientWidth,overlaps:row.overlaps,hiddenClips:row.hiddenClips,controlOverflow:row.controlOverflow}));
    check(label+' control labels fit their buttons',row.controlOverflow.length===0,row.controlOverflow);
    check(label+' text is not clipped outside an accessible scroll region',row.hiddenClips.every(x=>x.scrollable),row.hiddenClips.filter(x=>!x.scrollable));
    check(label+' readout labels fit their own columns',row.readoutLabels.every(x=>x.insideCell&&x.cellInsideGrid)&&row.readoutOverlaps.length===0,{labels:row.readoutLabels,overlaps:row.readoutOverlaps});
    if(label.includes('size200'))check(label+' uses exactly200% camera text',row.cameraFont==='20px',row.cameraFont);
    return row;
  }
  async function noticeScroll(label){
    const reading=page.locator('.wc-pilot-notice-reading');await reading.focus();
    const before=await reading.evaluate(e=>({scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,tabIndex:e.tabIndex}));
    await page.keyboard.press('End');await page.waitForTimeout(300);await settle();
    const after=await reading.evaluate(e=>{const b=e.getBoundingClientRect(),p=e.querySelector('.wc-pilot-notice-prompt'),range=document.createRange();range.selectNodeContents(p);const lines=[...range.getClientRects()],last=lines.at(-1);return{scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,lastLineVisible:!!last&&last.top>=b.top-1&&last.bottom<=b.bottom+1};});
    await page.keyboard.press('Home');await page.waitForTimeout(300);await settle();
    const home=await reading.evaluate(e=>{const b=e.getBoundingClientRect(),first=e.querySelector('.wc-pilot-notice-kicker'),range=document.createRange();range.selectNodeContents(first);const line=range.getClientRects()[0];return{scrollTop:e.scrollTop,firstLineVisible:!!line&&line.top>=b.top-1&&line.bottom<=b.bottom+1};});
    await page.keyboard.press('End');await page.waitForTimeout(300);await settle();
    r.focus.push({label,before,after,home});check(label+' reading region supports native keyboard scroll',before.tabIndex>=0&&(before.scrollHeight<=before.clientHeight+1||after.scrollTop>before.scrollTop)&&after.lastLineVisible&&home.firstLineVisible&&home.scrollTop===0,{before,after,home});
  }
  async function controlsFocus(label){
    const loc=page.locator('.wc-pilot-stage button:visible:enabled');const count=await loc.count();
    for(let i=0;i<count;i++){
      await loc.nth(i).focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle();
      const item=await page.evaluate(()=>{const e=document.activeElement,b=e.getBoundingClientRect(),s=getComputedStyle(e),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{name:e.getAttribute('aria-label')||e.innerText,hit:!!hit&&(e===hit||e.contains(hit)),outline:s.outlineStyle,width:s.outlineWidth,inViewport:b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight};});
      r.focus.push({label:label+' button '+i,...item});check(label+' button '+i+' has unobscured visible keyboard focus',item.hit&&item.inViewport&&item.outline!=='none'&&parseFloat(item.width)>0,item);
    }
  }
  async function mapScroll(label){
    const map=page.locator('.wc-pilot-map');await map.focus();const before=await map.evaluate(e=>({scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,tabIndex:e.tabIndex}));await page.keyboard.press('End');await page.waitForTimeout(300);await settle();
    const after=await map.evaluate(e=>{const b=e.getBoundingClientRect(),p=e.querySelector('.wc-pilot-map-cue'),range=document.createRange();range.selectNodeContents(p);const last=[...range.getClientRects()].at(-1);return{scrollTop:e.scrollTop,lastLineVisible:!!last&&last.top>=b.top-1&&last.bottom<=b.bottom+1};});
    check(label+' supports keyboard scrolling to final map cue',before.tabIndex>=0&&(before.scrollHeight<=before.clientHeight+1||after.scrollTop>before.scrollTop)&&after.lastLineVisible,{before,after});
    await page.keyboard.press('Home');await page.waitForTimeout(300);await settle();await focus(label+' Map Close','.wc-pilot-map-head button');
  }
  async function focus(label,selector){
    await page.locator(selector).focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle();
    const f=await page.evaluate(label=>{const e=document.activeElement,b=e.getBoundingClientRect(),s=getComputedStyle(e),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{label,id:e.id,name:e.getAttribute('aria-label')||e.innerText,rect:{x:b.x,y:b.y,width:b.width,height:b.height},hit:!!hit&&(e===hit||e.contains(hit)),outline:s.outlineStyle,outlineWidth:s.outlineWidth,inViewport:b.x>=0&&b.right<=innerWidth&&b.y>=0&&b.bottom<=innerHeight};},label);r.focus.push(f);console.log('FOCUS '+label+' '+JSON.stringify(f));check(label+' has visible unobscured focus',f.hit&&f.inViewport&&f.outline!=='none'&&parseFloat(f.outlineWidth)>0,f);return f;
  }
  const fixture=require('./watercycle_pilot_rain_landing_motion_checks.cjs').fixture(source);r.fixtureScope=fixture.scope;
  if(process.argv.includes('--investigation-check')){
    r.investigation=[];r.investigationCaptures=[];
    for(const width of [320,640])for(const kind of ['normal','spacing','size200']){
      await mount(width,false);const baseFont=await page.getByRole('button',{name:'Start investigation',exact:true}).evaluate(e=>parseFloat(getComputedStyle(e).fontSize));await override(kind);const button=page.getByRole('button',{name:'Start investigation',exact:true});await button.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle();
      const item=await button.evaluate((e,label)=>{const b=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const lines=[...range.getClientRects()],style=getComputedStyle(e),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{label,text:e.textContent,fontSize:style.fontSize,page:{width:innerWidth,scrollWidth:document.documentElement.scrollWidth},button:{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom},textFits:lines.every(line=>line.left>=b.left-1&&line.right<=b.right+1&&line.top>=b.top-1&&line.bottom<=b.bottom+1),focus:document.activeElement===e,hit:e===hit||e.contains(hit),outline:style.outlineStyle,outlineWidth:style.outlineWidth};},width+' '+kind+' investigation');r.investigation.push(item);
      check(item.label+' page has no horizontal overflow',item.page.scrollWidth<=item.page.width+1,item.page);check(item.label+' label fits inside the button',item.textFits&&item.button.x>=0&&item.button.right<=width,item);check(item.label+' keyboard focus is visible and unobscured',item.focus&&item.hit&&item.outline!=='none'&&parseFloat(item.outlineWidth)>0,item);
      if(kind==='size200'){check(item.label+' uses exactly200% button text',parseFloat(item.fontSize)===baseFont*2,{baseFont,actual:item.fontSize});const file=path.join(out,width+'-size200-investigation.png');await page.locator('.wc-investigation').first().screenshot({path:file});r.investigationCaptures.push({path:path.relative(process.cwd(),file),label:item.label});}
      fs.writeFileSync(path.join(out,'investigation-progress.json'),JSON.stringify(r.investigation,null,2));
    }
    return;
  }
  if(process.argv.includes('--overlay-check')){
    for(const width of [320,640]){
      await mount(width,false,{showLandingMap:true});await override('size200');await page.locator('#wcPilotLookToggle').focus();await page.keyboard.press('Enter');await settle();await override('size200');
      await measure(width+' size200 map with Look');
      if(await page.locator('.wc-pilot-map').isVisible())await focus(width+' size200 map Close while Look is open','.wc-pilot-map-head button');
      else{check(width+' map controls are removed from view while Look is open',await page.locator('.wc-pilot-map button:visible').count()===0&&await page.evaluate(()=>waterReviewData.pilot.showLandingMap===true));await page.locator('#wcPilotLookPanel > button:last-child').focus();await page.keyboard.press('Tab');await settle();check(width+' keyboard Tab skips hidden map controls',await page.evaluate(()=>!document.activeElement.closest('.wc-pilot-map')&&document.activeElement.tagName==='BUTTON'));
      }
      await capture(width+'-size200-map-with-look');await page.locator('#wcPilotLookPanel > button:last-child').focus();await page.keyboard.press('Escape');await settle();
      check(width+' Escape restores chosen map',await page.locator('.wc-pilot-map').isVisible());await mapScroll(width+' size200 restored map');await page.keyboard.press('Enter');await settle();check(width+' native map close returns focus to canvas',await page.evaluate(()=>document.activeElement?.id==='wcPilotCanvas'&&waterReviewData.pilot.showLandingMap===false));
      await mount(width,false,{resumeCheckpoint:fixture.checkpoint,resumeToken:'text-cycle-overlay-'+width});await page.waitForFunction(()=>waterReviewData.pilot.snapshot?.form==='rain');await page.locator('[data-control=pause]').click();await page.waitForFunction(()=>waterReviewData.pilot.paused&&waterReviewData.pilot.lastChange?.from==='rain'&&waterReviewData.pilot.lastChange?.to==='liquid',null,{timeout:90000});await page.locator('#wcPilotNoticeContinue').click();await settle();if(!await page.evaluate(()=>waterReviewData.pilot.paused))await page.locator('[data-control=pause]').click();await override('size200');
      check(width+' genuine completed cycle exists before Look',await page.evaluate(()=>waterReviewData.pilot.lastCycle?.n===1)&&await page.locator('.wc-pilot-cycle').isVisible());await page.locator('#wcPilotLookToggle').focus();await page.keyboard.press('Enter');await settle();await override('size200');
      check(width+' completed-cycle controls are hidden while Look is open',!await page.locator('.wc-pilot-cycle').isVisible()&&await page.locator('.wc-pilot-cycle button:visible').count()===0);await page.locator('#wcPilotLookPanel > button:last-child').focus();await page.keyboard.press('Tab');await settle();check(width+' keyboard Tab skips hidden completed-cycle controls',await page.evaluate(()=>!document.activeElement.closest('.wc-pilot-cycle')&&document.activeElement.tagName==='BUTTON'));await focus(width+' cycle overlay Look Done','#wcPilotLookPanel > button:last-child');if(width===320)await capture('320-size200-cycle-with-look');await page.keyboard.press('Enter');await settle();check(width+' Done restores completed-cycle card',await page.locator('.wc-pilot-cycle').isVisible()&&!await page.locator('#wcPilotLookPanel').count());await focus(width+' restored Keep flying','.wc-pilot-cycle-btn');
    }
    return;
  }
  if(verify)for(const width of [320,1280]){await mount(width,false);await measure(width+' normal expanded surface');await capture(width+'-normal-expanded-surface');}
  for(const width of [320,640])for(const kind of ['spacing','size200']){
    for(const compact of [true,false]){
      await mount(width,compact);await override(kind);await measure(width+' '+kind+' '+(compact?'compact':'expanded')+' surface');
      if(verify&&compact)await controlsFocus(width+' '+kind+' compact surface');
      if(width===320)await capture(width+'-'+kind+'-'+(compact?'compact':'expanded')+'-surface');
    }
    await page.locator('#wcPilotLookToggle').focus();await page.keyboard.press('Enter');await settle();await override(kind);await measure(width+' '+kind+' expanded Look');
    if(verify)await controlsFocus(width+' '+kind+' expanded Look');
    await focus(width+' '+kind+' Look Done','#wcPilotLookPanel > button:last-child');
    if(width===320)await capture(width+'-'+kind+'-expanded-look');
    await page.keyboard.press('Escape');await settle();
    await mount(width,false,{showLandingMap:true});await override(kind);check(width+' '+kind+' map is visible',await page.locator('.wc-pilot-map').count()===1);await measure(width+' '+kind+' expanded map');
    if(verify)await mapScroll(width+' '+kind+' map');
    if(width===320)await capture(width+'-'+kind+'-expanded-map');
    await mount(width,false,{resumeCheckpoint:fixture.checkpoint,resumeToken:'text-reflow-'+width+'-'+kind});await page.waitForFunction(()=>waterReviewData.pilot.snapshot?.form==='rain');await page.locator('[data-control=pause]').click();await page.waitForFunction(()=>waterReviewData.pilot.paused&&waterReviewData.pilot.lastChange?.from==='rain'&&waterReviewData.pilot.lastChange?.to==='liquid',null,{timeout:90000});await settle();await override(kind);
    check(width+' '+kind+' has genuine rain collection notice',await page.locator('.wc-pilot-notice').count()===1);
    await measure(width+' '+kind+' collection notice');await noticeScroll(width+' '+kind+' notice');await focus(width+' '+kind+' notice Continue','#wcPilotNoticeContinue');if(width===320)await capture(width+'-'+kind+'-notice');
    await page.keyboard.press('Enter');await settle();if(!await page.evaluate(()=>waterReviewData.pilot.paused))await page.locator('[data-control=pause]').click();await override(kind);
    check(width+' '+kind+' has genuine completed cycle',await page.evaluate(()=>waterReviewData.pilot.snapshot.loops===1&&waterReviewData.pilot.lastCycle?.n===1));
    await measure(width+' '+kind+' completed cycle');await focus(width+' '+kind+' Keep flying','.wc-pilot-cycle-btn');if(width===320)await capture(width+'-'+kind+'-cycle');
  }
};
