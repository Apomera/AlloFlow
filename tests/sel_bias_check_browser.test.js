import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_decisions.js'), 'utf8');
const caseData = JSON.parse(source.match(/var BIAS_DATA = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-bias-check');
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
      const [data, setData] = R.useState({ decisions: { soundEnabled: false, activeTab: 'bias', ...initial } });
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
  await page.getByRole('tab', { name: /Bias Check/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Bias evidence practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.decisions.biasDrafts?.[id], id);

describe('Decision bias evidence checks', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Bias evidence practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id exposes the example, check and limits without scores or compulsory notes',async({band,item})=>{
    await mount(band);
    const selector=map().getByLabel('Choose a thinking pattern',{exact:true});
    await selector.selectOption(item.id);
    for(const key of ['simple','name','desc','example'])expect(await map().innerText()).toContain(item[key]);
    const approach=map().getByText('Compare a checking approach',{exact:true});
    await approach.focus();await page.keyboard.press('Enter');
    for(const key of ['question','antidote','limits'])expect(await map().innerText()).toContain(item[key]);
    expect(await approach.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByText('Build an evidence check (optional)',{exact:true}).click();
    expect(await map().getByRole('textbox').count()).toBe(5);
    expect(await draft(band+':'+item.id)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.decisions.biasViewed)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthSnapshot.decisions.practiceLog)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('keeps all five notes separate by pattern and grade through serialized restoration and navigation',async()=>{
    await mount();
    const notes=()=>map().getByText('Build an evidence check (optional)',{exact:true});
    await notes().click();
    const fields={'What we know':'A reader could not find the time.','A working thought':'The poster may need revision.\nCheck the layout.','Another possible explanation':'The text may be too small.','A useful check or support':'Ask a willing reader to locate the time.','What I would keep or change':'Revise if the time is still hard to find.'};
    for(const [label,value] of Object.entries(fields))await map().getByLabel(label+' (optional)',{exact:true}).fill(value);
    await map().getByLabel('Choose a thinking pattern',{exact:true}).selectOption('b8');
    await notes().click();
    expect(await map().getByLabel('A working thought (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('A working thought (optional)',{exact:true}).fill('Compare future costs.');
    await page.evaluate(()=>window.depthSetBand('high'));
    await map().getByLabel('Choose a thinking pattern',{exact:true}).selectOption('b15');
    await notes().click();
    await map().getByLabel('A useful check or support (optional)',{exact:true}).fill('Test known inputs.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a thinking pattern',{exact:true}).inputValue()).toBe('b8');
    const saved=await page.evaluate(()=>window.depthSnapshot.decisions);
    await mount('middle','light',1100,saved);
    await page.getByRole('tab',{name:/Consequence/}).click();await page.getByRole('tab',{name:/Bias Check/}).click();
    await map().getByLabel('Choose a thinking pattern',{exact:true}).selectOption('b7');
    await notes().click();
    for(const [label,value] of Object.entries(fields))expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe(value);
    expect((await draft('middle:b8')).interpretation).toContain('future costs');
    expect((await draft('high:b15')).check).toContain('known inputs');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('copies an earlier reflection only into an empty working thought and preserves historical records',async()=>{
    const legacy={biasIdx:1,biasViewed:9,biasRevealed:true,biasReflection:'Earlier reflection\nKeep the original.',earnedBadges:{first_bias:123,bias_all:124},practiceLog:[{type:'bias',id:'b8',timestamp:123}]};
    await mount('middle','light',1100,legacy);
    expect(await map().getByLabel('Choose a thinking pattern',{exact:true}).inputValue()).toBe('b8');
    await map().getByText('Earlier Bias Check reflection',{exact:true}).click();
    const copy=map().getByRole('button',{name:'Copy earlier reflection into this working thought',exact:true});
    await copy.click();expect(await copy.isDisabled()).toBe(true);
    await page.waitForFunction(()=>document.activeElement?.id==='dec-bias-note-interpretation');
    expect(await page.evaluate(()=>window.depthAnnouncements)).toContain('Earlier reflection copied into the working thought. The original is unchanged.');
    const thought=map().getByLabel('A working thought (optional)',{exact:true});
    expect(await thought.inputValue()).toBe(legacy.biasReflection);
    await thought.fill('Keep my edited thought');expect(await copy.isDisabled()).toBe(true);
    const saved=await page.evaluate(()=>window.depthSnapshot.decisions);
    for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('recovers malformed saved state, keeps unknown fields and supports keyboard selection',async()=>{
    await mount('middle','light',1100,{biasIdx:-3,biasSelections:{middle:'missing'},biasDrafts:{'middle:b7':{interpretation:[],facts:42,extra:'Retain'}}});
    await map().getByText('Build an evidence check (optional)',{exact:true}).click();
    expect(await map().getByLabel('A working thought (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('What we know (optional)',{exact:true}).fill('An observation');
    expect((await draft('middle:b7')).extra).toBe('Retain');
    const selector=map().getByLabel('Choose a thinking pattern',{exact:true});await selector.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await selector.inputValue()).toBe('b8');expect(await selector.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('middle','light',1100,{biasIdx:'bad',biasSelections:[],biasDrafts:[],biasReflection:{}});
    await map().getByText('Build an evidence check (optional)',{exact:true}).click();
    await map().getByLabel('What we know (optional)',{exact:true}).fill('A fresh note');
    expect((await draft('middle:b7')).facts).toBe('A fresh note');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable evidence work and labeled controls at 320px in %s',async theme=>{
    await mount('high',theme,320,{biasReflection:'An earlier note'});
    await map().getByLabel('Choose a thinking pattern',{exact:true}).selectOption('b15');
    await map().getByText('Compare a checking approach',{exact:true}).click();
    await map().getByText('Build an evidence check (optional)',{exact:true}).click();
    await map().getByText('Earlier Bias Check reflection',{exact:true}).click();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-example-phone.png')});
    await map().getByText('Compare a checking approach',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-approach-phone.png')});
    await map().getByText('Build an evidence check (optional)',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-notes-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
