import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_teamwork.js'), 'utf8');
const cases = JSON.parse(source.match(/var RETRO_PRACTICE = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-teamwork-retrospective');
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
      const [data, setData] = R.useState({ teamwork: { soundEnabled: false, activeTab: 'retro', ...initial } });
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
  await page.getByRole('tab', { name: /Retro/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Team retrospective practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.teamwork.retroDrafts?.[id], id);

describe('Team retrospective practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Team retrospective practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);


  const open = text => map().getByText(text,{exact:true}).click();
  const labels=['What happened, and what helped','Different perspectives and missing voices','One change to try','Support and shared responsibility','When and how to review','What happened next, and what to revise'];
  async function openNotes(){for(const text of ['1. Look back: evidence and perspectives','2. Plan one supported change','3. Return after trying it'])await open(text);}

  it.each(examples)('$band / $item.id connects observations to a supported change and later review',async({band,item})=>{
    await mount(band);await map().getByLabel('Choose a retrospective context',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setups[band]);
    await open('Examine the example');await open('Compare a possible plan');await openNotes();await open('Explore a fictional follow-up');
    for(const text of [item.notice,item.plan,item.later,item.adjust])expect(await map().innerText()).toContain(text);
    expect(await map().getByRole('textbox').count()).toBe(6);expect(await draft(band+':'+item.id)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.teamwork.retroSaved)).toBeUndefined();expect(await page.evaluate(()=>window.depthSnapshot.teamwork.practiceLog)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

  it('keeps six editable notes independent across contexts, grades, navigation and serialized restoration',async()=>{
    await mount();await openNotes();
    for(const [i,label] of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('Working note '+i+'\nSecond line');
    await map().getByLabel('Choose a retrospective context',{exact:true}).selectOption('own');await openNotes();
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My own observation');
    await page.evaluate(()=>window.depthSetBand('high'));await openNotes();await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Different grade');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);await mount('middle','light',1100,JSON.parse(JSON.stringify(saved)));
    expect(await map().getByLabel('Choose a retrospective context',{exact:true}).inputValue()).toBe('own');
    await page.getByRole('tab',{name:/Virtual Team/}).click();await page.getByRole('tab',{name:/Retro/}).click();
    await map().getByLabel('Choose a retrospective context',{exact:true}).selectOption('turns');await openNotes();
    for(const [i,label] of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('Working note '+i+'\nSecond line');
    await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('');expect((await draft('middle:turns')).perspectives).toBe('');
    await open('Review or copy my notes');const review=await map().getByLabel('Review text to copy',{exact:true}).inputValue();
    expect(review).toContain('Working note 0\nSecond line');expect(review).toContain('(not recorded)');expect(review).not.toContain('My own observation');expect(review).not.toContain('Different grade');
    expect((await draft('middle:own')).evidence).toBe('My own observation');expect((await draft('high:turns')).evidence).toBe('Different grade');expect(errors).toEqual([]);
  },120000);

  it('preserves earlier cards, unfinished inputs, flags, reflections, awards and logs without importing them',async()=>{
    const legacy={retroGreen:['Clear instructions'],retroYellow:['Materials missing'],retroBlue:['Check access'],retroGreenInput:'Unfinished thought',retroSaved:true,reflectionNote:'Earlier note',earnedBadges:{retro_runner:123,retro_exporter:124},practiceLog:[{type:'retro',id:'retrospective',timestamp:123}]};
    await mount('middle','light',1100,legacy);await open('Earlier retrospective cards');for(const text of ['Clear instructions','Materials missing','Check access','Unfinished thought'])expect(await map().innerText()).toContain(text);
    await openNotes();expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Try one change');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();expect(await page.getByText('Earlier retrospective',{exact:true}).count()).toBe(1);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('handles malformed drafts and cards, retains unknown fields and supports keyboard disclosure and selection',async()=>{
    await mount('middle','light',1100,{retroSelections:{middle:'missing'},retroDrafts:{'middle:turns':{evidence:42,perspectives:[],extra:'keep'}},retroGreen:'invalid',retroYellow:[null,{bad:true},'Valid earlier card'],retroBlue:42});
    const first=map().getByText('1. Look back: evidence and perspectives',{exact:true});await first.focus();await page.keyboard.press('Enter');
    expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Observed');expect((await draft('middle:turns')).extra).toBe('keep');
    await open('Earlier retrospective cards');expect(await map().innerText()).toContain('Valid earlier card');
    const selector=map().getByLabel('Choose a retrospective context',{exact:true});await selector.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await selector.inputValue()).toBe('deadline');expect(await selector.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('elementary','light',1100,{retroSelections:[],retroDrafts:[]});await openNotes();await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('With help');expect((await draft('elementary:turns')).evidence).toBe('With help');expect(errors).toEqual([]);
  },120000);

  it.each(['success','false','reject','throw','native-success','unavailable'])('copy reports %s honestly, retains selectable text and never awards completion',async mode=>{
    await mount();await openNotes();await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Specific observation');await open('Review or copy my notes');
    await page.evaluate(mode=>{
      window.copiedReview=[];
      if(mode==='native-success'||mode==='unavailable'){
        delete window.SelHub.copyText;Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='unavailable'?undefined:{writeText:text=>{window.copiedReview.push(text);return Promise.resolve();}}});
      }else window.SelHub.copyText=text=>{window.copiedReview.push(text);if(mode==='throw')throw new Error('Denied');return mode==='reject'?Promise.reject(new Error('Denied')):Promise.resolve(mode==='success');};
    },mode);
    const preview=map().getByLabel('Review text to copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();await preview.focus();expect(await preview.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByRole('button',{name:'Copy review text',exact:true}).click();
    const success=['success','native-success'].includes(mode);await page.waitForFunction(()=>window.depthAnnouncements.length>0);
    const message=await page.evaluate(()=>window.depthAnnouncements.at(-1));expect(message).toBe(success?'Retrospective notes copied.':'Copy unavailable. Select the review text and copy it manually.');
    if(mode!=='unavailable')expect(await page.evaluate(()=>window.copiedReview[0])).toBe(await preview.inputValue());
    expect(await preview.inputValue()).toContain('Specific observation');expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthSnapshot.teamwork.earnedBadges)).toBeUndefined();expect(await page.evaluate(()=>window.depthSnapshot.teamwork.retroSaved)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports retrospective reflection at 320px in %s',async theme=>{
    await mount('high',theme,320,{retroGreen:['Earlier accessible instructions']});await map().getByLabel('Choose a retrospective context',{exact:true}).selectOption('deadline');
    await open('Examine the example');await openNotes();await open('Compare a possible plan');await open('Explore a fictional follow-up');await open('Review or copy my notes');await open('Earlier retrospective cards');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('The report was on time. Editing took one person an extra hour.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('summary:visible,select:visible,button:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-context-phone.png')});
    await map().getByText('2. Plan one supported change',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-plan-phone.png')});
    await map().getByText('3. Return after trying it',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-review-phone.png')});expect(errors).toEqual([]);
  },120000);
});
