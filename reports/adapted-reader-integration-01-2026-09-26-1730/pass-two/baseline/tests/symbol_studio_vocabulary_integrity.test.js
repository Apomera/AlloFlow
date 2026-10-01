import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
const image = 'data:image/png;base64,AA==';
let api, Studio, root, host;
beforeAll(() => {
  Studio = setupSymbolStudio().SymbolStudio;
  api = window.AlloModules.SymbolStudioInternals;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks(); localStorage.clear();
});
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function control(name) {
  const match = Array.from(host.querySelectorAll('[aria-label]')).find(el => el.getAttribute('aria-label') === name);
  expect(match, name).toBeTruthy(); return match;
}
async function click(name) { await act(async () => control(name).click()); }
async function change(name, value) {
  const input = control(name);
  const proto = input.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
  });
}
async function mount({tab='symbols', assets=[], wishes=[], overrides={}, familiarity={}} = {}) {
  write('alloStudentProfiles', [{id:'a',name:'Learner A'},{id:'b',name:'Learner B'}]);
  write('alloActiveProfileId','a');
  write('alloSymbolGallery__a',assets);
  write('alloSymbolFamiliarity__a',familiarity);
  write('alloGardenWishSeeds',wishes);
  host=document.createElement('div');document.body.appendChild(host);
  root=ReactDOM.createRoot(host);
  const draftStorage={read:async()=>null,write:async()=>{},remove:async()=>{}};
  await act(async()=>root.render(React.createElement(Studio,baseProps({initialTab:tab,draftStorage,...overrides}))));
}
function gardenLabels() {
  return Array.from(host.querySelectorAll('.ss-workspace button[aria-label]')).map(el=>el.getAttribute('aria-label'));
}

describe('Unicode symbol identity and discovery',()=>{
  it.each(['水','ماء','вода','पानी','한국어','日本語','አማርኛ'])('preserves %s through identity, aliases, exact reuse and search',label=>{
    const asset={id:'existing',label,image};
    expect(api.normalizeSymbolLabel(label)).not.toBe('');
    expect(api.findExactBankAsset([asset],label)).toBe(asset);
    expect(api.normalizeBankAsset({id:'alias',label:'Water',aliases:[label]}).aliases).toEqual([label]);
    expect(api.matchesBankQuery(asset,label)).toBe(true);
    expect(api.matchesBankQuery({id:'unrelated',label:'Book'},label)).toBe(false);
  });
  it('preserves distinct identities while allowing accent-insensitive Latin discovery',()=>{
    expect(api.normalizeSymbolLabel('café')).not.toBe(api.normalizeSymbolLabel('cafe'));
    expect(api.normalizeSymbolLabel('cafe\u0301')).toBe(api.normalizeSymbolLabel('café'));
    expect(api.matchesBankQuery({label:'Café'},'cafe')).toBe(true);
    expect(api.normalizeSymbolLabel('का')).not.toBe(api.normalizeSymbolLabel('क'));
    expect(api.symbolSearchKey('का')).toBe('का');
    expect(api.matchesBankQuery({label:'Book'},'🎉')).toBe(false);
    expect(api.matchesBankQuery({label:'Book'},' ')).toBe(true);
  });
  it('uses whole words and phrases for story context instead of substrings',()=>{
    expect(api.storyIncludesSymbol('The book is here.','he')).toBe(false);
    expect(api.storyIncludesSymbol('I am happy.','i')).toBe(true);
    expect(api.storyIncludesSymbol('We are all done!','all done')).toBe(true);
    expect(api.storyIncludesSymbol('This is painting time.','pain')).toBe(false);
    expect(api.storyIncludesSymbol('Я пью воду.','воду')).toBe(true);
    expect(api.storyIncludesSymbol('أريد ماء، من فضلك.','ماء')).toBe(true);
  });
  it('filters the rendered bank and preserves multilingual bridge vocabulary',async()=>{
    await mount({assets:[{id:'water',label:'水',image},{id:'book',label:'Book',image}]});
    await change('Search symbols in the Symbol Bank','水');
    expect(host.querySelectorAll('[aria-label^="Select symbol:"]')).toHaveLength(1);
    expect(control('Select symbol: 水')).toBeTruthy();
    expect(window.AlloModules.GardenBridge.getVocabulary().map(word=>word.label)).toEqual(['水','Book']);
  });
});

