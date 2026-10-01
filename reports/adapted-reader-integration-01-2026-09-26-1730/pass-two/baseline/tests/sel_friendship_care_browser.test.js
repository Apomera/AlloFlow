import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const cases = JSON.parse(source.match(/var CARE_PRACTICES = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-friendship-care');
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
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, activeTab: 'compass', ...initial } });
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
  await page.getByRole('tab', { name: /Ways to Care/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Ways to care practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.careDrafts?.[id], id);

describe('Ways to care practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Ways to care practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);






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
