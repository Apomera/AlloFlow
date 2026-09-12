import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_goals.js'), 'utf8');
const library = vm.runInNewContext('(' + source.match(/var SMART_EXAMPLES = (\{[\s\S]*?\n  \});/)[1] + ')');
const examples = ['elementary','middle','high'].flatMap(band=>library.health.map(item=>({band,item})));
const reports = path.join(root, 'reports/sel-goals-health');
let browser, page;
let errors = [];
async function mount(band = 'middle', theme = 'light', width = 1100, initial = {}, ai = false) {
  errors = [];
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://sel-depth.test/');
  await page.addStyleTag({ content: 'html,body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}button,select,summary,textarea{font-family:inherit}button:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}' });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ content: source });
  await page.evaluate(({ band, theme, initial, ai }) => {
    const R = window.React, noop = () => {}, Icon = () => null;
    window.depthXP = []; window.depthAnnouncements = []; window.repairRequests = [];
    function App() {
      const [data, setData] = R.useState({ goals_tool: { soundOn: false, tab: 'smart', showSmartExamples: true, smartExampleCat: 'health', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, setToolData: setData, gradeBand, gradeLevel: ({elementary:"4",middle:"7",high:"10"})[gradeBand],
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: ai ? prompt => { window.repairRequests.push(prompt); return Promise.resolve("Check the contact boundary before considering any message."); } : null };
      return window.SelHub._registry.goals.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial, ai });
  await page.getByRole('button', { name: 'SMART Goal Examples Library', exact: true }).waitFor();
}
const guide=()=>page.getByRole('region',{name:'SMART example library',exact:true});
const chooser=()=>guide().getByLabel('Choose a worked goal example',{exact:true});
const snapshot=()=>page.evaluate(()=>window.depthSnapshot.goals_tool);
const legacyGoal={id:'existing',text:'My existing goal',category:'academic',smart:{S:'Keep my own plan',M:'My evidence',A:'My support',R:'My reason',T:'My review'},steps:[{text:'Existing step',done:false}],progress:0,completed:false,createdAt:1,difficulty:1,reflections:[{text:'Existing reflection'}]};

describe('Goal Setter health depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Goal Setter health planning</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id explains context and creates an editable independent copy',async({band,item})=>{
    await mount(band,'light',1100,{goals:[legacyGoal],goalNotesDrafts:{existing:{whatWorked:'Keep this draft'}}});
    await chooser().selectOption(item.id);
    for(const value of Object.values(item.context[band])) expect(await guide().innerText()).toContain(value);
    for(const key of 'SMART') expect(await guide().innerText()).toContain(item.smart[key][band]);
    expect((await snapshot()).goals).toEqual([legacyGoal]);
    await guide().getByRole('button',{name:'Use as Template',exact:true}).click();
    await page.waitForFunction(()=>window.depthSnapshot.goals_tool.goals.length===2);
    const data=await snapshot();const created=data.goals[1];
    expect(data.goals[0]).toEqual(legacyGoal);
    expect(data.goalNotesDrafts.existing.whatWorked).toBe('Keep this draft');
    expect(created.text).toBe(item.title);
    expect(created.category).toBe('health');
    expect(created.progress).toBe(0);expect(created.completed).toBe(false);
    for(const key of 'SMART') expect(created.smart[key]).toBe(item.smart[key][band]);
    const field=page.locator('#smart-field-'+created.id+'-S');
    await page.waitForFunction(id=>document.activeElement?.id===id,'smart-field-'+created.id+'-S');
    await field.fill('My adapted action.\nUse a supported route.');
    const saved=await snapshot();
    await mount(band,'light',1100,saved);
    expect(await page.locator('#smart-field-'+created.id+'-S').inputValue()).toContain('My adapted action');
    expect((await snapshot()).goals[0]).toEqual(legacyGoal);
    expect(errors).toEqual([]);
  },120000);

  it('preserves old health goals and saved example selections while browsing revised plans', async()=>{
    const oldGoal={...legacyGoal,category:'health',text:'My saved water goal',smart:{...legacyGoal.smart,S:'My previously chosen amount'}};
    await mount('middle','light',1100,{goals:[oldGoal],smartExampleSelections:{'middle:health':'example-2','elementary:health':'example-1'}});
    expect(await chooser().inputValue()).toBe('example-2');
    await page.evaluate(()=>window.depthSetBand('elementary'));
    expect(await chooser().inputValue()).toBe('example-1');
    await chooser().focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    expect(await chooser().inputValue()).toBe('example-2');
    expect(await chooser().evaluate(node=>node===document.activeElement)).toBe(true);
    await page.evaluate(()=>window.depthSetBand('middle'));
    await page.getByRole('button',{name:'SMART Goal Examples Library',exact:true}).click();
    const saved=await snapshot();
    await mount('middle','light',1100,saved);
    await page.getByRole('button',{name:'SMART Goal Examples Library',exact:true}).click();
    expect(await chooser().inputValue()).toBe('example-2');
    expect((await snapshot()).goals).toEqual([oldGoal]);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable phone plans and accessible controls in %s',async theme=>{
    await mount('high',theme,320);
    await chooser().selectOption('example-2');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await guide().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-library-axe.json'),JSON.stringify(violations,null,2));
    expect(violations).toEqual([]);
    expect(await guide().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await guide().locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await guide().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-library-phone.png')});
    await guide().getByText('Read the SMART plan',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-plan-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
