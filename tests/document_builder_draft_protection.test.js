import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import { parse } from '@babel/parser';

const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const tree = parse(source, { sourceType: 'script', plugins: ['jsx'] });
const component = tree.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'ExportPreviewView');
const apiNames = ['_builderDraftContext', '_builderDraftIdentity', '_normalizeBuilderLocalDraft', '_builderCreateDraftCapture', '_builderCompareDocumentVersions', '_builderRestoreVersionBlock'];
const api = new Function('TextEncoder', source.slice(0, component.start) + '\nreturn {' + apiNames.join(',') + '};')(TextEncoder);
function callback(name, bindings) {
  const declaration = component.body.body.flatMap(n => n.declarations || []).find(n => n.id.name === name);
  const fn = declaration.init.arguments[0];
  return new Function(...Object.keys(bindings), 'return (' + source.slice(fn.start, fn.end) + ');')(...Object.values(bindings));
}
function hostCapture(bindings) {
  const start = hostSource.indexOf('  const _captureBuilderDraft =');
  const end = hostSource.indexOf('  const getBuilderGuidedDeliveryContext =', start);
  return new Function(...Object.keys(bindings), hostSource.slice(start, end) + ';return _captureBuilderDraft;')(...Object.values(bindings));
}
function doc(html) { const d = document.implementation.createHTMLDocument('Lesson'); d.body.innerHTML = html; return d; }
function html(body) { return '<!doctype html><html><head><title>Lesson</title></head><body>' + body + '</body></html>'; }
const context = options => api._builderDraftContext({ source: 'history', mode: 'print', history: [{ id: 'a', content: 'Original reading' }], resourceIds: null, ...options });
const identity = options => api._builderDraftIdentity(context(options), webcrypto);
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); delete window.__alloBuilderEditedPack; });

describe('source-bound Builder local recovery', () => {
  it('distinguishes content changes that preserve history count and endpoint IDs', async () => {
    const history = [{id:'a'}, {id:'middle', content:'First lesson'}, {id:'z'}];
    const changed = history.map(x => x.id === 'middle' ? {...x, content:'Different lesson'} : x);
    expect(await identity({ history })).not.toBe(await identity({ history: changed }));
  });
  it('distinguishes remediation assets with the same title and History', async () => {
    expect(await identity({source:'remediation',documentDigest:'sha256:source-a'})).not.toBe(await identity({source:'remediation',documentDigest:'sha256:source-b'}));
  });
  it('binds explicit scope and mode without including the mutable display title', async () => {
    expect(await identity({resourceIds:['a']})).not.toBe(await identity({resourceIds:null}));
    expect(await identity({mode:'print'})).not.toBe(await identity({mode:'worksheet'}));
    expect(await identity({title:'Original'})).toBe(await identity({title:'Renamed'}));
  });
  it('hashes all content rather than truncating an encoded key prefix', async () => {
    const content='教育'.repeat(400)+' first';
    expect(await identity({history:[{id:'a',content}]})).not.toBe(await identity({history:[{id:'a',content:content+' different'}]}));
    expect((await identity({history:[{id:'a',content}]})).length).toBeLessThan(100);
  });
  it('does not create persistent identities from missing asset digests or unavailable hashing', async () => {
    expect(context({source:'remediation'})).toBeNull();
    expect(await api._builderDraftIdentity(null,webcrypto)).toBeNull();
    expect(await api._builderDraftIdentity(context(),{})).toBeNull();
  });
  it('rejects unbound legacy local stores and mismatched source metadata', async () => {
    const key=await identity(); const candidate={version:2,html:html('<p>'+ 'Legacy '.repeat(20)+'</p>'),at:1};
    expect(api._normalizeBuilderLocalDraft(candidate,key)).toBeNull();
    expect(api._normalizeBuilderLocalDraft({...candidate,version:3,sourceIdentity:'other'},key)).toBeNull();
    // Existing project codecs and legacy helper callers remain independent.
    expect(api._normalizeBuilderLocalDraft(candidate).version).toBe(2);
  });
  it('retains valid bound snapshots with their source identity and the ten-version bound', async () => {
    const key=await identity();const content=html('<p>'+ 'Bound lesson '.repeat(20)+'</p>');
    const store=api._normalizeBuilderLocalDraft({version:3,sourceIdentity:key,html:content,at:1,snapshots:Array.from({length:13},(_,i)=>({id:String(i),html:content,at:i+1}))},key);
    expect(store.version).toBe(3);expect(store.snapshots).toHaveLength(10);
    expect(store.snapshots.every(s=>s.sourceIdentity===key)).toBe(true);
  });
  it('does not read any legacy key while identity is unavailable', () => {
    const get=vi.spyOn(Storage.prototype,'getItem');
    expect(callback('readLocalDraftStore',{draftStorageKey:null,_normalizeBuilderLocalDraft:api._normalizeBuilderLocalDraft})()).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });
  it('rejects stale restore and comparison buttons before they mutate the current document', () => {
    const write=vi.fn(),toast=vi.fn();
    callback('restoreVersionSnapshot',{draftStorageKey:'current',addToast:toast,getCleanBuilderDocument:write})({html:html('<p>Other document</p>'),sourceIdentity:'other'});
    callback('compareVersionSnapshot',{draftStorageKey:'current',exportPreviewRef:{current:{contentDocument:doc('<p>Keep</p>')}},addToast:toast})({html:html('<p>Other document</p>'),sourceIdentity:'other'});
    expect(write).not.toHaveBeenCalled();expect(toast).toHaveBeenCalledTimes(2);
  });
});

