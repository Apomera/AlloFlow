import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const clone = value => JSON.parse(JSON.stringify(value));
let api, React, createRoot, act;
const roots = [];
beforeAll(() => {
  loadAlloModule('utils_pure_module.js'); loadAlloModule('studio_response_module.js');
  api = window.AlloModules.UtilsPure;
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = React); window.React = global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { for (const root of roots.splice(0)) await act(async () => root.unmount()); document.body.innerHTML = ''; vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });
const seed = () => ({ garden: { studio: { workspace: { response: 'Original response', evidence: 'Original evidence' }, evidenceLedger: [{ id: 'row-1', claim: 'First claim', evidence: 'First support' }] } } });
function device(initial = seed()) {
  let stored = clone(initial), queue = Promise.resolve();
  const storage = { get: vi.fn(async () => clone(stored)), set: vi.fn(async (_key, value) => { stored = clone(value); return true; }) };
  const withLock = (_key, operation) => { const next = queue.catch(() => {}).then(operation); queue = next; return next; };
  return { storage, withLock, value: () => clone(stored), replace: value => { stored = clone(value); } };
}
function tab(device) {
  const changes = [];
  const session = api.createLearnerWorkSession({ ...device, onChange: value => changes.push(value) });
  session.hydrate(device.value());
  return { session, changes, edit(fn) { const value = session.state().snapshot; fn(value); session.stage(value); }, value: () => session.state().snapshot };
}
describe('Applied learner work merges against the current saved version', () => {
  it('preserves sequential edits to different fields from stale tabs', async () => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.workspace.response = 'A response'; }); await a.session.save();
    b.edit(v => { v.garden.studio.workspace.evidence = 'B evidence'; }); await b.session.save();
    expect(d.value().garden.studio.workspace).toEqual({ response: 'A response', evidence: 'B evidence' });
    expect(b.value()).toEqual(d.value());
  });
  it('serializes simultaneous saves and exposes a same-field conflict without overwriting', async () => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.workspace.response = 'A response'; });
    b.edit(v => { v.garden.studio.workspace.response = 'B response'; });
    const results = await Promise.all([a.session.save(), b.session.save()]);
    expect(results.map(r => r.status)).toEqual(['saved', 'conflict']);
    expect(d.value().garden.studio.workspace.response).toBe('A response');
    expect(b.value().garden.studio.workspace.response).toBe('B response');
    expect(results[1].conflicts[0]).toMatchObject({ mine: 'B response', saved: 'A response' });
  });
  it('merges separate rows and separate fields within one row', async () => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.evidenceLedger[0].claim = 'A claim'; v.garden.studio.evidenceLedger.push({ id: 'a', claim: 'A added' }); });
    b.edit(v => { v.garden.studio.evidenceLedger[0].evidence = 'B support'; v.garden.studio.evidenceLedger.push({ id: 'b', claim: 'B added' }); });
    await Promise.all([a.session.save(), b.session.save()]);
    expect(d.value().garden.studio.evidenceLedger).toEqual(expect.arrayContaining([{ id: 'row-1', claim: 'A claim', evidence: 'B support' }, { id: 'a', claim: 'A added' }, { id: 'b', claim: 'B added' }]));
  });
  it('does not resurrect a row deleted in another tab; conflicting edits stay recoverable', async () => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.evidenceLedger = []; }); await a.session.save();
    b.edit(v => { v.garden.studio.evidenceLedger[0].evidence = 'Pending support'; });
    expect((await b.session.save()).status).toBe('conflict');
    expect(d.value().garden.studio.evidenceLedger).toEqual([]);
    await b.session.save(() => true, 'saved');
    expect(b.value().garden.studio.evidenceLedger).toEqual([]);
  });
  it('Use saved changes preserves other pending edits', async () => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.workspace.response = 'A response'; }); await a.session.save();
    b.edit(v => { v.garden.studio.workspace.response = 'B response'; v.garden.studio.workspace.evidence = 'B evidence'; });
    await b.session.save(); await b.session.save(() => true, 'saved');
    expect(d.value().garden.studio.workspace).toEqual({ response: 'A response', evidence: 'B evidence' });
  });
  it('requires a new comparison when Keep my changes would overwrite a newer value', async () => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.workspace.response = 'A first'; }); await a.session.save();
    b.edit(v => { v.garden.studio.workspace.response = 'B pending'; }); await b.session.save();
    a.edit(v => { v.garden.studio.workspace.response = 'A second'; }); await a.session.save();
    const decision = await b.session.save(() => true, 'mine');
    expect(decision).toMatchObject({ status: 'conflict', reason: 'changed-again' });
    expect(decision.conflicts[0].saved).toBe('A second');
    expect(d.value().garden.studio.workspace.response).toBe('A second');
    expect((await b.session.save(() => true, 'mine')).status).toBe('saved');
    expect(d.value().garden.studio.workspace.response).toBe('B pending');
  });
  it('refreshes independent fields repeatedly without manufacturing local edits', async () => {
    const d = device(), a = tab(d), b = tab(d);
    b.edit(v => { v.garden.studio.workspace.response = 'B pending'; });
    for (const text of ['A first evidence', 'A second evidence']) {
      a.edit(v => { v.garden.studio.workspace.evidence = text; }); await a.session.save();
      expect((await b.session.refresh()).status).toBe('saving');
      expect(b.value().garden.studio.workspace.evidence).toBe(text);
    }
    expect((await b.session.save()).status).toBe('saved');
    expect(d.value().garden.studio.workspace.response).toBe('B pending');
  });
  it.each(['mine', 'saved'])('reconfirms newly conflicting fields before resolving with %s', async resolution => {
    const d = device(), a = tab(d), b = tab(d);
    a.edit(v => { v.garden.studio.workspace.response = 'A response'; }); await a.session.save();
    b.edit(v => { v.garden.studio.workspace.response = 'B response'; }); await b.session.save();
    b.edit(v => { v.garden.studio.workspace.evidence = 'B new evidence'; });
    a.edit(v => { v.garden.studio.workspace.evidence = 'A new evidence'; }); await a.session.save();
    const before = d.value();
    const result = await b.session.save(() => true, resolution);
    expect(result).toMatchObject({ status: 'conflict', reason: 'changed-again' });
    expect(result.conflicts).toHaveLength(2);
    expect(d.value()).toEqual(before);
    expect(b.value().garden.studio.workspace.evidence).toBe('B new evidence');
    expect((await b.session.save(() => true, resolution)).status).toBe('saved');
  });
  it.each(['mine', 'saved'])('binds %s approval to the comparison at click time, before a queued refresh', async resolution => {
    const d = device(); let hold = false, release;
    const session = api.createLearnerWorkSession({ storage: d.storage, withLock: async (_key, operation) => {
      if (hold) await new Promise(resolve => { release = resolve; });
      return operation();
    } });
    session.hydrate(d.value());
    const mine = seed(); mine.garden.studio.workspace.response = 'My pending response'; session.stage(mine);
    const first = seed(); first.garden.studio.workspace.response = 'First saved response'; d.replace(first);
    expect((await session.save()).status).toBe('conflict');
    hold = true;
    const refresh = session.refresh(); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const decision = session.save(() => true, resolution);
    const newer = seed(); newer.garden.studio.workspace.response = 'Newer saved response'; d.replace(newer);
    hold = false; release();
    expect((await refresh).conflicts[0].saved).toBe('Newer saved response');
    expect(await decision).toMatchObject({ status: 'conflict', reason: 'changed-again' });
    expect(d.storage.set).not.toHaveBeenCalled();
    expect(session.state().snapshot.garden.studio.workspace.response).toBe('My pending response');
    expect((await session.save(() => true, resolution)).status).toBe('saved');
  });
  it.each(['mine', 'saved'])('preserves post-click typing in a conflicting field while %s waits for its lock', async resolution => {
    const d = device(); let hold = false, release;
    const session = api.createLearnerWorkSession({ storage: d.storage, withLock: async (_key, operation) => {
      if (hold) await new Promise(resolve => { release = resolve; });
      return operation();
    } });
    session.hydrate(d.value());
    const mine = seed(); mine.garden.studio.workspace.response = 'My answer at click'; session.stage(mine);
    const saved = seed(); saved.garden.studio.workspace.response = 'Saved answer'; d.replace(saved);
    await session.save(); hold = true;
    const decision = session.save(() => true, resolution); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const newer = session.state().snapshot;
    newer.garden.studio.workspace.response = 'New typing after click';
    newer.garden.studio.workspace.evidence = 'Independent new evidence'; session.stage(newer);
    hold = false; release();
    expect(await decision).toMatchObject({ status: 'conflict', reason: 'changed-again' });
    expect(d.storage.set).not.toHaveBeenCalled();
    expect(session.state().snapshot.garden.studio.workspace).toEqual({ response: 'New typing after click', evidence: 'Independent new evidence' });
    expect((await session.save(() => true, resolution)).status).toBe('saved');
    expect(d.value().garden.studio.workspace).toEqual({ response: resolution === 'mine' ? 'New typing after click' : 'Saved answer', evidence: 'Independent new evidence' });
  });
  it.each(['mine', 'saved'])('merges independent post-click typing without requiring another %s decision', async resolution => {
    const d = device(); let hold = false, release;
    const session = api.createLearnerWorkSession({ storage: d.storage, withLock: async (_key, operation) => {
      if (hold) await new Promise(resolve => { release = resolve; });
      return operation();
    } });
    session.hydrate(d.value());
    const mine = seed(); mine.garden.studio.workspace.response = 'My answer'; session.stage(mine);
    const saved = seed(); saved.garden.studio.workspace.response = 'Saved answer'; d.replace(saved);
    await session.save(); hold = true;
    const decision = session.save(() => true, resolution); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const newer = session.state().snapshot; newer.garden.studio.workspace.evidence = 'Independent typing'; session.stage(newer);
    hold = false; release();
    expect((await decision).status).toBe('saved');
    expect(d.value().garden.studio.workspace).toEqual({ response: resolution === 'mine' ? 'My answer' : 'Saved answer', evidence: 'Independent typing' });
  });
  it.each([['mine', 'workspace'], ['saved', 'workspace'], ['mine', 'row'], ['saved', 'row']])('preserves an intentional empty clear after %s approval on a %s conflict', async (resolution, field) => {
    const initial = seed();
    const set = (value, text) => { if (field === 'row') value.garden.studio.evidenceLedger[0].claim = text; else value.garden.studio.workspace.response = text; };
    const get = value => field === 'row' ? value.garden.studio.evidenceLedger[0].claim : value.garden.studio.workspace.response;
    set(initial, ''); const d = device(initial); let hold = false, release;
    const session = api.createLearnerWorkSession({ storage: d.storage, withLock: async (_key, operation) => {
      if (hold) await new Promise(resolve => { release = resolve; });
      return operation();
    } });
    session.hydrate(d.value());
    const mine = clone(initial); set(mine, 'Mine'); session.stage(mine);
    const saved = clone(initial); set(saved, 'A'); d.replace(saved);
    expect((await session.save()).status).toBe('conflict'); hold = true;
    const decision = session.save(() => true, resolution); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const cleared = session.state().snapshot; set(cleared, ''); session.stage(cleared);
    hold = false; release();
    expect(await decision).toMatchObject({ status: 'conflict', reason: 'changed-again' });
    expect(get(session.state().snapshot)).toBe(''); expect(get(d.value())).toBe('A');
    expect((await session.refresh()).status).toBe('conflict');
    expect(get(session.state().snapshot)).toBe('');
    expect((await session.save(() => true, 'mine')).status).toBe('saved');
    expect(get(d.value())).toBe('');
    if (field === 'row') expect(d.value().garden.studio.evidenceLedger[0].evidence).toBe('First support');
  });
  it('preserves typing during an awaited write and saves it on the next pass', async () => {
    const d = device(), a = tab(d); let release;
    const original = d.storage.set;
    d.storage.set = vi.fn(async (...args) => { await new Promise(resolve => { release = resolve; }); return original(...args); });
    a.edit(v => { v.garden.studio.workspace.response = 'First edit'; });
    const pending = a.session.save(); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    a.edit(v => { v.garden.studio.workspace.response = 'Later typing'; }); release();
    expect((await pending).status).toBe('saving');
    expect(a.value().garden.studio.workspace.response).toBe('Later typing');
    d.storage.set = original; await a.session.save();
    expect(d.value().garden.studio.workspace.response).toBe('Later typing');
  });
  it('retains pending work after storage failure and reports unavailable locks honestly', async () => {
    const d = device(), a = tab(d);
    a.edit(v => { v.garden.studio.workspace.response = 'Pending'; });
    d.storage.set.mockRejectedValueOnce(new Error('quota'));
    await expect(a.session.save()).rejects.toThrow('quota');
    expect(a.changes.at(-1).status).toBe('error');
    expect(a.value().garden.studio.workspace.response).toBe('Pending');
    await a.session.save(); expect(d.value().garden.studio.workspace.response).toBe('Pending');
    vi.stubGlobal('navigator', {});
    await expect(api.withLearnerWorkLock('key', async () => true)).rejects.toThrow('Coordinated');
  });
  it('does not save or publish after ownership changes while waiting for the lock', async () => {
    const d = device(); let owner = true, run;
    const a = api.createLearnerWorkSession({ storage: d.storage, withLock: (_key, fn) => new Promise(resolve => { run = () => resolve(fn()); }) });
    a.hydrate(d.value()); const changed = seed(); changed.garden.studio.workspace.response = 'Old actor'; a.stage(changed);
    const pending = a.save(() => owner); await vi.waitFor(() => expect(run).toBeTypeOf('function'));
    owner = false; run(); expect((await pending).status).toBe('superseded'); expect(d.storage.set).not.toHaveBeenCalled();
  });
  it.each([false, true])('rebases a reset over its own in-flight receipt while preserving genuine remote changes=%s', async remoteEdit => {
    const d = device(), a = tab(d); let release, owner = true;
    const original = d.storage.set;
    d.storage.set = vi.fn(async (...args) => { await new Promise(resolve => { release = resolve; }); return original(...args); });
    a.edit(v => { v.garden.studio.workspace.response = 'Pending before reset'; });
    const pending = a.session.save(() => owner); await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    owner = false; a.session.stage({});
    const published = a.changes.length; release();
    expect((await pending).status).toBe('superseded'); expect(a.changes).toHaveLength(published);
    expect(a.value()).toEqual({});
    d.storage.set = original;
    if (remoteEdit) { const b = tab(d); b.edit(v => { v.garden.studio.workspace.evidence = 'Other tab evidence'; }); await b.session.save(); }
    const reset = await a.session.save();
    expect(reset.status).toBe(remoteEdit ? 'conflict' : 'saved');
    if (remoteEdit) expect(d.value().garden.studio.workspace.evidence).toBe('Other tab evidence');
    else expect(d.value()).toEqual({});
  });
});

