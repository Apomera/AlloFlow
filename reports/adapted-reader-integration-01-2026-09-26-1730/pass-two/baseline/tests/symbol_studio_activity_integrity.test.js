import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require=createRequire(import.meta.url);
const {createRoot}=require(resolve(process.cwd(),'desktop/web-app/node_modules/react-dom/client'));
const act=React.act, image='data:image/png;base64,AA==';
const source=readFileSync(resolve(process.cwd(),'symbol_studio_module.js'),'utf8');
let api,Studio,root,host;
beforeAll(()=>{Studio=setupSymbolStudio().SymbolStudio;api=window.AlloModules.SymbolStudioInternals;globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;vi.restoreAllMocks();localStorage.clear();});
const set=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
function control(name){const el=[...host.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===name);expect(el,name).toBeTruthy();return el;}
async function click(name){await act(async()=>control(name).click());}
async function input(name,value){const el=control(name);await act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
async function mount(tab='board',extra={}){
  set('alloStudentProfiles',[{id:'a',name:'Learner',codename:'DEMO'}]);set('alloActiveProfileId','a');
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  await act(async()=>root.render(React.createElement(Studio,baseProps({initialTab:tab,draftStorage:{read:async()=>null,write:async()=>{},remove:async()=>{}},onCallTTS:null,...extra}))));
}
function extractedScope(entries=[]){
  const scope={...api,profiles:[{id:'a',codename:'DEMO'}],activeProfileId:'a',activeGoals:[],profileWishes:[],
    gallery:[],savedBoards:[],savedSchedules:[],boardWords:[],schedItems:[],storyPages:[],cmItems:[],snItems:[],amItems:[],bcItems:[],twItems:[],cbItems:[],
    boardTitle:'',schedTitle:'',ftFirstLabel:'',ftThenLabel:'',usageLog:{a:{sessions:[{entries}]}},familiarity:{},CORE_SET:{},getWordFunction:()=>null,
    t:x=>x,addToast:()=>{},document:{createElement:()=>({click(){}}),body:{appendChild(){},removeChild(){}}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
    Blob:class{constructor(parts){scope.csv=parts.join('');}}
  };
  scope.getFamiliarityScore=label=>api.symbolPracticeScore(api.symbolFamiliarityEntry(scope.familiarity,label));
  vm.createContext(scope);
  for(const [start,end] of [['    function computeWordBank() {','    var generateGardenStory ='],['    function gardenSuggestions(word) {','    function renderGrowthCelebrations() {'],['    function exportGardenCSV(bank) {','    // ── Quick Boards tab']]){
    const a=source.indexOf(start),b=source.indexOf(end,a+start.length);expect(a).toBeGreaterThan(-1);expect(b).toBeGreaterThan(a);vm.runInContext(source.slice(a,b),scope);
  }
  return scope;
}
function csvMetrics(scope){scope.exportGardenCSV([]);const rows=scope.csv.split('\n'),i=rows.indexOf('--- AGGREGATE METRICS ---');const names=rows[i+1].split(','),values=rows[i+2].split(',');expect(names).toHaveLength(values.length);return Object.fromEntries(names.map((name,i)=>[name,values[i]]));}

describe('Review-aware automatic reuse',()=>{
  it('ranks approval before every preference and rejects assets without images',()=>{
    const approved={id:'approved',label:'Water',image,reviewStatus:'approved'};
    const flagged={id:'flagged',label:'Water',image,reviewStatus:'needs_changes',isPreferred:true,validated:true,locked:true,isFavorite:true};
    expect(api.findExactBankAsset([flagged,approved],'water')).toBe(approved);
    const unreviewed={id:'new',label:'Water',image};
    expect(api.findExactBankAsset([flagged,unreviewed],'Water')).toBe(unreviewed);
    expect(api.findExactBankAsset([{...approved,image:null},flagged],'Water')).toBe(flagged);
    expect(api.findExactBankAsset([approved],'Tea')).toBeNull();
  });
  it('keeps the approved image and asset reference together in Garden reuse actions',()=>{
    const scope=extractedScope(),boards=[],sequences=[],toasts=[];
    scope.gallery=[{id:'flagged',label:'Café',image:'flagged-image',isPreferred:true,reviewStatus:'needs_changes'},{id:'approved',label:'Café',image:'approved-image',reviewStatus:'approved'}];
    Object.assign(scope,{uid:()=> 'new',setTab:()=>{},setBoardWords:fn=>boards.splice(0,boards.length,...fn(boards)),setSchedItems:fn=>sequences.splice(0,sequences.length,...fn(sequences)),setSchedNowId:()=>{},setSchedTitle:()=>{},addToast:message=>toasts.push(message)});
    const word={key:'café',displayLabel:'Café',category:'noun',contextTypes:['gallery'],image:'flagged-image',aacUses:1,growth:'seed'};
    const actions=scope.gardenSuggestions(word);actions[0].action();actions[1].action();
    for(const item of [boards[0],sequences[0]])expect(item).toMatchObject({image:'approved-image',assetId:'approved'});
    expect(toasts.every(t=>!t.includes('to review'))).toBe(true);
    boards[0].label='Cafe\u0301';sequences[0].label='Cafe\u0301';actions[0].action();actions[1].action();
    expect(boards).toHaveLength(1);expect(sequences).toHaveLength(1);
    scope.gallery=[scope.gallery[0]];scope.gardenSuggestions({...word,key:'tea',displayLabel:'Café'})[1].action();
    expect(toasts.at(-1)).toContain('1 marked needs changes');
  });
  it('keeps preferred variants within their review tier and summarizes fallbacks',()=>{
    const a={id:'a',label:'Water',image,reviewStatus:'approved'},b={...a,id:'b',isPreferred:true};
    expect(api.findExactBankAsset([a,b],'Water')).toBe(b);
    expect(api.bankReuseReviewNotice([a,b])).toBe('');
    expect(api.bankReuseReviewNotice([a,{label:'Tea'},{label:'Milk',reviewStatus:'needs_changes'},null])).toBe(' Reused symbols to review: 1 unreviewed, 1 marked needs changes.');
  });
});

describe('Shared AAC activity metrics',()=>{
  it('uses recorded strip lengths despite removals, repeated speech and unsent taps',()=>{
    const entries=[{label:'I'},{label:'want'},{label:'Water'},{label:'__UTTERANCE__',length:2},{label:'__UTTERANCE__',length:2},{label:'Tea'}];
    expect(api.symbolSessionMetrics([{entries}])).toMatchObject({symbolTaps:4,uniqueTappedLabels:4,speechRequests:2,knownMessageLengths:2,unknownMessageLengths:0,meanSymbolsPerMessage:2});
    expect(csvMetrics(extractedScope(entries))).toMatchObject({symbol_taps:'4',unique_tapped_labels:'4',speech_requests:'2',mean_symbols_per_message:'2.00',metrics_version:'2'});
  });
  it('does not infer messages from unsent taps or unknown legacy marker lengths',()=>{
    const scope=extractedScope([{label:'Café'},{label:'Cafe\u0301'},{label:'__UTTERANCE__'},{label:'__UTTERANCE__',length:null},{label:'__UTTERANCE__',length:'3'}]);
    expect(csvMetrics(scope)).toMatchObject({symbol_taps:'2',unique_tapped_labels:'1',speech_requests:'3',known_message_lengths:'0',unknown_message_lengths:'3',mean_symbols_per_message:''});
    expect(api.symbolSessionMetrics([{entries:[{label:'Water'}]}])).toMatchObject({speechRequests:0,meanSymbolsPerMessage:null});
  });
  it('excludes invalid lengths and malformed entries while preserving valid messages',()=>{
    const entries=[null,{}, {label:'  '},{label:'__proto__'},...[-1,0,NaN,Infinity,1.5,2].map(length=>({label:'__UTTERANCE__',length}))];
    expect(api.symbolSessionMetrics([{entries},null])).toMatchObject({symbolTaps:1,uniqueTappedLabels:1,speechRequests:6,knownMessageLengths:1,unknownMessageLengths:5,meanSymbolsPerMessage:2});
    expect(api.symbolSessionMetrics(null).meanSymbolsPerMessage).toBeNull();
  });
  it('persists the composed message and shows the same mean after deleting a tapped word',async()=>{
    set('alloSymbolBoards__a',[{id:'board',title:'Communication',cols:3,words:['I','want','Water'].map(label=>({id:label,label,category:'other'}))}]);
    await mount();await click('Toggle saved boards gallery');await click('Use board in AAC mode');
    for(const cell of [...host.querySelectorAll('[role=gridcell]')])await act(async()=>cell.click());
    await click('Delete last word from sentence strip');await click('Speak constructed sentence');await click('Exit AAC mode');
    const session=JSON.parse(localStorage.getItem('alloAACUsage__a')).a.sessions.at(-1);
    expect(session.metricsVersion).toBe(2);
    expect(session.entries.at(-1)).toMatchObject({eventType:'speech_request',label:'__UTTERANCE__',length:2,phrase:'I want',symbols:[{label:'I'},{label:'want'}]});
    expect(api.symbolSessionMetrics([session])).toMatchObject({symbolTaps:3,speechRequests:1,meanSymbolsPerMessage:2});
    const summary=host.querySelector('[role=dialog]').textContent;
    expect(summary).toContain('2.0symbols / message');expect(summary).toContain('1 speech request');expect(summary).toContain('playback not verified');
    expect(csvMetrics(extractedScope(session.entries))).toMatchObject({symbol_taps:'3',speech_requests:'1',mean_symbols_per_message:'2.00'});
  });
  it('reports plain activity counts and unknown lengths for saved legacy sessions',async()=>{
    set('alloAACUsage__a',{a:{sessions:[{date:new Date().toISOString(),entries:[{label:'Café'},{label:'Cafe\u0301'},{label:'__UTTERANCE__'},{label:'__UTTERANCE__',length:2}]}]}});
    await mount('garden');
    expect(host.textContent).toContain('1 unique tapped labels / 2 symbol taps · 2 speech requests');
    let html='';vi.spyOn(window,'open').mockReturnValue({document:{write:value=>{html=value;},close(){}},print(){}});
    await click('Print practice report');
    expect(html).toContain('1 unique tapped labels across 2 symbol taps; 2 speech requests.');
    expect(html).toContain('Mean symbols per message: 2.00 (1 recorded lengths).');
    expect(html).toContain('1 legacy message lengths unknown.');expect(html).not.toContain('(Rich)');
  });
});

describe('Canonical Unicode activity and spelling',()=>{
  it('merges equivalent familiarity buckets and consolidates them once on the next event',()=>{
    const original={'café':{taps:2,questCorrect:1,firstSeen:100,lastSeen:200},'cafe\u0301':{taps:3,questWrong:2,firstSeen:50,lastSeen:300},'cafe':{taps:9}};
    expect(api.symbolFamiliarityEntry(original,'CAFÉ')).toMatchObject({taps:5,questCorrect:1,questWrong:2,firstSeen:50,lastSeen:300});
    const next=api.recordSymbolPractice(original,'Cafe\u0301','aac-tap',400);
    expect(Object.keys(next).sort()).toEqual(['cafe','café']);expect(next['café']).toMatchObject({taps:6,firstSeen:50,lastSeen:400});
    expect(api.recordSymbolPractice(next,'Café','aac-tap',500)['café'].taps).toBe(7);
    expect(next.cafe.taps).toBe(9);expect(original['cafe\u0301'].taps).toBe(3);
  });
  it.each([['Café','Cafe\u0301'],['가','\u1100\u1161'],['Å','A\u030a']])('aggregates equivalent %s encodings', (a,b)=>{
    expect(api.symbolActivityKey(a)).toBe(api.symbolActivityKey(b));
    const scope=extractedScope([{label:a},{label:b}]);scope.gallery=[{id:'one',label:a,image},{id:'two',label:b,image}];scope.familiarity={[a.toLowerCase()]:{taps:2},[b.toLowerCase()]:{taps:3}};
    const bank=scope.computeWordBank();expect(bank).toHaveLength(1);expect(bank[0]).toMatchObject({taps:5,aacUses:2});
  });
  it('preserves meaningful spelling distinctions',()=>{
    for(const [a,b] of [['café','cafe'],['का','क'],['re-sign','resign'],['Ａ','A']])expect(api.symbolActivityKey(a)).not.toBe(api.symbolActivityKey(b));
  });
  it('accepts equivalent encoding in the live spelling game and persists canonical practice',async()=>{
    // Three image symbols are required to enter Quest. Use equivalent Hangul encodings for any target.
    set('alloSymbolGallery__a',['가','나','다'].map((label,i)=>({id:String(i),label,image:image+'#'+i})));
    await mount('quest');await click('Spell It game mode');
    const index=Number(host.querySelector('img[alt="symbol to identify"]').getAttribute('src').split('#')[1]);
    const label=['가','나','다'][index];expect(label).toBeTruthy();
    await input('Spell the symbol label',label.normalize('NFD'));await click('Check');
    expect(host.textContent).toContain('Perfect spelling!');
    expect(JSON.parse(localStorage.getItem('alloSymbolFamiliarity__a'))[label]).toMatchObject({questCorrect:1});
  });
});
