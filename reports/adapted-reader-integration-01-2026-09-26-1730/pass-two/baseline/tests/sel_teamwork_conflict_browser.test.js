import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_teamwork.js'), 'utf8');
const cases = JSON.parse(source.match(/var CONFLICT_PRACTICE = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-teamwork-conflict');
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
      const [data, setData] = R.useState({ teamwork: { soundEnabled: false, activeTab: 'conflicttool', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: prompt => { window.depthCoachCalls.push(prompt); return Promise.resolve('A mocked coach response.'); } };
      return window.SelHub._registry.teamwork.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Conflict Plan/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Conflict planning practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.teamwork.conflictDrafts?.[id], id);

describe('Conflict planning practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Conflict planning practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);



  const open = text => map().getByText(text,{exact:true}).click();
  const labels=['What I noticed and what I do not know','Needs, boundaries and support','Words I could use or ask for help saying','One next step and who can help','What I will check, and when'];

  it.each(examples)('$band / $item.id distinguishes support routes without claiming resolution or calling a provider',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a conflict practice context',{exact:true}).selectOption(item.id);expect(await map().innerText()).toContain(item.setups[band]);expect(await map().innerText()).toContain(item.notice);
    const route=map().getByLabel('A support route to consider',{exact:true});
    const routes=item.supportFirst?['pause','support','unsure']:['talk','pause','support','unsure'];
    for(const choice of routes){await route.selectOption(choice);await open('Consider this route in the example');expect(await map().innerText()).toContain(item[choice]||item.support);expect(await map().getByRole('status').innerText()).not.toBe('');}
    if(item.supportFirst)expect(await route.locator('option[value="talk"]').count()).toBe(0);
    await open('Build a plan (optional)');expect(await map().getByRole('textbox').count()).toBe(5);await open('Reconsider when something changes');expect(await map().innerText()).toContain(item.change);expect(await map().innerText()).toContain(item.adjust);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(await page.evaluate(()=>window.depthSnapshot.teamwork.conflictCount)).toBeUndefined();expect(await page.evaluate(()=>window.depthSnapshot.teamwork.practiceLog)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

  it('keeps five notes and editable routes independent across contexts, grades, navigation and restoration',async()=>{
    await mount();await open('Build a plan (optional)');for(const [i,label] of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Plan note '+i+'\nSecond line');await map().getByLabel('A support route to consider',{exact:true}).selectOption('talk');
    await map().getByLabel('Choose a conflict practice context',{exact:true}).selectOption('own');await open('Build a plan (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own observation');await map().getByLabel('A support route to consider',{exact:true}).selectOption('unsure');
    await page.evaluate(()=>window.depthSetBand('high'));await open('Build a plan (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Another grade');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);await mount('middle','light',1100,JSON.parse(JSON.stringify(saved)));expect(await map().getByLabel('Choose a conflict practice context',{exact:true}).inputValue()).toBe('own');
    await page.getByRole('tab',{name:/Retro/}).click();await page.getByRole('tab',{name:/Conflict Plan/}).click();await map().getByLabel('Choose a conflict practice context',{exact:true}).selectOption('ideas');await open('Build a plan (optional)');
    for(const [i,label] of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('Plan note '+i+'\nSecond line');
    const route=map().getByLabel('A support route to consider',{exact:true});expect(await route.inputValue()).toBe('talk');await route.selectOption('support');expect(await map().getByLabel(labels[2]+' (optional)',{exact:true}).inputValue()).toContain('Plan note');await route.selectOption('');expect((await draft('middle:ideas')).route).toBe('');
    await open('Review my possible next steps');const preview=map().getByLabel('Plan text to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('Plan note 0\nSecond line');expect(await preview.inputValue()).not.toContain('My own observation');expect(await preview.inputValue()).not.toContain('Another grade');expect(await preview.inputValue()).toContain('not evidence that the situation is resolved');expect((await draft('middle:own')).route).toBe('unsure');expect(errors).toEqual([]);
  },120000);

  it('does not restore direct-talk rehearsal in the pressure example, even from an older or edited draft',async()=>{
    await mount('middle','light',1100,{conflictSelections:{middle:'pressure'},conflictDrafts:{'middle:pressure':{route:'talk',words:'Earlier words',extra:'keep'}}});const route=map().getByLabel('A support route to consider',{exact:true});expect(await route.inputValue()).toBe('');expect(await route.locator('option[value="talk"]').count()).toBe(0);expect(await map().innerText()).toContain('This example calls for adult support.');expect(await map().getByText('Consider this route in the example',{exact:true}).count()).toBe(0);
    await open('Build a plan (optional)');expect(await map().getByLabel(labels[2]+' (optional)',{exact:true}).inputValue()).toBe('Earlier words');expect(await map().innerText()).toContain('A direct conversation is not required.');await route.selectOption('support');await open('Consider this route in the example');expect(await map().innerText()).toContain(cases[2].support);await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Ask a trusted adult for help.');expect((await draft('middle:pressure')).extra).toBe('keep');
    await open('Reconsider when something changes');expect(await map().innerText()).toContain('A joint meeting, apology or forgiveness is not a required first step.');expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('preserves old input, generated responses, loading flags, counts, history, reflections and awards as historical data',async()=>{
    const legacy={conflictInput:'Earlier problem',conflictResult:'Earlier generated advice',conflictLoading:true,conflictCount:3,conflictHistory:[{input:'Past input',result:'Past response',timestamp:123}],earnedBadges:{conflict_converter:123},reflectionNote:'Earlier reflection',practiceLog:[{type:'conflict_convert',id:'conflict_3',timestamp:123}]};
    await mount('middle','light',1100,legacy);await open('Earlier conflict-coach records');await open('Earlier record 1');for(const text of ['Earlier problem','Earlier generated advice','Past input','Past response'])expect(await map().innerText()).toContain(text);expect(await map().innerText()).toContain('not verified advice');
    await open('Build a plan (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('A new observation');const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();expect(await page.getByText('Earlier conflict-coach requests',{exact:true}).count()).toBe(1);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('handles malformed records and keeps keyboard route selection and disclosures usable',async()=>{
    await mount('middle','light',1100,{conflictSelections:{middle:'missing'},conflictDrafts:{'middle:ideas':{route:[],observations:42,extra:'keep'}},conflictHistory:[null,42,{input:42},{input:'Valid earlier input'}],conflictInput:{},conflictResult:[]});await open('Earlier conflict-coach records');await open('Earlier record 1');expect(await map().innerText()).toContain('Valid earlier input');
    const plan=map().getByText('Build a plan (optional)',{exact:true});await plan.focus();await page.keyboard.press('Enter');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Observed');expect((await draft('middle:ideas')).extra).toBe('keep');const route=map().getByLabel('A support route to consider',{exact:true});await route.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await route.inputValue()).toBe('talk');expect(await route.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('elementary','light',1100,{conflictSelections:[],conflictDrafts:[],conflictHistory:{bad:true}});await open('Build a plan (optional)');await map().getByLabel(labels[3]+' (optional)',{exact:true}).fill('Ask a teacher');expect((await draft('elementary:ideas')).next).toBe('Ask a teacher');expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable conflict planning at 320px in %s',async theme=>{
    await mount('high',theme,320,{conflictInput:'Earlier example'});await map().getByLabel('Choose a conflict practice context',{exact:true}).selectOption('pressure');await map().getByLabel('A support route to consider',{exact:true}).selectOption('support');await open('Consider this route in the example');await open('Build a plan (optional)');await open('Reconsider when something changes');await open('Review my possible next steps');await open('Earlier conflict-coach records');
    await map().getByLabel(labels[3]+' (optional)',{exact:true}).fill('Ask a trusted adult to help plan a supported next step.');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name] of [['Choose a supported next step','context'],['Consider this route in the example','route'],['Reconsider when something changes','review']]){await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
