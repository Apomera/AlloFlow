import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_goals.js'), 'utf8');
const library = vm.runInNewContext('(' + source.match(/var SMART_EXAMPLES = (\{[\s\S]*?\n  \});/)[1] + ')');
const examples = ['elementary','middle','high'].flatMap(band=>library.personal.map(item=>({band,item})));
const reports = path.join(root, 'reports/sel-goals-routines');
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
      const [data, setData] = R.useState({ goals_tool: { soundOn: false, tab: 'smart', showSmartExamples: true, smartExampleCat: 'personal', ...initial } });
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
  await page.getByRole('tab', { name: /SMART/ }).waitFor();
}
const guide=()=>page.getByRole('region',{name:'SMART example library',exact:true});
const chooser=()=>guide().getByLabel('Choose a worked goal example',{exact:true});
const snapshot=()=>page.evaluate(()=>window.depthSnapshot.goals_tool);
const legacyGoal={id:'existing',text:'My existing goal',category:'academic',smart:{S:'Keep my own plan',M:'My evidence',A:'My support',R:'My reason',T:'My review'},steps:[{text:'Existing step',done:false}],progress:0,completed:false,createdAt:1,difficulty:1,reflections:[{text:'Existing reflection'}]};

describe('Goal Setter personal and routine depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Upstander support practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
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
    expect(created.category).toBe('personal');
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

  it('keeps separate routine plans through legacy conversion, filtering, grade changes and serialized restoration',async()=>{
    await mount('middle','light',1100,{tab:'habits',habits:['Read a section',{name:'Create something',category:'creative',custom:'keep'}],habitLog:{'0-2025-01-01':true,'1-2025-01-02':true}});
    const first=page.getByRole('region',{name:'Routine planning: Read a section',exact:true});
    const second=page.getByRole('region',{name:'Routine planning: Create something',exact:true});
    await first.getByText('Plan and review this routine',{exact:true}).click();
    const labels=['Why this routine matters (optional)','When it might fit (optional)','Supports or changes needed (optional)','A smaller or different option (optional)','What to check next, and when (optional)'];
    for(const [i,label] of labels.entries()) await first.getByLabel(label,{exact:true}).fill('First plan '+i+'\nKeep this line.');
    await second.getByText('Plan and review this routine',{exact:true}).click();
    await second.getByLabel(labels[0],{exact:true}).fill('A separate reason.');
    await second.getByLabel('How this plan fits now (optional)',{exact:true}).selectOption('reviewing');
    await page.getByRole('button',{name:'Filter habits by Creative',exact:true}).click();
    expect(await first.count()).toBe(0);
    await page.getByRole('button',{name:'All routines',exact:true}).click();
    await page.evaluate(()=>window.depthSetBand('high'));
    const saved=await snapshot();
    expect(saved.habits[0].name).toBe('Read a section');
    expect(saved.habits[0].category).toBe('health');
    expect(saved.habits[1].custom).toBe('keep');
    await mount('high','light',1100,saved);
    await first.getByText('Plan and review this routine',{exact:true}).click();
    for(const [i,label] of labels.entries()) expect(await first.getByLabel(label,{exact:true}).inputValue()).toBe('First plan '+i+'\nKeep this line.');
    expect((await snapshot()).habits[1].plan).toMatchObject({purpose:'A separate reason.',status:'reviewing'});
    expect((await snapshot()).habitLog).toEqual({'0-2025-01-01':true,'1-2025-01-02':true});
    expect(errors).toEqual([]);
  },120000);

  it('pauses without changing dates and permits keyboard corrections while retaining paused status',async()=>{
    await mount('middle','light',1100,{tab:'habits',habits:['Read'],habitLog:{'0-2025-01-01':true}});
    const plan=page.getByRole('region',{name:'Routine planning: Read',exact:true});
    await plan.getByText('Plan and review this routine',{exact:true}).click();
    const status=plan.getByLabel('How this plan fits now (optional)',{exact:true});
    await status.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await status.inputValue()).toBe('paused');
    expect(await status.evaluate(node=>node===document.activeElement)).toBe(true);
    expect((await snapshot()).habitLog).toEqual({'0-2025-01-01':true});
    const day=page.locator('#goal-habit-0 [data-habit-date]').last();
    const date=await day.getAttribute('data-habit-date');
    await day.focus();await page.keyboard.press('Enter');
    expect((await snapshot()).habits[0].plan.status).toBe('paused');
    expect((await snapshot()).habitLog['0-'+date]).toBe(true);
    await day.click();expect((await snapshot()).habitLog['0-'+date]).toBe(false);
    await status.selectOption('trying');
    expect((await snapshot()).habitLog['0-2025-01-01']).toBe(true);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('keeps the surviving plan attached to its routine when earlier routine records are removed',async()=>{
    await mount('middle','light',1100,{tab:'habits',habits:[{name:'First',category:'health',plan:{purpose:'First reason'}},{name:'Second',category:'creative',plan:{status:'paused',support:'Keep this support'}}],habitLog:{'0-2025-01-01':true,'1-2025-01-02':true}});
    await page.getByRole('button',{name:'Remove routine: First',exact:true}).click();
    await page.getByRole('button',{name:'Keep routine',exact:true}).click();
    expect((await snapshot()).habits).toHaveLength(2);
    await page.getByRole('button',{name:'Remove routine: First',exact:true}).click();
    await page.getByRole('button',{name:'Remove routine and records',exact:true}).click();
    expect((await snapshot()).habits).toEqual([{name:'Second',category:'creative',plan:{status:'paused',support:'Keep this support'}}]);
    expect((await snapshot()).habitLog).toEqual({'0-2025-01-02':true});
    const plan=page.getByRole('region',{name:'Routine planning: Second',exact:true});
    await plan.getByText('Plan and review this routine',{exact:true}).click();
    expect(await plan.getByLabel('Supports or changes needed (optional)',{exact:true}).inputValue()).toBe('Keep this support');
    expect(errors).toEqual([]);
  },120000);

  it('does not create streak rewards from seven recorded days and preserves historical badges',async()=>{
    await mount('middle','light',1100,{tab:'habits',habits:['Read'],badges:{habitFormer:true}});
    const dates=await page.locator('#goal-habit-0 [data-habit-date]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-habit-date')));
    for(const date of dates) await page.locator('#goal-habit-0 [data-habit-date="'+date+'"]').click();
    const data=await snapshot();
    expect(Object.values(data.habitLog).filter(Boolean)).toHaveLength(7);
    expect(data.habitStreak7).toBeUndefined();expect(data.habitWeekComplete).toBeUndefined();expect(data.habitChampion3Day).toBeUndefined();
    expect(data.badges.habitFormer).toBe(true);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('uses safe empty controls for malformed plan fields without discarding unrelated routine data',async()=>{
    await mount('middle','light',1100,{tab:'habits',habits:[{name:'Read',category:'academic',custom:'keep',plan:{status:'unknown',purpose:42,support:[],extra:'keep'}}]});
    const plan=page.getByRole('region',{name:'Routine planning: Read',exact:true});
    await plan.getByText('Plan and review this routine',{exact:true}).click();
    expect(await plan.getByLabel('How this plan fits now (optional)',{exact:true}).inputValue()).toBe('');
    expect(await plan.getByLabel('Why this routine matters (optional)',{exact:true}).inputValue()).toBe('');
    await plan.getByLabel('Supports or changes needed (optional)',{exact:true}).fill('A readable format.');
    expect((await snapshot()).habits[0]).toMatchObject({custom:'keep',plan:{extra:'keep',support:'A readable format.'}});
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports personal plans and routine planning on phones in %s',async theme=>{
    await mount('high',theme,320);
    await chooser().selectOption('example-1');
    expect(await guide().innerText()).not.toContain('For social goals');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    async function audit(region,name) {
      const violations=await region.evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
      fs.writeFileSync(path.join(reports,theme+'-'+name+'-axe.json'),JSON.stringify(violations,null,2));
      expect(violations).toEqual([]);
      expect(await region.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      expect(await region.locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    }
    await audit(guide(),'personal');
    await guide().getByText('Read the SMART plan',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-personal-phone.png')});
    await page.getByRole('tab',{name:/Habits/}).click();
    await page.getByLabel('Routine to try',{exact:true}).fill('Review the plan and supports');
    await page.getByRole('button',{name:'Add routine',exact:true}).click();
    const plan=page.getByRole('region',{name:'Routine planning: Review the plan and supports',exact:true});
    await plan.getByText('Plan and review this routine',{exact:true}).click();
    await plan.getByLabel('How this plan fits now (optional)',{exact:true}).selectOption('paused');
    await plan.getByLabel('Supports or changes needed (optional)',{exact:true}).fill('Ask for a suitable time and accessible materials.');
    await audit(plan,'routine');
    await audit(page.getByRole('region',{name:'Habit tracker',exact:true}),'tracker');
    await plan.getByText('Plan and review this routine',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-routine-phone.png')});
    await plan.getByLabel('A smaller or different option (optional)',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-review-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
