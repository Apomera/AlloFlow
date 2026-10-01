import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { unifiedDemoToolbar, unifiedDemoClientScript } from '../dev-tools/school_store_unified_demo_ui.mjs';

const opened = [];
afterEach(() => { opened.splice(0).forEach(dom => dom.window.close()); vi.restoreAllMocks(); });
const metadata = () => ({ classId: 'CLS-DEMO-KING', classLabel: 'Fictional demo class', primaryStudentId: 'STUDENT-AVERY', categoryId: 'CATEGORY-HOWl', notebookId: 'NOTEBOOK', learners: [
  { learnerId: 'LRN-1', codename: 'Calm Otter', studentId: 'STUDENT-AVERY' },
  { learnerId: 'LRN-2', codename: 'Brave Robin', studentId: 'STUDENT-BLAKE' },
  { learnerId: 'LRN-3', codename: 'Bright Fox', studentId: 'STUDENT-CASEY' }
] });
const portalControls = `<span id="actor-pill">STAFF</span><div id="notice" class="status"></div>
<button id="tab-dashboard"></button><button id="tab-award"></button><button id="tab-store"></button><button id="tab-print"></button>
<details id="linked-learner-card"><div id="typed-recognition-controls"><textarea id="typed-recognition-input"></textarea>
<select id="typed-recognition-category"><option value="">Choose category</option><option value="CATEGORY-HOWl">HOWL</option><option value="OTHER-CATEGORY">Other category</option></select></div></details>
<button id="linked-classes-load"></button><select id="linked-class"><option value="">Choose class</option></select>
<button id="award-submit"></button><button id="retry-award" hidden></button><button id="restore-award" hidden></button>
<button id="typed-recognition-review"></button><button id="linked-learner-use"></button><button id="checkout-submit"></button><fieldset id="typed-voice-controls"><button id="typed-voice-start"></button><button id="typed-voice-cancel" hidden></button></fieldset>`;

async function tick() { await new Promise(resolve => setTimeout(resolve, 0)); }
async function open({ step = 'recognize', role = 'staff', deferLoad = false, data = metadata(), beforeStart } = {}) {
  const vc = new VirtualConsole(), errors = []; vc.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM('<body data-demo-generation="fictional-generation">' + unifiedDemoToolbar(data) + portalControls + '</body>', { url: 'http://127.0.0.1:8767/?demoStep=' + step + '&role=' + role, runScripts: 'outside-only', virtualConsole: vc });
  opened.push(dom); const w = dom.window, $ = id => w.document.getElementById(id);
  w.HTMLElement.prototype.scrollIntoView = vi.fn(); $('demo-role').value = role; $('actor-pill').textContent = role.toUpperCase();
  const forbidden = ['typed-recognition-review', 'linked-learner-use', 'award-submit', 'checkout-submit', 'typed-voice-start'].map(id => { const call = vi.fn(); $(id).onclick = call; return call; });
  const fetch = vi.fn(() => { throw new Error('Unexpected direct network request'); }); w.fetch = fetch;
  const speech = vi.fn(() => { throw new Error('Unexpected microphone capability access'); }); Object.defineProperty(w, 'SpeechRecognition', { get: speech });
  const rpc = vi.fn(); w.google = { script: { run: new Proxy({}, { get() { return rpc; } }) } };
  const reads = [], choices = [];
  const deliverClass = () => { $('linked-class').innerHTML = '<option value="">Choose class</option><option value="CLS-DEMO-KING">Fictional demo class</option><option value="OTHER-CLASS">Other class</option>'; $('notice').className = 'status'; };
  $('linked-classes-load').onclick = () => { reads.push('listSchoolRewardsAlloFlowLinkedClasses'); $('linked-class').innerHTML = '<option value="">Choose class</option>'; $('notice').className = 'status busy'; if (!deferLoad) deliverClass(); };
  $('linked-class').onchange = () => { choices.push(['class', $('linked-class').value]); $('typed-recognition-input').value = ''; $('typed-recognition-category').value = ''; };
  // Model property-only edits: no attribute, text, or option-tree mutation.
  $('typed-recognition-category').onchange = () => choices.push(['category', $('typed-recognition-category').value]);
  $('typed-recognition-input').oninput = () => choices.push(['input', $('typed-recognition-input').value]);
  const app = { dom, w, $, errors, reads, choices, forbidden, fetch, speech, rpc, deliverClass,
    set(id, value) { $(id).value = value; $(id).dispatchEvent(new w.Event(id === 'typed-recognition-input' ? 'input' : 'change', { bubbles: true })); },
    load() { return $('demo-load-example').onclick(); }
  };
  if (beforeStart) beforeStart(app); w.eval(unifiedDemoClientScript()); await tick(); return app;
}

