import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, act, mountGame } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const data = Array.from({ length: 14 }, (_, i) => ({ entryId: String(i), term: ['Leaf','Root','Seed','Stem','Flower','Fruit','Branch','Bark','Tree','Moss','Fern','Grass','Soil','Water'][i], def: 'Meaning '+i, translations:{French:'Mot'+i+': Sens '+i} }));
let cleanup;
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); loadAlloModule('host_handlers_module.js'); loadAlloModule('text_utility_helpers_module.js'); });
afterEach(() => { cleanup?.(); cleanup=null; vi.restoreAllMocks(); });
function mount() {
  const rootElement=document.createElement('div');document.body.append(rootElement);const root=ReactDOMClient.createRoot(rootElement);const captured={};let setExternal;
  const base=glossaryMediaProps(),resource={...base.generatedContent,data};
  const wordSearch=vi.fn(),bingo=vi.fn(),setBingoState=vi.fn();
  const game = name => props => {captured[name]=props;return React.createElement('div',{'data-game':name},props.data.map(x=>x.term).join(','));};
  const games={MemoryGame:game('memory'),MatchingGame:game('matching'),CrosswordGame:game('crossword'),WordScrambleGame:game('scramble'),BingoGame:game('bingo'),StudentBingoGame:game('studentBingo')};
  function App(){const [state,set]=React.useState({limit:4});setExternal=patch=>set(p=>({...p,...patch}));const props=glossaryMediaProps({...games,generatedContent:resource,...state,filteredGlossaryData:data.slice(0,state.limit).map((x,i)=>({...x,_originalIdx:i})),ErrorBoundary:({children})=>children,generateWordSearch:wordSearch,handleGenerateBingo:bingo,setBingoState});for(const [name,flag] of [['Memory','isMemoryGame'],['Matching','isMatchingGame'],['Crossword','isCrosswordGame'],['WordScramble','isWordScrambleGame'],['Bingo','isBingoGame'],['StudentBingo','isStudentBingoGame']])props['handleSetIs'+name+'GameToTrue']=()=>set(p=>({...p,[flag]:true}));props.handleSetIsWordScrambleGameToTrue=()=>set(p=>({...p,isWordScrambleGame:true}));return React.createElement(window.AlloModules.GlossaryView,props);}
  act(()=>root.render(React.createElement(App)));cleanup=()=>{act(()=>root.unmount());rootElement.remove();};
  return {container:rootElement,captured,wordSearch,bingo,setBingoState,update:patch=>act(()=>setExternal(patch))};
}
const click=async el=>{expect(el).toBeTruthy();await act(async()=>el.click());};
const control=(v,name)=>v.container.querySelector('[data-help-key="glossary_'+name+'"]');
async function open(v){await click([...v.container.querySelectorAll('button')].find(b=>b.textContent.includes('common.start_game')));}
async function select(v,index,value){await act(async()=>{const el=v.container.querySelectorAll('[data-glossary-activity-settings] select')[index];el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});}

describe('glossary activity settings',()=>{
 it('uses a stable filtered pool and applies board settings only on the next deliberate launch',async()=>{const v=mount();await open(v);await select(v,0,'filtered');await select(v,1,'4');await click(control(v,'memory_game'));const round=v.captured.memory;expect(round.data.map(x=>x.term)).toEqual(data.slice(0,4).map(x=>x.term));expect(round.roundSize).toBe(4);expect(round.data[0].translations).toEqual(data[0].translations);v.update({limit:1});await select(v,1,'6');expect(v.captured.memory.data).toBe(round.data);expect(v.captured.memory.roundSize).toBe(4);await click(control(v,'memory_game'));expect(v.captured.memory.data).toHaveLength(1);expect(v.captured.memory.roundSize).toBe(6);expect(data).toHaveLength(14);});
 it.each([['matching','matching'],['crossword','crossword'],['scramble','scramble'],['bingo','bingo'],['play_bingo','studentBingo']])('uses the selected words for %s',async(button,name)=>{const v=mount();await open(v);await select(v,0,'filtered');await click(control(v,button));expect(v.captured[name].data).toHaveLength(4);if(name==='bingo'){expect(v.setBingoState).toHaveBeenCalledWith({cards:[],drawPile:[],calledTerms:[],currentCall:null});v.captured.bingo.onGenerate();expect(v.bingo).toHaveBeenCalledWith(v.captured.bingo.data);}});
 it('passes filtered words to word search and prevents empty launches with a recovery action',async()=>{const v=mount();await open(v);await select(v,0,'filtered');await click(control(v,'word_search'));expect(v.wordSearch.mock.calls[0][1].map(x=>x.term)).toEqual(data.slice(0,4).map(x=>x.term));v.update({limit:0});expect(control(v,'word_search').disabled).toBe(true);expect(control(v,'memory_game').disabled).toBe(true);expect(v.container.querySelector('#glossary-activity-pool').textContent).toContain('0 words');await click([...v.container.querySelectorAll('button')].find(b=>b.textContent==='Use all glossary words'));expect(control(v,'memory_game').disabled).toBe(false);await click(control(v,'matching'));expect(v.captured.matching.data).toHaveLength(14);});
});

describe('activity board sizes',()=>{
 it.each([['MemoryGame',4,8],['MemoryGame',6,12],['MatchingGame',4,4],['MatchingGame',6,6]])('%s honors a %s-pair round', (name,roundSize,count)=>{const game=mountGame(name,{data,roundSize,onClose:vi.fn()});cleanup=game.unmount;const selector=name==='MemoryGame'?'[role="group"] [role="button"]':'[data-help-key="matching_term_item"]';expect(game.container.querySelectorAll(selector)).toHaveLength(count);});
});

describe('scoped puzzle generators',()=>{
 it('builds word-search words from the selection without dropping glossary entries',()=>{const setGameData=vi.fn(),setGeneratedContent=vi.fn(),setHistory=vi.fn();const resource={type:'glossary',id:'scoped',data};window.AlloModules.TextUtilityHelpers.generateWordSearch('English',{generatedContent:resource,wordSearchLang:'English',setGameData,setGeneratedContent,setHistory,setGameMode:vi.fn(),setFoundWords:vi.fn(),setSelectedLetters:vi.fn(),setShowWordSearchAnswers:vi.fn(),addToast:vi.fn(),t:key=>key},data.slice(0,2));expect(setGameData).toHaveBeenCalled();expect(setGameData.mock.calls[0][0].words.sort()).toEqual(['LEAF','ROOT']);expect(resource.data).toHaveLength(14);for(const [value] of setGeneratedContent.mock.calls){if(typeof value==='object')expect(value.data).toHaveLength(14);}});
 it('uses the same selected terms for bingo cards and the caller pile',()=>{const generateBingoCards=vi.fn(()=>[['Leaf']]),setBingoState=vi.fn();window.AlloModules.createHostHandlers({generatedContent:{type:'glossary',data},generateBingoCards,bingoSettings:{cardCount:1,gridSize:3},setBingoState,fisherYatesShuffle:x=>x,addToast:vi.fn(),t:key=>key}).handleGenerateBingo(data.slice(0,2));expect(generateBingoCards).toHaveBeenCalledWith(data.slice(0,2),1,3);expect(setBingoState.mock.calls[0][0].drawPile).toEqual(['Leaf','Root']);});
});
