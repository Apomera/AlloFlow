import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const cases = JSON.parse(source.match(/var STARTERS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(cases).flatMap(([band,items])=>items.map(item=>({band,item})));
const reports = path.join(root, 'reports/sel-friendship-starting');
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
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, activeTab: 'start', ...initial } });
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
  await page.getByRole('tab', { name: /Starting/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Starting friendship practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.starterDrafts?.[id], id);

describe('Starting friendship practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Starting friendship practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);






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
