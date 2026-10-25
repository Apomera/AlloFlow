import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_KEYBOARD_EVIDENCE_OUTPUT || 'test-results/dissection-keyboard-evidence';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await mkdir(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

async function mount(page: Page, state: Record<string, unknown> = {}, width = 1280, dark = false) {
  await page.setViewportSize({ width, height: 900 });
  await harness.mount(page, { dissection: {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', quizMode: false, quizReviewMode: false, quizReviewQueue: ['tympanum'],
    quizAnswerMode: 'choices', quizSeed: 42, quizIdx: 0, quizScore: 0, quizTotal: 0,
    assessmentRecordedScore: 2, assessmentRecordedTotal: 4, assessmentCompletedAt: 100,
    reducedMotion: true, soundEnabled: false, sceneDetail: false, ...state,
  } }, undefined, { expectCanvas: false });
  const host = await readFile('stem_lab/stem_lab_module.js', 'utf8');
  const effects = ['stem-theme-overrides', 'stem-contrast-fix'].map(id => {
    const site = host.indexOf("var id = '" + id + "'"), start = host.lastIndexOf('React.useEffect(', site);
    const open = host.indexOf('{', start), end = host.indexOf('}, [isDark, isContrast]);', site);
    if (site < 0 || start < 0 || end < 0) throw Error('Missing host theme effect: ' + id);
    return host.slice(open + 1, end);
  });
  await page.evaluate(({ dark, effects }) => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.cssText = 'width:100%;max-width:1180px;position:relative;display:block;margin:auto'; wrap.setAttribute('data-stem-lab', '');
    document.body.className = dark ? 'theme-dark' : 'theme-default';
    for (const body of effects) new Function('isDark', 'isContrast', body)(dark, false);
    (window as any).__ctx.isDark = dark; (window as any).__rerender();
  }, { dark, effects });
}
async function activate(page: Page, button: ReturnType<Page['getByRole']>, key = 'Enter') {
  await button.focus(); await page.keyboard.press(key);
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer', 'annotations', 'assessmentRecordedScore', 'assessmentRecordedTotal'].map(key => [key, d[key]]));
  });
}
const continuation = (page: Page) => page.locator('#diss-quiz-panel').getByRole('button', { name: /^(Next Question|View assessment summary)$/ });

const selected = (page: Page) => page.locator('[data-dissection-specimens] [role="tab"][aria-selected="true"]');
const displayToolbar = (page: Page) => page.getByRole('toolbar', { name: 'Specimen display and lab tool controls', exact: true });
async function localImage(page: Page) { return page.evaluate(() => { const c=document.createElement('canvas'); c.width=c.height=2; c.getContext('2d')!.fillRect(0,0,2,2); return c.toDataURL('image/png'); }); }

test('modified and composing keys do not change the active specimen or toolbar focus', async ({ page }) => {
  await mount(page, { specimen: 'pig', _dissLoadedSpec: 'pig' });
  const before=await evidence(page);
  for (const control of [selected(page),displayToolbar(page).getByRole('button',{name:'View and accessibility options',exact:true})]) {
    await control.focus();
    const prevented=await control.evaluate(node => [
      {key:'Home',ctrlKey:true},{key:'ArrowLeft',altKey:true},{key:'End',metaKey:true},{key:'ArrowRight',shiftKey:true},
      {key:'ArrowRight',ctrlKey:true,altKey:true},{key:'ArrowRight',isComposing:true},{key:'Home',keyCode:229}
    ].map(options => { const event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...options}); node.dispatchEvent(event); return event.defaultPrevented; }));
    expect(prevented).toEqual(Array(7).fill(false)); await expect(control).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__ctx.toolData.dissection.specimen)).toBe('pig'); expect(await evidence(page)).toEqual(before);
  }
});

test('plain specimen navigation focuses selected tabs and saves departing notes', async ({ page }) => {
  await mount(page,{organNotes:{'frog|nictitating':'A transparent membrane covers the eye.'}});
  const tabs=page.locator('[data-dissection-specimens] [role="tab"]');
  await selected(page).focus(); await page.keyboard.press('ArrowRight'); await expect(tabs.nth(1)).toBeFocused(); await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('dissection_progress_frog')!).organNotes['frog|nictitating'])).toBe('A transparent membrane covers the eye.');
  for(const [key,last] of [['End',true],['Home',false],['ArrowLeft',true]] as const){await page.keyboard.press(key);const target=last?tabs.last():tabs.first();await expect(target).toBeFocused();await expect(target).toHaveAttribute('aria-selected','true');}
});

