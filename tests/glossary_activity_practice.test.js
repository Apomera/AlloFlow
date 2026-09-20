import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, mountGame } from './helpers/games_live_harness.js';
let game;
afterEach(()=>{game?.unmount();game=null;vi.useRealTimers();vi.restoreAllMocks();});
const words=[{term:'Leaf',def:'A green plant part'},{term:'Root',def:'Takes up water'},{term:'Seed',def:'Grows into a plant'}];
const click=el=>{expect(el).toBeTruthy();act(()=>el.click());};
const key=el=>{expect(el).toBeTruthy();act(()=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));};
const control=(c,name)=>c.querySelector('[data-help-key="'+name+'"]');
const practice=c=>c.querySelector('[data-game-review-practice]');
const byText=(c,text)=>[...c.querySelectorAll('button')].find(button=>button.textContent.trim()===text);
const terms=c=>[...c.querySelectorAll('[data-help-key="matching_term_item"]')];
function mount(name,extra={}){game=mountGame(name,{data:words,onClose:vi.fn(),...extra});return game.container;}
function connect(c,term,def){key(terms(c).find(el=>el.textContent===term));key([...c.querySelectorAll('[data-help-key="matching_def_item"]')].find(el=>el.getAttribute('aria-label').endsWith(': '+def)));}
function changeMode(c,value){act(()=>{const select=c.querySelector('select');select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});}
function input(c,value){act(()=>{const el=c.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
function answer(c,value){input(c,value);click(c.querySelector('[aria-label="common.check"]'));act(()=>vi.advanceTimersByTime(1100));}
function setupScramble(){vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0.999);}

describe('Matching practice rounds',()=>{
 it('retries incorrect and unanswered pairs only, moves focus, and restores the full round',()=>{
  const complete=vi.fn(),c=mount('MatchingGame',{onGameComplete:complete});
  connect(c,'Leaf',words[0].def);connect(c,'Root',words[2].def);click(control(c,'matching_check_btn'));
  expect(practice(c).textContent).toContain('(2)');expect(c.textContent).toContain('Not answered');expect(document.activeElement.tagName).toBe('H3');
  click(practice(c));expect(terms(c).map(el=>el.textContent)).toEqual(['Root','Seed']);expect(c.querySelector('[data-game-practice-round]').textContent).toContain('2/3');expect(document.activeElement).toBe(terms(c)[0]);
  connect(c,'Root',words[1].def);connect(c,'Seed',words[2].def);click(control(c,'matching_check_btn'));
  expect(practice(c)).toBeNull();expect(complete).toHaveBeenLastCalledWith('matching',expect.objectContaining({totalPairs:2,correctMatches:2,isPerfect:true}));
  click(byText(c,'Restart all pairs'));expect(terms(c).map(el=>el.textContent)).toEqual(words.map(item=>item.term));expect(c.querySelector('[data-game-practice-round]')).toBeNull();expect(complete).toHaveBeenCalledTimes(2);
 });
 it('retains picture descriptions and excludes correctly matched picture pairs from practice',()=>{
  const data=words.map((word,i)=>({...word,image:'data:image/png;base64,'+i,imageAlt:'Description '+i})),c=mount('MatchingGame',{data});changeMode(c,'pictures');
  connect(c,'Leaf','Description 0');click(control(c,'matching_check_btn'));click(practice(c));
  expect(c.querySelector('select').value).toBe('pictures');expect(terms(c)).toHaveLength(2);expect(c.querySelector('img[alt="Description 0"]')).toBeNull();expect(c.querySelector('img[alt="Description 1"]')).toBeTruthy();
  changeMode(c,'definitions');expect(terms(c)).toHaveLength(3);expect(c.querySelector('[data-game-practice-round]')).toBeNull();
 });
 it('keeps duplicate term entries distinct during a retry',()=>{
  const data=[{term:'bank',def:'River edge'},{term:'bank',def:'A financial institution'}],c=mount('MatchingGame',{data});
  key(terms(c)[0]);key([...c.querySelectorAll('[data-help-key="matching_def_item"]')].find(el=>el.textContent==='River edge'));click(control(c,'matching_check_btn'));click(practice(c));
  expect(terms(c)).toHaveLength(1);expect(control(c,'matching_def_item').textContent).toBe('A financial institution');
 });
 it('retries the missed meaning when duplicate labels are matched in a different order',()=>{
  const data=[{term:'bank',def:'River edge'},{term:'bank',def:'A financial institution'}],c=mount('MatchingGame',{data});
  key(terms(c)[0]);key([...c.querySelectorAll('[data-help-key="matching_def_item"]')].find(el=>el.textContent==='A financial institution'));click(control(c,'matching_check_btn'));const review=c.querySelector('[role="region"]');expect(review.textContent.match(/River edge/g)).toHaveLength(1);expect(review.textContent.match(/A financial institution/g)).toHaveLength(1);click(practice(c));
  expect(terms(c)).toHaveLength(1);expect(control(c,'matching_def_item').textContent).toBe('River edge');
 });
 it('clears an old practice pool when glossary data is replaced',()=>{
  const c=mount('MatchingGame');connect(c,'Leaf',words[0].def);click(control(c,'matching_check_btn'));click(practice(c));
  game.rerender({data:[{term:'Sun',def:'A star'}],onClose:vi.fn()});click(control(c,'matching_reset_btn'));expect(terms(c).map(el=>el.textContent)).toEqual(['Sun']);expect(c.querySelector('[data-game-practice-round]')).toBeNull();
 });
});

describe('Word Scramble practice rounds',()=>{
 it('offers skipped and hinted words for practice and restores the original set afterward',()=>{
  setupScramble();const complete=vi.fn(),c=mount('WordScrambleGame',{onGameComplete:complete});
  answer(c,'Leaf');click(c.querySelector('[aria-label="games.scramble.get_hint_aria"]'));answer(c,'Root');click(c.querySelector('[aria-label="common.skip"]'));
  expect(practice(c).textContent).toContain('(2)');expect(c.textContent).toContain('Solved with a hint');expect(c.textContent).toContain('Skipped');expect(document.activeElement.tagName).toBe('H3');
  click(practice(c));act(()=>vi.advanceTimersByTime(20));expect(document.activeElement).toBe(c.querySelector('input'));expect(c.querySelector('[data-game-practice-round]').textContent).toContain('2/3');expect(c.textContent).toContain(words[1].def);
  answer(c,'Root');answer(c,'Seed');expect(practice(c)).toBeNull();expect(complete).toHaveBeenLastCalledWith('wordScramble',expect.objectContaining({totalItems:2,correctCount:2,score:20}));
  click(byText(c,'Restart all words'));expect(c.textContent).toContain(words[0].def);expect(c.querySelector('[data-game-practice-round]')).toBeNull();answer(c,'Leaf');answer(c,'Root');answer(c,'Seed');expect(complete).toHaveBeenLastCalledWith('wordScramble',expect.objectContaining({totalItems:3,correctCount:3,score:30}));expect(complete).toHaveBeenCalledTimes(3);
 });
 it('offers words solved after an incorrect attempt without including later independent answers',()=>{
  setupScramble();const c=mount('WordScrambleGame');input(c,'wrong');click(c.querySelector('[aria-label="common.check"]'));answer(c,'Leaf');answer(c,'Root');answer(c,'Seed');
  expect(practice(c).textContent).toContain('(1)');expect(c.textContent).toContain('Solved after another try');click(practice(c));answer(c,'Leaf');expect(practice(c)).toBeNull();
 });
 it('uses item identity when duplicate terms have different clues',()=>{
  setupScramble();const data=[{term:'bank',def:'River edge'},{term:'bank',def:'A financial institution'}],c=mount('WordScrambleGame',{data});answer(c,'bank');click(c.querySelector('[aria-label="common.skip"]'));click(practice(c));expect(c.textContent).toContain('A financial institution');expect(c.textContent).not.toContain('River edge');
 });
 it('clears stale practice and completion timers when the glossary changes',()=>{
  setupScramble();const complete=vi.fn(),c=mount('WordScrambleGame',{onGameComplete:complete});for(let i=0;i<3;i++)click(c.querySelector('[aria-label="common.skip"]'));click(practice(c));input(c,'Leaf');click(c.querySelector('[aria-label="common.check"]'));
  game.rerender({data:[{term:'Sun',def:'A star'}],onClose:vi.fn(),onGameComplete:complete});act(()=>vi.advanceTimersByTime(1200));expect(complete).toHaveBeenCalledTimes(1);expect(c.textContent).toContain('A star');expect(c.querySelector('[data-game-practice-round]')).toBeNull();answer(c,'Sun');expect(practice(c)).toBeNull();expect(complete).toHaveBeenLastCalledWith('wordScramble',expect.objectContaining({totalItems:1,correctCount:1}));
 });
});
