import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { makeWaterworksBoard } from '../lesson_board_demo.js';
import { challengeInitialDraft, challengeSolution } from '../lesson_board_challenges.js';
import {readSolo} from '../lesson_board_storage.js';
import {derive,stepOf} from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let UI, root, element, latest, controls;
const t = key => key;
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({t});
  const code = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export * from './lesson_board_challenges_ui.jsx'; export {LessonBoardSolo} from './lesson_board_source.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Challenges',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  UI = new Function(code + ';return Challenges;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = controls = null; localStorage.clear(); sessionStorage.clear(); });
async function render(kind, disabled = false) {
  const node = makeWaterworksBoard().locations.find(node => node.kind === kind);
  function Harness() {
    const [current,setNode]=React.useState(node),[value,setValue]=React.useState(challengeInitialDraft(node)),[locked,setLocked]=React.useState(disabled);
    controls={replaceNode(next){setNode(next);setValue(challengeInitialDraft(next));},setValue,setDisabled:setLocked};
    latest=value; return React.createElement(UI.SpatialChallengeActivity,{node:current,value,onChange:setValue,disabled:locked,t});
  }
  element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element);
  await act(async () => root.render(React.createElement(Harness)));
  return node;
}
const click = async selector => { const target = element.querySelector(selector); expect(target).toBeTruthy(); await act(async () => target.click()); };
const change = async (selector, value) => { await act(async () => { const target = element.querySelector(selector); target.value = value; target.dispatchEvent(new Event('change', { bubbles: true })); }); };
function dataTransfer() { const data={}; return {effectAllowed:'none',dropEffect:'none',setData(type,value){data[type]=value;},getData(type){return data[type]||'';}}; }
async function dragEvent(selector,type,transfer) { let event; await act(async()=>{event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'dataTransfer',{value:transfer});element.querySelector(selector).dispatchEvent(event);});return event; }
async function mountSolo(board) {
  if (root) { await act(async () => root.unmount()); element.remove(); }
  element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element);
  await act(async () => root.render(React.createElement(UI.LessonBoardSolo, { board, appId:'challenge-integration', user:{uid:'test'}, onBack(){}, t })));
}

