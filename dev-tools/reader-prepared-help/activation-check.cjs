const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function({page,errors,out,browserName}) {
  const results=[];
  for(const width of [390,1280]) for(const destination of ['same','other']) {
    await page.setViewportSize({width,height:600});
    await page.evaluate(()=>{
      const data='The heron rests. The heron flies.';
      window.mount({data,quote:'heron',start:data.indexOf('heron'),
        explanation:'FIRST. '+('A heron waits beside the water. '.repeat(24)),
        additionalHelp:[{quote:'heron',start:data.lastIndexOf('heron'),end:data.lastIndexOf('heron')+5,text:'SECOND. '+('A heron flies above the river. '.repeat(24))}]});
    });
    const openers=page.locator('[data-prepared-help-open]');await openers.first().waitFor();
    const before=await page.evaluate(()=>({item:JSON.stringify(window.fixtureItem),passage:document.querySelector('[data-reading-passage]').textContent}));
    await openers.first().focus();await page.keyboard.press('Enter');
    const card=page.locator('[data-word-help-card]');await card.waitFor();
    // End is a native scroll action from the focused card, not a DOM scroll stub.
    await page.keyboard.press('End');
    await page.waitForFunction(()=>document.querySelector('[data-word-help-card]').scrollTop>100);
    const priorScroll=await card.evaluate(node=>node.scrollTop);
    const opener=openers.nth(destination==='same'?0:1);
    await opener.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement===document.querySelector('[data-word-help-card]'));
    const nextScroll=await card.evaluate(node=>node.scrollTop);
    const expected=destination==='same'?'FIRST.':'SECOND.';
    assert.ok((await card.locator('[data-word-help-card-text]').textContent()).startsWith(expected));
    results.push({width,destination,priorScroll,nextScroll});
    fs.writeFileSync(path.join(out,'activation-results.json'),JSON.stringify({browser:browserName,results,errors},null,2)+'\n');
    assert.equal(nextScroll,0,'A newly activated explanation starts at its beginning');
    assert.deepEqual(await page.evaluate(()=>({speak:window.calls.speak,lookup:window.calls.lookup})),{speak:[],lookup:[]});
    await page.keyboard.press('Escape');await card.waitFor({state:'detached'});
    assert.equal(await opener.evaluate(node=>node===document.activeElement),true);
    assert.deepEqual(await page.evaluate(()=>({item:JSON.stringify(window.fixtureItem),passage:document.querySelector('[data-reading-passage]').textContent})),before);
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:browserName,activationCases:results.length,errors}));
};
