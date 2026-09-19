import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_teamwork.js'), 'utf8');
const cases = JSON.parse(source.match(/var AGREEMENT_EXAMPLES = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band => cases.map(item => ({band,item})));
const reports = path.join(root, 'reports/sel-teamwork-agreement');
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
      const [data, setData] = R.useState({ teamwork: { soundEnabled: false, activeTab: 'contract', ...initial } });
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
  await page.getByRole('tab', { name: /Contract/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Working team agreement', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.teamwork.agreementDrafts?.[id], id);

describe('Working team agreement', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Working team agreement</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);



  const open = text => map().getByText(text,{exact:true}).click();
  const labels=['What this agreement is for','Whose input is still needed','What we propose doing','Ways to participate and get support','Responsibilities to discuss','If the agreement is not working','When and how we will revisit it'];
  const checkLabels=['Clear enough to try','Workable ways to join','Room to question and revise','Support and a review point'];
  const fields=['purpose','voices','practice','access','roles','repair','review'];
  async function openNotes(){for(const text of ['1. Purpose and participation','2. Practices, access and responsibilities','3. Support and revision'])await open(text);}

  it.each(examples)('$band / $item.id explains a conditional proposal and a changed circumstance without filling the draft',async({band,item})=>{
    await mount(band);await open('Compare and test example agreements');await map().getByLabel('Choose an agreement example',{exact:true}).selectOption(item.id);
    expect(await map().innerText()).toContain(item.setups[band]);await open('Compare a more workable proposal');await open('Test it when circumstances change');
    for(const text of [item.initial,item.problem,item.proposal,item.test,item.revision])expect(await map().innerText()).toContain(text);
    await openNotes();expect(await map().getByRole('textbox').count()).toBe(7);expect(await draft(band)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(await page.evaluate(()=>window.depthSnapshot.teamwork.contractSaved)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

  it('keeps all seven notes and reviews across examples, grades, tabs and serialized restoration',async()=>{
    await mount();await openNotes();for(const [i,label] of labels.entries())await map().getByLabel(label+' (optional)',{exact:true}).fill('My note '+i+'\nSecond line');
    await open('Check my draft before discussing it');for(const [i,label] of checkLabels.entries())await map().getByLabel(label,{exact:true}).selectOption(i===1?'revise':'discuss');
    await open('Compare and test example agreements');await map().getByLabel('Choose an agreement example',{exact:true}).selectOption('timing');
    expect((await draft('middle')).practice).toBe('My note 2\nSecond line');expect((await draft('middle')).reviews.clear).toBe('discuss');
    await page.evaluate(()=>window.depthSetBand('high'));await openNotes();await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('High school draft');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);await mount('middle','light',1100,JSON.parse(JSON.stringify(saved)));
    await page.getByRole('tab',{name:/Retro/}).click();await page.getByRole('tab',{name:/Contract/}).click();await openNotes();
    for(const [i,label] of labels.entries())expect(await map().getByLabel(label+' (optional)',{exact:true}).inputValue()).toBe('My note '+i+'\nSecond line');
    await open('Check my draft before discussing it');expect(await map().getByLabel(checkLabels[1],{exact:true}).inputValue()).toBe('revise');
    await open('Compare and test example agreements');expect(await map().getByLabel('Choose an agreement example',{exact:true}).inputValue()).toBe('timing');
    await open('Review my proposal');const preview=map().getByLabel('Proposal text to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();
    expect(await preview.inputValue()).toContain('My note 4\nSecond line');expect(await preview.inputValue()).toContain('not a record of team consent');expect(await preview.inputValue()).toContain('Workable ways to join: Needs revision');expect(await preview.inputValue()).not.toContain('High school draft');expect(await preview.inputValue()).not.toContain(cases[1].proposal);
    expect((await draft('high')).purpose).toBe('High school draft');expect(errors).toEqual([]);
  },120000);

  it('resets all known review choices when wording changes, preserves notes and unknown fields, and allows clearing checks',async()=>{
    await mount('middle','light',1100,{agreementDrafts:{middle:{practice:'Keep this',extra:'future',reviews:{clear:'discuss',workable:'revise',voice:'discuss',followup:'discuss',future:'keep'}}}});await openNotes();await open('Check my draft before discussing it');
    await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('A revised purpose');for(const label of checkLabels)expect(await map().getByLabel(label,{exact:true}).inputValue()).toBe('');
    const saved=await draft('middle');expect(saved.practice).toBe('Keep this');expect(saved.extra).toBe('future');expect(saved.reviews).toEqual({future:'keep'});expect(await page.evaluate(()=>window.depthAnnouncements)).toEqual(['Draft changed. Review choices reset so you can check the new wording.']);
    await map().getByLabel(checkLabels[0],{exact:true}).selectOption('discuss');await map().getByLabel(checkLabels[0],{exact:true}).selectOption('');expect((await draft('middle')).purpose).toBe('A revised purpose');
    await map().getByLabel(checkLabels[2],{exact:true}).selectOption('revise');await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('');expect((await draft('middle')).reviews.voice).toBeUndefined();expect((await draft('middle')).practice).toBe('');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthSnapshot.teamwork.earnedBadges)).toBeUndefined();expect(await page.evaluate(()=>window.depthSnapshot.teamwork.practiceLog)).toBeUndefined();expect(errors).toEqual([]);
  },120000);

  it('keeps earlier agreement, role, communication, consequence, saved and award records intact',async()=>{
    const legacy={contractAgreements:['Earlier promise'],contractRoles:['Earlier role'],contractComms:'Earlier channel',contractConsequence:'Earlier penalty text',contractSaved:true,earnedBadges:{contract_creator:123},practiceLog:[{type:'contract',id:'team_contract',timestamp:123}]};
    await mount('middle','light',1100,legacy);await open('Earlier contract records');for(const text of ['Earlier promise','Earlier role','Earlier channel','Earlier penalty text'])expect(await map().innerText()).toContain(text);
    await openNotes();expect(await map().getByLabel(labels[2]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('An accessible proposal');
    const saved=await page.evaluate(()=>window.depthSnapshot.teamwork);for(const [key,value] of Object.entries(legacy))expect(saved[key]).toEqual(value);
    await page.getByRole('tab',{name:/Progress/}).click();expect(await page.getByText('Earlier contract',{exact:true}).count()).toBe(1);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('handles malformed records and retains focus while choosing examples and review options with the keyboard',async()=>{
    await mount('middle','light',1100,{contractAgreements:[null,'Valid historical line',{}],contractRoles:42,contractComms:[],contractConsequence:{},agreementDrafts:{middle:{purpose:42,reviews:{clear:'not-real'}}},agreementExamples:{middle:'missing'}});
    await open('Earlier contract records');expect(await map().innerText()).toContain('Valid historical line');await openNotes();expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');
    const details=map().getByText('Check my draft before discussing it',{exact:true});await details.focus();await page.keyboard.press('Enter');const review=map().getByLabel(checkLabels[0],{exact:true});expect(await review.inputValue()).toBe('');await review.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await review.inputValue()).toBe('revise');expect(await review.evaluate(node=>node===document.activeElement)).toBe(true);
    await open('Compare and test example agreements');const selector=map().getByLabel('Choose an agreement example',{exact:true});await selector.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect(await selector.inputValue()).toBe('timing');expect(await selector.evaluate(node=>node===document.activeElement)).toBe(true);
    await mount('elementary','light',1100,{agreementDrafts:[],agreementExamples:[]});await openNotes();await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Work together');expect((await draft('elementary')).purpose).toBe('Work together');expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports working agreements at 320px in %s',async theme=>{
    await mount('high',theme,320,{contractAgreements:['Earlier agreement']});await open('Compare and test example agreements');await map().getByLabel('Choose an agreement example',{exact:true}).selectOption('repair');await open('Compare a more workable proposal');await open('Test it when circumstances change');await openNotes();await open('Check my draft before discussing it');await open('Review my proposal');await open('Earlier contract records');
    await map().getByLabel(labels[2]+' (optional)',{exact:true}).fill('Ask before changing shared work.');await map().getByLabel(checkLabels[0],{exact:true}).selectOption('discuss');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);expect(await map().locator('summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await map().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-example-phone.png')});
    await map().getByText('2. Practices, access and responsibilities',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-draft-phone.png')});
    await map().getByText('Check my draft before discussing it',{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(reports,theme+'-review-phone.png')});expect(errors).toEqual([]);
  },120000);
});
