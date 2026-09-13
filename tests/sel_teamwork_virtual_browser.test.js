import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_teamwork.js'), 'utf8');
const cases = JSON.parse(source.match(/var VIRTUAL_TEAM_PRACTICE = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-teamwork-virtual');
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
      const [data, setData] = R.useState({ teamwork: { soundEnabled: false, activeTab: 'virtualteam', ...initial } });
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
  await page.getByRole('tab', { name: /Virtual Team/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Virtual teamwork practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.teamwork.virtualDrafts?.[id], id);

describe('Virtual teamwork agreements', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Virtual teamwork practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id supports two conditional approaches and revision without scores',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a virtual teamwork situation',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setups[band]);
    const notice=map().getByText('Notice the conditions before judging',{exact:true});await notice.focus();await page.keyboard.press('Enter');
    expect(await notice.evaluate(node=>node===document.activeElement)).toBe(true);expect(await map().innerText()).toContain(item.notice);
    for(const route of item.routes){await map().locator('summary').filter({hasText:route.title}).click();expect(await map().innerText()).toContain(route.helps);expect(await map().innerText()).toContain(route.limits);}
    await map().getByText('Draft a team agreement (optional)',{exact:true}).click();
    expect(await map().getByLabel('An approach to try (optional)',{exact:true}).inputValue()).toBe('');
    expect(await map().getByRole('textbox').count()).toBe(3);
    await map().getByText('Try a changed condition',{exact:true}).click();await map().getByText('Compare one possible adjustment',{exact:true}).click();
    expect(await map().getByRole('textbox').count()).toBe(4);expect(await map().innerText()).toContain(item.change);expect(await map().innerText()).toContain(item.model);
    expect(await draft(band+':'+item.id)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork.vtAnswers)).toBeUndefined();expect(await page.evaluate(()=>window.depthSnapshot.teamwork.practiceLog)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

  it('keeps four notes and editable approaches separate across situations, grades, navigation and restoration',async()=>{
    await mount();const build=()=>map().getByText('Draft a team agreement (optional)',{exact:true}).click();await build();
    await map().getByLabel('An approach to try (optional)',{exact:true}).selectOption('plan1');
    const fields={'Access and boundaries to plan for':'Written feedback is workable.','Our proposed agreement':'Leave one specific comment.\nAllow time to respond.','Who will check, and when':'Check during the next class.'};
    for(const [label,value] of Object.entries(fields))await map().getByLabel(label+' (optional)',{exact:true}).fill(value);
    await map().getByText('Try a changed condition',{exact:true}).click();await map().getByLabel('What I would revise, and why (optional)',{exact:true}).fill('Keep the written format.');
    await map().getByLabel('Choose a virtual teamwork situation',{exact:true}).selectOption('vt3');await build();
    expect(await map().getByLabel('An approach to try (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('An approach to try (optional)',{exact:true}).selectOption('own');
    await map().getByLabel('Our proposed agreement (optional)',{exact:true}).fill('Use the diagram without requiring a camera.');
    await page.evaluate(()=>window.depthSetBand('high'));await build();
    await map().getByLabel('Who will check, and when (optional)',{exact:true}).fill('Confirm the response window.');
    await page.evaluate(()=>window.depthSetBand('middle'));expect(await map().getByLabel('Choose a virtual teamwork situation',{exact:true}).inputValue()).toBe('vt3');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);await mount('middle','light',1100,saved);
    await page.getByRole('tab',{name:/Communication Plan/}).click();await page.getByRole('tab',{name:/Virtual Team/}).click();
    await map().getByLabel('Choose a virtual teamwork situation',{exact:true}).selectOption('vt1');await build();
    for(const [label,value] of Object.entries(fields))expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe(value);
    expect(await map().getByLabel('An approach to try (optional)',{exact:true}).inputValue()).toBe('plan1');
    await map().getByLabel('An approach to try (optional)',{exact:true}).selectOption('plan2');
    await map().getByLabel('An approach to try (optional)',{exact:true}).selectOption('');expect((await draft('middle:vt1')).route).toBe('');
    expect((await draft('middle:vt1')).revision).toContain('written format');expect((await draft('middle:vt3')).agreement).toContain('diagram');expect((await draft('high:vt1')).followup).toContain('window');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('preserves old answers, reveal flags, reflections and badges as historical records',async()=>{
    const legacy={vtScenarioIdx:2,vtAnswers:{vt1:1,vt3:0},vtRevealed:{vt1:true,vt3:true},reflectionNote:'Earlier note',reflectionLog:[{activity:'virtualteam',skill:'Communication',note:'Earlier work',timestamp:123}],earnedBadges:{virtual_scenario_1:123,virtual_team_pro:124},practiceLog:[{type:'virtual_team',id:'vt3',timestamp:123}]};
    await mount('middle','light',1100,legacy);expect(await map().getByLabel('Choose a virtual teamwork situation',{exact:true}).inputValue()).toBe('vt3');
    await map().getByText('Earlier virtual-team choices',{exact:true}).click();expect(await map().innerText()).toContain('Make a rule: cameras on for all meetings, no exceptions.');
    await map().getByText('Draft a team agreement (optional)',{exact:true}).click();
    expect(await map().getByLabel('An approach to try (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('Our proposed agreement (optional)',{exact:true}).fill('Respect camera choice.');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();expect(await page.getByText('Earlier virtual-team answers',{exact:true}).count()).toBe(1);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('recovers malformed saved values, preserves unknown fields and keeps keyboard selection focused',async()=>{
    await mount('middle','light',1100,{vtScenarioIdx:-2,vtAnswers:{vt1:88,vt2:-1,vt3:'1',extra:1},virtualSelections:{middle:'missing'},virtualDrafts:{'middle:vt1':{route:'missing',agreement:42,access:[],extra:'Keep'}}});
    await map().getByText('Draft a team agreement (optional)',{exact:true}).click();expect(await map().getByLabel('Our proposed agreement (optional)',{exact:true}).inputValue()).toBe('');
    const route=map().getByLabel('An approach to try (optional)',{exact:true});await route.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await route.inputValue()).toBe('plan1');expect(await route.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByLabel('Our proposed agreement (optional)',{exact:true}).fill('One clear comment');expect((await draft('middle:vt1')).extra).toBe('Keep');
    const selector=map().getByLabel('Choose a virtual teamwork situation',{exact:true});await selector.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await selector.inputValue()).toBe('vt2');expect(await selector.evaluate(node=>node===document.activeElement)).toBe(true);
    await page.getByRole('tab',{name:/Progress/}).click();expect(await page.getByText('Earlier virtual-team answers',{exact:true}).count()).toBe(1);expect(errors).toEqual([]);
    await mount('elementary','light',1100,{vtScenarioIdx:'bad',vtAnswers:[],virtualSelections:[],virtualDrafts:[]});await map().getByText('Draft a team agreement (optional)',{exact:true}).click();
    await map().getByLabel('Who will check, and when (optional)',{exact:true}).fill('Ask the teacher.');expect((await draft('elementary:vt1')).followup).toBe('Ask the teacher.');expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable virtual collaboration practice at 320px in %s',async theme=>{
    await mount('high',theme,320,{vtAnswers:{vt3:1}});await map().getByLabel('Choose a virtual teamwork situation',{exact:true}).selectOption('vt3');
    for(const text of ['Notice the conditions before judging','Plan a task-specific alternative with the teacher','Draft a team agreement (optional)','Try a changed condition','Compare one possible adjustment','Earlier virtual-team choices'])await map().locator('summary').filter({hasText:text}).click();
    await map().getByLabel('An approach to try (optional)',{exact:true}).selectOption('plan2');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-case-phone.png')});
    await map().locator('summary').filter({hasText:'Plan a task-specific alternative with the teacher'}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-approach-phone.png')});
    await map().getByText('Try a changed condition',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});expect(errors).toEqual([]);
  },120000);
});
