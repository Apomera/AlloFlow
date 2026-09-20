from pathlib import Path
import time
root=Path.cwd();base=(root/'tests/sel_friendship_endings_browser.test.js').read_text(encoding='utf-8')
prefix=base[:base.index('  const open =')].replace('ENDING_PRACTICE','CARE_PRACTICES').replace('sel-friendship-endings','sel-friendship-care').replace("activeTab: 'endings'","activeTab: 'compass'").replace('/Endings/','/Ways to Care/').replace('Changing friendship practice','Ways to care practice').replace('endingDrafts','careDrafts')
tests=r'''
  const open=text=>map().getByText(text,{exact:true}).click();
  const labels=['What do I notice or need to ask?','What could I offer, adapt or decline?','What would show this is welcome or needs changing?'];

  it.each(examples)('$band / $item.id explores a flexible practice and a changed circumstance without assigning a type',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a way to care to explore',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setup[band]);expect(await map().innerText()).toContain(item.notice);
    await open('Explore words and boundaries');expect(await map().innerText()).toContain(item.words[band]);expect(await map().innerText()).toContain(item.limit);
    await open('Adjust when the situation changes');expect(await map().innerText()).toContain(item.changed);expect(await map().innerText()).toContain(item.review);
    await open('Adapt a practice (optional)');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    expect(await page.evaluate(()=>window.depthSnapshot.friendship.myStyle)).toBeUndefined();expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('keeps independent context and grade notes through changes and remounting',async()=>{
    await mount();await open('Adapt a practice (optional)');for(const [i,label]of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Practice '+i+'\nSecond line');
    await map().getByLabel('Choose a way to care to explore',{exact:true}).selectOption('listener');await open('Adapt a practice (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('Choose a way to care to explore',{exact:true}).selectOption('own');expect(await map().getByText('Explore words and boundaries',{exact:true}).count()).toBe(0);await open('Adapt a practice (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own example');
    await page.evaluate(()=>window.depthSetBand('high'));await open('Adapt a practice (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Other grade');
    await page.evaluate(()=>window.depthSetBand('middle'));expect(await map().getByLabel('Choose a way to care to explore',{exact:true}).inputValue()).toBe('own');await map().getByLabel('Choose a way to care to explore',{exact:true}).selectOption('helper');const saved=await page.evaluate(()=>window.depthSnapshot.friendship);await mount('middle','light',1100,saved);
    await open('Adapt a practice (optional)');for(const [i,label]of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('Practice '+i+'\nSecond line');await open('Review my practice notes');const preview=map().getByLabel('Practice notes to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('Practice 2\nSecond line');expect(await preview.inputValue()).toContain('not a personality assessment');expect(await preview.inputValue()).not.toContain('My own example');expect(await preview.inputValue()).not.toContain('Other grade');expect(errors).toEqual([]);
  },120000);

  it('keeps earlier style choices, awards and other notes as history without using them to choose a practice',async()=>{
    const legacy={myStyle:'loyalist',earnedBadges:{old:123},friendNotes:[{text:'Earlier journal'}],newNote:'Unfinished journal',coachHistory:[{role:'coach',text:'Earlier coach reply'}],keepingDrafts:{'middle:contact':{care:'Earlier care plan'}}};
    await mount('middle','light',1100,legacy);expect(await map().getByLabel('Choose a way to care to explore',{exact:true}).inputValue()).toBe('helper');await open('Earlier style selection');expect(await map().innerText()).toContain('Earlier selection: The Loyalist.');expect(await map().innerText()).toContain('not an assessment of who you are');
    await map().getByLabel('Choose a way to care to explore',{exact:true}).selectOption('cheerleader');await open('Adapt a practice (optional)');await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('Ask how they want the news acknowledged.');const saved=await page.evaluate(()=>window.depthSnapshot.friendship);for(const [key,value]of Object.entries(legacy))expect(saved[key]).toEqual(value);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('recovers malformed records and supports native keyboard selection and activity navigation',async()=>{
    await mount('middle','light',1100,{myStyle:{bad:true},careSelections:{middle:'missing'},careDrafts:{'middle:helper':{notice:42,offer:[],extra:'keep'}}});await open('Earlier style selection');expect(await map().innerText()).toContain('no matching style label');
    const summary=map().getByText('Adapt a practice (optional)',{exact:true});await summary.focus();await page.keyboard.press('Enter');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Ask first');expect((await draft('middle:helper')).extra).toBe('keep');
    const context=map().getByLabel('Choose a way to care to explore',{exact:true});await context.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await context.inputValue()).toBe('listener');expect(await context.evaluate(node=>node===document.activeElement)).toBe(true);
    await page.getByText('Explore other friendship activities',{exact:true}).click();await page.getByRole('button',{name:/Care with limits/}).click();expect(await page.getByRole('region',{name:'Keeping friendship practice',exact:true}).count()).toBe(1);
    await mount('unexpected','light',1100,{careSelections:[],careDrafts:[]});await open('Adapt a practice (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Recovered');expect((await draft('middle:helper')).notice).toBe('Recovered');expect(errors).toEqual([]);
  },120000);

  it.each([{method:'enter',safe:true},{method:'button',safe:true},{method:'enter',safe:false},{method:'button',safe:false}])('$method coach submission (safe=$safe) does not add an old type or new reflection to the prompt',async({method,safe})=>{
    const earlier={role:'coach',text:'Earlier generated response'};
    await mount('middle','light',1100,{myStyle:'loyalist',coachHistory:[earlier],careDrafts:{'middle:helper':{notice:'DO_NOT_INCLUDE_REFLECTION'}}});
    if(safe)await page.evaluate(()=>{window.SelHub.safeCoach=async options=>{window.depthCoachCalls.push(options.coachPrompt);window.depthSafeHistory=options.conversationHistory;return{response:'Mocked coach response',tier:0};};});
    await page.getByRole('tab',{name:/Practice/}).click();const field=page.getByLabel('Friendship practice message',{exact:true});await field.fill('Can I ask about sharing a task?');if(method==='enter')await field.press('Enter');else await page.getByRole('button',{name:'Send message to friendship coach',exact:true}).click();
    await page.waitForFunction(()=>window.depthSnapshot.friendship.coachLoading===false);const prompts=await page.evaluate(()=>window.depthCoachCalls);expect(prompts).toHaveLength(1);expect(prompts[0]).toContain('Can I ask about sharing a task?');expect(prompts[0]).not.toContain('loyalist');expect(prompts[0]).not.toContain('Their friendship style');expect(prompts[0]).not.toContain('DO_NOT_INCLUDE_REFLECTION');expect(await page.evaluate(()=>window.depthSnapshot.friendship.myStyle)).toBe('loyalist');expect(await page.evaluate(()=>window.depthSnapshot.friendship.coachHistory[0])).toEqual(earlier);if(safe)expect(await page.evaluate(()=>window.depthSafeHistory[0])).toEqual(earlier);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps Ways to Care readable and accessible at 320px in %s',async theme=>{
    await mount('high',theme,320,{myStyle:'helper'});await map().getByLabel('Choose a way to care to explore',{exact:true}).selectOption('includer');for(const title of ['Explore words and boundaries','Adapt a practice (optional)','Adjust when the situation changes','Review my practice notes','Earlier style selection'])await open(title);await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('Offer an accessible choice and respect a pass.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name]of [['Different ways to show care','context'],['Explore words and boundaries','example'],['Earlier style selection','history']]){await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
'''
hubtest=r'''
  it('ways to care practice survives the real hub return flow without assigning a friendship type',async()=>{
    await mount();await page.locator('[data-sel-tool-card-id="friendship"]').click();const activity=page.getByRole('region',{name:'Ways to care practice',exact:true});expect(await page.getByRole('tab',{name:/Ways to Care/}).getAttribute('aria-selected')).toBe('true');await activity.getByLabel('Choose a way to care to explore',{exact:true}).selectOption('listener');await activity.getByText('Adapt a practice (optional)',{exact:true}).click();await activity.getByLabel('What could I offer, adapt or decline? (optional)',{exact:true}).fill('Ask whether listening or ideas would help.');
    const support=page.locator('details[aria-label="Practice support"]');await support.locator(':scope > summary').click();await support.getByRole('button',{name:'Return to activities',exact:true}).click();await page.locator('[data-sel-tool-card-id="friendship"]').click();expect(await activity.getByLabel('Choose a way to care to explore',{exact:true}).inputValue()).toBe('listener');await activity.getByText('Adapt a practice (optional)',{exact:true}).click();expect(await activity.getByLabel('What could I offer, adapt or decline? (optional)',{exact:true}).inputValue()).toBe('Ask whether listening or ideas would help.');expect(await page.evaluate(()=>window.__alloflowSelToolData.friendship.myStyle)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

'''
hub=root/'tests/sel_hub_review_browser.test.js';s=hub.read_text(encoding='utf-8');marker='  const learningGuides';assert marker in s
digital=root/'tests/sel_friendship_depth_browser.test.js';digitaltext=digital.read_text(encoding='utf-8').replace('name:/My Style/','name:/Ways to Care/')
for target,text in [(root/'tests/sel_friendship_care_browser.test.js',prefix+tests),(hub,s.replace(marker,hubtest+marker,1)),(digital,digitaltext)]:
    for attempt in range(5):
        try:target.write_bytes(text.encode('utf-8'));break
        except OSError:
            if attempt==4:raise
            time.sleep(1)
print('Added Ways to Care, prompt and hub tests; updated the renamed-tab assertion.')
