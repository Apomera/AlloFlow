import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_decisions.js'), 'utf8');
const contexts = Function('return ' + source.match(/var VALUES_SORT = (\{[\s\S]*?\n  \});/)[1])();
const practice = JSON.parse(source.match(/var VALUES_PRACTICE = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(contexts).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-values-context');
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
    window.depthXP = []; window.depthAnnouncements = [];
    function App() {
      const [data, setData] = R.useState({ decisions: { soundEnabled: false, activeTab: 'values', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.decisions.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Values Sort/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Values in context practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.decisions.valuesDrafts?.[id], id);

describe('Decision contextual values practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Values in context practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id offers a situation, flexible priorities, a change and a response without rewards',async({band,item})=>{
    await mount(band);
    await map().getByLabel('Choose a values context',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(practice[item.id].situation);
    const optional=map().getByText('Map what matters (optional)',{exact:true});
    await optional.focus();await page.keyboard.press('Enter');
    expect(await optional.evaluate(node=>node===document.activeElement)).toBe(true);
    for(const value of item.values)expect(await map().getByLabel(value+' — role in this situation',{exact:true}).inputValue()).toBe('');
    expect(await map().getByRole('textbox').count()).toBe(5);
    await map().getByText('Explore the tension and a change',{exact:true}).click();
    expect(await map().getByRole('textbox').count()).toBe(6);
    await map().getByText('Compare one possible response',{exact:true}).click();
    for(const key of ['tension','change','model'])expect(await map().innerText()).toContain(practice[item.id][key]);
    expect(await draft(band+':'+item.id)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.decisions.vsCompleted)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthSnapshot.decisions.practiceLog)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('keeps equal priorities, undecided values and all notes separate through context, grade, navigation and restoration',async()=>{
    await mount();
    const open=()=>map().getByText('Map what matters (optional)',{exact:true}).click();
    await open();
    for(const value of ['honesty','boundaries'])await map().getByLabel(value+' — role in this situation',{exact:true}).selectOption('protect');
    await map().getByLabel('vulnerability — role in this situation',{exact:true}).selectOption('less');
    await map().getByLabel('forgiveness — role in this situation',{exact:true}).selectOption('support');
    const fields={'The situation I am considering':'A fictional missed message.','What these words mean here':'Honesty can include a boundary.','What fits together or pulls apart':'Confirm plans without a family detail.','A boundary or support to protect':'Personal information stays private.','A possible next step and reason':'Confirm the plan.\nAsk what time works.'};
    for(const [label,value] of Object.entries(fields))await map().getByLabel(label+' (optional)',{exact:true}).fill(value);
    await map().getByText('Explore the tension and a change',{exact:true}).click();
    await map().getByLabel('What I would keep or change, and why (optional)',{exact:true}).fill('Keep the boundary; check the plan.');
    await map().getByLabel('Choose a values context',{exact:true}).selectOption('vs9');await open();
    expect(await map().getByLabel('privacy — role in this situation',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('consent — role in this situation',{exact:true}).selectOption('protect');
    await map().getByLabel('A possible next step and reason (optional)',{exact:true}).fill('Choose the scenery.');
    await page.evaluate(()=>window.depthSetBand('high'));await open();
    await map().getByLabel('A boundary or support to protect (optional)',{exact:true}).fill('Account for transport.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a values context',{exact:true}).inputValue()).toBe('vs9');
    const saved=await page.evaluate(()=>window.depthSnapshot.decisions);
    await mount('middle','light',1100,saved);
    await page.getByRole('tab',{name:/Consequence/}).click();await page.getByRole('tab',{name:/Values Sort/}).click();
    await map().getByLabel('Choose a values context',{exact:true}).selectOption('vs7');await open();
    for(const [label,value] of Object.entries(fields))expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe(value);
    for(const value of ['honesty','boundaries'])expect(await map().getByLabel(value+' — role in this situation',{exact:true}).inputValue()).toBe('protect');
    expect(await map().getByLabel('consistency — role in this situation',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('vulnerability — role in this situation',{exact:true}).selectOption('');
    expect((await draft('middle:vs7')).priorities.vulnerability).toBe('');
    expect((await draft('middle:vs7')).review).toContain('Keep the boundary');
    expect((await draft('middle:vs9')).action).toBe('Choose the scenery.');
    expect((await draft('high:vs13')).boundary).toContain('transport');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('keeps earlier rankings, counters and badges as historical data without assigning new priorities',async()=>{
    const legacy={vsIdx:2,vsRanking:['privacy','consent','kindness','authenticity','self-expression','mental health'],vsSaved:true,vsCompleted:5,earnedBadges:{first_sort:123,sort_3:124},practiceLog:[{type:'values',id:'vs9',timestamp:123}]};
    await mount('middle','light',1100,legacy);
    expect(await map().getByLabel('Choose a values context',{exact:true}).inputValue()).toBe('vs9');
    await map().getByText('Earlier values ranking',{exact:true}).click();
    expect(await map().getByRole('listitem').allTextContents()).toEqual(legacy.vsRanking);
    await map().getByText('Map what matters (optional)',{exact:true}).click();
    expect(await map().getByLabel('privacy — role in this situation',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('privacy — role in this situation',{exact:true}).selectOption('protect');
    await map().getByLabel('Choose a values context',{exact:true}).selectOption('vs7');
    const saved=await page.evaluate(()=>window.depthSnapshot.decisions);
    for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();
    expect(await page.getByText('Earlier values sorts',{exact:true}).count()).toBe(1);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('recovers malformed state, retains unknown fields and keeps keyboard selection focused',async()=>{
    await mount('middle','light',1100,{vsIdx:-5,vsRanking:{},valuesSelections:{middle:'missing'},valuesDrafts:{'middle:vs7':{context:42,priorities:{honesty:'invalid',extra:'keep'},extra:'retain'}}});
    await map().getByText('Map what matters (optional)',{exact:true}).click();
    expect(await map().getByLabel('The situation I am considering (optional)',{exact:true}).inputValue()).toBe('');
    expect(await map().getByLabel('honesty — role in this situation',{exact:true}).inputValue()).toBe('');
    const select=map().getByLabel('honesty — role in this situation',{exact:true});
    await select.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await select.inputValue()).toBe('protect');expect(await select.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByLabel('The situation I am considering (optional)',{exact:true}).fill('A fictional plan');
    expect((await draft('middle:vs7')).extra).toBe('retain');expect((await draft('middle:vs7')).priorities.extra).toBe('keep');
    const chooser=map().getByLabel('Choose a values context',{exact:true});await chooser.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await chooser.inputValue()).toBe('vs8');expect(await chooser.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('elementary','light',1100,{vsIdx:'bad',valuesSelections:[],valuesDrafts:[],vsRanking:[null,3]});
    await map().getByText('Map what matters (optional)',{exact:true}).click();
    await map().getByLabel('honesty — role in this situation',{exact:true}).selectOption('support');
    expect((await draft('elementary:vs1')).priorities.honesty).toBe('support');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable values work and labeled controls at 320px in %s',async theme=>{
    await mount('high',theme,320,{vsRanking:['safety','community']});
    await map().getByLabel('Choose a values context',{exact:true}).selectOption('vs18c');
    for(const text of ['Map what matters (optional)','Explore the tension and a change','Compare one possible response','Earlier values ranking'])await map().getByText(text,{exact:true}).click();
    await map().getByLabel('conviction — role in this situation',{exact:true}).selectOption('protect');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-case-phone.png')});
    await map().getByLabel('conviction — role in this situation',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-priorities-phone.png')});
    await map().getByText('Explore the tension and a change',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