describe('Topic and grammatical category compatibility',()=>{
  it('migrates a legacy topic without guessing grammar or changing asset identity',()=>{
    const asset=api.normalizeBankAsset({id:'apple',conceptId:'fruit',label:'Apple',category:'food',image,locked:true});
    expect(asset).toMatchObject({id:'apple',conceptId:'fruit',category:'other',partOfSpeech:'other',topicTags:['food'],image,locked:true});
    expect(api.normalizeBankAsset(asset)).toEqual(asset);
    expect(api.normalizeBankAsset({id:'run',category:'verb',topicTags:['actions','actions']})).toMatchObject({category:'verb',topicTags:['actions']});
  });
  it('preserves topics through the shareable asset contract without private notes',()=>{
    const shared=api.packAssetForShare(api.normalizeBankAsset({id:'apple',label:'Apple',category:'food',reviewNote:'private'}));
    expect(shared).toMatchObject({category:'other',topicTags:['food']});
    expect(shared).not.toHaveProperty('reviewNote');
  });
  it('finds old topic assets under Other and through the independent topic filter',async()=>{
    await mount({assets:[{id:'apple',label:'Apple',category:'food',image},{id:'run',label:'Run',category:'verb',topicTags:['actions'],image}]});
    await click('Filter by Other');
    expect(control('Select symbol: Apple')).toBeTruthy();
    expect(host.querySelectorAll('[aria-label^="Select symbol:"]')).toHaveLength(1);
    await click('Filter by All');
    await change('Filter Symbol Bank by topic','actions');
    expect(control('Select symbol: Run')).toBeTruthy();
    expect(host.querySelectorAll('[aria-label^="Select symbol:"]')).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('alloSymbolGallery__a'))[0]).toMatchObject({id:'apple',category:'other',topicTags:['food']});
  });
  it('saves the selected word type and topic independently',async()=>{
    await mount({overrides:{onCallImagen:async()=>image}});
    await change('Symbol label','Apple');
    await change('Symbol topic','food');
    await change('Symbol word type','noun');
    await click('Generate symbol');
    expect(JSON.parse(localStorage.getItem('alloSymbolGallery__a'))[0]).toMatchObject({label:'Apple',category:'noun',topicTags:['food']});
  });
});

describe('Learner wish ownership',()=>{
  const wishes=[{label:'A wish',profileId:'a'},{label:'B wish',profileId:'b'},{label:'Legacy wish'}];
  it('never treats missing ownership as belonging to every profile',()=>{
    expect(api.getWishesForProfile(wishes,'a').map(w=>w.label)).toEqual(['A wish']);
    expect(api.getWishesForProfile(wishes,'b').map(w=>w.label)).toEqual(['B wish']);
    expect(api.getWishesForProfile(wishes,'default')).toEqual([]);
  });
  it('isolates Garden vocabulary on profile switches while retaining unassigned wishes for review',async()=>{
    await mount({tab:'garden',wishes});
    expect(gardenLabels()).toContain('A wish — Seed');
    expect(gardenLabels()).not.toContain('B wish — Seed');
    expect(gardenLabels()).not.toContain('Legacy wish — Seed');
    expect(control('Assign wish Legacy wish to learner')).toBeTruthy();
    await click('Profile: Learner B');
    expect(gardenLabels()).toContain('B wish — Seed');
    expect(gardenLabels()).not.toContain('A wish — Seed');
  });
  it('assigns a legacy wish explicitly and persists its owner across learner changes',async()=>{
    await mount({tab:'garden',wishes});
    await change('Assign wish Legacy wish to learner','b');
    expect(gardenLabels()).not.toContain('Legacy wish — Seed');
    expect(JSON.parse(localStorage.getItem('alloGardenWishSeeds'))[2].profileId).toBe('b');
    await click('Profile: Learner B');
    expect(gardenLabels()).toContain('Legacy wish — Seed');
    await click('Student view');
    expect(host.textContent).not.toContain('A wish');
    expect(host.textContent).not.toContain('Review unassigned wish words');
  });
  it('keeps a failed wish assignment unassigned',async()=>{
    const addToast=vi.fn();
    await mount({tab:'garden',wishes,overrides:{addToast}});
    const original=Storage.prototype.setItem;
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(key,value){if(key==='alloGardenWishSeeds')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);});
    await change('Assign wish Legacy wish to learner','a');
    expect(control('Assign wish Legacy wish to learner')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('alloGardenWishSeeds'))[2].profileId).toBeUndefined();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Could not assign'),'error');
  });
});