describe('Board manipulation controls', () => {
  it('previews the dragged card and a displaced connection without changing the response',async()=>{
    await render('connect');await change('[data-challenge-select="0"]','1');await click('[data-challenge-piece="3"]');const before=latest,transfer=dataTransfer();
    await dragEvent('[data-challenge-piece="2"]','dragstart',transfer);await dragEvent('[data-challenge-drop="1"]','dragover',transfer);
    expect(element.querySelector('[data-challenge-drop-hint]').textContent).toBe('Drop C here; A returns to the tray.');expect(latest).toBe(before);
    expect(element.querySelector('[data-challenge-feedback]')).toBeNull();
    await dragEvent('[data-challenge-piece="2"]','dragend',transfer);expect(element.querySelector('[data-challenge-drop-hint]')).toBeNull();expect(latest).toBe(before);
    await click('[data-challenge-undo]');expect(latest).toBe(',,,');expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
  });
  it('distinguishes a tray return from an unchanged drop and clears cues when locked',async()=>{
    await render('place');await change('[data-challenge-select="1"]','2');let transfer=dataTransfer();
    await dragEvent('[data-challenge-piece="1"]','dragstart',transfer);await dragEvent('[data-challenge-drop="2"]','dragover',transfer);expect(element.querySelector('[data-challenge-drop-hint]').textContent).toBe('Card B is already here.');
    await dragEvent('[data-challenge-drop="tray"]','dragover',transfer);expect(element.querySelector('[data-challenge-drop-hint]').textContent).toBe('Return card B to the tray.');expect(latest).toBe(',2,,');
    await act(async()=>controls.setDisabled(true));expect(element.querySelector('[data-challenge-drop-hint]')).toBeNull();await act(async()=>controls.setDisabled(false));
    transfer=dataTransfer();await dragEvent('[data-challenge-piece="0"]','dragstart',transfer);await dragEvent('[data-challenge-drop="tray"]','dragover',transfer);expect(element.querySelector('[data-challenge-drop-hint]').textContent).toBe('Card A is already in the tray.');
  });
  it('adds a card to a classification bin without implying another card is displaced',async()=>{
    await render('classify');await change('[data-challenge-select="0"]','0');const transfer=dataTransfer();await dragEvent('[data-challenge-piece="1"]','dragstart',transfer);await dragEvent('[data-challenge-drop="0"]','dragover',transfer);
    expect(element.querySelector('[data-challenge-drop-hint]').textContent).toBe('Drop card B here.');expect(latest).toBe('0,,,');await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe('0,0,,');expect(element.querySelector('[data-challenge-drop-hint]')).toBeNull();
  });
  it.each(['classify','connect','place'])('drags an explicit %s card independently of click selection and preserves Undo',async kind=>{
    await render(kind);const transfer=dataTransfer();
    expect(element.querySelector('[data-challenge-piece="2"]').draggable).toBe(true);
    await dragEvent('[data-challenge-piece="2"]','dragstart',transfer);
    await click('[data-challenge-piece="1"]');
    const over=await dragEvent('[data-challenge-drop="0"]','dragover',transfer);
    expect(over.defaultPrevented).toBe(true);expect(transfer.dropEffect).toBe('move');
    expect(element.querySelector('[data-challenge-drop="0"]').dataset.dropActive).toBe('true');
    await dragEvent('[data-challenge-drop="0"]','drop',transfer);
    expect(latest).toBe(',,0,');expect(element.querySelector('[data-dragging=true]')).toBeNull();expect(element.querySelector('[data-drop-active=true]')).toBeNull();
    expect(element.querySelector('[data-challenge-feedback]')).toBeNull();
    await click('[data-challenge-undo]');expect(latest).toBe(',,,');
    expect(element.querySelector('[data-challenge-piece="1"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('returns a dragged piece to the tray and restores displaced placements with Undo',async()=>{
    await render('place');await change('[data-challenge-select="0"]','2');
    let transfer=dataTransfer();await dragEvent('[data-challenge-piece="1"]','dragstart',transfer);await dragEvent('[data-challenge-drop="2"]','drop',transfer);
    expect(latest).toBe(',2,,');expect(element.querySelector('[role=status]').textContent).toContain('returned to the tray');
    await click('[data-challenge-undo]');expect(latest).toBe('2,,,');
    transfer=dataTransfer();await dragEvent('[data-challenge-piece="0"]','dragstart',transfer);await dragEvent('[data-challenge-drop="tray"]','drop',transfer);expect(latest).toBe(',,,');
    await click('[data-challenge-undo]');expect(latest).toBe('2,,,');
  });
  it('ignores external, canceled, altered, and stale drag payloads',async()=>{
    await render('connect');let transfer=dataTransfer();transfer.setData('application/x-allo-board-piece','0');
    expect((await dragEvent('[data-challenge-drop="0"]','dragover',transfer)).defaultPrevented).toBe(false);
    await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe(',,,');
    transfer=dataTransfer();await dragEvent('[data-challenge-piece="2"]','dragstart',transfer);await dragEvent('[data-challenge-piece="2"]','dragend',transfer);await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe(',,,');
    transfer=dataTransfer();await dragEvent('[data-challenge-piece="2"]','dragstart',transfer);transfer.setData('application/x-allo-board-piece','altered');await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe(',,,');
    transfer=dataTransfer();await dragEvent('[data-challenge-piece="2"]','dragstart',transfer);await act(async()=>controls.setValue(',1,,'));await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe(',1,,');
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
  });
  it('cancels an in-flight drag when response controls become locked',async()=>{
    await render('classify');const transfer=dataTransfer();await dragEvent('[data-challenge-piece="2"]','dragstart',transfer);
    await act(async()=>controls.setDisabled(true));
    expect([...element.querySelectorAll('[data-challenge-piece]')].every(piece=>!piece.draggable)).toBe(true);
    await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe(',,,');expect(element.querySelector('[data-dragging=true]')).toBeNull();
    await act(async()=>controls.setDisabled(false));await dragEvent('[data-challenge-drop="0"]','drop',transfer);expect(latest).toBe(',,,');
  });
  it.each(['classify', 'connect', 'place'])('completes %s through named native buttons without dragging', async kind => {
    const node = await render(kind), answer = challengeSolution(node).split(',');
    for (let index = 0; index < node.items.length; index++) {
      await click('[data-challenge-piece="' + index + '"]');
      const target = element.querySelector('[data-challenge-destination="' + answer[index] + '"]');
      expect(target.getAttribute('aria-label')).toContain(node.items[index]);
      await click('[data-challenge-destination="' + answer[index] + '"]');
    }
    expect(latest).toBe(challengeSolution(node));
    expect(element.querySelector('[role=status]').textContent).toContain('→');
    expect(element.querySelector('[data-challenge-feedback]')).toBeNull();
  });
  it('returns an occupied connection to the tray and announces the change', async () => {
    await render('connect');
    await click('[data-challenge-destination="0"]');
    await click('[data-challenge-piece="1"]');
    await click('[data-challenge-destination="0"]');
    expect(latest).toBe(',0,,');
    expect(element.querySelector('[role=status]').textContent).toContain('returned to the tray');
  });
  it('offers equivalent select controls and can undo a placement', async () => {
    const node = await render('place');
    await change('[data-challenge-select="0"]', '2');
    expect(latest).toBe('2,,,');
    await click('[data-challenge-piece="0"]');
    await click('[data-challenge-return]');
    expect(latest).toBe(challengeInitialDraft(node));
  });
  it('disables every response control after submission or pause', async () => {
    const node = await render('classify', true);
    expect([...element.querySelectorAll('button,select')].every(control => control.disabled)).toBe(true);
    await click('[data-challenge-destination="0"]');
    expect(latest).toBe(challengeInitialDraft(node));
  });
  it.each(['classify','connect','place'])('undoes real %s moves and restores a cleared arrangement',async kind=>{
    const node=await render(kind),empty=challengeInitialDraft(node);
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
    await click('[data-challenge-piece="2"]');
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
    await click('[data-challenge-destination="0"]');
    const once=latest;
    await change('[data-challenge-select="1"]','1');
    const twice=latest;
    await click('[data-challenge-clear]');
    expect(latest).toBe(empty);
    expect(element.querySelector('[data-challenge-clear]').disabled).toBe(true);
    await click('[data-challenge-undo]');expect(latest).toBe(twice);
    await click('[data-challenge-undo]');expect(latest).toBe(once);
    await click('[data-challenge-undo]');expect(latest).toBe(empty);
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
    expect(element.querySelector('[role=status]').textContent).toContain('Last move undone');
  });
  it('undo restores an item displaced by a competing connection',async()=>{
    await render('connect');
    await click('[data-challenge-destination="0"]');
    await click('[data-challenge-piece="1"]');
    await click('[data-challenge-destination="0"]');
    expect(latest).toBe(',0,,');
    await click('[data-challenge-undo]');expect(latest).toBe('0,,,');
    expect(element.querySelector('[data-challenge-wire="0"]').getAttribute('data-connected')).toBe('true');
    expect(element.querySelector('[data-challenge-wire="1"]').getAttribute('data-connected')).toBe('false');
    await click('[data-challenge-undo]');expect(latest).toBe(',,,');
  });
  it('does not add selection-only or unchanged actions to Undo history',async()=>{
    await render('place');
    await change('[data-challenge-select="0"]','2');
    await click('[data-challenge-piece="0"]');
    await click('[data-challenge-destination="2"]');
    await click('[data-challenge-undo]');expect(latest).toBe(',,,');
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
  });
  it('locks Undo and Clear with the other response controls',async()=>{
    await render('classify');await click('[data-challenge-destination="0"]');const before=latest;
    await act(async()=>controls.setDisabled(true));
    await click('[data-challenge-clear]');await click('[data-challenge-undo]');
    expect(latest).toBe(before);
    expect([...element.querySelectorAll('button,select')].every(control=>control.disabled)).toBe(true);
    await act(async()=>controls.setDisabled(false));
    await click('[data-challenge-undo]');expect(latest).toBe(',,,');
  });
  it.each([false,true])('isolates history when the challenge changes (same location ID: %s)',async sameId=>{
    const first=await render('classify');
    await click('[data-challenge-piece="3"]');await click('[data-challenge-destination="0"]');
    const next={...makeWaterworksBoard().locations.find(node=>node.id==='garden'),...(sameId?{id:first.id}:{})};
    await act(async()=>controls.replaceNode(next));
    expect(latest).toBe(',,');
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
    expect(element.querySelector('[data-challenge-piece="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[role=status]').textContent).toBe('');
    await click('[data-challenge-undo]');expect(latest).toBe(',,');
  });
  it('clears stale Undo history after an external draft replacement',async()=>{
    await render('classify');await click('[data-challenge-destination="0"]');
    await act(async()=>controls.setValue(',1,,'));
    expect(element.querySelector('[data-challenge-undo]').disabled).toBe(true);
    await click('[data-challenge-undo]');expect(latest).toBe(',1,,');
  });
  it.each([['classify','[data-challenge-bin]'],['connect','[data-challenge-wire]'],['place','[data-challenge-slot]']])('shows a distinct %s work surface without revealing correctness',async(kind,selector)=>{
    const node=await render(kind);
    expect(element.querySelectorAll(selector).length).toBeGreaterThan(1);
    expect(element.querySelector('[data-challenge-feedback]')).toBeNull();
    expect(element.querySelector('[data-correct]')).toBeNull();
    if(kind==='place')expect([...element.querySelectorAll('.lb-slot-number')].map(n=>n.textContent)).toEqual(node.slots.map((_,index)=>String(index+1)));
  });
  it.each(['classify','connect','place'])('restores a partial %s response and retries without duplicating rewards or losing first-attempt evidence', async kind => {
    const board=makeWaterworksBoard(), node={...board.locations.find(node=>node.kind===kind),id:'camp'};
    board.locations[0]=node; delete board.chance;
    const saved=()=>readSolo(localStorage,board,'challenge-integration','test');
    await mountSolo(board);
    await click('[data-board-move="camp"]');
    await change('.lb-current [data-challenge-select="0"]',challengeSolution(node).split(',')[0]);
    const draft=saved().workspace.drafts['0:camp'];
    expect(draft.split(',').filter(Boolean)).toHaveLength(1);
    await mountSolo(board);
    expect(element.querySelector('.lb-current [data-challenge-select="0"]').value).toBe(draft.split(',')[0]);
    const wrong=challengeSolution(node).split(',').reverse();
    for(let index=0;index<wrong.length;index++)await change('.lb-current [data-challenge-select="'+index+'"]',wrong[index]);
    await click('[data-board-submit]');
    expect(stepOf(saved().run).result.success).toBe(false);
    expect(element.querySelector('[data-challenge-feedback]')).toBeTruthy();
    expect(derive(board,saved().run).balance).toEqual([0,0]);
    await click('[data-board-retry]');
    expect(element.querySelector('[data-challenge-feedback]')).toBeNull();
    for(const [index,value] of challengeSolution(node).split(',').entries())await change('.lb-current [data-challenge-select="'+index+'"]',value);
    await click('[data-board-submit]');
    const run=saved().run,progress=derive(board,run);
    expect(run.turn).toBe(0);
    expect(stepOf(run).result.attempts.solo).toMatchObject({answered:2,correct:1,firstCorrect:false,lastCorrect:true});
    expect(progress.visited).toEqual(['camp']); expect(progress.balance).toEqual(node.reward);
    await mountSolo(board);
    expect(derive(board,saved().run).balance).toEqual(node.reward);
    expect(element.querySelector('[data-challenge-feedback]').textContent).toContain(node.items.length+'/'+node.items.length);
  });
});