describe('unified fictional demo UI', () => {
  it('escapes metadata and every displayed codename without executable markup', async () => {
    const data = metadata(); data.classLabel = '<script id="injected">bad()</script> & "class"'; data.learners[0].codename = '<img id="injected-image" src=x onerror=bad()> & Otter';
    const app = await open({ data, step: 'class' });
    expect(app.w.document.getElementById('injected')).toBeNull(); expect(app.w.document.getElementById('injected-image')).toBeNull(); expect(app.w.document.querySelectorAll('script,iframe')).toHaveLength(0);
    expect(app.$('demo-scene-class').textContent).toContain(data.classLabel); expect([...app.$('demo-prepared-roster').children].map(n => n.textContent)).toEqual(data.learners.map(n => n.codename));
    expect(JSON.parse(app.$('unified-demo').getAttribute('data-demo-metadata')).learners).toEqual(data.learners); expect(app.errors).toEqual([]);
  });
  it('provides exactly four same-origin steps with fixed simulated roles and retained advanced controls', async () => {
    const app = await open({ step: 'class' }); const links = [...app.$('unified-demo').querySelectorAll('[data-demo-step]')];
    expect(links.map(link => { const url = new URL(link.href); expect(url.origin).toBe('http://127.0.0.1:8767'); expect(url.pathname).toBe('/'); return [url.searchParams.get('demoStep'), url.searchParams.get('role')]; })).toEqual([['class', 'staff'], ['recognize', 'staff'], ['balance', 'student'], ['shop', 'cashier']]);
    expect(app.w.document.querySelectorAll('#demo-role')).toHaveLength(1); expect(app.w.document.querySelectorAll('#demo-reset')).toHaveLength(1); expect(app.$('demo-advanced').open).toBe(false);
    expect(new URL(app.$('demo-start').href).searchParams.get('demoStep')).toBe('recognize'); expect(app.$('unified-demo').textContent).toContain('no live Google OAuth'); expect(app.$('unified-demo').textContent).toContain('not student authentication');
  });
  it.each([['class', 'staff'], ['recognize', 'staff'], ['balance', 'student'], ['shop', 'cashier']])('opens %s without automatic read, mutation, example, or microphone work', async (step, role) => {
    const app = await open({ step, role }); expect(app.$('demo-scene-' + step).hidden).toBe(false); expect(app.$('unified-demo').querySelector('[aria-current="step"]').dataset.demoStep).toBe(step);
    expect(app.reads).toEqual([]); app.forbidden.forEach(call => expect(call).not.toHaveBeenCalled()); expect(app.fetch).not.toHaveBeenCalled(); expect(app.rpc).not.toHaveBeenCalled(); expect(app.speech).not.toHaveBeenCalled(); expect(app.$('typed-recognition-input').value).toBe(''); expect(app.w.sessionStorage.length).toBe(0);
  });
  it('loads the readonly class list only on click, then fills selections through actual control events', async () => {
    const app = await open(); expect(app.$('demo-load-example').disabled).toBe(false); await app.load();
    expect(app.reads).toEqual(['listSchoolRewardsAlloFlowLinkedClasses']); expect(app.choices).toEqual([['class', 'CLS-DEMO-KING'], ['category', 'CATEGORY-HOWl'], ['input', 'give Calm Otter 5 points for helping']]);
    expect(app.$('typed-recognition-input').value).toBe('give Calm Otter 5 points for helping'); expect(app.$('demo-status').textContent).toContain('not awarded');
    app.forbidden.forEach(call => expect(call).not.toHaveBeenCalled()); expect(app.fetch).not.toHaveBeenCalled(); expect(app.rpc).not.toHaveBeenCalled(); expect(app.speech).not.toHaveBeenCalled(); expect(app.errors).toEqual([]);
  });
  it('does not replace an existing typed draft or perform a read', async () => {
    const app = await open(); app.set('typed-recognition-input', 'Keep this unfinished draft'); await app.load(); expect(app.$('typed-recognition-input').value).toBe('Keep this unfinished draft'); expect(app.reads).toEqual([]); expect(app.$('demo-status').textContent).toContain('not replaced');
  });
  it.each(['typed-recognition-input', 'typed-recognition-category'])('preserves %s edits during a held class load and releases the button promptly', async id => {
    const app = await open({ deferLoad: true }), loading = app.load(); expect(app.$('demo-load-example').disabled).toBe(true);
    const value = id === 'typed-recognition-input' ? 'My current draft' : 'OTHER-CATEGORY'; app.set(id, value);
    const outcome = await Promise.race([loading.then(() => 'finished'), new Promise(resolve => setTimeout(() => resolve('pending'), 500))]);
    expect(outcome).toBe('finished'); expect(app.$('demo-load-example').disabled).toBe(false); expect(app.$(id).value).toBe(value); expect(app.$('demo-status').textContent).toContain('current choices were kept');
    app.deliverClass(); await tick(); expect(app.$(id).value).toBe(value); expect(app.choices.some(([kind]) => kind === 'class')).toBe(false); app.forbidden.forEach(call => expect(call).not.toHaveBeenCalled());
  });
  it.each(['award', 'award_group'])('blocks an original pending %s retry without loading or changing its key', async operation => {
    const app = await open(), key = 'alloflow_school_rewards_retry_' + operation, value = '{"key":"original-fictional-key","fingerprint":"0123456789abcdef"}'; app.w.sessionStorage.setItem(key, value); await app.load();
    expect(app.reads).toEqual([]); expect(app.choices).toEqual([]); expect(app.w.sessionStorage.getItem(key)).toBe(value); expect(app.$('demo-status').textContent).toContain('pending award retry');
  });
  it('rechecks pending recovery when a class list arrives after a new pending award', async () => {
    const app = await open({ deferLoad: true }), loading = app.load(); app.w.sessionStorage.setItem('alloflow_school_rewards_retry_award', 'original'); app.deliverClass(); await loading;
    expect(app.$('typed-recognition-input').value).toBe(''); expect(app.choices).toEqual([]); expect(app.$('demo-status').textContent).toContain('pending award retry'); expect(app.reads).toHaveLength(1);
  });
  it('moves the original voice controls into a collapsed, touch-friendly optional section without starting capture', async () => {
    let fieldset, start; const app = await open({ beforeStart(a) { fieldset = a.$('typed-voice-controls'); start = a.$('typed-voice-start'); } });
    const details = app.$('demo-optional-voice'); expect(details.open).toBe(false); expect(details.querySelector('#typed-voice-controls')).toBe(fieldset); expect(details.querySelector('#typed-voice-start')).toBe(start);
    expect(app.w.getComputedStyle(details.querySelector('summary')).minHeight).toBe('44px'); app.forbidden.forEach(call => expect(call).not.toHaveBeenCalled()); expect(app.speech).not.toHaveBeenCalled();
  });
  it('uses the existing visible cancel control when optional voice is closed', async () => {
    const app = await open(), details = app.$('demo-optional-voice'), cancel = vi.fn(() => { app.$('typed-voice-cancel').hidden = true; }); app.$('typed-voice-cancel').onclick = cancel;
    details.open = true; await tick(); expect(cancel).not.toHaveBeenCalled(); app.$('typed-voice-cancel').hidden = false; details.open = false; details.dispatchEvent(new app.w.Event('toggle')); await tick();
    expect(cancel).toHaveBeenCalledTimes(1); expect(app.speech).not.toHaveBeenCalled(); app.forbidden.forEach(call => expect(call).not.toHaveBeenCalled());
  });
  it('removes temporary event listeners after both ready success and edited-load rejection', async () => {
    let removed; const app = await open({ deferLoad: true, beforeStart(a) { removed = vi.spyOn(a.w.document, 'removeEventListener'); } });
    const eventRemovals = () => removed.mock.calls.filter(([name]) => ['input', 'change'].includes(name));
    expect(eventRemovals().map(([name]) => name)).toEqual(['input', 'change']);
    const loading = app.load(); app.set('typed-recognition-input', 'Keep my edited request'); await loading;
    const removals = eventRemovals(); expect(removals.map(([name]) => name)).toEqual(['input', 'change', 'input', 'change']); expect(removals[2][1]).toBe(removals[3][1]); expect(removals[2][1]).not.toBe(removals[0][1]);
    app.set('typed-recognition-input', 'Another local edit'); app.deliverClass(); await tick(); expect(eventRemovals()).toHaveLength(4); expect(app.reads).toHaveLength(1); expect(app.$('typed-recognition-input').value).toBe('Another local edit');
  });
});
