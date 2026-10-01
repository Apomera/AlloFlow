import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_decisions.js'), 'utf8');
const caseData = JSON.parse(source.match(/var MORAL_REASONING_CASES = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-decision-lenses');
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
      const [data, setData] = R.useState({ decisions: { soundEnabled: false, activeTab: 'compass', ...initial } });
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
  await page.getByRole('tab', { name: /Moral reasoning/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Moral reasoning practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.decisions.compassDrafts?.[id], id);

describe('Decision moral reasoning lenses', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Moral reasoning practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id supports four lenses and reconsideration without scoring',async({band,item})=>{
    await mount(band);
    await map().getByLabel('Choose a moral reasoning case',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.situation);
    await map().getByText('Consider possible routes',{exact:true}).click();
    expect(await map().innerText()).toContain(item.options);
    for(const [key,label] of Object.entries({outcomes:'Possible outcomes',rights:'Rights and fairness',care:'Care and relationships',commitments:'Commitments and integrity'})) {
      await map().getByText(label,{exact:true}).click();
      expect(await map().innerText()).toContain(item.lenses[key]);
    }
    const reveal=map().getByRole('button',{name:'Explore a changed condition',exact:true});
    await reveal.focus();await page.keyboard.press('Enter');
    expect(await reveal.getAttribute('aria-expanded')).toBe('true');
    expect(await reveal.evaluate(node=>node===document.activeElement)).toBe(true);
    expect(await map().innerText()).toContain(item.change);
    await map().getByText('Compare one possible response',{exact:true}).click();
    expect(await map().innerText()).toContain(item.model);
    expect(await draft(band+':'+item.id)).toEqual({changeSeen:true});
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.decisions.mcDone)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthSnapshot.decisions.practiceLog)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('retains independent notes across cases, grade changes, navigation and serialized restoration',async()=>{
    await mount();
    await map().getByLabel('My starting thought and reason (optional)',{exact:true}).fill('Keep the boundary.\nTry another image.');
    await map().getByText('Rights and fairness',{exact:true}).click();
    await map().getByLabel('Rights and fairness note (optional)',{exact:true}).fill('A majority vote is not permission.');
    await map().getByRole('button',{name:'Explore a changed condition',exact:true}).click();
    await map().getByLabel('What I would keep or change, and why (optional)',{exact:true}).fill('The alternative makes the change practical.');
    await map().getByLabel('Choose a moral reasoning case',{exact:true}).selectOption('deadline');
    expect(await map().getByLabel('My starting thought and reason (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('A next step and review point (optional)',{exact:true}).fill('Ask the teacher about the notes.');
    await page.evaluate(()=>window.depthSetBand('high'));
    await map().getByLabel('Choose a moral reasoning case',{exact:true}).selectOption('sponsor');
    await map().getByLabel('What I would need to check (optional)',{exact:true}).fill('Clarify the revised terms.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a moral reasoning case',{exact:true}).inputValue()).toBe('deadline');
    const saved=await page.evaluate(()=>window.depthSnapshot.decisions);
    await mount('middle','light',1100,saved);
    await page.getByRole('tab',{name:/Consequence/}).click();
    await page.getByRole('tab',{name:/Moral reasoning/}).click();
    await map().getByLabel('Choose a moral reasoning case',{exact:true}).selectOption('photo');
    expect(await map().getByLabel('My starting thought and reason (optional)',{exact:true}).inputValue()).toContain('Keep the boundary.\nTry another image.');
    expect(await map().getByLabel('What I would keep or change, and why (optional)',{exact:true}).inputValue()).toContain('alternative');
    expect((await draft('middle:photo')).rights).toContain('majority');
    expect((await draft('middle:deadline')).review).toContain('teacher');
    expect((await draft('high:sponsor')).unknown).toContain('terms');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('preserves historical quiz data and badges without showing a profile or submitting AI requests',async()=>{
    const legacy={mcAnswers:{mc1:'agree',mc13:'sometimes'},mcDone:true,mcAiResp:'Earlier generated text',earnedBadges:{compass_done:123,compass_balanced:124},practiceLog:[{type:'compass',id:'assessment',timestamp:123}],csCompleted:4};
    await mount('middle','light',1100,legacy);
    await map().getByText('Earlier quiz records',{exact:true}).click();
    expect(await map().innerText()).toContain('Earlier response: It depends');
    expect(await map().getByRole('progressbar').count()).toBe(0);
    expect(await map().getByRole('button',{name:/Reveal My|Personalized|Retake/}).count()).toBe(0);
    await map().getByLabel('What I would need to check (optional)',{exact:true}).fill('A new note');
    const saved=await page.evaluate(()=>window.depthSnapshot.decisions);
    for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('recovers malformed saved values and keeps selection focus while preserving unknown note fields',async()=>{
    await mount('middle','light',1100,{compassSelections:{middle:'missing'},compassDrafts:{'middle:photo':{initial:[],unknown:42,extra:'Keep me'}}});
    expect(await map().getByLabel('My starting thought and reason (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('What I would need to check (optional)',{exact:true}).fill('Use a private check-in');
    expect((await draft('middle:photo')).extra).toBe('Keep me');
    const select=map().getByLabel('Choose a moral reasoning case',{exact:true});
    await select.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await select.inputValue()).toBe('deadline');
    expect(await select.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('middle','light',1100,{compassSelections:[],compassDrafts:[]});
    await map().getByLabel('A next step and review point (optional)',{exact:true}).fill('Ask for support');
    expect((await draft('middle:photo')).review).toBe('Ask for support');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('provides readable phone reasoning and labeled notes in %s',async theme=>{
    await mount('high',theme,320);
    await map().getByText('Rights and fairness',{exact:true}).click();
    await map().getByRole('button',{name:'Explore a changed condition',exact:true}).click();
    await map().getByText('Compare one possible response',{exact:true}).click();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));
    expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-case-phone.png')});
    await map().getByText('Rights and fairness',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-lens-phone.png')});
    await map().getByRole('button',{name:'Explore a changed condition',exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