describe('Actual host save hook and response Boundary', () => {
  it('synchronizes two mounted workspaces, keeps both edits, and stops saving when clean', async () => {
    vi.useFakeTimers(); const d = device(), states = {};
    vi.stubGlobal('navigator', { locks: { request: (_key, _options, operation) => d.withLock(_key, operation) } });
    const source = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8').replace(/\r\n/g, '\n');
    const start = source.indexOf('  const [studentResponses, setStudentResponses]');
    const end = source.indexOf('  const generationViewOwnerRef', start);
    const hooks = source.slice(start, end).replace('useState({})', 'useState(() => clone(initial))').replace('const isStudentWorkLoaded = useRef(false);', 'const isStudentWorkLoaded = useRef(true);');
    const Host = new Function('React', 'window', 'storageDB', 'clone', 'initial', 'states', `return function Host({name}) {
      const {useState,useRef,useEffect,useCallback}=React;
      const lzLoaded=true,isStorageDisabled=false,isTeacherMode=false,showStudentEntry=false,activeSessionCode=null;
      const _alloShouldSuppressLearnerDeviceStorage=()=>false;
      const warnLog=()=>{};
      ${hooks}
      studentWorkActorRef.current='learner';
      states[name]={studentResponses,studentWorkStatus,studentWorkConflict};
      const View=props=>React.createElement('div',null,...['response','evidence'].map(field=>React.createElement('textarea',{key:field,'aria-label':field,value:props.generatedContent.data.workspace[field],onChange:e=>props.handleNoteUpdate('workspace',old=>({...old,[field]:e.target.value}))})));
      return React.createElement(window.AlloModules.StudioResponse.Boundary,{View,generatedContent:{id:'garden',type:'applied-challenge',data:initial.garden.studio},studentResponses,studentWorkStatus,studentWorkConflict,onResolveWorkConflict:resolveStudentWorkConflict,isTeacherMode:false,activeProfileId:'learner',onResponseChange:(id,studio)=>setStudentResponses(old=>({...old,[id]:{...old[id],studio}}))});
    };`)(React, window, d.storage, clone, seed(), states);
    const hosts = {};
    for (const name of ['A', 'B']) { hosts[name] = document.createElement('div'); document.body.append(hosts[name]); const root = createRoot(hosts[name]); roots.push(root); await act(async () => root.render(React.createElement(Host, { name }))); }
    const wait = () => act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    const type = (name,field,value) => act(async () => { const input=hosts[name].querySelector('textarea[aria-label="'+field+'"]'); Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); });
    await wait(); await type('A','response','A saved response'); await wait();
    expect(hosts.B.querySelector('textarea[aria-label="response"]').value).toBe('A saved response');
    await type('B','evidence','B saved evidence'); await wait();
    expect(d.value().garden.studio.workspace).toEqual({response:'A saved response',evidence:'B saved evidence'});
    expect(states.A.studentWorkStatus).toBe('saved'); expect(states.B.studentWorkStatus).toBe('saved');
    const count=d.storage.set.mock.calls.length; await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
    expect(d.storage.set.mock.calls.length).toBe(count);
    await type('A','response','A conflicting response');
    await type('B','response','B pending response');
    await type('B','evidence','B independent pending evidence');
    await wait();
    expect(states.B.studentWorkStatus).toBe('conflict');
    expect(hosts.B.textContent).toContain('B pending response');
    expect(hosts.B.textContent).toContain('A conflicting response');
    expect(d.value().garden.studio.workspace.response).toBe('A conflicting response');
    await act(async()=>[...hosts.B.querySelectorAll('button')].find(button=>button.textContent==='Use saved changes').click());
    expect(d.value().garden.studio.workspace).toEqual({response:'A conflicting response',evidence:'B independent pending evidence'});
    expect(hosts.B.querySelector('textarea[aria-label="response"]').value).toBe('A conflicting response');
  });
});