describe('Consistent practice evidence',()=>{
  it('uses the same score in the bridge and Garden, including accented legacy keys',async()=>{
    const entry={taps:19,lastSeen:Date.now()};
    await mount({tab:'garden',assets:[{id:'cafe',label:'Café',image}],familiarity:{'café':entry}});
    const word=window.AlloModules.GardenBridge.getVocabulary().find(w=>w.label==='Café');
    expect(word.familiarityScore).toBe(api.symbolPracticeScore(entry));
    expect(word.scoreVersion).toBe(1);
    await click('Café — Growing');
    expect(host.textContent).toContain(String(Math.round(word.familiarityScore*100)));
    expect(host.textContent).not.toContain('used spontaneously everywhere');
  });
  it('bounds corrupt/future counters and decays the same score with elapsed time',()=>{
    const now=Date.now();
    const entry={taps:25,questCorrect:4,questWrong:1,lastSeen:now};
    expect(api.symbolPracticeScore(entry,now)).toBeCloseTo(.94);
    expect(api.symbolPracticeScore(entry,now+14*86400000)).toBeCloseTo(.64);
    expect(api.symbolPracticeScore({taps:Infinity,lastSeen:now+100000},now)).toBeLessThanOrEqual(1);
    expect(api.symbolPracticeScore(null,now)).toBe(0);
  });
});


it('edits a migrated symbol word type and topics without changing its identity or image', async()=>{
  await mount({assets:[{id:'apple',label:'Apple',category:'food',image,locked:true}]});
  await click('Select symbol: Apple (locked)');
  await change('Word type for Apple','noun');
  await change('Topics for Apple','food, home, food');
  await act(async()=>control('Topics for Apple').dispatchEvent(new FocusEvent('focusout',{bubbles:true})));
  expect(JSON.parse(localStorage.getItem('alloSymbolGallery__a'))[0]).toMatchObject({id:'apple',label:'Apple',category:'noun',partOfSpeech:'noun',topicTags:['food','home'],image,locked:true});
});

it('quizzes grammar and legacy topics while excluding overlapping topics from distractors', async()=>{
  const assets=[
    {id:'apple',label:'Apple',image,category:'noun',topicTags:['food','daily living']},
    {id:'bread',label:'Bread',image,category:'noun',topicTags:['food','daily living']},
    {id:'run',label:'Run',image,category:'verb',topicTags:['actions']}
  ];
  expect(api.symbolQuizCategories({category:'food'})).toEqual(['food']);
  expect(api.symbolQuizCategories(assets[0])).toEqual(['noun','food','daily living']);
  await mount({tab:'quest',assets});
  await click('Category Quiz game mode');
  const choices=Array.from(host.querySelectorAll('[aria-label^="Choose:"]'),el=>el.getAttribute('aria-label'));
  expect(choices).toContain('Choose: Run');
  const prompt=host.querySelector('h4').textContent;
  if(/a thing|food|daily living/.test(prompt))expect(choices).toHaveLength(2);
  else expect(choices).toHaveLength(3);
});