function captureFixture(savedLocally=true) {
  const document=doc('<p>Current edited lesson</p>'),token={};document.__alloBuilderCaptureToken=token;
  const owner={source:'history',historySignature:'current-history-signature',resourceIds:['a']};
  const exportPreviewRef={current:{contentDocument:document}};
  const ownerRef={current:owner};
  const receive=hostCapture({_builderDraftOwnerRef:ownerRef,showExportPreview:true,exportPreviewRef});
  const bindings={mountedRef:{current:true},showExportPreview:true,draftContext:'context-a',draftContextRef:{current:'context-a'},exportPreviewRef,
    getCleanBuilderDocument:()=>({html:html(document.body.innerHTML)}),onBuilderDraftCapture:receive,builderDraftOwner:owner,
    persistLocalDraft:vi.fn(()=>savedLocally),setDraftCaptureAt:vi.fn(),setDraftCaptureState:vi.fn()};
  return {document,token,owner,ownerRef,bindings,capture:callback('captureBuilderDraftDocument',bindings)};
}
describe('owned and flushable Builder capture', () => {
  it('flushes close-before-debounce once and preserves the metadata required by project save', () => {
    vi.useFakeTimers();const f=captureFixture();const controller=api._builderCreateDraftCapture({capture:()=>f.capture(f.document),isCurrent:()=>f.bindings.mountedRef.current});
    controller.schedule();vi.advanceTimersByTime(200);expect(controller.flush()).toBe(true);
    f.ownerRef.current=null;f.bindings.mountedRef.current=false;controller.cancel();vi.advanceTimersByTime(1000);
    expect(window.__alloBuilderEditedPack).toMatchObject({source:'history',historySignature:'current-history-signature',resourceIds:['a']});
    expect(f.bindings.persistLocalDraft).toHaveBeenCalledTimes(1);expect(f.bindings.setDraftCaptureAt).toHaveBeenCalledWith(expect.any(Number));
  });
  it('cancels queued work on unmount without a session or local-store write', () => {
    vi.useFakeTimers();const f=captureFixture();const controller=api._builderCreateDraftCapture({capture:()=>f.capture(f.document),isCurrent:()=>f.bindings.mountedRef.current});
    controller.schedule();controller.cancel();vi.advanceTimersByTime(1000);
    expect(window.__alloBuilderEditedPack).toBeUndefined();expect(f.bindings.persistLocalDraft).not.toHaveBeenCalled();
  });
  it.each(['token','document','context','owner'])('refuses callbacks after %s ownership changes', kind => {
    const f=captureFixture();
    if(kind==='token')f.document.__alloBuilderCaptureToken={};
    if(kind==='document')f.bindings.exportPreviewRef.current={contentDocument:doc('<p>Replacement</p>')};
    if(kind==='context')f.bindings.draftContextRef.current='context-b';
    if(kind==='owner')f.ownerRef.current={...f.owner};
    expect(f.capture(f.document,'Auto-save','context-a',f.token)).toBe(false);
    expect(window.__alloBuilderEditedPack).toBeUndefined();expect(f.bindings.persistLocalDraft).not.toHaveBeenCalled();
  });
  it('retains attributed session capture and reports captured when local storage cannot save', () => {
    const f=captureFixture(false);expect(f.capture(f.document)).toBe(true);
    expect(window.__alloBuilderEditedPack.source).toBe('history');expect(f.bindings.setDraftCaptureState).toHaveBeenCalledWith('captured');
    expect(f.bindings.setDraftCaptureAt).toHaveBeenCalledWith(expect.any(Number));
  });
  it('does not overwrite a History draft when capturing remediation HTML', () => {
    const f=captureFixture();f.owner.source='remediation';window.__alloBuilderEditedPack={source:'history',html:'Keep history draft'};
    expect(f.capture(f.document)).toBe(true);expect(window.__alloBuilderEditedPack.html).toBe('Keep history draft');
  });
  it('uses the same flush seam before host close and removes unattributed session writers', () => {
    const sync=hostSource.slice(hostSource.indexOf('  const _syncBuilderEditsToRemediation ='),hostSource.indexOf('  const NON_EXPORTABLE_TYPES'));
    expect(sync).toContain('iframe?.__alloBuilderFlushDraft?.()');
    expect(sync.indexOf('_syncBuilderEditsToRemediation();')).toBeLessThan(sync.indexOf('_builderDraftOwnerRef.current = null;'));
    expect(source).not.toContain('window.__alloBuilderEditedPack =');
    expect(source).toContain("draftCaptureLatestRef.current?.(doc, 'Workbench edit')");
  });
});

