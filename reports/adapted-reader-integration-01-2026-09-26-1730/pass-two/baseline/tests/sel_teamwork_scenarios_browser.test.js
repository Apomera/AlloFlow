import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_teamwork.js'), 'utf8');
const cases = JSON.parse(source.match(/var TEAMWORK_PRACTICE = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-teamwork-scenarios');
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
      const [data, setData] = R.useState({ teamwork: { soundEnabled: false, activeTab: 'scenarios', ...initial } });
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
  await page.getByRole('tab', { name: /Scenarios/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Teamwork scenario practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.teamwork.scenarioDrafts?.[id], id);

describe('Teamwork supported scenario rehearsal', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Teamwork scenario practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id supports comparing three routes without scoring or compulsory writing',async({band,item})=>{
    await mount(band);
    await map().getByLabel('Choose a teamwork situation',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.situations[band]);
    const check=map().getByText('Notice what we know and what to check',{exact:true});
    await check.focus();await page.keyboard.press('Enter');
    expect(await check.evaluate(node=>node===document.activeElement)).toBe(true);
    expect(await map().innerText()).toContain(item.check);
    for(const route of item.routes){
      await map().locator('summary').filter({hasText:route.title}).click();
      expect(await map().innerText()).toContain(route.helps);expect(await map().innerText()).toContain(route.limits);
    }
    await map().getByText('Build a response (optional)',{exact:true}).click();
    expect(await map().getByLabel('A route to rehearse (optional)',{exact:true}).inputValue()).toBe('');
    expect(await map().getByRole('textbox').count()).toBe(5);
    await map().getByText('Try a changed situation',{exact:true}).click();
    await map().getByText('Compare one possible plan',{exact:true}).click();
    expect(await map().getByRole('textbox').count()).toBe(6);
    expect(await map().innerText()).toContain(item.change);expect(await map().innerText()).toContain(item.model);
    expect(await draft(band+':'+item.id)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork.scenarioAnswers)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork.practiceLog)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('keeps all notes and editable route choices across scenarios, grade bands, tab changes and restoration',async()=>{
    await mount();
    const build=()=>map().getByText('Build a response (optional)',{exact:true}).click();
    await build();
    await map().getByLabel('A route to rehearse (optional)',{exact:true}).selectOption('route3');
    const fields={'What I notice without guessing motives':'The decision closed before all ideas were read.','What I need to check':'Can everyone add ideas?','Words or another way to respond':'Could we read the notes first?\nA teacher can help.','A boundary or support we need':'No one must speak aloud.','A next step and check-in':'Read each idea at the next work time.'};
    for(const [label,value] of Object.entries(fields))await map().getByLabel(label+' (optional)',{exact:true}).fill(value);
    await map().getByText('Try a changed situation',{exact:true}).click();
    await map().getByLabel('What I would keep or change, and why (optional)',{exact:true}).fill('Check that written ideas enter the decision.');
    await map().getByLabel('Choose a teamwork situation',{exact:true}).selectOption('sc5');await build();
    expect(await map().getByLabel('A route to rehearse (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('A route to rehearse (optional)',{exact:true}).selectOption('own');
    await map().getByLabel('A boundary or support we need (optional)',{exact:true}).fill('No overnight rescue work.');
    await page.evaluate(()=>window.depthSetBand('high'));await build();
    await map().getByLabel('What I need to check (optional)',{exact:true}).fill('Document permissions.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a teamwork situation',{exact:true}).inputValue()).toBe('sc5');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);await mount('middle','light',1100,saved);
    await page.getByRole('tab',{name:/Roles/}).click();await page.getByRole('tab',{name:/Scenarios/}).click();
    await map().getByLabel('Choose a teamwork situation',{exact:true}).selectOption('sc1');await build();
    for(const [label,value] of Object.entries(fields))expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe(value);
    expect(await map().getByLabel('A route to rehearse (optional)',{exact:true}).inputValue()).toBe('route3');
    await map().getByLabel('A route to rehearse (optional)',{exact:true}).selectOption('route1');
    await map().getByLabel('A route to rehearse (optional)',{exact:true}).selectOption('');
    expect((await draft('middle:sc1')).route).toBe('');
    expect((await draft('middle:sc1')).review).toContain('written ideas');
    expect((await draft('middle:sc5')).route).toBe('own');expect((await draft('middle:sc5')).support).toContain('overnight');
    expect((await draft('high:sc1')).check).toContain('permissions');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('preserves older answers, reveal flags, reflections, coach history and badges without copying them into rehearsal',async()=>{
    const legacy={scenarioIdx:4,scenarioAnswers:{sc1:2,sc5:0},scenarioRevealed:{sc1:true,sc5:true},reflectionNote:'An earlier reflection.',reflectionLog:[{activity:'scenario',skill:'Communication',note:'Earlier work',timestamp:123}],coachPrompt:'An earlier coach prompt.',coachResponse:'An earlier coach response.',earnedBadges:{scenario_pro:123,perfect_scenarios:124},practiceLog:[{type:'scenario',id:'sc5',timestamp:123}]};
    await mount('middle','light',1100,legacy);
    expect(await map().getByLabel('Choose a teamwork situation',{exact:true}).inputValue()).toBe('sc5');
    await map().getByText('Earlier scenario choices',{exact:true}).click();
    expect(await map().innerText()).toContain('Do their section for them so the grade');
    await map().getByText('Build a response (optional)',{exact:true}).click();
    expect(await map().getByLabel('A route to rehearse (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel('Words or another way to respond (optional)',{exact:true}).fill('Ask for an adjusted task.');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);
    for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();
    expect(await page.getByText('Earlier scenario stars',{exact:true}).count()).toBe(1);
    expect(await page.getByText('Earlier scenario answers',{exact:true}).count()).toBe(1);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('recovers malformed state, keeps unknown fields and supports keyboard selection without losing focus',async()=>{
    await mount('middle','light',1100,{scenarioIdx:-2,scenarioAnswers:{sc1:99,sc2:-1,sc3:'2',extra:2},scenarioSelections:{middle:'missing'},scenarioDrafts:{'middle:sc1':{notice:[],check:42,route:'missing',extra:'Retain'}}});
    await map().getByText('Build a response (optional)',{exact:true}).click();
    expect(await map().getByLabel('What I notice without guessing motives (optional)',{exact:true}).inputValue()).toBe('');
    const route=map().getByLabel('A route to rehearse (optional)',{exact:true});
    expect(await route.inputValue()).toBe('');await route.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await route.inputValue()).toBe('route1');expect(await route.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByLabel('What I need to check (optional)',{exact:true}).fill('Check access');expect((await draft('middle:sc1')).extra).toBe('Retain');
    const choice=map().getByLabel('Choose a teamwork situation',{exact:true});await choice.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await choice.inputValue()).toBe('sc2');expect(await choice.evaluate(node=>node===document.activeElement)).toBe(true);
    await page.getByRole('tab',{name:/Progress/}).click();expect(await page.getByText('Earlier scenario answers',{exact:true}).count()).toBe(1);expect(errors).toEqual([]);
    await mount('elementary','light',1100,{scenarioIdx:'bad',scenarioSelections:[],scenarioDrafts:[],scenarioAnswers:[]});
    await map().getByText('Build a response (optional)',{exact:true}).click();
    await map().getByLabel('A next step and check-in (optional)',{exact:true}).fill('Ask the teacher.');
    expect((await draft('elementary:sc1')).plan).toBe('Ask the teacher.');expect(errors).toEqual([]);
  },120000);

  it('keeps the optional coach explicit and sends only its prompt rather than rehearsal notes',async()=>{
    await mount();await map().getByText('Build a response (optional)',{exact:true}).click();
    await map().getByLabel('Words or another way to respond (optional)',{exact:true}).fill('REHEARSAL_PRIVATE_SENTINEL');
    expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    await page.getByText('Optional AI teamwork coach',{exact:true}).click();
    expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    await page.getByLabel('Describe your teamwork challenge',{exact:true}).fill('A fictional group needs a shared checklist.');
    await page.getByRole('button',{name:/Ask Coach/}).click();
    await page.getByText('A mocked coach response.',{exact:true}).waitFor();
    const calls=await page.evaluate(()=>window.depthCoachCalls);expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('fictional group');expect(calls[0]).toContain('help can be a first step');expect(calls[0]).toContain('realistic capacity');expect(calls[0]).not.toContain('REHEARSAL_PRIVATE_SENTINEL');
    expect((await draft('middle:sc1')).words).toBe('REHEARSAL_PRIVATE_SENTINEL');expect(errors).toEqual([]);
  },120000);

  it('retains the coach safety pre-check without sending a blocked prompt',async()=>{
    await mount();
    await page.evaluate(()=>{
      window.SelHub.safeRehearseCheck=()=>({action:'block',severity:'high'});
      window.SelHub.rehearseBreakCharacterText=()=> 'A mocked support response.';
    });
    await page.getByText('Optional AI teamwork coach',{exact:true}).click();
    await page.getByLabel('Describe your teamwork challenge',{exact:true}).fill('A fictional situation for the mocked check.');
    await page.getByRole('button',{name:/Ask Coach/}).click();
    await page.getByText('A mocked support response.',{exact:true}).waitFor();
    expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(await page.getByRole('region',{name:'Teamwork challenge coach response',exact:true}).getAttribute('aria-busy')).toBe('false');
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork._lastTier)).toBe(3);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable scenario practice and labeled controls at 320px in %s',async theme=>{
    await mount('high',theme,320,{scenarioAnswers:{sc10:2}});
    await map().getByLabel('Choose a teamwork situation',{exact:true}).selectOption('sc10');
    for(const text of ['Notice what we know and what to check','Ask to adjust the assignment','Build a response (optional)','Try a changed situation','Compare one possible plan','Earlier scenario choices'])await map().locator('summary').filter({hasText:text}).click();
    await map().getByLabel('A route to rehearse (optional)',{exact:true}).selectOption('route3');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-case-phone.png')});
    await map().locator('summary').filter({hasText:'Ask to adjust the assignment'}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-route-phone.png')});
    await map().getByText('Try a changed situation',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
