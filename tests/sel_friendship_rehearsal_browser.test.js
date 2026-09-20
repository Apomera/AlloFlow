import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const cases = JSON.parse(source.match(/var FRIEND_SCENARIOS = (\{[\s\S]*?\n\});/)[1]);
const examples = ['elementary','middle','high'].flatMap(band=>Object.entries(cases).map(([id,item])=>({band,id,item})));
const reports = path.join(root, 'reports/sel-friendship-rehearsal');
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
    window.coachFlags = []; window.coachMode = 'ok'; window.depthXP = []; window.depthAnnouncements = []; window.depthCoachCalls = [];
    function App() {
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, activeTab: 'rehearse', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        onSafetyFlag: flag => window.coachFlags.push(flag), addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: initial.offline ? null : prompt => { window.depthCoachCalls.push(prompt); if(window.coachMode==='throw')throw new Error('Mock failure'); if(window.coachMode==='reject')return Promise.reject(new Error('Mock failure')); if(window.coachMode==='empty')return Promise.resolve('  '); if(window.coachMode==='pending')return new Promise(resolve=>{window.resolveCoach=resolve;}); return Promise.resolve('A mocked coach response.'); } };
      return window.SelHub._registry.friendship.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Ways to Care/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Friendship rehearsal practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.careDrafts?.[id], id);