describe('revision-bound Builder block restoration', () => {
  const saved=html('<p id="opening">Saved opening.</p><p id="tail">Unchanged tail.</p>');
  function compared(){const current=doc('<p id="opening">Edited opening.</p><p id="tail">Unchanged tail.</p>');return {current,comparison:api._builderCompareDocumentVersions(current,saved)};}
  it('restores the unique compared paragraph when the document is unchanged', () => {
    const {current,comparison}=compared();const result=api._builderRestoreVersionBlock(current,saved,comparison.excerpts[0]);
    expect(result.ok).toBe(true);expect(current.getElementById('opening').textContent).toBe('Saved opening.');expect(current.getElementById('tail').textContent).toBe('Unchanged tail.');
  });
  it.each(['insert','remove','reorder','text','asset'])('rejects a %s change after comparison without mutating the document', action => {
    const {current,comparison}=compared();
    if(action==='insert')current.body.insertAdjacentHTML('afterbegin','<p>New important paragraph.</p>');
    if(action==='remove')current.getElementById('tail').remove();
    if(action==='reorder')current.body.prepend(current.getElementById('tail'));
    if(action==='text')current.getElementById('opening').textContent='New third version';
    if(action==='asset')current.body.insertAdjacentHTML('beforeend','<img src="replacement.png" alt="New figure">');
    const before=current.documentElement.outerHTML;
    expect(api._builderRestoreVersionBlock(current,saved,comparison.excerpts[0])).toMatchObject({ok:false,reason:'stale-comparison'});
    expect(current.documentElement.outerHTML).toBe(before);
  });
  it('rejects a changed saved snapshot without mutation', () => {
    const {current,comparison}=compared();const before=current.documentElement.outerHTML;
    expect(api._builderRestoreVersionBlock(current,saved.replace('Saved opening.','Other saved opening.'),comparison.excerpts[0]).ok).toBe(false);
    expect(current.documentElement.outerHTML).toBe(before);
  });
  it('refuses duplicate candidate blocks rather than assigning identity by index', () => {
    const current=doc('<p>Edited</p><p>Edited</p>'),snapshot=html('<p>Saved</p><p>Saved</p>');
    const comparison=api._builderCompareDocumentVersions(current,snapshot),before=current.body.innerHTML;
    expect(api._builderRestoreVersionBlock(current,snapshot,comparison.excerpts[0])).toMatchObject({ok:false,reason:'ambiguous-block'});
    expect(current.body.innerHTML).toBe(before);
  });
  it('restores unique table cells without relying on parsing a standalone td', () => {
    const current=doc('<table><tbody><tr><th scope="row">Population</th><td>20</td></tr></tbody></table>');
    const snapshot=html('<table><tbody><tr><th scope="row">Population</th><td>12</td></tr></tbody></table>');
    const comparison=api._builderCompareDocumentVersions(current,snapshot);
    expect(api._builderRestoreVersionBlock(current,snapshot,comparison.excerpts[0]).ok).toBe(true);
    expect(current.querySelector('td').textContent).toBe('12');expect(current.querySelector('th').getAttribute('scope')).toBe('row');
  });
  it('exposes the actual bounded text window instead of implying full-document equality', () => {
    const paragraphs=Array.from({length:401},(_,i)=>'<p>Paragraph '+i+'</p>').join('');
    const comparison=api._builderCompareDocumentVersions(doc(paragraphs.replace('Paragraph 400','Changed final paragraph')),html(paragraphs));
    expect(comparison).toMatchObject({changed:0,comparedBefore:400,comparedAfter:400,totalBefore:401,totalAfter:401,contentWindowTruncated:true,excerptWindowTruncated:false});
  });
  it('keeps nontext comparison claims explicit for unchanged text with different images', () => {
    const result=api._builderCompareDocumentVersions(doc('<p>Same text.</p><img src="second.png">'),html('<p>Same text.</p><img src="first.png">'));
    expect(result.changed).toBe(0);expect(source).toContain('Images, links and formatting are not compared.');
    expect(source).not.toContain('The current document matches this saved version.');
    expect(source).toContain('Later blocks are not compared.');
  });
});

