from pathlib import Path
import time
root=Path.cwd()
base=(root/'tests/sel_teamwork_conflict_browser.test.js').read_text(encoding='utf-8')
prefix=base[:base.index('  it.each(examples)')]
prefix=prefix.replace('teamwork','friendship').replace('CONFLICT_PRACTICE','REPAIR_PRACTICE').replace('sel-teamwork-conflict','sel-friendship-repair').replace('sel-friendship-conflict','sel-friendship-repair').replace("activeTab: 'conflicttool'", "activeTab: 'repair'").replace('/Conflict Plan/','/Repair/').replace('Conflict planning practice','Friendship repair choices').replace('conflictDrafts','repairDrafts')
# Drop helpers belonging only to the prior suite, leaving this suite's own helpers below.
prefix=prefix[:prefix.index('  const open =')]
tests=r'''
  const open = text => map().getByText(text,{exact:true}).click();
  const labels = ['What happened, and what is uncertain?', 'What is mine to take responsibility for?', 'What boundary or support is needed?', 'What could I say or do next?', 'What would make me keep or change the plan?'];

  it.each(examples)('$band / $item.id explores words, limits and changed circumstances without forced disclosure', async ({band,item}) => {
    await mount(band);
    await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setup[band]);
    expect(await map().innerText()).toContain(item.notice);
    await open('Explore example words and their limits');
    expect(await map().innerText()).toContain(item.model[band]);
    expect(await map().innerText()).toContain(item.limit);
    const route = map().getByLabel('A next step to consider',{exact:true});
    expect(await route.locator('option[value="talk"]').count()).toBe(item.supportFirst ? 0 : 1);
    await route.selectOption('space');
    expect(await map().getByRole('status').innerText()).toContain('do not keep messaging');
    await route.selectOption('support');
    expect(await map().getByRole('status').innerText()).toContain('practical plan and a follow-up');
    await open('Revisit when something changes');
    expect(await map().innerText()).toContain(item.changed);
    expect(await map().innerText()).toContain(item.revisit);
    await open('Build my possible plan (optional)');
    for (const label of labels) expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('keeps notes independent across examples, grades and routes, including after remount', async()=>{
    await mount();
    await open('Build my possible plan (optional)');
    for (const [i,label] of labels.entries()) await map().getByLabel(label+' (optional)',{exact:true}).fill('My note '+i+'\nA second line');
    await map().getByLabel('A next step to consider',{exact:true}).selectOption('talk');
    await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption('own');
    expect(await map().getByText('Explore example words and their limits',{exact:true}).count()).toBe(0);
    await open('Build my possible plan (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own context');
    await page.evaluate(()=>window.depthSetBand('high'));
    await open('Build my possible plan (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Another grade');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a repair practice context',{exact:true}).inputValue()).toBe('own');
    await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption('plans');
    await map().getByLabel('A next step to consider',{exact:true}).selectOption('space');
    await open('Build my possible plan (optional)');
    for (const [i,label] of labels.entries()) expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('My note '+i+'\nA second line');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);
    await mount('middle','light',1100,saved);
    expect(await map().getByLabel('A next step to consider',{exact:true}).inputValue()).toBe('space');
    await open('Review my plan text');
    const preview=map().getByLabel('Plan text to review or copy',{exact:true});
    expect(await preview.getAttribute('readonly')).not.toBeNull();
    expect(await preview.inputValue()).toContain('My note 4\nA second line');
    expect(await preview.inputValue()).not.toContain('My own context');
    expect(await preview.inputValue()).not.toContain('Another grade');
    expect(await preview.inputValue()).toContain('not proof of reconciliation');
    expect(errors).toEqual([]);
  },120000);

  it('preserves previous activity data and rejects a saved direct-talk route in the pressure example',async()=>{
    const legacy={repairIdx:4,coachInput:'Earlier question',coachHistory:[{role:'user',text:'Earlier note'}],digitalDone:{old:true},friendNotes:[{text:'Earlier journal'}],repairDrafts:{'middle:pressure':{route:'talk',action:'Earlier words',extra:'keep'}}};
    await mount('middle','light',1100,{...legacy,repairSelections:{middle:'pressure'}});
    expect(await map().getByLabel('A next step to consider',{exact:true}).inputValue()).toBe('');
    expect(await map().getByLabel('A next step to consider',{exact:true}).locator('option[value="talk"]').count()).toBe(0);
    await open('Build my possible plan (optional)');
    expect(await map().getByLabel(labels[3]+' (optional)',{exact:true}).inputValue()).toBe('Earlier words');
    await map().getByLabel(labels[3]+' (optional)',{exact:true}).fill('Ask for support');
    expect((await draft('middle:pressure')).extra).toBe('keep');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);
    for(const key of ['repairIdx','coachInput','coachHistory','digitalDone','friendNotes'])expect(saved[key]).toEqual(legacy[key]);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('recovers malformed drafts and supports keyboard disclosures and route selection',async()=>{
    await mount('middle','light',1100,{repairSelections:{middle:'missing'},repairDrafts:{'middle:plans':{observations:42,route:[],extra:'keep'}}});
    const summary=map().getByText('Build my possible plan (optional)',{exact:true});
    await summary.focus();await page.keyboard.press('Enter');
    const note=map().getByLabel(labels[0]+' (optional)',{exact:true});expect(await note.inputValue()).toBe('');await note.fill('Observed');
    expect((await draft('middle:plans')).extra).toBe('keep');
    const route=map().getByLabel('A next step to consider',{exact:true});await route.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await route.inputValue()).toBe('talk');expect(await route.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('unexpected','light',1100,{repairSelections:[],repairDrafts:[]});await open('Build my possible plan (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Recovered');expect((await draft('middle:plans')).observations).toBe('Recovered');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps the repair activity readable and accessible at 320px in %s',async theme=>{
    await mount('high',theme,320);await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption('privacy');
    await map().getByLabel('A next step to consider',{exact:true}).selectOption('space');
    for(const title of ['Explore example words and their limits','Build my possible plan (optional)','Revisit when something changes','Review my plan text'])await open(title);
    await map().getByLabel(labels[3]+' (optional)',{exact:true}).fill('Respect the no-contact request. Stop forwarding the message.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name] of [['Repair, boundaries and next steps','context'],['Explore example words and their limits','example'],['Revisit when something changes','review']]){
      await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});
    }
    expect(errors).toEqual([]);
  },120000);
});
'''
hubtest=r'''
  it('friendship repair notes and boundaries survive the real hub return flow',async()=>{
    await mount();await page.locator('[data-sel-tool-card-id="friendship"]').click();await page.getByRole('tab',{name:/Repair/}).click();
    const activity=page.getByRole('region',{name:'Friendship repair choices',exact:true});
    await activity.getByLabel('Choose a repair practice context',{exact:true}).selectOption('privacy');
    await activity.getByLabel('A next step to consider',{exact:true}).selectOption('space');
    await activity.getByText('Build my possible plan (optional)',{exact:true}).click();
    await activity.getByLabel('What could I say or do next? (optional)',{exact:true}).fill('Respect their request for space.');
    const support=page.locator('details[aria-label="Practice support"]');await support.locator(':scope > summary').click();await support.getByRole('button',{name:'Return to activities',exact:true}).click();
    await page.locator('[data-sel-tool-card-id="friendship"]').click();
    expect(await activity.getByLabel('Choose a repair practice context',{exact:true}).inputValue()).toBe('privacy');
    expect(await activity.getByLabel('A next step to consider',{exact:true}).inputValue()).toBe('space');
    await activity.getByText('Build my possible plan (optional)',{exact:true}).click();
    expect(await activity.getByLabel('What could I say or do next? (optional)',{exact:true}).inputValue()).toBe('Respect their request for space.');
    expect(await page.evaluate(()=>window.__alloflowSelToolData.friendship.repairIdx)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

'''
hub=root/'tests/sel_hub_review_browser.test.js'
content=hub.read_text(encoding='utf-8')
marker='  const learningGuides'
assert marker in content
for target,value in [(root/'tests/sel_friendship_repair_browser.test.js',prefix+tests),(hub,content.replace(marker,hubtest+marker,1))]:
  for attempt in range(5):
    try: target.write_bytes(value.encode('utf-8')); break
    except OSError:
      if attempt==4: raise
      time.sleep(1)
print('Added focused repair and real-hub browser coverage.')
