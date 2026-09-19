import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const cases = JSON.parse(source.match(/var KEEPING_PRACTICE = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-friendship-keeping');
let browser, page;
let errors = [];
async function mount(band = 'middle', theme = 'light', width = 1100, initial = {}) {
  errors = [];
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://sel-depth.test/');
  await page.addStyleTag({ content: 'html,body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}button,select,summary,textarea{font-family:inherit}button:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}' });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ content: source });
  await page.evaluate(({ band, theme, initial }) => {
    const R = window.React, noop = () => {}, Icon = () => null;
    window.depthXP = []; window.depthAnnouncements = []; window.depthCoachCalls = [];
    function App() {
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, activeTab: 'keep', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: prompt => { window.depthCoachCalls.push(prompt); return Promise.resolve('A mocked coach response.'); } };
      return window.SelHub._registry.friendship.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Keeping/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Keeping friendship practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.keepingDrafts?.[id], id);

describe('Keeping friendship practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Keeping friendship practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);






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