describe('capture failure and restore status', () => {
  it.each(['callback-throws','callback-rejects','serialization-throws'])('leaves no saving or durable status after %s', failure => {
    const f=captureFixture();
    if(failure==='serialization-throws')f.bindings.getCleanBuilderDocument=()=>{throw new Error('Cannot serialize')};
    else f.bindings.onBuilderDraftCapture=()=>{if(failure==='callback-throws')throw new Error('Rejected');return false};
    const capture=callback('captureBuilderDraftDocument',f.bindings);
    expect(()=>capture(f.document)).not.toThrow();expect(capture(f.document)).toBe(false);
    expect(f.bindings.setDraftCaptureState).toHaveBeenLastCalledWith('error');
    expect(f.bindings.setDraftCaptureAt).not.toHaveBeenCalled();expect(f.bindings.persistLocalDraft).not.toHaveBeenCalled();
  });
  it('binds a recovered current draft when its version list is absent', async () => {
    const key=await identity();const store=api._normalizeBuilderLocalDraft({version:3,sourceIdentity:key,html:html('<p>'+ 'Bound '.repeat(30)+'</p>'),at:1},key);
    expect(store.snapshots[0].sourceIdentity).toBe(key);
  });
  it('restores and captures synchronously without leaving an 80ms post-close mutation', () => {
    vi.useFakeTimers();const f=captureFixture();
    const noop=vi.fn(),state=vi.fn(),at=vi.fn();
    const restore=callback('restoreDraftHtml',{...f.bindings,draftStorageKey:'bound-current',draftCaptureLatestRef:{current:f.capture},
      setDraftCaptureState:state,setDraftCaptureAt:at,refreshDocumentStats:noop,refreshReviewComments:noop,
      refreshTrackedChanges:noop,refreshActiveHeading:noop,refreshPageMetrics:noop,refreshFormattingState:noop,addToast:noop});
    expect(restore(html('<p>Restored lesson with preserved attribution.</p>'))).toBe(true);
    expect(f.document.body.textContent).toBe('Restored lesson with preserved attribution.');
    expect(window.__alloBuilderEditedPack).toMatchObject({source:'history',historySignature:'current-history-signature'});
    expect(state).toHaveBeenLastCalledWith('restored');expect(at).toHaveBeenCalledWith(expect.any(Number));
    f.bindings.exportPreviewRef.current=null;vi.advanceTimersByTime(1000);
    expect(window.__alloBuilderEditedPack.source).toBe('history');
  });
});

describe('unchanged close and projected-source identity', () => {
  it('does not create an auto-save simply by opening and closing an unchanged preview', () => {
    const capture=vi.fn();const controller=api._builderCreateDraftCapture({capture,isCurrent:()=>true});
    expect(controller.flush()).toBe(false);expect(capture).not.toHaveBeenCalled();
  });
  it('keeps student-response projections separate even when raw History is unchanged', async () => {
    expect(await identity({historySignature:'student-response-one'})).not.toBe(await identity({historySignature:'student-response-two'}));
  });
});

describe('capture to project packing continuity', () => {
  it('packs a just-closed draft after the old debounce deadline has passed', async () => {
    vi.useFakeTimers();const f=captureFixture();
    const controller=api._builderCreateDraftCapture({capture:()=>f.capture(f.document),isCurrent:()=>f.bindings.mountedRef.current});
    controller.schedule();vi.advanceTimersByTime(100);controller.flush();controller.cancel();f.bindings.mountedRef.current=false;f.bindings.exportPreviewRef.current=null;vi.advanceTimersByTime(1000);
    const start=hostSource.indexOf('  const _getBuilderDraftForProject ='),end=hostSource.indexOf('  const _restoreBuilderDraftFromProject =',start);
    const bindings={_syncBuilderEditsToRemediation:()=>{},_getBuilderHistorySignature:()=>f.owner.historySignature,
      _sanitizeBuilderProjectDraft:(content,signature)=>({html:content,historySignature:signature}),_packBuilderProjectDraft:async draft=>({...draft,version:2})};
    const pack=new Function(...Object.keys(bindings),hostSource.slice(start,end)+';return _getBuilderDraftForProject;')(...Object.values(bindings));
    await expect(pack()).resolves.toMatchObject({version:2,resourceIds:['a'],historySignature:'current-history-signature',html:expect.stringContaining('Current edited lesson')});
  });
});
