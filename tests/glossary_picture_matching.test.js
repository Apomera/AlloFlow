import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, mountGame } from './helpers/games_live_harness.js';
const picture = color => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="'+color+'"/></svg>');
const words = [
  {term:'Leaf',def:'A plant part',image:picture('green'),imageAlt:'A broad green shape',imageAttribution:{set:'Mulberry',author:'Steve Lee',license:'CC BY-SA 4.0'}},
  {term:'Root',def:'A plant part',image:picture('brown'),imageAlt:'A branching brown shape'},
  {term:'Seed',def:'Grows into a new plant'}
];
let game;
afterEach(()=>{game?.unmount();game=null;vi.restoreAllMocks();});
function mount(data=words,extra={}) { game=mountGame('MatchingGame',{data,onClose:vi.fn(),...extra});return game.container; }
function mode(container,value='pictures'){act(()=>{const select=container.querySelector('select');select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});}
function click(el){expect(el).toBeTruthy();act(()=>el.click());}
function key(el,key='Enter'){expect(el).toBeTruthy();act(()=>el.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true})));}
const terms=c=>[...c.querySelectorAll('[data-help-key="matching_term_item"]')];
const clues=c=>[...c.querySelectorAll('[data-help-key="matching_def_item"]')];
function pair(c,term,description){key(terms(c).find(el=>el.textContent===term));key(clues(c).find(el=>el.getAttribute('aria-label').endsWith(': '+description)));}

describe('picture matching',()=>{
 it('keeps definitions as the default and uses glossary images, descriptions, credits and text fallbacks in picture mode',()=>{
  const c=mount();expect(c.querySelectorAll('img')).toHaveLength(0);mode(c);
  expect(clues(c)).toHaveLength(3);expect(clues(c).filter(el=>el.querySelector('img'))).toHaveLength(2);
  expect(c.querySelector('[data-help-key="matching_def_item"] img[alt="A broad green shape"]')).toBeTruthy();
  expect(c.querySelector('.glossary-matching-sheet').textContent).toContain('CC BY-SA 4.0');
  expect(c.textContent).toContain('Pictures: 2/3');expect(c.textContent).toContain('Definition clue');
 });
 it('grades keyboard picture and fallback matches and reports completion once',()=>{
  const complete=vi.fn(),score=vi.fn(),c=mount(words,{onGameComplete:complete,onScoreUpdate:score});mode(c);
  pair(c,'Leaf','A broad green shape');pair(c,'Root','A branching brown shape');pair(c,'Seed','Grows into a new plant');
  click(c.querySelector('[data-help-key="matching_check_btn"]'));
  expect(complete).toHaveBeenCalledWith('matching',expect.objectContaining({correctMatches:3,totalPairs:3,isPerfect:true,score:75}));
  expect(score).toHaveBeenCalledTimes(1);click(c.querySelector('[data-help-key="matching_check_btn"]'));expect(complete).toHaveBeenCalledTimes(1);
 });
 it('does not confuse different pictures that share a definition',()=>{
  const complete=vi.fn(),c=mount(words,{onGameComplete:complete});mode(c);pair(c,'Leaf','A branching brown shape');
  click(c.querySelector('[data-help-key="matching_check_btn"]'));expect(complete).toHaveBeenCalledWith('matching',expect.objectContaining({correctMatches:0,isPerfect:false}));
 });
 it('rejects stale and decorative descriptions and replaces broken images with usable text',()=>{
  const c=mount([{...words[0],imageAltHash:'img-stale'},{...words[1],imageDecorative:true}]);mode(c);
  for(const el of clues(c)){expect(el.querySelector('img').alt).toBe('A plant part');act(()=>el.querySelector('img').dispatchEvent(new Event('error')));expect(el.querySelector('img')).toBeNull();expect(el.textContent).toContain('Picture unavailable');expect(el.textContent).toContain('A plant part');}
 });
 it('resets connections when changing mode and retains picture mode when replaying',()=>{
  const c=mount();mode(c);pair(c,'Leaf','A broad green shape');expect(c.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('1');
  click(c.querySelector('[data-help-key="matching_reset_btn"]'));expect(c.querySelector('select').value).toBe('pictures');expect(c.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
  pair(c,'Leaf','A broad green shape');mode(c,'definitions');expect(c.querySelectorAll('img')).toHaveLength(0);expect(c.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('0');
 });
 it('includes image-only words and respects round size, and remains usable without images',()=>{
  const c=mount([{term:'Sun',image:picture('gold'),imageAlt:'A yellow circle'},...words],{roundSize:4});expect(terms(c)).toHaveLength(3);mode(c);expect(terms(c)).toHaveLength(4);expect(c.querySelector('img[alt="A yellow circle"]')).toBeTruthy();
  game.rerender({data:[words[2]],roundSize:4,onClose:vi.fn()});expect(terms(c)).toHaveLength(1);expect(c.textContent).toContain('Pictures: 0/1');expect(clues(c)[0].textContent).toContain('Grows into a new plant');
 });
 it('prints the same shuffled picture clues and uses descriptions for audio hints',()=>{
  const speak=vi.fn();window.AlloSpeechPlayer={speak,stop:vi.fn()};const c=mount();mode(c);click(c.querySelector('[data-help-key="matching_audio_hints"]'));
  pair(c,'Leaf','A broad green shape');expect(speak).toHaveBeenCalledWith('A broad green shape');
  const printed=[...c.querySelectorAll('.glossary-matching-sheet img')].map(el=>el.alt),screen=clues(c).flatMap(el=>[...el.querySelectorAll('img')].map(img=>img.alt));expect(printed).toEqual(screen);delete window.AlloSpeechPlayer;
 });
});
