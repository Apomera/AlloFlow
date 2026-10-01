import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_strengths.js'), 'utf8');
const cases = JSON.parse(source.match(/var INTERVIEW_LENSES = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band=>cases.map(item=>({band,id:item.id,item})));
const reports = path.join(root, 'reports/sel-strengths-interview');
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
    window.speechCalls = []; window.coachFlags = []; window.coachMode = 'ok'; window.depthXP = []; window.depthAnnouncements = []; window.depthCoachCalls = [];
    function App() {
      const [data, setData] = R.useState({ strengths: { tab: 'interview', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, setToolData: setData, gradeLevel: {elementary:'4',middle:'7',high:'11'}[gradeBand] || '7',
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        callTTS: text=>{window.speechCalls.push(text);return Promise.resolve(null);}, onSafetyFlag: flag => window.coachFlags.push(flag), addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: initial.offline ? null : prompt => { window.depthCoachCalls.push(prompt); if(window.coachMode==='throw')throw new Error('Mock failure'); if(window.coachMode==='reject')return Promise.reject(new Error('Mock failure')); if(window.coachMode==='empty')return Promise.resolve('  '); if(window.coachMode==='pending')return new Promise(resolve=>{window.resolveCoach=resolve;}); return Promise.resolve('A mocked coach response.'); } };
      return window.SelHub._registry.strengths.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Interview/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Strengths interview reflection', exact: true });

describe('Strengths interview reflection', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Strengths interview practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);











  const select=()=>map().getByLabel('Choose an interview focus',{exact:true});
  const state=()=>page.evaluate(()=>window.depthSnapshot.strengths);
  const open=text=>map().getByText(text,{exact:true}).click();
  const answer=(item,band)=>map().getByLabel(item.prompt[band]+' (optional)',{exact:true});
  const reflection=item=>map().getByLabel(item.followup+' (optional)',{exact:true});

  it.each(examples)('$band / $id offers concrete examples, qualified interpretations and limits',async({band,id,item})=>{
    await mount(band);await select().selectOption(id);expect(await map().getByRole('heading',{name:item.prompt[band],exact:true}).count()).toBe(1);expect(await map().innerText()).toContain(item.why);await open('Explore a worked example');for(const text of [item.example[band],item.notice,item.consider,item.limit])expect(await map().innerText()).toContain(text);await open('My reflection (optional)');await answer(item,band).fill('An observation');await reflection(item).fill('A possibility, with support');const saved=await state();expect(saved.interviewReflectionDrafts[band][id]).toEqual({observation:'An observation',reflection:'A possibility, with support'});for(const key of ['interviewComplete','interviewResult','interviewAnswers','selectedStrengths'])expect(saved[key]).toBeUndefined();expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('allows skipping and keyboard navigation with an announced focus and no completion quota',async()=>{
    await mount();expect(await map().getByRole('button',{name:'Previous focus',exact:true}).isDisabled()).toBe(true);for(let i=1;i<cases.length;i++){await map().getByRole('button',{name:'Next focus',exact:true}).focus();await page.keyboard.press('Enter');expect(await select().inputValue()).toBe(cases[i].id);expect(await map().getByRole('status').innerText()).toContain(cases[i].title);}expect(await map().getByRole('button',{name:'Next focus',exact:true}).isDisabled()).toBe(true);await map().getByRole('button',{name:'Previous focus',exact:true}).click();expect(await select().inputValue()).toBe('perspectives');await select().focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Tab');expect(await select().inputValue()).toBe('conditions');await map().getByText('Review my interview notes',{exact:true}).focus();await page.keyboard.press('Enter');expect(await map().getByLabel('Interview notes to review or copy',{exact:true}).inputValue()).toContain('(No note yet)');expect((await state()).interviewComplete).toBeUndefined();expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('preserves independent focus and grade drafts and builds a current-grade preview through remount',async()=>{
    await mount();for(const [i,item]of cases.entries()){await select().selectOption(item.id);await open('My reflection (optional)');await answer(item,'middle').fill('Middle '+i+'\nDetail');await reflection(item).fill('Question '+i);}await page.evaluate(()=>window.depthSetBand('high'));expect(await select().inputValue()).toBe('moment');await open('My reflection (optional)');expect(await answer(cases[0],'high').inputValue()).toBe('');await answer(cases[0],'high').fill('HIGH_ONLY');await page.evaluate(()=>window.depthSetBand('middle'));expect(await select().inputValue()).toBe('experiment');await mount('middle','light',1100,await state());await open('Review my interview notes');const preview=map().getByLabel('Interview notes to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();for(let i=0;i<4;i++){expect(await preview.inputValue()).toContain('Middle '+i+'\nDetail');expect(await preview.inputValue()).toContain('Question '+i);}expect(await preview.inputValue()).not.toContain('HIGH_ONLY');await select().selectOption('moment');await open('My reflection (optional)');expect(await answer(cases[0],'middle').inputValue()).toBe('Middle 0\nDetail');expect(errors).toEqual([]);
  },120000);

  it('shows earlier answers in selectable original wording without changing legacy records or earning awards',async()=>{
    const legacy={interviewStep:7,interviewAnswers:{iq1:'OLD_PRIVATE_ANSWER',iq3:'Another answer',custom:'Custom note'},interviewResult:'Earlier generated interpretation',interviewComplete:true,interviewAnalyzing:true,selectedStrengths:[{id:'kind',label:'Kindness',category:'character'}],badges:{interviewComplete:true,firstCard:true}};await mount('middle','light',1100,legacy);await open('Earlier interview activity');expect(await map().innerText()).toContain('Earlier answers did not record a grade band.');for(const band of ['elementary','middle','high']){await map().getByLabel('Earlier question wording',{exact:true}).selectOption(band);expect(await map().innerText()).toContain('OLD_PRIVATE_ANSWER');expect(await map().innerText()).toContain('Custom note');}expect(await map().innerText()).toContain('When do you experience');expect(await map().innerText()).toContain('Earlier generated interpretation');await open('My reflection (optional)');await answer(cases[0],'middle').fill('New reflection');await open('Review my interview notes');expect(await map().getByLabel('Interview notes to review or copy',{exact:true}).inputValue()).not.toContain('OLD_PRIVATE_ANSWER');for(const [key,value]of Object.entries(legacy))expect((await state())[key]).toEqual(value);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('guards malformed records and retains unknown draft properties',async()=>{
    await mount('middle','light',1100,{interviewReflectionSelections:{middle:'__proto__'},interviewReflectionDrafts:{middle:{extra:'keep',moment:{observation:42,reflection:[],extra:'retain'}}},interviewAnswers:{iq1:42,iq2:{}},interviewResult:{bad:true},interviewStep:999});expect(await select().inputValue()).toBe('moment');await open('My reflection (optional)');expect(await answer(cases[0],'middle').inputValue()).toBe('');expect(await reflection(cases[0]).inputValue()).toBe('');await answer(cases[0],'middle').fill('Recovered');const saved=(await state()).interviewReflectionDrafts.middle;expect(saved.extra).toBe('keep');expect(saved.moment.extra).toBe('retain');await open('Earlier interview activity');expect(await map().getByText('Earlier generated response',{exact:true}).count()).toBe(0);await mount('middle','light',1100,{interviewReflectionSelections:[],interviewReflectionDrafts:[],interviewAnswers:[]});await open('My reflection (optional)');await answer(cases[0],'middle').fill('Recovered again');expect((await state()).interviewReflectionDrafts.middle.moment.observation).toBe('Recovered again');expect(errors).toEqual([]);
  },120000);

  it('supports private solo reflection offline and narrates only the selected authored focus',async()=>{
    await mount('middle','light',1100,{offline:true});await select().selectOption('perspectives');await open('If I choose to ask someone');expect(await map().innerText()).toContain('You can stop, disagree or keep the reflection private.');await open('My reflection (optional)');await answer(cases[2],'middle').fill('PRIVATE_NOTE');await map().getByRole('button',{name:'Read this focus aloud',exact:true}).click();expect(await page.evaluate(()=>window.speechCalls)).toEqual([cases[2].prompt.middle+' '+cases[2].why]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);await open('Review my interview notes');expect(await map().getByLabel('Interview notes to review or copy',{exact:true}).inputValue()).toContain('PRIVATE_NOTE');expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps examples and notes accessible at 320px in %s',async theme=>{
    await mount('high',theme,320);await select().selectOption('conditions');for(const title of ['Explore a worked example','My reflection (optional)','Review my interview notes'])await open(title);await answer(cases[1],'high').fill('Visual instructions and time to pause.');await reflection(cases[1]).fill('Keep the support; ask which format helps.');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);expect(await map().locator('select:visible,button:visible,summary:visible,textarea:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44))).toBe(true);for(const [text,name]of [['Explore strengths through examples','context'],['Explore a worked example','example'],['My reflection (optional)','notes']]){await map().getByText(text,{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
