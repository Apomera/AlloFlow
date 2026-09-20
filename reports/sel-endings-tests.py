from pathlib import Path
import time
root=Path.cwd()
base=(root/'tests/sel_friendship_repair_browser.test.js').read_text(encoding='utf-8')
prefix=base[:base.index('  const open =')].replace('REPAIR_PRACTICE','ENDING_PRACTICE').replace('sel-friendship-repair','sel-friendship-endings').replace("activeTab: 'repair'","activeTab: 'endings'").replace('/Repair/','/Endings/').replace('Friendship repair choices','Changing friendship practice').replace('repairDrafts','endingDrafts')
tests=r'''
  const open = text => map().getByText(text,{exact:true}).click();
  const labels=['What feels different, and what is uncertain?','What contact or space would respect both people?','What could help in my day?','What would I keep or reconsider?'];

  it.each(examples)('$band / $item.id compares possibilities and revisits change without required notes',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a changing-friendship context',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setup[band]);expect(await map().innerText()).toContain(item.notice);
    for(const option of item.options){
      await open(option.title);
      for(const text of [option.benefit,option.limit,option.words[band]])expect(await map().innerText()).toContain(text);
    }
    await open('Reconsider after something changes');
    expect(await map().innerText()).toContain(item.changed);expect(await map().innerText()).toContain(item.review);
    await open('Make room for my next day (optional)');
    for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('preserves independent notes across contexts, grade changes and remounting',async()=>{
    await mount();await open('Make room for my next day (optional)');
    for(const [i,label] of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Note '+i+'\nSecond line');
    await map().getByLabel('Choose a changing-friendship context',{exact:true}).selectOption('space');
    await open(cases[1].options[0].title);
    await map().getByLabel('Choose a changing-friendship context',{exact:true}).selectOption('own');
    expect(await map().getByText('Compare possible next steps',{exact:true}).count()).toBe(0);
    await open('Make room for my next day (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own context');
    await page.evaluate(()=>window.depthSetBand('high'));await open('Make room for my next day (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Another grade');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a changing-friendship context',{exact:true}).inputValue()).toBe('own');
    await map().getByLabel('Choose a changing-friendship context',{exact:true}).selectOption('move');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);await mount('middle','light',1100,saved);
    await open('Make room for my next day (optional)');
    for(const [i,label] of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('Note '+i+'\nSecond line');
    await open('Review my notes');const preview=map().getByLabel('Notes to review or copy',{exact:true});
    expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('Note 3\nSecond line');
    expect(await preview.inputValue()).not.toContain('Another grade');expect(await preview.inputValue()).not.toContain('My own context');
    expect(await preview.inputValue()).toContain('not a final decision');expect(errors).toEqual([]);
  },120000);

  it('keeps legacy friendship data and handles malformed new records without inventing notes',async()=>{
    const legacy={endingIdx:3,repairIdx:2,repairDrafts:{'middle:plans':{action:'Existing repair note'}},friendNotes:[{text:'Earlier journal'}],digitalDone:{old:true},coachHistory:[{role:'user',text:'Earlier question'}]};
    await mount('middle','light',1100,{...legacy,endingSelections:{middle:'missing'},endingDrafts:{'middle:move':{change:42,boundary:[],extra:'keep'}}});
    await open('Make room for my next day (optional)');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('A changed routine');expect((await draft('middle:move')).extra).toBe('keep');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await mount('unexpected','light',1100,{endingSelections:[],endingDrafts:[]});await open('Make room for my next day (optional)');await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Ask for help');expect((await draft('middle:move')).support).toBe('Ask for help');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('uses native keyboard choices and keeps no-contact guidance separate from invitations',async()=>{
    await mount();const context=map().getByLabel('Choose a changing-friendship context',{exact:true});await context.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await context.inputValue()).toBe('space');expect(await context.evaluate(node=>node===document.activeElement)).toBe(true);
    const summary=map().getByText(cases[1].options[0].title,{exact:true});await summary.focus();await page.keyboard.press('Enter');
    expect(await map().innerText()).toContain('Do not ask friends to carry messages');expect(await map().getByText(cases[2].options[0].title,{exact:true}).count()).toBe(0);
    await open('Reconsider after something changes');expect(await map().innerText()).toContain('A greeting does not automatically reopen the friendship');
    await context.selectOption('uncertain');await open(cases[2].options[0].title);expect(await map().innerText()).toContain('only when contact is welcome');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports accessible changing-friendship practice at 320px in %s',async theme=>{
    await mount('high',theme,320);await map().getByLabel('Choose a changing-friendship context',{exact:true}).selectOption('space');
    for(const option of cases[1].options)await open(option.title);
    for(const title of ['Make room for my next day (optional)','Reconsider after something changes','Review my notes'])await open(title);
    await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Ask a teacher to help plan shared class work.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name] of [['When friendships change','context'],[cases[1].options[0].title,'options'],['Reconsider after something changes','review']]){
      await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});
    }
    expect(errors).toEqual([]);
  },120000);
});
'''
hubtest=r'''
  it('changing friendship notes survive the real hub return and reopen flow',async()=>{
    await mount();await page.locator('[data-sel-tool-card-id="friendship"]').click();await page.getByRole('tab',{name:/Endings/}).click();
    const activity=page.getByRole('region',{name:'Changing friendship practice',exact:true});
    await activity.getByLabel('Choose a changing-friendship context',{exact:true}).selectOption('space');await activity.getByText('Make room for my next day (optional)',{exact:true}).click();
    await activity.getByLabel('What could help in my day? (optional)',{exact:true}).fill('Ask for help with shared class routines.');
    const support=page.locator('details[aria-label="Practice support"]');await support.locator(':scope > summary').click();await support.getByRole('button',{name:'Return to activities',exact:true}).click();
    await page.locator('[data-sel-tool-card-id="friendship"]').click();expect(await activity.getByLabel('Choose a changing-friendship context',{exact:true}).inputValue()).toBe('space');await activity.getByText('Make room for my next day (optional)',{exact:true}).click();
    expect(await activity.getByLabel('What could help in my day? (optional)',{exact:true}).inputValue()).toBe('Ask for help with shared class routines.');
    expect(await page.evaluate(()=>window.__alloflowSelToolData.friendship.endingIdx)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

'''
hub=root/'tests/sel_hub_review_browser.test.js'; s=hub.read_text(encoding='utf-8'); marker='  const learningGuides'; assert marker in s
for target,text in [(root/'tests/sel_friendship_endings_browser.test.js',prefix+tests),(hub,s.replace(marker,hubtest+marker,1))]:
    for attempt in range(5):
        try: target.write_bytes(text.encode('utf-8')); break
        except OSError:
            if attempt==4: raise
            time.sleep(1)
print('Added focused endings and real-hub coverage.')
