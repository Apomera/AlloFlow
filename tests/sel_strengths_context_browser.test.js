import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_strengths.js'), 'utf8');
const cases = JSON.parse(source.match(/var STRENGTH_CASES = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band=>cases.map(item=>({band,id:item.id,item})));
const reports = path.join(root, 'reports/sel-strengths-context');
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
    window.speechCalls = []; window.coachFlags = []; window.coachMode = 'ok'; window.depthXP = []; window.depthAnnouncements = []; window.depthCoachCalls = [];
    function App() {
      const [data, setData] = R.useState({ strengths: { tab: 'scenarios', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, setToolData: setData, gradeLevel: {elementary:'4',middle:'7',high:'11'}[gradeBand] || '7',
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        callTTS: text=>{window.speechCalls.push(text);return Promise.resolve(null);}, onSafetyFlag: flag => window.coachFlags.push(flag), addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: initial.offline ? null : prompt => { window.depthCoachCalls.push(prompt); if(window.coachMode==='throw')throw new Error('Mock failure'); if(window.coachMode==='reject')return Promise.reject(new Error('Mock failure')); if(window.coachMode==='empty')return Promise.resolve('  '); if(window.coachMode==='pending')return new Promise(resolve=>{window.resolveCoach=resolve;}); return Promise.resolve('A mocked coach response.'); } };
      return window.SelHub._registry.strengths.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Scenarios/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Strengths in context practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.careDrafts?.[id], id);

describe('Strengths in context practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Ways to care practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);









  const select=()=>map().getByLabel('Choose a strengths context',{exact:true});
  const state=()=>page.evaluate(()=>window.depthSnapshot.strengths);
  const open=text=>map().getByText(text,{exact:true}).click();
  const labels=['What do I notice, and what do I still need to ask?','What support, access or boundaries matter here?','What might I try, combine, adapt or pause?','What would tell me to keep or change the plan?'];

  it.each(examples)('$band / $id compares possible strengths, limits and changed circumstances without scoring',async({band,id,item})=>{
    await mount(band);await select().selectOption(id);expect(await map().innerText()).toContain(item.setup[band]);expect(await map().innerText()).toContain(item.question);await open('Compare possible approaches');for(const option of item.options){for(const text of [option.title,option.skill,option.when,option.limit,option.words[band]])expect(await map().innerText()).toContain(text);}await open('Reconsider when something changes');expect(await map().innerText()).toContain(item.changed);expect(await map().innerText()).toContain(item.review);const saved=await state();expect(saved.scenariosDone).toBeUndefined();expect(saved.topScenarios).toBeUndefined();expect(saved.selectedStrengths).toBeUndefined();expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('keeps independent context and grade notes, including an own example and a scoped preview',async()=>{
    await mount();await open('Consider my own response (optional)');for(const [i,label]of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Practice '+i+'\nAnother line'.replace('\\n','\n'));await select().selectOption('welcome');await open('Consider my own response (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await select().selectOption('own');expect(await map().getByText('Compare possible approaches',{exact:true}).count()).toBe(0);await open('Consider my own response (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own example');await page.evaluate(()=>window.depthSetBand('high'));await open('Consider my own response (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Other grade');await page.evaluate(()=>window.depthSetBand('middle'));expect(await select().inputValue()).toBe('own');await select().selectOption('effort');const saved=await state();await mount('middle','light',1100,saved);await open('Review my practice notes');const preview=map().getByLabel('Notes to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('Practice 3');expect(await preview.inputValue()).not.toContain('My own example');expect(await preview.inputValue()).not.toContain('Other grade');expect(errors).toEqual([]);
  },120000);

  it('preserves earlier choices, completion records, selected strengths and earned awards',async()=>{
    const legacy={scenarioIdx:2,scenarioChoice:{idx:1,choice:{text:'An earlier response',rating:2,strength:'brave'}},scenariosDone:['sc1'],topScenarios:1,selectedStrengths:[{id:'kind',label:'Kindness',category:'character'}],badges:{firstScenario:true,firstCard:true},reflections:[{text:'Earlier note'}]};legacy.badges.firstReflection=true;
    await mount('middle','light',1100,legacy);await open('Earlier scenario activity');expect(await map().innerText()).toContain('Earlier choice: An earlier response');await select().selectOption('harm');await open('Consider my own response (optional)');await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Seek support');const saved=await state();for(const [key,value]of Object.entries(legacy))expect(saved[key]).toEqual(value);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('guards malformed new records, keeps unknown draft properties and supports keyboard navigation',async()=>{
    await mount('middle','light',1100,{contextSelections:{middle:'__proto__'},contextDrafts:{'middle:effort':{notice:42,action:[],extra:'keep'}},scenarioChoice:{choice:{text:{bad:true}}}});expect(await select().inputValue()).toBe('effort');const summary=map().getByText('Consider my own response (optional)',{exact:true});await summary.focus();await page.keyboard.press('Enter');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('A useful observation');expect((await state()).contextDrafts['middle:effort'].extra).toBe('keep');await select().focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');expect(await select().inputValue()).toBe('welcome');await mount('middle','light',1100,{contextSelections:[],contextDrafts:[]});await open('Consider my own response (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Recovered');expect((await state()).contextDrafts['middle:effort'].notice).toBe('Recovered');expect(errors).toEqual([]);
  },120000);

  it('reads only the selected fictional scene aloud and never sends reflection notes to the coach',async()=>{
    await mount();await select().selectOption('harm');await open('Consider my own response (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('PRIVATE_NOTE');await map().getByRole('button',{name:'Read this strengths scenario aloud',exact:true}).click();expect(await page.evaluate(()=>window.speechCalls)).toEqual([cases.find(c=>c.id==='harm').setup.middle]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps context comparisons and notes readable at 320px in %s',async theme=>{
    await mount('high',theme,320);await select().selectOption('harm');for(const title of ['Compare possible approaches','Reconsider when something changes','Consider my own response (optional)','Review my practice notes'])await open(title);await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('Trusted support and a way to step away.');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);expect(await map().locator('select:visible,button:visible,summary:visible,textarea:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44))).toBe(true);for(const [text,name]of [['Explore strengths in context','context'],['Compare possible approaches','comparison'],['Consider my own response (optional)','notes']]){await map().getByText(text,{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
