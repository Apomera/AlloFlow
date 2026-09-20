from pathlib import Path
import time
root=Path.cwd();base=(root/'tests/sel_friendship_endings_browser.test.js').read_text(encoding='utf-8')
prefix=base[:base.index('  const open =')].replace('ENDING_PRACTICE','KEEPING_PRACTICE').replace('sel-friendship-endings','sel-friendship-keeping').replace("activeTab: 'endings'","activeTab: 'keep'").replace('/Endings/','/Keeping/').replace('Changing friendship practice','Keeping friendship practice').replace('endingDrafts','keepingDrafts')
tests=r'''
  const open=text=>map().getByText(text,{exact:true}).click();
  const labels=['What matters, and what is workable for each person?','What small act of care could fit?','What limit or support would make this sustainable?','What would tell me to keep or change the plan?'];
  const journal=()=>map().getByLabel('Friendship journal entry',{exact:true});
  const save=()=>map().getByRole('button',{name:'Add friendship journal entry',exact:true});

  it.each(examples)('$band / $item.id explores care, limits and changed circumstances without compulsory writing',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a friendship-care context',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setup[band]);expect(await map().innerText()).toContain(item.notice);
    await open('Explore a possible plan and its limits');for(const text of [item.model[band],item.why,item.limit])expect(await map().innerText()).toContain(text);
    await open('Revisit if the plan stops working');expect(await map().innerText()).toContain(item.changed);expect(await map().innerText()).toContain(item.review);
    await open('Consider my own plan (optional)');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('keeps planning contexts and grade drafts separate while retaining the shared unfinished journal',async()=>{
    await mount('middle','light',1100,{newNote:'Unfinished journal'});await open('Consider my own plan (optional)');for(const [i,label]of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Plan '+i+'\nSecond line');
    await open('Friendship journal (optional)');expect(await journal().inputValue()).toBe('Unfinished journal');
    await map().getByLabel('Choose a friendship-care context',{exact:true}).selectOption('own');expect(await map().getByText('Explore a possible plan and its limits',{exact:true}).count()).toBe(0);await open('Consider my own plan (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Own example');
    await page.evaluate(()=>window.depthSetBand('high'));await open('Consider my own plan (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Other grade');expect(await journal().inputValue()).toBe('Unfinished journal');
    await page.evaluate(()=>window.depthSetBand('middle'));expect(await map().getByLabel('Choose a friendship-care context',{exact:true}).inputValue()).toBe('own');await map().getByLabel('Choose a friendship-care context',{exact:true}).selectOption('contact');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);await mount('middle','light',1100,saved);await open('Consider my own plan (optional)');for(const [i,label]of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('Plan '+i+'\nSecond line');
    await open('Review my plan text');const preview=map().getByLabel('Plan text to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('Plan 3\nSecond line');expect(await preview.inputValue()).not.toContain('Own example');expect(await preview.inputValue()).not.toContain('Other grade');expect(await preview.inputValue()).not.toContain('Unfinished journal');expect(await preview.inputValue()).toContain('not an agreement made by the other person');expect(errors).toEqual([]);
  },120000);

  it('preserves old records and unknown draft fields and handles malformed values without crashing',async()=>{
    const legacy={friendNotes:[null,42,{id:'x',text:42},{id:'y',text:'Readable old note',date:{bad:true},extra:'retain'}],newNote:'Unfinished note',starterIdx:4,starterDrafts:{'middle:class':{opener:'Old opener'}},repairDrafts:{'middle:plans':{action:'Old plan'}},coachHistory:[{role:'user',text:'Old question'}]};
    await mount('middle','light',1100,{...legacy,keepingSelections:{middle:'missing'},keepingDrafts:{'middle:contact':{needs:42,boundary:[],extra:'keep'}}});
    await open('Consider my own plan (optional)');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('What fits');expect((await draft('middle:contact')).extra).toBe('keep');
    await open('Friendship journal (optional)');expect(await map().innerText()).toContain('Readable old note');expect(await map().innerText()).toContain('Saved note');expect(await journal().inputValue()).toBe('Unfinished note');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);for(const [key,value]of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await save().click();expect((await page.evaluate(()=>window.depthSnapshot.friendship.friendNotes)).slice(1)).toEqual(legacy.friendNotes);
    await mount('unexpected','light',1100,{keepingSelections:[],keepingDrafts:[],friendNotes:{bad:true},newNote:42,keepingJournalNotice:{bad:true}});await open('Consider my own plan (optional)');await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('A small offer');expect((await draft('middle:contact')).care).toBe('A small offer');await open('Friendship journal (optional)');expect(await journal().inputValue()).toBe('');expect(await save().isDisabled()).toBe(true);expect(errors).toEqual([]);
  },120000);

  it('saves by button and Enter consistently, without points, and exposes notes older than ten',async()=>{
    const old=Array.from({length:12},(_,i)=>({id:'old-'+i,text:i===11?'<b>Older note stays text</b>':'Earlier note '+i,date:'Earlier date',extra:i}));
    await mount('middle','light',1100,{friendNotes:old});await open('Friendship journal (optional)');expect(await save().isDisabled()).toBe(true);
    await journal().fill('   ');await journal().press('Enter');expect(await page.evaluate(()=>window.depthSnapshot.friendship.friendNotes)).toEqual(old);
    await journal().fill('  Saved with button  ');await save().click();expect(await journal().inputValue()).toBe('');expect(await map().getByRole('status').innerText()).toBe('Note added to your journal.');
    await journal().fill(' Saved with Enter ');expect(await map().getByRole('status').innerText()).toBe('');await journal().press('Enter');expect(await journal().inputValue()).toBe('');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship.friendNotes);expect(saved).toHaveLength(14);expect(saved[0].text).toBe('Saved with Enter');expect(saved[1].text).toBe('Saved with button');expect(saved.slice(2)).toEqual(old);
    await open('Earlier journal notes (4)');expect(await map().getByText('<b>Older note stays text</b>',{exact:true}).isVisible()).toBe(true);expect(await map().locator('b').count()).toBe(0);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('supports keyboard disclosures and does not save during IME composition',async()=>{
    await mount();const context=map().getByLabel('Choose a friendship-care context',{exact:true});await context.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await context.inputValue()).toBe('activities');expect(await context.evaluate(node=>node===document.activeElement)).toBe(true);
    const summary=map().getByText('Friendship journal (optional)',{exact:true});await summary.focus();await page.keyboard.press('Enter');await journal().fill('Composing text');
    await journal().evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,isComposing:true,bubbles:true,cancelable:true})));
    expect(await journal().inputValue()).toBe('Composing text');expect(await page.evaluate(()=>window.depthSnapshot.friendship.friendNotes||[])).toEqual([]);
    await journal().press('Enter');expect(await page.evaluate(()=>window.depthSnapshot.friendship.friendNotes[0].text)).toBe('Composing text');expect(await journal().evaluate(node=>node===document.activeElement)).toBe(true);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable care planning and journaling at 320px in %s',async theme=>{
    await mount('high',theme,320,{friendNotes:Array.from({length:12},(_,i)=>({id:i,text:'Earlier note '+i+' with enough words to check wrapping on a narrow phone.',date:'Earlier date'}))});await map().getByLabel('Choose a friendship-care context',{exact:true}).selectOption('support');
    for(const title of ['Explore a possible plan and its limits','Consider my own plan (optional)','Revisit if the plan stops working','Review my plan text','Friendship journal (optional)','Earlier journal notes (2)'])await open(title);
    await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Ask a trusted adult for help.');await journal().fill('A fictional reflection about setting a limit.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);expect(await map().locator('summary:visible,select:visible,input:visible,button:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name]of [['Care that works for both people','context'],['Explore a possible plan and its limits','example'],['Friendship journal (optional)','journal']]){await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
'''
hubtest=r'''
  it('keeping friendship plan and journal survive the real hub return flow',async()=>{
    await mount();await page.locator('[data-sel-tool-card-id="friendship"]').click();await page.getByRole('tab',{name:/Keeping/}).click();const activity=page.getByRole('region',{name:'Keeping friendship practice',exact:true});
    await activity.getByLabel('Choose a friendship-care context',{exact:true}).selectOption('activities');await activity.getByText('Consider my own plan (optional)',{exact:true}).click();await activity.getByLabel('What limit or support would make this sustainable? (optional)',{exact:true}).fill('Share the planning of an accessible activity.');
    await activity.getByText('Friendship journal (optional)',{exact:true}).click();await activity.getByLabel('Friendship journal entry',{exact:true}).fill('A fictional reflection about access.');await activity.getByRole('button',{name:'Add friendship journal entry',exact:true}).click();await activity.getByLabel('Friendship journal entry',{exact:true}).fill('An unfinished thought');
    const support=page.locator('details[aria-label="Practice support"]');await support.locator(':scope > summary').click();await support.getByRole('button',{name:'Return to activities',exact:true}).click();await page.locator('[data-sel-tool-card-id="friendship"]').click();
    expect(await activity.getByLabel('Choose a friendship-care context',{exact:true}).inputValue()).toBe('activities');await activity.getByText('Consider my own plan (optional)',{exact:true}).click();expect(await activity.getByLabel('What limit or support would make this sustainable? (optional)',{exact:true}).inputValue()).toBe('Share the planning of an accessible activity.');await activity.getByText('Friendship journal (optional)',{exact:true}).click();expect(await activity.getByLabel('Friendship journal entry',{exact:true}).inputValue()).toBe('An unfinished thought');expect(await activity.getByText('A fictional reflection about access.',{exact:true}).isVisible()).toBe(true);expect(errors).toEqual([]);
  },120000);

'''
hub=root/'tests/sel_hub_review_browser.test.js';s=hub.read_text(encoding='utf-8');marker='  const learningGuides';assert marker in s
for target,text in [(root/'tests/sel_friendship_keeping_browser.test.js',prefix+tests),(hub,s.replace(marker,hubtest+marker,1))]:
    for attempt in range(5):
        try:target.write_bytes(text.encode('utf-8'));break
        except OSError:
            if attempt==4:raise
            time.sleep(1)
print('Added Keeping and journal browser coverage, plus a real-hub regression.')