test('toolbar arrows skip hidden Essentials controls and inert Advanced controls', async ({ page }) => {
  for(const dark of [false,true]){
    await mount(page,{workspaceMode:'essentials'},320,dark);
    const before=await evidence(page),view=displayToolbar(page).getByRole('button',{name:'View and accessibility options',exact:true});
    await expect(displayToolbar(page).locator('button[aria-label="Lab tool options"]')).toBeHidden();await view.focus();
    for(const key of ['ArrowRight','End','ArrowLeft','Home']){await page.keyboard.press(key);await expect(view).toBeFocused();await expect(view).toBeInViewport();}
    expect(await evidence(page)).toEqual(before);expect(await view.evaluate(node=>node.matches(':focus-visible'))).toBe(true);
    await displayToolbar(page).screenshot({path:out+'/essentials-'+(dark?'dark':'light')+'-focus.png'});
  }
  await mount(page);const view=displayToolbar(page).getByRole('button',{name:'View and accessibility options',exact:true}),tools=displayToolbar(page).getByRole('button',{name:'Lab tool options',exact:true});
  await view.focus();await page.keyboard.press('End');await expect(tools).toBeFocused();await expect(tools).toBeVisible();
  await page.keyboard.press('ArrowRight');await expect(view).toBeFocused();await tools.evaluate(node=>node.setAttribute('inert',''));await page.keyboard.press('End');await expect(view).toBeFocused();
});

test('refused specimen navigation keeps recovery focus and protected save bytes', async ({ page }) => {
  await mount(page);const before=await evidence(page),raw=JSON.stringify({schemaVersion:22,activeLayer:'skin',organNotes:{'frog|nictitating':'Protected observation.'},futureOnlyField:{preserve:true}});
  await page.evaluate(raw=>{const key='dissection_progress_frog';localStorage.setItem(key,raw);window.dispatchEvent(new StorageEvent('storage',{key,newValue:raw}));},raw);
  await expect(page.locator('[data-dissection-protected-save]')).toBeVisible();await page.locator('#diss-specimen-tab-frog').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('#diss-protected-save-retry')).toBeFocused();await expect(page.locator('#diss-specimen-tab-frog')).toHaveAttribute('aria-selected','true');
  expect(await page.evaluate(()=>localStorage.getItem('dissection_progress_frog'))).toBe(raw);expect(await evidence(page)).toEqual(before);
  await page.locator('[data-dissection-protected-save]').screenshot({path:out+'/protected-recovery-focus.png'});
});

test('unsafe evidence causes no remote requests and valid inline evidence downloads', async ({ page }) => {
  const image=await localImage(page),requests:string[]=[];await page.route('https://evidence.invalid/**',async route=>{requests.push(route.request().url());await route.abort();});
  await mount(page,{evidenceNotebookOpen:true,visualEvidence:[
    {id:101,image:'https://evidence.invalid/tracker.png',layer:'skin'},
    {id:102,image:'javascript:void(window.__dissUnsafeDownloadRan=true)',layer:'skin'},
    {id:103,image:'data:image/svg+xml,<svg/>',layer:'skin'},{id:104,image,layer:'skin'}]});
  await expect(page.locator('[data-evidence-id]')).toHaveCount(1);await expect(page.locator('[data-evidence-id="104"] img')).toHaveAttribute('src',image);expect(requests).toEqual([]);
  const pending=page.waitForEvent('download');await page.locator('[data-evidence-id="104"]').getByRole('button',{name:/^Download frame/}).click();const downloaded=await pending;
  expect(downloaded.suggestedFilename()).toBe('frog_skin_104.png');await writeFile(out+'/safe-download.json',JSON.stringify({requests,filename:downloaded.suggestedFilename()},null,2));
});

test('download revalidates a changed frame before creating a navigation link', async ({ page }) => {
  const image=await localImage(page);await mount(page,{techniquePanelOpen:true,evidenceNotebookOpen:true,visualEvidence:[{id:105,image,layer:'skin'}]});const before=await evidence(page);
  await page.evaluate(()=>{(window as any).__dissUnsafeDownloadRan=false;(window as any).__dissEvidenceLinks=[];const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){(window as any).__dissEvidenceLinks.push(this.href);return original.call(this);};(window as any).__ctx.toolData.dissection.visualEvidence[0].image='javascript:void(window.__dissUnsafeDownloadRan=true)';});
  await page.locator('[data-evidence-id="105"]').getByRole('button',{name:/^Download frame/}).press('Enter');await page.waitForTimeout(100);
  const result=await page.evaluate(()=>({executed:(window as any).__dissUnsafeDownloadRan,links:(window as any).__dissEvidenceLinks}));await writeFile(out+'/unsafe-download-probe.json',JSON.stringify(result,null,2));
  expect(result.executed).toBe(false);expect(result.links).toEqual([]);await expect(page.locator('.diss-procedure__feedback[role="status"]')).toContainText('Evidence download blocked');expect(await evidence(page)).toEqual(before);
});

test.afterAll(async()=>{const substitute=process.env.STEM_GL_SUBSTITUTE?.split(';').find(entry=>entry.startsWith('stem_lab/stem_tool_dissection.js='))?.slice('stem_lab/stem_tool_dissection.js='.length);const servedFile=substitute||'stem_lab/stem_tool_dissection.js';await writeFile(out+'/source.json',JSON.stringify({servedFile,sourceSha256:createHash('sha256').update(await readFile(servedFile)).digest('hex')},null,2));});
