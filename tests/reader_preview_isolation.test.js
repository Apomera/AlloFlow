import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, act, createRoot, View, api, pure, host, root, props;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  api = window.AlloModules.InstructionalContext; pure = window.AlloModules.PureHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if(root) act(() => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });
const TEXT = '## Birds\n\nThe heron walked slowly.\n\n## Food\n\nIt waited for a fish.\n\n## Nests\n\nHerons build nests in trees.';
function item(data = TEXT) {
  const original = api.createSupportedReading('The heron waded through the marsh.', { id:'original', sourceFamilyId:'heron' });
  return { id:'reading', type:'simplified', data, sourceSnapshot:original.sourceSnapshot, sourceFamilyId:'heron', instructionalText:{form:'adapted',role:'supplemental'}, config:{language:'English'} };
}
function mount(extra = {}) {
  const noop = () => {};
  props = { generatedContent:item(), history:[], t:k=>k, isTeacherMode:true, isZenMode:false, interactionMode:'read', readingTheme:'default', readingLearnerKey:'teacher|test',
    studentInterests:[], gradeLevel:'5', leveledTextLanguage:'English', latestGlossary:[], playbackState:{currentIdx:-1}, cursorStyles:{},
    setInteractionMode:vi.fn(), setIsCompareMode:vi.fn(), setIsFluencyMode:vi.fn(), setSelectionMenu:vi.fn(), setIsCustomReviseOpen:vi.fn(), setFocusedParagraphIndex:vi.fn(), setReadingTheme:vi.fn(),
    closeDefinition:vi.fn(), closePhonics:vi.fn(), closeRevision:vi.fn(), stopPlayback:vi.fn(), handleSpeak:vi.fn(), callTTS:vi.fn(), handleWordClick:vi.fn(), handlePhonicsClick:vi.fn(), handleAnalyzePOS:vi.fn(), handleSetIsSyntaxGameToTrue:vi.fn(),
    handleToggleIsEditingLeveledText:vi.fn(), handleSimplifiedTextChange:vi.fn(), setGeneratedContent:vi.fn(), setHistory:vi.fn(),
    setComplexityLevel:noop,setSaveOriginalOnAdjust:noop,handleFormatText:noop,handleTextMouseUp:noop,textEditorRef:React.createRef(),
    splitTextToSentences:s=>pure.splitTextToSentences(s,{}),getSideBySideContent:()=>null,getContentDirection:()=> 'ltr',isRtlLang:()=>false,
    formatInteractiveText:s=>s, renderFormattedText:s=>s, highlightGlossaryTerms:s=>s, SourceReferencesPanel:()=>null, ComplexityGauge:()=>null, ...extra };
  host=document.createElement('div'); document.body.append(host); root=createRoot(host);
  act(()=>root.render(React.createElement(View,props)));
  return next=>{props={...props,...next};act(()=>root.render(React.createElement(View,props)));};
}
const click = el=>act(()=>el.click());
const dialog=()=>host.querySelector('[data-student-preview]');
const open=()=>click(host.querySelector('[data-student-preview-open]'));
const change=(el,value)=>act(()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('change',{bubbles:true}));});
function withHelp() {
  const reading=item(); const start=TEXT.indexOf('heron');
  const help=api.upsertAdaptedReadingSupport(reading,null,{id:'heron',start,end:start+5,quote:'heron',text:'A water bird.'});
  reading.adaptedReadingSupports=api.setAdaptedReadingSupportsShown(reading,help,true);return reading;
}
const key=(el,value,extra={})=>act(()=>el.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra})));