describe('Friendship rehearsal practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Ways to care practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);








  const field=()=>map().getByLabel('Your friendship role-play response',{exact:true});
  const send=()=>map().getByRole('button',{name:'Send role-play response',exact:true});
  const start=async(id='new_invite')=>map().getByRole('button',{name:cases[id].label+': '+cases[id].blurb,exact:true}).click();
  const state=()=>page.evaluate(()=>window.depthSnapshot.friendship);
  const settled=()=>page.waitForFunction(()=>window.depthSnapshot.friendship.fRpLoading===false);
  const pause=()=>map().getByRole('button',{name:'Pause and reflect',exact:true}).click();
  const notes=['What did I observe, and what is still uncertain?','What choice or boundary matters to me?','What might I adapt, pause or seek support with?'];
  const reset=async()=>{await map().getByText('Choose another scenario',{exact:true}).click();await map().getByRole('button',{name:'Clear this rehearsal and choose another',exact:true}).click();};

  it.each(examples)('$band / $id opens an authored scene and permits reflection with no AI request or points',async({band,id,item})=>{
    await mount(band);await start(id);expect(await map().innerText()).toContain(item.setup[band]);expect(await map().innerText()).toContain(item.opener[band]);expect(await map().innerText()).toContain(item.limit);await pause();expect(await map().getByRole('region',{name:'Role-play reflection',exact:true}).count()).toBe(1);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['open','unsure','decline'])('passes the %s response condition to the partner, coaching and optional reflection without private notes',async mode=>{
    await mount();await map().getByLabel('Choose a simulated response condition',{exact:true}).selectOption(mode);await start('set_boundary');await field().fill('I cannot offer that.');await send().click();await settled();await map().getByRole('button',{name:'Ask for a coaching idea',exact:true}).click();await settled();await pause();await map().getByLabel(notes[0]+' (optional)',{exact:true}).fill('PRIVATE_REFLECTION');await map().getByText('Optional AI reflection',{exact:true}).click();await map().getByRole('button',{name:'Request an AI reflection',exact:true}).click();await settled();
    const calls=await page.evaluate(()=>window.depthCoachCalls);expect(calls).toHaveLength(3);for(const call of calls){expect(call).toContain('RESPONSE CONDITION:');expect(call).toContain('not a prediction');expect(call).toContain('Do not reward a script with agreement');expect(call).toContain('processing time');expect(call).not.toContain('PRIVATE_REFLECTION');expect(call).not.toContain('By turn 4-5');}
    expect(calls[0]).toContain(mode==='open'?'Be willing to talk':mode==='unsure'?'Express uncertainty':'Do not reverse a no');expect(calls[1]).toContain('Do not infer what the friend probably needs');expect(calls[2]).toContain('Do not score');expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('preserves independent reflection notes, legacy records and a paused response through remounting and grade changes',async()=>{
    const old={myStyle:'helper',coachHistory:[{role:'coach',text:'Earlier coach'}],earnedBadges:{old:1},fRpReflectionDrafts:{'middle:new_invite':{notice:42,extra:'retain'}}};await mount('middle','light',1100,old);await start();await field().fill('Unsent response');await field().press('Enter');await field().type('Another line');await pause();for(const [i,note]of notes.entries())await map().getByLabel(note+' (optional)',{exact:true}).fill('Note '+i);let saved=await state();expect(saved.fRpReflectionDrafts['middle:new_invite'].extra).toBe('retain');await mount('middle','light',1100,saved);expect(await map().getByLabel(notes[1]+' (optional)',{exact:true}).inputValue()).toBe('Note 1');await page.evaluate(()=>window.depthSetBand('high'));expect(await map().getByLabel(notes[1]+' (optional)',{exact:true}).inputValue()).toBe('');await page.evaluate(()=>window.depthSetBand('middle'));await map().getByRole('button',{name:'Return to this rehearsal',exact:true}).click();expect(await field().inputValue()).toBe('Unsent response\nAnother line');await pause();await reset();await start('reconnect');await pause();expect(await map().getByLabel(notes[0]+' (optional)',{exact:true}).inputValue()).toBe('');saved=await state();for(const key of ['myStyle','coachHistory','earnedBadges'])expect(saved[key]).toEqual(old[key]);expect(saved.fRpReflectionDrafts['middle:new_invite'].notice).toBe('Note 0');expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['reject','throw','empty'])('retains a failed %s response and retries without duplicate turns',async mode=>{
    await mount();await start();await field().fill('An unsent question');await page.evaluate(mode=>window.coachMode=mode,mode);await send().click();await settled();expect(await field().inputValue()).toBe('An unsent question');expect((await state()).fRpHistory).toHaveLength(1);expect(await map().getByRole('alert').innerText()).toContain('draft are still here');await page.evaluate(()=>window.coachMode='ok');await send().click();await settled();expect((await state()).fRpHistory).toHaveLength(3);expect(await field().inputValue()).toBe('');expect(errors).toEqual([]);
  },120000);

  it('can pause a pending request and cannot clear the scenario or duplicate its send while waiting',async()=>{
    await mount();await start();await field().fill('A question');await page.evaluate(()=>window.coachMode='pending');await send().click();await page.waitForFunction(()=>typeof window.resolveCoach==='function');expect(await field().isDisabled()).toBe(true);await pause();await map().getByText('Choose another scenario',{exact:true}).click();expect(await map().getByRole('button',{name:'Clear this rehearsal and choose another',exact:true}).isDisabled()).toBe(true);expect(await map().getByRole('button',{name:'Return to this rehearsal',exact:true}).isDisabled()).toBe(true);expect(await page.evaluate(()=>window.depthCoachCalls.length)).toBe(1);await page.evaluate(()=>window.resolveCoach('I need some time.'));await settled();expect((await state()).fRpEnded).toBe(true);expect((await state()).fRpHistory).toHaveLength(3);expect(errors).toEqual([]);
  },120000);

  it('keeps failed coaching and reflection requests separate from authored self-reflection',async()=>{
    await mount();await start();await page.evaluate(()=>window.coachMode='reject');await map().getByRole('button',{name:'Ask for a coaching idea',exact:true}).click();await settled();expect((await state()).fRpHistory).toHaveLength(1);await pause();await map().getByLabel(notes[2]+' (optional)',{exact:true}).fill('Ask a trusted adult');await map().getByText('Optional AI reflection',{exact:true}).click();await map().getByRole('button',{name:'Request an AI reflection',exact:true}).click();await settled();expect((await state()).fRpReflection).toBe('');expect(await map().getByLabel(notes[2]+' (optional)',{exact:true}).inputValue()).toBe('Ask a trusted adult');expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('stops provider calls on a safety block and keeps independent reflection available',async()=>{
    await mount();await start();await page.evaluate(()=>{window.SelHub.safeRehearseCheck=()=>({action:'block',severity:'critical'});window.SelHub.rehearseBreakCharacterText=()=> 'Mock support response';});await field().fill('Fictional safety case');await send().click();expect(await map().getByText('Mock support response',{exact:true}).isVisible()).toBe(true);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect((await state()).fRpBlocked).toBe(true);expect(await map().getByRole('button',{name:'Return to this rehearsal',exact:true}).count()).toBe(0);await map().getByText('Optional AI reflection',{exact:true}).click();expect(await map().getByRole('button',{name:'Request an AI reflection',exact:true}).isDisabled()).toBe(true);await map().getByLabel(notes[2]+' (optional)',{exact:true}).fill('Trusted support');expect(errors).toEqual([]);
  },120000);

  it('supports offline drafts, invalid saved records and the existing consent gate',async()=>{
    await mount('middle','light',1100,{offline:true,fRpScenarioId:'__proto__',fRpHistory:[],fRpResponseMode:'missing'});expect(await map().getByLabel('Choose a simulated response condition',{exact:true}).inputValue()).toBe('unsure');await start();await field().fill('Offline response');expect(await send().isDisabled()).toBe(true);await pause();expect(await map().getByLabel(notes[0]+' (optional)',{exact:true}).count()).toBe(1);
    await mount('middle','light',1100,{fRpScenarioId:'new_invite',fRpHistory:[null,{speaker:'ai',text:'Earlier reply',extra:1}],fRpInput:42});expect(await map().getByText('Earlier reply',{exact:true}).isVisible()).toBe(true);expect(await field().inputValue()).toBe('');await page.evaluate(()=>{window.SelHub.hasCoachConsent=()=>false;window.SelHub.renderConsentScreen=h=>h('p',null,'Rehearsal consent required');});await page.getByRole('tab',{name:/Ways to Care/}).click();await page.getByRole('tab',{name:/Rehearse/}).click();expect(await page.getByText('Rehearsal consent required',{exact:true}).isVisible()).toBe(true);expect(await map().count()).toBe(0);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps scenarios, draft recovery and reflection accessible at 320px in %s',async theme=>{
    await mount('high',theme,320);const mode=map().getByLabel('Choose a simulated response condition',{exact:true});await mode.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await mode.inputValue()).toBe('decline');await map().getByText('Practise choices, not perfect outcomes',{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-choices-phone.png')});await start('set_boundary');await field().fill('I cannot offer that right now.');await page.evaluate(()=>window.coachMode='reject');await send().click();await settled();await map().getByText('Fictional scene',{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-draft-phone.png')});await pause();await map().getByLabel(notes[1]+' (optional)',{exact:true}).fill('I can set a limit.');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);expect(await map().locator('button:visible,textarea:visible,summary:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44))).toBe(true);await map().getByText('Reflect on choices and limits',{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-reflection-phone.png')});expect(errors).toEqual([]);
  },120000);
});
