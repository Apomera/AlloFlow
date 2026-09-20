import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const reports = path.join(root, 'reports/sel-friendship-coach');
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
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, activeTab: 'coach', ...initial } });
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
const map = () => page.getByRole('region', { name: 'Friendship coach practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.careDrafts?.[id], id);

describe('Friendship coach practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Ways to care practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);







  const field=()=>page.getByLabel('Friendship practice message',{exact:true});
  const send=()=>page.getByRole('button',{name:'Send message to friendship coach',exact:true});
  const settled=()=>page.waitForFunction(()=>window.depthSnapshot.friendship.coachLoading===false);
  const snapshot=()=>page.evaluate(()=>window.depthSnapshot.friendship);
  const installSafe=()=>page.evaluate(()=>{window.SelHub.safeCoach=async opts=>{window.safeOptions={...opts,callGemini:undefined,onSafetyFlag:undefined};return {response:await opts.callGemini(opts.coachPrompt,false),tier:0};};});

  it.each([{method:'enter',safe:true},{method:'button',safe:true},{method:'enter',safe:false},{method:'button',safe:false}])('$method submission with safe=$safe uses considered guidance and preserves earlier records without XP',async({method,safe})=>{
    const old={myStyle:'loyalist',coachHistory:[null,{role:'coach',text:'Earlier advice',extra:'preserve'}],careDrafts:{'middle:helper':{notice:'PRIVATE_NOTE'}}};
    await mount('middle','light',1100,old);if(safe)await installSafe();await field().fill('  Can I decline an invitation?  ');if(method==='enter')await field().press('Enter');else await send().click();await settled();
    const state=await snapshot();expect(state.coachInput).toBe('');expect(state.coachHistory.slice(0,2)).toEqual(old.coachHistory);expect(state.coachHistory.slice(2)).toEqual([{role:'user',text:'Can I decline an invitation?'},{role:'coach',text:'A mocked coach response.'}]);expect(state.myStyle).toBe('loyalist');expect(state.careDrafts).toEqual(old.careDrafts);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    const calls=await page.evaluate(()=>window.depthCoachCalls);expect(calls).toHaveLength(1);for(const text of ['age-appropriate','uncertain interpretations','its limits','consent','communication differences','Do not promise friendship','not instructions'])expect(calls[0]).toContain(text);expect(calls[0]).not.toContain('PRIVATE_NOTE');expect(calls[0]).not.toContain('loyalist');if(safe)expect((await page.evaluate(()=>window.safeOptions)).conversationHistory).toEqual(old.coachHistory.concat([{role:'user',text:'Can I decline an invitation?'}]));expect(errors).toEqual([]);
  },120000);

  it.each(['reject','throw','empty'])('retains the draft on %s and retries once without duplicate conversation entries',async mode=>{
    await mount('middle','light',1100,{coachHistory:[{role:'coach',text:'Earlier message'}]});await page.evaluate(mode=>window.coachMode=mode,mode);await field().fill('Draft to keep');await send().click();await settled();expect(await field().inputValue()).toBe('Draft to keep');expect((await snapshot()).coachHistory).toHaveLength(1);expect(await map().getByRole('alert').innerText()).toContain('Your draft is still below');
    await page.evaluate(()=>window.coachMode='ok');await send().click();await settled();expect((await snapshot()).coachHistory).toHaveLength(3);expect(await map().getByRole('alert').count()).toBe(0);expect(errors).toEqual([]);
  },120000);

  it.each([0,3])('keeps drafts when the real safety layer absorbs a provider failure, tier %s',async tier=>{
    await mount();await page.addScriptTag({path:path.join(root,'sel_hub/sel_safety_layer.js')});await page.evaluate(tier=>{window.SelHub.giveCoachConsent();window.SelHub.assessSafety=async()=>({tier,rationale:'Mock assessment',category:'test'});window.SelHub.showCrisisModal=()=>{};window.coachMode='reject';},tier);
    await field().fill('Fictional request');await send().click();await settled();expect(await field().inputValue()).toBe('Fictional request');expect((await snapshot()).coachHistory).toBeUndefined();expect((await snapshot())._lastTier).toBe(tier);expect((await snapshot()).coachError).toContain('Your draft is still below');if(tier===3){expect((await snapshot()).coachError).toContain('988');expect(await page.evaluate(()=>window.coachFlags.length)).toBeGreaterThan(0);}expect(errors).toEqual([]);
  },120000);

  it('honors a fallback safety block without calling the provider',async()=>{
    await mount();await page.evaluate(()=>{window.SelHub.safeRehearseCheck=()=>({action:'block',severity:'critical'});window.SelHub.rehearseBreakCharacterText=()=> 'Mock safety response';});await field().fill('A fictional safety check');await send().click();await settled();expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect((await snapshot())._lastTier).toBe(3);expect((await snapshot()).coachHistory[1].text).toBe('Mock safety response');expect(errors).toEqual([]);
  },120000);

  it('guards blanks, composing Enter and duplicate sends while retaining the pending draft',async()=>{
    await mount();await field().fill('   ');expect(await send().isDisabled()).toBe(true);await field().press('Enter');expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);await field().fill('A pending question');await field().dispatchEvent('keydown',{key:'Enter',isComposing:true});expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    await page.evaluate(()=>window.coachMode='pending');await field().press('Enter');await page.waitForFunction(()=>typeof window.resolveCoach==='function');expect(await field().isDisabled()).toBe(true);expect(await field().inputValue()).toBe('A pending question');expect(await map().getByRole('status').innerText()).toContain('draft is kept');await field().dispatchEvent('keydown',{key:'Enter'});expect(await page.evaluate(()=>window.depthCoachCalls.length)).toBe(1);await page.evaluate(()=>window.resolveCoach('Reply after waiting'));await settled();expect((await snapshot()).coachHistory).toHaveLength(2);expect(errors).toEqual([]);
  },120000);

  it.each(['elementary','middle','high'])('offers %s fictional examples without sending or overwriting a draft',async band=>{
    await mount(band);await map().getByText('Try a fictional example',{exact:true}).click();const examples=map().getByRole('button',{name:/Use prompt:/});expect(await examples.count()).toBe(3);await examples.first().click();expect(await field().inputValue()).toContain('Fictional example:');expect(await examples.nth(1).isDisabled()).toBe(true);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);const saved=await snapshot();await mount(band,'light',1100,saved);expect(await field().inputValue()).toBe(saved.coachInput);expect(errors).toEqual([]);
  },120000);

  it('keeps an editable offline draft and respects the existing consent gate',async()=>{
    await mount('middle','light',1100,{offline:true});await field().fill('Offline draft');expect(await send().isDisabled()).toBe(true);expect(await map().innerText()).toContain('AI replies are unavailable');await page.getByRole('tab',{name:/Ways to Care/}).click();await page.getByRole('tab',{name:/Practice/}).click();expect(await field().inputValue()).toBe('Offline draft');
    await page.evaluate(()=>{window.SelHub.hasCoachConsent=()=>false;window.SelHub.renderConsentScreen=h=>h('p',null,'Consent required');});await page.getByRole('tab',{name:/Ways to Care/}).click();await page.getByRole('tab',{name:/Practice/}).click();expect(await page.getByText('Consent required',{exact:true}).isVisible()).toBe(true);expect(await field().count()).toBe(0);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('provides readable keyboard controls and failure recovery at 320px in %s',async theme=>{
    await mount('middle',theme,320);for(const title of ['Before asking (optional)','Try a fictional example','Check a suggestion before using it']){const summary=map().getByText(title,{exact:true});await summary.focus();await page.keyboard.press('Enter');}
    await field().fill('Fictional example: how could I ask for space?');await page.evaluate(()=>window.coachMode='reject');await send().click();await settled();await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);expect(await map().locator('input,button,summary').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44))).toBe(true);
    for(const [target,name]of [['Explore a possible next step','intro'],['Situation or question for the coach','draft'],['Check a suggestion before using it','review']]){await map().getByText(target,{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