describe('layout preview isolation',()=>{
  it('uses distinct IDs and keeps ARIA references in the owning reader',()=>{
    mount({generatedContent:withHelp()}); open();
    const ids=[...host.querySelectorAll('[id]')].map(el=>el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for(const el of dialog().querySelectorAll('[aria-controls], [aria-labelledby], [aria-describedby]')) {
      for(const name of ['aria-controls','aria-labelledby','aria-describedby']) for(const id of (el.getAttribute(name)||'').split(/\s+/).filter(Boolean)) {
        const target=document.getElementById(id);
        if(target) expect(dialog().contains(target)).toBe(true);
        else expect(name).toBe('aria-controls'); // Closed conditional panels are not mounted.
      }
    }
    expect(dialog().querySelector('[id="sentence-0"]')).toBe(null);
  });
  it('keeps width, Display, theme and comparison preferences in memory',()=>{
    mount(); open(); const storage=vi.spyOn(Storage.prototype,'setItem');
    click(dialog().querySelector('[data-reader-display]'));
    change(dialog().querySelector('select[aria-label="Reading width"]'),'40');
    change(dialog().querySelector('[data-adapted-theme-picker]'),'dark');
    expect(dialog().querySelector('[data-adapted-theme-picker]').value).toBe('dark');
    key(dialog().querySelector('[data-adapted-theme-picker]'),'Escape');
    click(dialog().querySelector('[data-reading-version="both"]'));
    click(dialog().querySelector('input[aria-label="Show changes"]'));
    expect(storage).not.toHaveBeenCalled(); expect(props.setReadingTheme).not.toHaveBeenCalled();
    click(dialog().querySelector('[data-student-preview-close]')); open();
    expect(dialog().querySelector('[data-adapted-theme-picker]').value).toBe('default');
  });
  it('never mounts host scoring renderers or enables AI, microphone, or audio actions',()=>{
    const score=vi.fn();
    mount({latestGlossary:[{term:'heron',isSelected:true}],formatInteractiveText:()=>React.createElement('button',{'data-host-score':true,onClick:score},'Score')}); open();
    expect(dialog().querySelector('[data-host-score]')).toBe(null);
    expect(dialog().textContent).toContain('Listening, recording, AI help and scored practice are unavailable');
    click(dialog().querySelector('[data-reading-mode="define"]'));
    for(const name of ['phonics','explain']) expect(dialog().querySelector(`[data-reading-mode="${name}"]`).disabled).toBe(true);
    for(const name of ['simplified_read_along','simplified_cloze_mode','simplified_scramble_game','simplified_immersive_reader']) {
      const button=dialog().querySelector(`[data-help-key="${name}"]`); expect(button.disabled).toBe(true); click(button);
    }
    click(dialog().querySelector('[data-reader-listen]'));
    expect(score).not.toHaveBeenCalled();
    for(const name of ['handleSpeak','stopPlayback','callTTS','handleWordClick','handlePhonicsClick','handleAnalyzePOS','handleSetIsSyntaxGameToTrue','setGeneratedContent','setHistory']) expect(props[name],name).not.toHaveBeenCalled();
  });
  it('does not let preview scrolling save the parent reading place',async()=>{
    mount(); open(); const storage=vi.spyOn(Storage.prototype,'setItem');
    const paragraph=dialog().querySelector('[data-reading-paragraph="3"]');
    act(()=>{paragraph.tabIndex=-1;paragraph.focus();dialog().dispatchEvent(new Event('scroll'));});
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,850));});
    expect(storage).not.toHaveBeenCalled();
  });
  it('freezes content until close and uses fresh content on reopening',()=>{
    const rerender=mount(); open(); rerender({generatedContent:item('Changed reading.')});
    expect(dialog().textContent).toContain('The heron walked slowly.');
    expect(dialog().textContent).not.toContain('Changed reading.');
    click(dialog().querySelector('[data-student-preview-close]')); open();
    expect(dialog().textContent).toContain('Changed reading.');
  });
  it('contains focus, suspends background controls, and restores the opener',()=>{
    mount(); const opener=host.querySelector('[data-student-preview-open]');open();
    const close=dialog().querySelector('[data-student-preview-close]');expect(document.activeElement).toBe(close);
    expect(opener.closest('[inert]')).not.toBe(null);
    const last=[...dialog().querySelectorAll('button:not([disabled]), select, textarea, [tabindex="0"]')].filter(el=>!el.closest('[hidden]')).at(-1);
    act(()=>last.focus());key(last,'Tab');expect(document.activeElement).toBe(close);
    key(close,'Escape');expect(dialog()).toBe(null);expect(document.activeElement).toBe(opener);expect(opener.closest('[inert]')).toBe(null);
  });
});


