from pathlib import Path
import time
root=Path.cwd(); base=(root/'tests/sel_friendship_endings_browser.test.js').read_text(encoding='utf-8')
prefix=base[:base.index('  const open =')].replace("const cases = JSON.parse(source.match(/var ENDING_PRACTICE = (\\[[\\s\\S]*?\\n\\]);/)[1]);\nconst examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));", "const cases = JSON.parse(source.match(/var STARTERS = (\\{[\\s\\S]*?\\n\\});/)[1]);\nconst examples = Object.entries(cases).flatMap(([band,items])=>items.map(item=>({band,item})));")
assert 'var STARTERS' in prefix
prefix=prefix.replace('sel-friendship-endings','sel-friendship-starting').replace("activeTab: 'endings'","activeTab: 'start'").replace('/Endings/','/Starting/').replace('Changing friendship practice','Starting friendship practice').replace('endingDrafts','starterDrafts')
tests=r'''
  const open=text=>map().getByText(text,{exact:true}).click();
  const labels=['What would make this a workable moment?','What opening words or action could I try?','How could I respond or step back?','What would I notice or adjust next time?'];

  it.each(examples)('$band / $item.id checks context and rehearses welcome, decline and uncertainty without compulsory writing',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a conversation context',{exact:true}).selectOption(item.id);
    for(const text of [item.situation,item.check,item.say,item.why])expect(await map().innerText()).toContain(text);
    const response=map().getByLabel('Explore a fictional response',{exact:true});
    await response.selectOption('welcome');expect(await map().innerText()).toContain(item.follow);expect(await map().innerText()).toContain('Both people can change their minds.');
    await response.selectOption('decline');expect(await map().innerText()).toContain('Do not keep asking');expect(await map().innerText()).not.toContain(item.follow);
    await response.selectOption('unclear');expect(await map().innerText()).toContain('Uncertainty is not permission to continue contact.');expect(await map().innerText()).toContain('communication');
    await open('Adapt and rehearse (optional)');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('keeps optional notes and explored responses independent across contexts, grades and remounts',async()=>{
    await mount();await open('Adapt and rehearse (optional)');for(const [i,label]of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Note '+i+'\nSecond line');
    const response=map().getByLabel('Explore a fictional response',{exact:true});await response.selectOption('decline');await response.selectOption('welcome');
    expect(await map().getByLabel(labels[2]+' (optional)',{exact:true}).inputValue()).toBe('Note 2\nSecond line');
    await map().getByLabel('Choose a conversation context',{exact:true}).selectOption('own');await open('Adapt and rehearse (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Own context');await response.selectOption('unclear');
    await page.evaluate(()=>window.depthSetBand('high'));await open('Adapt and rehearse (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Another grade');
    await page.evaluate(()=>window.depthSetBand('middle'));expect(await map().getByLabel('Choose a conversation context',{exact:true}).inputValue()).toBe('own');expect(await response.inputValue()).toBe('unclear');
    await map().getByLabel('Choose a conversation context',{exact:true}).selectOption('class');const saved=await page.evaluate(()=>window.depthSnapshot.friendship);await mount('middle','light',1100,saved);
    expect(await response.inputValue()).toBe('welcome');await open('Adapt and rehearse (optional)');for(const [i,label]of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('Note '+i+'\nSecond line');
    await response.selectOption('');await open('Review my practice notes');const preview=map().getByLabel('Practice notes to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('Note 3\nSecond line');expect(await preview.inputValue()).toContain('not a prediction of friendship');expect(await preview.inputValue()).not.toContain('Own context');expect(await preview.inputValue()).not.toContain('Another grade');expect(errors).toEqual([]);
  },120000);

  it('retains legacy positions and records while recovering malformed new draft values',async()=>{
    const legacy={starterIdx:5,endingIdx:3,endingDrafts:{'middle:space':{support:'Old support note'}},repairDrafts:{'middle:plans':{action:'Old repair note'}},friendNotes:[{text:'Old journal'}],coachHistory:[{role:'user',text:'Old question'}]};
    await mount('middle','light',1100,{...legacy,starterSelections:{middle:'missing'},starterDrafts:{'middle:mutual':{response:'missing',opener:42,next:[],extra:'keep'}}});
    expect(await map().getByLabel('Choose a conversation context',{exact:true}).inputValue()).toBe('mutual');expect(await map().getByLabel('Explore a fictional response',{exact:true}).inputValue()).toBe('');
    await open('Adapt and rehearse (optional)');for(const label of labels)expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('Hello');expect((await draft('middle:mutual')).extra).toBe('keep');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);for(const [key,value]of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await mount('unexpected','light',1100,{starterIdx:-3,starterSelections:[],starterDrafts:[]});await open('Adapt and rehearse (optional)');await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('Recovered');expect((await draft('middle:class')).opener).toBe('Recovered');expect(errors).toEqual([]);
  },120000);

  it('supports keyboard response choices and keeps reconnection and own-context boundaries visible',async()=>{
    await mount('high');await map().getByLabel('Choose a conversation context',{exact:true}).selectOption('reconnect');expect(await map().innerText()).toContain('no request for space or no contact');
    const response=map().getByLabel('Explore a fictional response',{exact:true});await response.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await response.inputValue()).toBe('welcome');expect(await response.evaluate(node=>node===document.activeElement)).toBe(true);
    const summary=map().getByText('Adapt and rehearse (optional)',{exact:true});await summary.focus();await page.keyboard.press('Enter');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).isVisible()).toBe(true);
    await map().getByLabel('Choose a conversation context',{exact:true}).selectOption('own');expect(await response.inputValue()).toBe('');expect(await map().innerText()).toContain('respect that instead of rehearsing another approach');expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable and accessible response practice at 320px in %s',async theme=>{
    await mount('high',theme,320);await map().getByLabel('Choose a conversation context',{exact:true}).selectOption('reconnect');await map().getByLabel('Explore a fictional response',{exact:true}).selectOption('unclear');
    await open('Adapt and rehearse (optional)');await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Give time and leave room for their communication method.');await open('Review my practice notes');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name]of [['Start a conversation, leave room for choice','context'],['Explore a fictional response','response'],['Review my practice notes','review']]){await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}
    expect(errors).toEqual([]);
  },120000);
});
'''
hubtest=r'''
  it('conversation starting notes and response choice survive the real hub return flow',async()=>{
    await mount();await page.locator('[data-sel-tool-card-id="friendship"]').click();await page.getByRole('tab',{name:/Starting/}).click();const activity=page.getByRole('region',{name:'Starting friendship practice',exact:true});
    await activity.getByLabel('Choose a conversation context',{exact:true}).selectOption('invite');await activity.getByLabel('Explore a fictional response',{exact:true}).selectOption('decline');await activity.getByText('Adapt and rehearse (optional)',{exact:true}).click();await activity.getByLabel('How could I respond or step back? (optional)',{exact:true}).fill('Acknowledge their answer and give them space.');
    const support=page.locator('details[aria-label="Practice support"]');await support.locator(':scope > summary').click();await support.getByRole('button',{name:'Return to activities',exact:true}).click();await page.locator('[data-sel-tool-card-id="friendship"]').click();
    expect(await activity.getByLabel('Choose a conversation context',{exact:true}).inputValue()).toBe('invite');expect(await activity.getByLabel('Explore a fictional response',{exact:true}).inputValue()).toBe('decline');await activity.getByText('Adapt and rehearse (optional)',{exact:true}).click();expect(await activity.getByLabel('How could I respond or step back? (optional)',{exact:true}).inputValue()).toBe('Acknowledge their answer and give them space.');expect(await page.evaluate(()=>window.__alloflowSelToolData.friendship.starterIdx)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

'''
hub=root/'tests/sel_hub_review_browser.test.js'; s=hub.read_text(encoding='utf-8'); marker='  const learningGuides'; assert marker in s
for target,text in [(root/'tests/sel_friendship_starting_browser.test.js',prefix+tests),(hub,s.replace(marker,hubtest+marker,1))]:
    for attempt in range(5):
        try: target.write_bytes(text.encode('utf-8')); break
        except OSError:
            if attempt==4: raise
            time.sleep(1)
print('Added conversation-starting browser and hub regression coverage.')
