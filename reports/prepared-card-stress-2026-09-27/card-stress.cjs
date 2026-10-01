const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
module.exports=async function({browser,page,url,errors,out,browserName,inputRoot}) {
  const cases=[
    {name:'desktop-long',width:1280,height:900,font:16},
    {name:'phone-long',width:320,height:568,font:16},
    {name:'phone-large-text',width:390,height:844,font:32},
    {name:'landscape',width:844,height:390,font:16},
    {name:'landscape-large-text',width:568,height:320,font:32},
    {name:'zoom-400-equivalent',width:320,height:225,font:16},
    {name:'arabic-phone',width:390,height:844,font:16,arabic:true},
    {name:'arabic-landscape-large-text',width:568,height:320,font:32,arabic:true},
    {name:'mixed-long-token',width:320,height:568,font:32,arabic:true,longToken:true},
  ];
  const results=[],failures=[];
  const control=await browser.newPage();
  await control.setContent('<button id="before">Before</button><a id="link" href="#destination">Source</a><button id="after">After</button>');
  const navigation={};
  for(const key of ['Tab','Alt+Tab']) {
    await control.locator('#before').focus();await control.keyboard.press(key);
    navigation[key]=await control.evaluate(()=>document.activeElement.id);
  }
  await control.close();
  // WebKit can use a different key for links according to browser keyboard
  // navigation preferences. Establish that with plain HTML, not app changes.
  const tabKey=navigation.Tab==='link'?'Tab':navigation['Alt+Tab']==='link'?'Alt+Tab':'Tab';
  const tabsToLinks=navigation[tabKey]==='link';
  const image={src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5m8AAAAASUVORK5CYII=',alt:'A sample illustration.',source:'mulberry',
    attribution:{set:'Mulberry Symbols',author:'Steve Lee',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',via:'Global Symbols',url:'https://mulberrysymbols.org'}};
  const labels={'simplified.word_help_card_hear_word':'Das ausgewählte Wort vorlesen','simplified.word_help_card_listen':'Die vorbereitete Erklärung vorlesen',
    'simplified.word_help_card_more':'Weitere Informationen über dieses Wort','simplified.word_help_card_all':'Alle vorbereiteten Worterklärungen'};
  function scenario(test) {
    const quote=test.arabic?'مالك الحزين':'great blue heron';
    const data=test.arabic?'يعيش مالك الحزين بالقرب من الماء.\n\nرأيت مالك الحزين. [دليل 2026](https://example.invalid/guide).':'The great blue heron lives near water.\n\nI saw a great blue heron. [Field guide 2026](https://example.invalid/guide).';
    const explanation=(test.arabic?'هذا طائر يعيش قرب الماء ويبحث عن طعامه. It waits beside the water (2026). ':'A tall bird waits beside the water and catches food with its long beak. ').repeat(8)+(test.longToken?' ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(6).replaceAll(' ',''):'');
    return {data,quote,explanation,language:test.arabic?'Arabic':'English',image,labels};
  }
  async function inspect(test,target) {
    await target.setViewportSize({width:test.width,height:test.height});
    const fixture=scenario(test);
    await target.evaluate(({font,fixture})=>{document.documentElement.style.fontSize=font+'px';window.mount(fixture);},{font:test.font,fixture});
    const opener=target.locator('[data-prepared-help-open]');await opener.waitFor();
    const before=await target.evaluate(()=>({item:JSON.stringify(window.fixtureItem),passage:document.querySelector('[data-reading-passage]').textContent}));
    await opener.focus();await target.keyboard.press('Enter');
    const card=target.locator('[data-word-help-card]');await card.waitFor();
    assert.equal(await card.evaluate(node=>node===document.activeElement),true,'Card receives focus');
    assert.deepEqual(await target.evaluate(()=>window.calls.lookup),[],'Prepared activation makes no lookup');
    assert.deepEqual(await target.evaluate(()=>window.calls.speak),[],'Prepared activation does not read a sentence');
    assert.equal(await card.locator('[data-word-help-card-text]').getAttribute('lang'),test.arabic?'ar':'en');
    assert.equal(await card.locator('[data-word-help-card-text]').getAttribute('dir'),test.arabic?'rtl':'ltr');
    assert.match(await card.locator('[data-reading-picture-credits]').textContent(),/Mulberry Symbols.*Steve Lee/);
    assert.equal(await card.locator('img').getAttribute('alt'),image.alt);
    const geometry=await card.evaluate(node=>{
      const r=node.getBoundingClientRect(),v=window.visualViewport;
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,
        scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,viewport:{width:v?.width||innerWidth,height:v?.height||innerHeight,left:v?.offsetLeft||0,top:v?.offsetTop||0}};
    });
    const issues=[];
    if(geometry.scrollWidth>geometry.clientWidth+1)issues.push('horizontal overflow');
    if(geometry.left<geometry.viewport.left-1||geometry.right>geometry.viewport.left+geometry.viewport.width+1||geometry.top<geometry.viewport.top-1||geometry.bottom>geometry.viewport.top+geometry.viewport.height+1)issues.push('card outside visible viewport');
    const focus=[];
    const count=await card.locator(tabsToLinks?'button,a[href]':'button').count();
    for(let i=0;i<count;i++) {
      await target.keyboard.press(tabKey);
      // Native keyboard focus can scroll asynchronously. Observe the settled
      // target, retaining failures that stay clipped after that scrolling.
      await target.waitForFunction(()=>{
        const node=document.activeElement,card=node.closest('[data-word-help-card]');
        if(!card)return true;
        const r=node.getBoundingClientRect(),c=card.getBoundingClientRect();
        return Math.min(r.bottom,c.bottom-card.clientTop)-Math.max(r.top,c.top+card.clientTop)>=Math.min(r.height,24)-1;
      },null,{timeout:1000}).catch(()=>{});
      const position=await target.evaluate(()=>{
        const node=document.activeElement,card=node.closest('[data-word-help-card]');
        if(!card)return {outside:true,tag:node.tagName};
        const r=node.getBoundingClientRect(),c=card.getBoundingClientRect();
        const visibleHeight=Math.max(0,Math.min(r.bottom,c.bottom-card.clientTop)-Math.max(r.top,c.top+card.clientTop));
        const visibleWidth=Math.max(0,Math.min(r.right,c.right)-Math.max(r.left,c.left));
        return {tag:node.tagName,name:node.getAttribute('aria-label')||node.textContent,visibleHeight,visibleWidth,height:r.height,width:r.width,
          outline:getComputedStyle(node).outlineStyle,boxShadow:getComputedStyle(node).boxShadow};
      });
      focus.push(position);
      if(position.outside)issues.push('Tab missed a card control');
      else if(position.visibleHeight<Math.min(position.height,24)-1||position.visibleWidth<Math.min(position.width,24)-1)issues.push('focused control clipped: '+position.name);
    }
    const creditLinks=[];
    for(const link of await card.locator('[data-reading-picture-credits] a').all()) {
      assert.match(await link.getAttribute('href'),/^https:\/\//);
      await link.focus();
      await target.waitForFunction(()=>{
        const node=document.activeElement,card=node.closest('[data-word-help-card]');
        if(!card)return false;
        const r=node.getBoundingClientRect(),c=card.getBoundingClientRect();
        return Math.min(r.bottom,c.bottom-card.clientTop)-Math.max(r.top,c.top+card.clientTop)>=Math.min(r.height,24)-1;
      },null,{timeout:1000});
      creditLinks.push({name:await link.textContent(),href:await link.getAttribute('href'),focusedAndVisible:await link.evaluate(node=>node===document.activeElement)});
    }
    assert.equal(creditLinks.length,2,'Source and license remain available');
    if(test.name==='mixed-long-token')await target.screenshot({path:path.join(out,browserName+'-focused-credits.png')});
    // Return to a real audio button and activate by keyboard; callbacks remain mocks.
    await card.locator('[data-word-help-card-hear]').focus();await target.keyboard.press('Enter');
    const speech=await target.evaluate(()=>window.calls.speak.at(-1));
    assert.equal(speech[0],fixture.quote);assert.equal(speech[4],fixture.language);
    await target.keyboard.press('Escape');await card.waitFor({state:'detached'});
    assert.equal(await opener.evaluate(node=>node===document.activeElement),true,'Escape restores the exact opener');
    assert.equal(await target.evaluate(id=>window.calls.stop.includes(id),speech[1]),true,'Close cancels owned speech');
    assert.deepEqual(await target.evaluate(()=>({item:JSON.stringify(window.fixtureItem),passage:document.querySelector('[data-reading-passage]').textContent})),before,'Passage and support/citation data unchanged');
    if(test.name==='mixed-long-token'||test.name==='zoom-400-equivalent') {
      await opener.press('Enter');await card.waitFor();
      await target.screenshot({path:path.join(out,browserName+'-'+test.name+'.png')});
      await target.keyboard.press('Escape');
    }
    return {test,geometry,focus,creditLinks,issues};
  }
  for(const test of cases) {
    try {const result=await inspect(test,page);results.push(result);if(result.issues.length)failures.push({name:test.name,issues:result.issues});}
    catch(error){failures.push({name:test.name,error:error.message});}
  }
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try {
    const touch=await context.newPage();touch.on('pageerror',error=>errors.push(error.message));await touch.goto(url);
    await touch.evaluate(fixture=>window.mount(fixture),scenario({arabic:true}));
    const opener=touch.locator('[data-prepared-help-open]');await opener.tap();
    const card=touch.locator('[data-word-help-card]');await card.waitFor();
    await touch.setViewportSize({width:844,height:390});
    await card.locator('[data-word-help-card-listen]').tap();
    assert.equal(await touch.evaluate(()=>window.calls.speak.length),1);
    await card.getByRole('button',{name:'Close',exact:true}).tap();
    assert.equal(await card.count(),0);assert.equal(await touch.evaluate(()=>window.calls.stop.length),2);
    // Opening prepared help still makes no provider or lookup request.
    assert.deepEqual(await touch.evaluate(()=>window.calls.lookup),[]);
    results.push({name:'touch-arabic-rotation',passed:true});
  } catch(error){failures.push({name:'touch-arabic-rotation',error:error.message});}
  finally{await context.close();}
  const report={browser:browserName,navigation,tabKey,creditLinkKeyboard:tabsToLinks?'Verified by native keyboard traversal':'Not verified: this engine skips ordinary links in the plain-HTML control too. Programmatic focus/visibility is checked separately.',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(inputRoot,'view_simplified_source.jsx'))).digest('hex'),results,failures,errors,
    limits:'Production reader CSS fixture with mock speech/AI callbacks. The 320x225 viewport models 1280x900 at 400% reflow; it is not an actual browser toolbar zoom operation. Doubled root font is a separate text-size check. WebKit is not a Safari device/AT certification.'};
  fs.writeFileSync(path.join(out,browserName+'-card-stress.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({browser:browserName,cases:results.length,failures,errors},null,2));
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
};