describe('preview resource ownership and cleanup',()=>{
  it('leaves playing host audio untouched and never enters media, AI or persistence services',async()=>{
    vi.useFakeTimers();
    mount({isPlaying:true,playingContentId:'simplified-main',playbackState:{currentIdx:1},generatedContent:withHelp()});
    const speech={speak:vi.fn(),cancel:vi.fn()}, getUserMedia=vi.fn(), audio=vi.fn(), recorder=vi.fn(), fetch=vi.fn(), idb={open:vi.fn(),deleteDatabase:vi.fn()};
    vi.stubGlobal('speechSynthesis',speech);vi.stubGlobal('Audio',audio);vi.stubGlobal('MediaRecorder',recorder);vi.stubGlobal('fetch',fetch);vi.stubGlobal('indexedDB',idb);
    const originalMedia=Object.getOwnPropertyDescriptor(navigator,'mediaDevices');Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
    const services=['__alloResolveReadAloudAudio','__alloPrepareReadAloud','__alloRegenerateSentenceAudio','__alloStoreRecordedSentenceAudio','__alloRemoveSentenceAudio','__alloCancelAudioDownload'];
    const saved=services.map(name=>[name,window[name]]);services.forEach(name=>window[name]=vi.fn());
    const set=vi.spyOn(Storage.prototype,'setItem'), remove=vi.spyOn(Storage.prototype,'removeItem');
    const lesson=JSON.stringify(props.generatedContent), history=JSON.stringify(props.history);
    try {
      open();click(dialog().querySelector('[data-reader-listen]'));click(dialog().querySelector('[data-reading-mode="define"]'));
      const word=[...dialog().querySelectorAll('[data-reading-word]')].find(el=>el.textContent==='heron');click(word);
      expect(dialog().querySelector('[data-word-help-card-text]').textContent).toBe('A water bird.');
      for(const name of ['hear','listen']) {const control=dialog().querySelector('[data-word-help-card-'+name+']');expect(control.disabled).toBe(true);click(control);}
      expect(dialog().querySelector('[data-word-help-card-more]')).toBe(null);
      click(dialog().querySelector('[data-student-preview-close]'));
      await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
      for(const fn of [audio,recorder,fetch,getUserMedia,speech.speak,speech.cancel,idb.open,idb.deleteDatabase,set,remove,props.handleSpeak,props.stopPlayback,props.callTTS,props.handleWordClick,props.setGeneratedContent,props.setHistory])expect(fn).not.toHaveBeenCalled();
      services.forEach(name=>expect(window[name],name).not.toHaveBeenCalled());
      expect(JSON.stringify(props.generatedContent)).toBe(lesson);expect(JSON.stringify(props.history)).toBe(history);
      expect(document.getElementById('sentence-1').closest('[data-adapted-reader]').dataset.adaptedReader).toBe('teacher');
      click(host.querySelector('[data-reader-listen]'));expect(props.stopPlayback).toHaveBeenCalledTimes(1);
    } finally {saved.forEach(([name,value])=>{if(value===undefined)delete window[name];else window[name]=value;});if(originalMedia)Object.defineProperty(navigator,'mediaDevices',originalMedia);else delete navigator.mediaDevices;}
  });
  it('adds only its own highlight ranges and removes them without disturbing host ranges',()=>{
    vi.useFakeTimers();const registry=new Map();vi.stubGlobal('CSS',{highlights:registry});vi.stubGlobal('Highlight',class extends Set {constructor(...ranges){super(ranges);}});
    mount({generatedContent:withHelp()});const hostReader=host.querySelector('[data-adapted-reader]');
    click(hostReader.querySelector('[data-adapted-word-help-spot]'));
    const hostFocus=[...registry.get('allo-word-help-focus')][0];open();
    let ranges=[...registry.get('allo-word-help')];expect(ranges).toHaveLength(2);
    expect(ranges.filter(range=>dialog().contains(range.startContainer))).toHaveLength(1);
    expect(ranges.filter(range=>hostReader.contains(range.startContainer))).toHaveLength(1);
    click(dialog().querySelector('[data-adapted-word-help-spot]'));expect([...registry.get('allo-word-help-focus')]).toHaveLength(2);
    click(dialog().querySelector('[data-student-preview-close]'));
    expect([...registry.get('allo-word-help-focus')]).toEqual([hostFocus]);expect([...registry.get('allo-word-help')]).toHaveLength(1);
    act(()=>vi.advanceTimersByTime(4000));expect(registry.has('allo-word-help-focus')).toBe(false);
  });
  it('does not let an older host highlight timer erase the preview highlight',()=>{
    vi.useFakeTimers();const registry=new Map();vi.stubGlobal('CSS',{highlights:registry});vi.stubGlobal('Highlight',class extends Set {constructor(...ranges){super(ranges);}});
    mount({generatedContent:withHelp()});click(host.querySelector('[data-adapted-word-help-spot]'));act(()=>vi.advanceTimersByTime(2000));open();
    click(dialog().querySelector('[data-adapted-word-help-spot]'));act(()=>vi.advanceTimersByTime(2100));
    const remaining=[...registry.get('allo-word-help-focus')];expect(remaining).toHaveLength(1);expect(dialog().contains(remaining[0].startContainer)).toBe(true);
    act(()=>vi.advanceTimersByTime(2000));expect(registry.has('allo-word-help-focus')).toBe(false);
  });
  it('keeps prepared-help focus inside the modal, closes each layer, and restores background attributes on unmount',()=>{
    const outside=document.createElement('button');outside.textContent='Outside';outside.setAttribute('aria-hidden','false');document.body.append(outside);
    try {
      mount({generatedContent:withHelp()});open();const close=dialog().querySelector('[data-student-preview-close]');
      act(()=>outside.focus());expect(document.activeElement).toBe(close);
      click(dialog().querySelector('[data-reading-mode="define"]'));const word=[...dialog().querySelectorAll('[data-reading-word]')].find(el=>el.textContent==='heron');click(word);
      const card=dialog().querySelector('[data-word-help-card]');expect(document.activeElement).toBe(card);key(card,'Tab');expect(dialog().contains(document.activeElement)).toBe(true);
      key(card,'Escape');expect(dialog().querySelector('[data-word-help-card]')).toBe(null);expect(document.activeElement).toBe(word);
      expect(outside.hasAttribute('inert')).toBe(true);act(()=>root.unmount());root=null;
      expect(outside.hasAttribute('inert')).toBe(false);expect(outside.getAttribute('aria-hidden')).toBe('false');
    } finally {outside.remove();}
  });
  it('discards section answers and queued parent scroll writes on close',async()=>{
    vi.useFakeTimers();mount();act(()=>host.querySelector('[data-adapted-reader]').dispatchEvent(new Event('scroll')));open();
    const set=vi.spyOn(Storage.prototype,'setItem');
    click(dialog().querySelector('[data-reading-outline-toggle]'));click(dialog().querySelector('[data-reading-bookmark]'));
    const promptButton=dialog().querySelector('[data-section-prompts-toggle]') || [...dialog().querySelectorAll('button')].find(el=>el.textContent==='Think about this section');
    expect(promptButton).toBeTruthy();click(promptButton);
    const answer=dialog().querySelector('[data-section-prompt="mainIdea"]');
    act(()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(answer,'A practice answer');answer.dispatchEvent(new Event('input',{bubbles:true}));});expect(answer.value).toBe('A practice answer');
    click(dialog().querySelector('[data-student-preview-close]'));await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});expect(set).not.toHaveBeenCalled();
    open();click(dialog().querySelector('[data-reading-outline-toggle]'));const promptAgain=dialog().querySelector('[data-section-prompts-toggle]') || [...dialog().querySelectorAll('button')].find(el=>el.textContent==='Think about this section');click(promptAgain);
    expect(dialog().querySelector('[data-section-prompt="mainIdea"]').value).toBe('');
  });
  it('renders safe tables and explains unavailable charts without inheriting a host renderer',()=>{
    mount({generatedContent:item('| Bird | Food |\n| --- | --- |\n| Heron | Fish |\n\n[[CHART: data]]'),renderFormattedText:()=>React.createElement('button',{'data-host-renderer':true},'Host widget')});open();
    expect(dialog().querySelector('table').textContent).toContain('Heron');expect(dialog().querySelector('[data-host-renderer]')).toBe(null);
    expect(dialog().querySelector('[data-reading-chart]').textContent).toContain('Charts are unavailable in this layout preview');
  });
});

 it('keeps comparison navigation and word-help scrolling inside the preview',()=>{
   mount({generatedContent:withHelp()});open();
   const page=document.scrollingElement||document.documentElement;const before=page.scrollTop;page.scrollTop=170;
   const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=vi.fn(()=>{page.scrollTop=999;});
   try {
     click(dialog().querySelector('[data-adapted-word-help-spot]'));expect(page.scrollTop).toBe(170);
     click(dialog().querySelector('[data-reading-version="both"]'));expect(page.scrollTop).toBe(170);
     click(dialog().querySelector('[data-reading-version="adapted"]'));expect(page.scrollTop).toBe(170);
   } finally {Element.prototype.scrollIntoView=original;page.scrollTop=before;}
 });

 it('does not leak preview keys to the host fluency-recording shortcut',()=>{
   mount();const record=vi.fn(), keyUp=vi.fn();
   const hostShortcut=event=>{if(event.code==='Space')record();};
   window.addEventListener('keydown',hostShortcut);window.addEventListener('keyup',keyUp);
   try {
     open();const close=dialog().querySelector('[data-student-preview-close]');key(close,' ',{code:'Space'});
     act(()=>close.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true})));
     expect(record).not.toHaveBeenCalled();expect(keyUp).not.toHaveBeenCalled();
     key(close,'Escape');key(host.querySelector('[data-student-preview-open]'),' ',{code:'Space'});expect(record).toHaveBeenCalledTimes(1);
   } finally {window.removeEventListener('keydown',hostShortcut);window.removeEventListener('keyup',keyUp);}
 });

 it('contains preview clicks, pointer activity and pasted answers without disabling the controls',()=>{
   mount();open();const bubble=vi.fn(),capture=vi.fn(event=>{if(!event.target.closest('[data-help-ignore]'))event.stopPropagation();});
   const events=['click','dblclick','pointerdown','mousemove','wheel','touchstart','touchmove','paste'];events.forEach(name=>window.addEventListener(name,bubble));document.addEventListener('click',capture,true);
   try {
     const display=dialog().querySelector('[data-reader-display]');click(display);expect(display.getAttribute('aria-expanded')).toBe('true');
     for(const name of events.filter(name=>name!=='click'))act(()=>display.dispatchEvent(new Event(name,{bubbles:true,cancelable:true})));
     expect(bubble).not.toHaveBeenCalled();expect(capture).toHaveBeenCalled();
   } finally {events.forEach(name=>window.removeEventListener(name,bubble));document.removeEventListener('click',capture,true);}
 });
 it('announces a balanced preview lifetime on close and unmount without including lesson content',()=>{
   mount();const changes=[];const listen=event=>changes.push(event.detail);window.addEventListener('alloflow:reading-preview',listen);
   try {open();click(dialog().querySelector('[data-student-preview-close]'));open();act(()=>root.unmount());root=null;
     expect(changes.map(detail=>detail.active)).toEqual([true,false,true,false]);expect(new Set(changes.map(detail=>detail.owner)).size).toBe(1);
     for(const detail of changes)expect(Object.keys(detail).sort()).toEqual(['active','owner']);
   } finally {window.removeEventListener('alloflow:reading-preview',listen);}
 });

