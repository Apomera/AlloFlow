import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const cases = JSON.parse(source.match(/var REPAIR_PRACTICE = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-friendship-repair');
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
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, activeTab: 'repair', ...initial } });
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
  await page.getByRole('tab', { name: /Repair/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Friendship repair choices', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.repairDrafts?.[id], id);

describe('Friendship repair choices', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Friendship repair choices</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);




  const open = text => map().getByText(text,{exact:true}).click();
  const labels = ['What happened, and what is uncertain?', 'What is mine to take responsibility for?', 'What boundary or support is needed?', 'What could I say or do next?', 'What would make me keep or change the plan?'];

  it.each(examples)('$band / $item.id explores words, limits and changed circumstances without forced disclosure', async ({band,item}) => {
    await mount(band);
    await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setup[band]);
    expect(await map().innerText()).toContain(item.notice);
    await open('Explore example words and their limits');
    expect(await map().innerText()).toContain(item.model[band]);
    expect(await map().innerText()).toContain(item.limit);
    const route = map().getByLabel('A next step to consider',{exact:true});
    expect(await route.locator('option[value="talk"]').count()).toBe(item.supportFirst ? 0 : 1);
    await route.selectOption('space');
    expect(await map().getByRole('status').innerText()).toContain('do not keep messaging');
    await route.selectOption('support');
    expect(await map().getByRole('status').innerText()).toContain('practical plan and a follow-up');
    await open('Revisit when something changes');
    expect(await map().innerText()).toContain(item.changed);
    expect(await map().innerText()).toContain(item.revisit);
    await open('Build my possible plan (optional)');
    for (const label of labels) expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('keeps notes independent across examples, grades and routes, including after remount', async()=>{
    await mount();
    await open('Build my possible plan (optional)');
    for (const [i,label] of labels.entries()) await map().getByLabel(label+' (optional)',{exact:true}).fill('My note '+i+'\nA second line');
    await map().getByLabel('A next step to consider',{exact:true}).selectOption('talk');
    await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption('own');
    expect(await map().getByText('Explore example words and their limits',{exact:true}).count()).toBe(0);
    await open('Build my possible plan (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own context');
    await page.evaluate(()=>window.depthSetBand('high'));
    await open('Build my possible plan (optional)');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Another grade');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a repair practice context',{exact:true}).inputValue()).toBe('own');
    await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption('plans');
    await map().getByLabel('A next step to consider',{exact:true}).selectOption('space');
    await open('Build my possible plan (optional)');
    for (const [i,label] of labels.entries()) expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('My note '+i+'\nA second line');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);
    await mount('middle','light',1100,saved);
    expect(await map().getByLabel('A next step to consider',{exact:true}).inputValue()).toBe('space');
    await open('Review my plan text');
    const preview=map().getByLabel('Plan text to review or copy',{exact:true});
    expect(await preview.getAttribute('readonly')).not.toBeNull();
    expect(await preview.inputValue()).toContain('My note 4\nA second line');
    expect(await preview.inputValue()).not.toContain('My own context');
    expect(await preview.inputValue()).not.toContain('Another grade');
    expect(await preview.inputValue()).toContain('not proof of reconciliation');
    expect(errors).toEqual([]);
  },120000);

  it('preserves previous activity data and rejects a saved direct-talk route in the pressure example',async()=>{
    const legacy={repairIdx:4,coachInput:'Earlier question',coachHistory:[{role:'user',text:'Earlier note'}],digitalDone:{old:true},friendNotes:[{text:'Earlier journal'}],repairDrafts:{'middle:pressure':{route:'talk',action:'Earlier words',extra:'keep'}}};
    await mount('middle','light',1100,{...legacy,repairSelections:{middle:'pressure'}});
    expect(await map().getByLabel('A next step to consider',{exact:true}).inputValue()).toBe('');
    expect(await map().getByLabel('A next step to consider',{exact:true}).locator('option[value="talk"]').count()).toBe(0);
    await open('Build my possible plan (optional)');
    expect(await map().getByLabel(labels[3]+' (optional)',{exact:true}).inputValue()).toBe('Earlier words');
    await map().getByLabel(labels[3]+' (optional)',{exact:true}).fill('Ask for support');
    expect((await draft('middle:pressure')).extra).toBe('keep');
    const saved=await page.evaluate(()=>window.depthSnapshot.friendship);
    for(const key of ['repairIdx','coachInput','coachHistory','digitalDone','friendNotes'])expect(saved[key]).toEqual(legacy[key]);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('recovers malformed drafts and supports keyboard disclosures and route selection',async()=>{
    await mount('middle','light',1100,{repairSelections:{middle:'missing'},repairDrafts:{'middle:plans':{observations:42,route:[],extra:'keep'}}});
    const summary=map().getByText('Build my possible plan (optional)',{exact:true});
    await summary.focus();await page.keyboard.press('Enter');
    const note=map().getByLabel(labels[0]+' (optional)',{exact:true});expect(await note.inputValue()).toBe('');await note.fill('Observed');
    expect((await draft('middle:plans')).extra).toBe('keep');
    const route=map().getByLabel('A next step to consider',{exact:true});await route.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await route.inputValue()).toBe('talk');expect(await route.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('unexpected','light',1100,{repairSelections:[],repairDrafts:[]});await open('Build my possible plan (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Recovered');expect((await draft('middle:plans')).observations).toBe('Recovered');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps the repair activity readable and accessible at 320px in %s',async theme=>{
    await mount('high',theme,320);await map().getByLabel('Choose a repair practice context',{exact:true}).selectOption('privacy');
    await map().getByLabel('A next step to consider',{exact:true}).selectOption('space');
    for(const title of ['Explore example words and their limits','Build my possible plan (optional)','Revisit when something changes','Review my plan text'])await open(title);
    await map().getByLabel(labels[3]+' (optional)',{exact:true}).fill('Respect the no-contact request. Stop forwarding the message.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name] of [['Repair, boundaries and next steps','context'],['Explore example words and their limits','example'],['Revisit when something changes','review']]){
      await map().getByText(target,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});
    }
    expect(errors).toEqual([]);
  },120000);
});
