import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_upstander.js'), 'utf8');
const caseData = JSON.parse(source.match(/var ROLES = (\{[\s\S]*?\n\});/)[1]);
const strategies = JSON.parse(source.match(/var CYCLE_BREAKERS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-upstander-foundations');
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
      const [data, setData] = R.useState({ upstander: { soundOn: false, activeTab: 'roles', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.upstander.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Practice/ }).waitFor();
}
const names = { roles: 'Role, behavior and support', cycle: 'Shared responsibility for stopping harm' };
const pickers = { roles: 'Choose a role example', cycle: 'Choose a shared-responsibility example' };
const labels = ['What can you notice, and what is still unknown? (optional)', 'Who can help, and what responsibility belongs to them? (optional)', 'What would show that support needs to change? (optional)'];
const map = kind => page.getByRole('region', { name: names[kind], exact: true });
async function expand(kind) {
  for (const label of ['2. Separate choices and responsibilities', '3. Check support and follow-through']) {
    const summary = map(kind).getByText(label, { exact: true });
    if (!(await summary.evaluate(node => node.parentElement.open))) await summary.click();
  }
}

describe('Upstander foundations depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Upstander support practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id separates observation, uncertainty and responsibilities', async ({band,item}) => {
    await mount(band);
    await map('roles').getByLabel(pickers.roles,{exact:true}).selectOption(item.id);
    await expand('roles');
    for (const key of ['scenario','notice','unknown','learner','adult','boundary','check']) expect(await map('roles').innerText()).toContain(item[key]);
    await map('roles').getByLabel(labels[0],{exact:true}).fill('Notice behavior; ask about support.');
    expect(await page.evaluate(key=>window.depthSnapshot.upstander.rolesCoreNotes[key].notice,band+':'+item.id)).toContain('Notice behavior');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it.each(Object.keys(strategies))('provides all shared-responsibility examples for %s', async band => {
    await mount(band,'light',1100,{activeTab:'cycle'});
    for(const item of strategies[band]) {
      await map('cycle').getByLabel(pickers.cycle,{exact:true}).selectOption(item.id);
      await expand('cycle');
      for(const key of ['scenario','notice','unknown','learner','adult','boundary','check']) expect(await map('cycle').innerText()).toContain(item[key]);
    }
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it.each(['roles','cycle'])('keeps %s notes independent through selection, band and serialized restoration',async kind=>{
    const data=kind==='roles'?caseData:strategies;
    await mount('middle','light',1100,{activeTab:kind});
    await expand(kind);
    for(const [index,label] of labels.entries()) await map(kind).getByLabel(label,{exact:true}).fill('Middle note '+index+'\nA separate line.');
    await map(kind).getByLabel(pickers[kind],{exact:true}).selectOption(data.middle[1].id);
    expect(await map(kind).getByLabel(labels[0],{exact:true}).inputValue()).toBe('');
    await map(kind).getByLabel(labels[0],{exact:true}).fill('Second example.');
    await page.evaluate(()=>window.depthSetBand('elementary'));
    await map(kind).getByLabel(labels[0],{exact:true}).fill('Elementary note.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map(kind).getByLabel(pickers[kind],{exact:true}).inputValue()).toBe(data.middle[1].id);
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(window.depthSnapshot.upstander)));
    await mount('middle','light',1100,saved);
    expect(await map(kind).getByLabel(labels[0],{exact:true}).inputValue()).toBe('Second example.');
    await map(kind).getByLabel(pickers[kind],{exact:true}).selectOption(data.middle[0].id);
    await expand(kind);
    for(const [index,label] of labels.entries()) expect(await map(kind).getByLabel(label,{exact:true}).inputValue()).toBe('Middle note '+index+'\nA separate line.');
    await page.evaluate(()=>window.depthSetBand('elementary'));
    expect(await map(kind).getByLabel(labels[0],{exact:true}).inputValue()).toBe('Elementary note.');
    expect(errors).toEqual([]);
  },120000);

  it('recovers unassigned legacy notes only on request without overwriting current notes or classifying old answers',async()=>{
    const initial={roleIdx:1,roleReflect:{bully:'Earlier text.\nKept intact.'},scAnswers:{0:'bully'},scShowResults:true,earnedBadges:{old:{ts:123}}};
    await mount('middle','light',1100,initial);
    expect(await map('roles').getByLabel(pickers.roles,{exact:true}).inputValue()).toBe('bully');
    const note=map('roles').getByLabel(labels[0],{exact:true});
    expect(await note.inputValue()).toBe('');
    await map('roles').getByText('Earlier reflection: grade band unassigned',{exact:true}).click();
    const copy=map('roles').getByRole('button',{name:'Copy earlier reflection into empty noticing note',exact:true});
    await copy.click();
    expect(await note.inputValue()).toBe(initial.roleReflect.bully);
    expect(await copy.isDisabled()).toBe(true);
    await note.fill('A new reflection.');
    expect(await copy.isDisabled()).toBe(true);
    expect(await page.evaluate(()=>window.depthSnapshot.upstander)).toMatchObject(initial);
    expect(await map('roles').innerText()).not.toMatch(/\d+%/);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('handles malformed saved fields and keeps keyboard focus when choosing a case',async()=>{
    await mount('middle','light',1100,{roleIdx:-1,rolesCoreSelected:{middle:'missing'},rolesCoreNotes:{'middle:target':{notice:42,plan:[],review:{}}}});
    const picker=map('roles').getByLabel(pickers.roles,{exact:true});
    expect(await picker.inputValue()).toBe('target');
    expect(await map('roles').getByLabel(labels[0],{exact:true}).inputValue()).toBe('');
    await picker.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await picker.evaluate(node=>node===document.activeElement)).toBe(true);
    expect(await picker.inputValue()).toBe('bully');
    await mount('middle','light',1100,{activeTab:'cycle',cycleIdx:2,cycleCoreNotes:[],cycleCoreSelected:[]});
    expect(await map('cycle').getByLabel(pickers.cycle,{exact:true}).inputValue()).toBe('review');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports phone reading, touch targets and accessible core regions in %s',async theme=>{
    await mount('high',theme,320);
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    for(const kind of ['roles','cycle']) {
      if(kind==='cycle') await page.getByRole('tab',{name:/Break the Cycle/}).click();
      await expand(kind);
      await map(kind).getByLabel(labels[1],{exact:true}).fill('Adults respond, check privacy, and review whether help worked.');
      const violations=await map(kind).evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
      fs.writeFileSync(path.join(reports,theme+'-'+kind+'-axe.json'),JSON.stringify(violations,null,2));
      expect(violations).toEqual([]);
      expect(await map(kind).evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      expect(await map(kind).locator('button:visible,select:visible,summary:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
      await map(kind).getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));
      await page.screenshot({path:path.join(reports,theme+'-'+kind+'-phone.png')});
    }
    expect(errors).toEqual([]);
  },120000);
});