describe('preview snapshot refresh',()=>{
  it('describes available reading behavior instead of inviting unavailable sentence playback',()=>{
    mount();expect(host.textContent).toContain('Choose any sentence to listen from there.');open();
    expect(dialog().textContent).not.toContain('Choose any sentence to listen from there.');expect(dialog().textContent).toContain('Display changes the appearance of this preview.');
    expect(dialog().querySelector('[data-reader-listen]').disabled).toBe(true);
  });
  it('starts from the current appearance even when preference writes fail',()=>{
    mount({isCompareMode:true});
    const set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Storage unavailable');});
    click(host.querySelector('[data-reader-display]'));change(host.querySelector('select[aria-label="Reading width"]'),'40');
    click(host.querySelector('input[aria-label="Show changes"]'));set.mockClear();
    open();expect(dialog().querySelector('[data-reader-display]').getAttribute('aria-expanded')).toBe('true');
    expect(dialog().querySelector('select[aria-label="Reading width"]').value).toBe('40');
    click(dialog().querySelector('[data-reading-version="both"]'));expect(dialog().querySelector('input[aria-label="Show changes"]').checked).toBe(true);
    expect(set).not.toHaveBeenCalled();
  });
  it('refreshes only on request without restarting the modal lifetime or entering host services',()=>{
    const rerender=mount({generatedContent:withHelp()});const changes=[];const listen=e=>changes.push(e.detail.active);window.addEventListener('alloflow:reading-preview',listen);
    try {
      open();const modal=dialog();rerender({generatedContent:item('The new reading.'),readingTheme:'dark'});
      expect(modal.textContent).toContain('The heron walked slowly.');expect(modal.textContent).not.toContain('The new reading.');
      expect(modal.textContent).toContain('stays the same until you refresh or reopen it');
      props.stopPlayback.mockClear();const set=vi.spyOn(Storage.prototype,'setItem'),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
      const lesson=JSON.stringify(props.generatedContent),history=JSON.stringify(props.history);
      const refresh=modal.querySelector('[data-student-preview-refresh]');expect(refresh.getAttribute('aria-describedby')).toBeTruthy();click(refresh);
      expect(dialog()).toBe(modal);expect(modal.textContent).toContain('The new reading.');expect(modal.textContent).not.toContain('The heron walked slowly.');
      expect(modal.querySelector('[data-adapted-theme-picker]').value).toBe('dark');expect(document.activeElement).toBe(refresh);
      expect(modal.querySelector('[data-preview-refresh-status]').textContent).toContain('Preview refreshed');expect(changes).toEqual([true]);
      for(const fn of [set,fetch,props.handleSpeak,props.stopPlayback,props.callTTS,props.setGeneratedContent,props.setHistory])expect(fn).not.toHaveBeenCalled();
      expect(JSON.stringify(props.generatedContent)).toBe(lesson);expect(JSON.stringify(props.history)).toBe(history);
      click(modal.querySelector('[data-student-preview-close]'));expect(changes).toEqual([true,false]);
    } finally {window.removeEventListener('alloflow:reading-preview',listen);}
  });
  it('discards local answers, navigation and appearance on refresh without saving them',()=>{
    mount();open();click(dialog().querySelector('[data-reader-display]'));change(dialog().querySelector('select[aria-label="Reading width"]'),'40');
    click(dialog().querySelector('[data-reading-outline-toggle]'));click(dialog().querySelector('[data-reading-bookmark]'));
    const prompt=()=>dialog().querySelector('[data-section-prompts-toggle]')||[...dialog().querySelectorAll('button')].find(el=>el.textContent==='Think about this section');
    click(prompt());const answer=dialog().querySelector('[data-section-prompt="mainIdea"]');
    act(()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(answer,'A temporary answer');answer.dispatchEvent(new Event('input',{bubbles:true}));});expect(answer.value).toBe('A temporary answer');
    const set=vi.spyOn(Storage.prototype,'setItem'),remove=vi.spyOn(Storage.prototype,'removeItem');
    expect(dialog().textContent).toContain('discarded when you refresh or close it');click(dialog().querySelector('[data-student-preview-refresh]'));
    expect(dialog().querySelector('select[aria-label="Reading width"]').value).toBe('72');expect(dialog().querySelector('[data-reader-display]').getAttribute('aria-expanded')).toBe('false');
    click(dialog().querySelector('[data-reading-outline-toggle]'));click(prompt());expect(dialog().querySelector('[data-section-prompt="mainIdea"]').value).toBe('');
    expect(set).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
  });
  it('refreshes prepared help and removes the old preview card and ranges',()=>{
    const registry=new Map();vi.stubGlobal('CSS',{highlights:registry});vi.stubGlobal('Highlight',class extends Set {constructor(...ranges){super(ranges);}});
    const reading=withHelp(),rerender=mount({generatedContent:reading});const hostReader=host.querySelector('[data-adapted-reader]');open();
    click(dialog().querySelector('[data-reading-mode="define"]'));click([...dialog().querySelectorAll('[data-reading-word]')].find(el=>el.textContent==='heron'));
    const oldRange=[...registry.get('allo-word-help')].find(range=>dialog().contains(range.startContainer));
    const updated=withHelp();updated.adaptedReadingSupports={...updated.adaptedReadingSupports,annotations:updated.adaptedReadingSupports.annotations.map(entry=>({...entry,text:'A long-legged water bird.'}))};rerender({generatedContent:updated});
    expect(dialog().querySelector('[data-word-help-card-text]').textContent).toBe('A water bird.');
    click(dialog().querySelector('[data-student-preview-refresh]'));
    expect(dialog().querySelector('[data-word-help-card]')).toBe(null);expect(document.activeElement).toBe(dialog().querySelector('[data-student-preview-refresh]'));
    const ranges=[...registry.get('allo-word-help')];expect(ranges.some(range=>dialog().contains(range.startContainer))).toBe(true);expect(ranges).not.toContain(oldRange);
    click(dialog().querySelector('[data-reading-mode="define"]'));click([...dialog().querySelectorAll('[data-reading-word]')].find(el=>el.textContent==='heron'));
    expect(dialog().querySelector('[data-word-help-card-text]').textContent).toBe('A long-legged water bird.');
    const ids=[...host.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);
  });
  it('preserves host highlights when refreshing an unchanged snapshot',()=>{
    const registry=new Map();vi.stubGlobal('CSS',{highlights:registry});vi.stubGlobal('Highlight',class extends Set {constructor(...ranges){super(ranges);}});
    mount({generatedContent:withHelp()});const hostReader=host.querySelector('[data-adapted-reader]');open();
    const before=[...registry.get('allo-word-help')],hostRange=before.find(range=>hostReader.contains(range.startContainer)),previewRange=before.find(range=>dialog().contains(range.startContainer));
    expect(hostRange).toBeTruthy();expect(previewRange).toBeTruthy();click(dialog().querySelector('[data-student-preview-refresh]'));
    const after=[...registry.get('allo-word-help')];expect(after).toHaveLength(2);expect(after).toContain(hostRange);expect(after).not.toContain(previewRange);
    click(dialog().querySelector('[data-student-preview-close]'));expect([...registry.get('allo-word-help')]).toEqual([hostRange]);
  });
  it('keeps the snapshot available and explains refresh being unavailable after switching away',()=>{
    const rerender=mount();open();rerender({generatedContent:api.createSupportedReading('Another original.',{id:'other',sourceFamilyId:'other'})});
    expect(dialog().textContent).toContain('The heron walked slowly.');const refresh=dialog().querySelector('[data-student-preview-refresh]');
    expect(refresh.disabled).toBe(true);expect(dialog().textContent).toContain('A current adapted reading is needed to refresh');
    click(refresh);expect(dialog().textContent).toContain('The heron walked slowly.');click(dialog().querySelector('[data-student-preview-close]'));expect(dialog()).toBe(null);
  });
});
