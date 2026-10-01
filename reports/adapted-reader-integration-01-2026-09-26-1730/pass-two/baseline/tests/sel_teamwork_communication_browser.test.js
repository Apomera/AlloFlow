import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_teamwork.js'), 'utf8');
const cases = JSON.parse(source.match(/var COMMUNICATION_PLANS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(cases).flatMap(([band,items]) => items.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-teamwork-communication');
let browser, page;
let errors = [];
async function mount(band = 'middle', theme = 'light', width = 1100, initial = {}) {
  errors = [];
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://sel-depth.test/');
  await page.addStyleTag({ content: 'html,body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}button,select,summary,textarea{font-family:inherit}button:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}' });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ content: source });
  await page.evaluate(({ band, theme, initial }) => {
    const R = window.React, noop = () => {}, Icon = () => null;
    window.depthXP = []; window.depthAnnouncements = []; window.depthCoachCalls = [];
    function App() {
      const [data, setData] = R.useState({ teamwork: { soundEnabled: false, activeTab: 'commstyle', ...initial } });
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
  await page.getByRole('tab', { name: /Communication Plan/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Communication planning practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.teamwork.communicationDrafts?.[id], id);

describe('Teamwork communication planning', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Communication planning practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id offers worked communication and revision without a type or completion reward',async({band,item})=>{
    await mount(band);
    await map().getByLabel('Choose a communication example',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.situation);expect(await map().innerText()).toContain(item.focus);
    const worked=map().getByText('Compare a worked plan',{exact:true});await worked.focus();await page.keyboard.press('Enter');
    expect(await worked.evaluate(node=>node===document.activeElement)).toBe(true);
    for(const value of Object.values(item.moves))expect(await map().innerText()).toContain(value);
    await map().getByText('Build my plan (optional)',{exact:true}).click();
    expect(await map().getByRole('textbox').count()).toBe(5);
    for(const input of await map().getByRole('checkbox').all())expect(await input.isChecked()).toBe(false);
    await map().getByText('Try a changed situation',{exact:true}).click();
    await map().getByText('Compare a possible adjustment',{exact:true}).click();
    expect(await map().getByRole('textbox').count()).toBe(6);
    expect(await map().innerText()).toContain(item.change);expect(await map().innerText()).toContain(item.repair);
    await map().getByText('Review my communication plan',{exact:true}).click();
    expect(await map().getByText('No note added.',{exact:true}).count()).toBe(6);
    expect(await draft(band+':'+item.id)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork.commStyleDone)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork.practiceLog)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('keeps six notes and independent support choices through examples, grade changes, navigation and restoration',async()=>{
    await mount();const build=()=>map().getByText('Build my plan (optional)',{exact:true}).click();await build();
    const fields={'Who needs to know what':'Agree on one task.','My message or demonstration':'Could you label the diagram?\nPlease say if timing does not work.','Ways to take part':'Use a paper copy in class.','Time and response plan':'Confirm during next science class.','How we will check understanding':'Ask each member to describe their next step.'};
    for(const [label,value] of Object.entries(fields))await map().getByLabel(label+' (optional)',{exact:true}).fill(value);
    await map().getByRole('checkbox',{name:'Time to think or reply',exact:true}).check();
    await map().getByRole('checkbox',{name:'More than one way to respond',exact:true}).check();
    await map().getByText('Try a changed situation',{exact:true}).click();
    await map().getByLabel('What I would adjust and why (optional)',{exact:true}).fill('Use classroom work time.');
    await map().getByLabel('Choose a communication example',{exact:true}).selectOption('feedback');await build();
    expect(await map().getByLabel('My message or demonstration (optional)',{exact:true}).inputValue()).toBe('');
    expect(await map().getByRole('checkbox',{name:'Time to think or reply',exact:true}).isChecked()).toBe(false);
    await map().getByLabel('My message or demonstration (optional)',{exact:true}).fill('The label is hard to locate.');
    await map().getByRole('checkbox',{name:'A clear example or record',exact:true}).check();
    await page.evaluate(()=>window.depthSetBand('high'));await build();
    await map().getByLabel('How we will check understanding (optional)',{exact:true}).fill('Understanding is separate from support.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a communication example',{exact:true}).inputValue()).toBe('feedback');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);await mount('middle','light',1100,saved);
    await page.getByRole('tab',{name:/Scenarios/}).click();await page.getByRole('tab',{name:/Communication Plan/}).click();
    await map().getByLabel('Choose a communication example',{exact:true}).selectOption('handoff');await build();
    for(const [label,value] of Object.entries(fields))expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe(value);
    expect(await map().getByRole('checkbox',{name:'More than one way to respond',exact:true}).isChecked()).toBe(true);
    await map().getByRole('checkbox',{name:'Time to think or reply',exact:true}).uncheck();
    expect((await draft('middle:handoff')).supports.time).toBe(false);expect((await draft('middle:handoff')).review).toContain('classroom');
    expect((await draft('middle:feedback')).supports.backup).toBe(true);
    expect((await draft('high:decision')).check).toContain('separate');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('reviews only the learner draft, reflects edits and renders note text safely',async()=>{
    await mount();await map().getByText('Build my plan (optional)',{exact:true}).click();
    const text='My own message\n<img src=x onerror=alert(1)> is example text.';
    await map().getByLabel('My message or demonstration (optional)',{exact:true}).fill(text);
    await map().getByRole('checkbox',{name:'A clear example or record',exact:true}).check();
    const review=map().locator('details').filter({has:page.locator('summary').filter({hasText:'Review my communication plan'})});
    await review.locator(':scope > summary').click();
    expect(await review.innerText()).toContain(text);expect(await review.getByRole('listitem').allTextContents()).toEqual(['A clear example or record']);
    expect(await review.locator('img').count()).toBe(0);expect(await review.getByText('No note added.',{exact:true}).count()).toBe(5);
    await map().getByLabel('My message or demonstration (optional)',{exact:true}).fill('A revised message');
    await map().getByRole('checkbox',{name:'A clear example or record',exact:true}).uncheck();
    expect(await review.innerText()).toContain('A revised message');expect(await review.innerText()).not.toContain('onerror');
    expect(await review.getByRole('listitem').count()).toBe(0);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('retains earlier questionnaire answers, profile, generated advice and rewards without showing a new profile',async()=>{
    const legacy={commStyleAnswers:{0:'director',1:'supporter',8:'analyzer'},commStyleDone:true,commStyleResult:{primary:'director',secondary:'supporter',tallies:{director:5,supporter:5}},commStyleCoachResp:'OLDER_AI_SENTINEL',commStyleCoachLoad:false,reflectionNote:'Earlier note',earnedBadges:{comm_style:123},practiceLog:[{type:'comm_style',id:'discovery',timestamp:123}]};
    await mount('middle','light',1100,legacy);
    await map().getByText('Earlier communication questionnaire',{exact:true}).click();
    expect(await map().innerText()).toContain('Jump in with a plan and assign tasks');
    expect(await map().innerText()).toContain('Make sure nobody feels hurt or dismissed');
    expect(await map().innerText()).not.toContain('OLDER_AI_SENTINEL');
    expect(await map().getByRole('button').count()).toBe(0);
    await map().getByText('Build my plan (optional)',{exact:true}).click();
    await map().getByLabel('My message or demonstration (optional)',{exact:true}).fill('A contextual message.');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);
    for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();
    expect(await page.getByText('Earlier communication quiz',{exact:true}).count()).toBe(1);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('recovers malformed fields, keeps unknown data and supports keyboard toggles and selection',async()=>{
    await mount('middle','light',1100,{communicationSelections:{middle:'missing'},communicationDrafts:{'middle:handoff':{purpose:[],message:42,supports:{time:'true',extra:'Keep'},extra:'Retain'}},commStyleAnswers:{0:'missing',11:'director'},commStyleResult:{primary:'missing'}});
    await map().getByText('Build my plan (optional)',{exact:true}).click();
    expect(await map().getByLabel('My message or demonstration (optional)',{exact:true}).inputValue()).toBe('');
    const input=map().getByRole('checkbox',{name:'Time to think or reply',exact:true});expect(await input.isChecked()).toBe(false);
    await input.focus();await page.keyboard.press('Space');expect(await input.isChecked()).toBe(true);expect(await input.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByLabel('My message or demonstration (optional)',{exact:true}).fill('A message');
    expect((await draft('middle:handoff')).extra).toBe('Retain');expect((await draft('middle:handoff')).supports.extra).toBe('Keep');
    const choice=map().getByLabel('Choose a communication example',{exact:true});await choice.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await choice.inputValue()).toBe('feedback');expect(await choice.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('elementary','light',1100,{communicationSelections:[],communicationDrafts:[],commStyleAnswers:[],commStyleResult:[]});
    await map().getByText('Build my plan (optional)',{exact:true}).click();
    await map().getByLabel('Who needs to know what (optional)',{exact:true}).fill('Show one turn.');expect((await draft('elementary:game')).purpose).toBe('Show one turn.');expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable communication plans and labeled controls at 320px in %s',async theme=>{
    await mount('high',theme,320,{commStyleAnswers:{0:'director'}});
    await map().getByLabel('Choose a communication example',{exact:true}).selectOption('decision');
    for(const text of ['Compare a worked plan','Build my plan (optional)','Try a changed situation','Compare a possible adjustment','Review my communication plan','Earlier communication questionnaire'])await map().getByText(text,{exact:true}).click();
    await map().getByRole('checkbox',{name:'Time to think or reply',exact:true}).check();
    await map().getByLabel('My message or demonstration (optional)',{exact:true}).fill('Please mark support, concern or needing more information.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('summary:visible,select:visible,label:has(input[type="checkbox"])').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-example-phone.png')});
    await map().getByRole('group',{name:'Supports to consider (optional)',exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-supports-phone.png')});
    await map().getByText('Try a changed situation',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
