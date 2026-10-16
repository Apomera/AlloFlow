import {beforeAll,afterEach,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {puzzleBoard,getPuzzle} from './fixtures/lesson_board_puzzles.js';
import {puzzleInitialDraft,puzzleSolution} from '../lesson_board_puzzles.js';
import {readSolo} from '../lesson_board_storage.js';
import {derive,stepOf} from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const t=key=>key;let UI,root,element,latest,controls;
beforeAll(()=>{
  window.React=React;window.AlloLanguageContext=React.createContext({t});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const code=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export * from './lesson_board_puzzles_ui.jsx'; export {Activity} from './lesson_board_ui.jsx'; export {LessonBoardSolo} from './lesson_board_source.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Puzzles',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  UI=new Function(code+';return Puzzles;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=controls=null;localStorage.clear();sessionStorage.clear();});
async function mount(component,props){if(root){await act(async()=>root.unmount());element.remove();}element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);await act(async()=>root.render(React.createElement(component,props)));}
async function render(kind,disabled=false){const node=getPuzzle(kind);function Harness(){const [current,setNode]=React.useState(node),[value,setValue]=React.useState(puzzleInitialDraft(node)),[locked,setLocked]=React.useState(disabled);controls={setValue,setDisabled:setLocked,replaceNode(next){setNode(next);setValue(puzzleInitialDraft(next));}};latest=value;return React.createElement(UI.Activity,{node:current,value,onChange:setValue,disabled:locked,t});}await mount(Harness);return node;}
async function click(selector){const target=element.querySelector(selector);expect(target).toBeTruthy();await act(async()=>target.click());}
async function change(selector,value){const target=element.querySelector(selector);expect(target).toBeTruthy();await act(async()=>{target.value=value;target.dispatchEvent(new Event('change',{bubbles:true}));});}
const soloProps=board=>({board,appId:'puzzle-integration',user:{uid:'test'},onBack(){},t});

describe('Playable allocation and repair workspaces',()=>{
  it('tracks allocation completion without treating a fully spent budget as correct',async()=>{
    await render('allocate');expect(element.querySelector('[data-puzzle-progress]').value).toBe(0);
    await change('[data-puzzle-select="0"]','6');expect(element.querySelector('[data-puzzle-progress]').value).toBe(6);
    expect(element.querySelector('.lb-puzzle-progress-note').textContent).toContain('Review the rules');
    expect(element.querySelector('[data-puzzle-feedback]')).toBeNull();expect(element.textContent).not.toContain('Required allocation');
    await click('[data-puzzle-undo]');expect(element.querySelector('[data-puzzle-progress]').value).toBe(0);expect(element.querySelector('.lb-puzzle-progress-note')).toBeNull();
  });
  it('navigates to unchecked repair statements without marking them or leaking answers',async()=>{
    const node=await render('repair');await click('[data-repair-next]');expect(document.activeElement).toBe(element.querySelector('[data-repair-row="0"] h4'));expect(latest).toBe(',,');
    await click('[data-repair-keep="0"]');await click('[data-repair-next]');expect(document.activeElement).toBe(element.querySelector('[data-repair-row="1"] h4'));
    expect(element.querySelector('[data-repair-progress]').textContent).toBe('1/3 inspected');expect(element.querySelector('[data-puzzle-progress]').value).toBe(1);
    await click('[data-repair-keep="1"]');await click('[data-repair-keep="2"]');expect(element.querySelector('[data-repair-next]')).toBeNull();expect(element.querySelector('.lb-puzzle-progress-note').textContent).toContain('Review your marks');
    expect(element.querySelector('[data-puzzle-feedback]')).toBeNull();expect(element.textContent).not.toContain(node.corrections[2]);
    await click('[data-puzzle-undo]');await click('[data-repair-next]');expect(document.activeElement).toBe(element.querySelector('[data-repair-row="2"] h4'));expect(latest).toBe('0,0,');
  });
  it('distributes a finite token supply with named native buttons and reversible counters',async()=>{
    const node=await render('allocate');expect(element.querySelector('[data-allocation-constraints]').textContent).toContain(node.constraints[0]);
    for(let count=0;count<6;count++)await click('[data-allocation-add="0"]');
    expect(latest).toBe('6,0,0');expect(element.querySelector('[data-allocation-budget]').textContent).toContain('0 of 6');
    expect([...element.querySelectorAll('[data-allocation-add]')].every(button=>button.disabled)).toBe(true);
    expect(element.querySelector('[data-puzzle-feedback]')).toBeNull();expect(element.textContent).not.toContain('Required allocation');
    await click('[data-allocation-add="1"]');expect(latest).toBe('6,0,0');
    await click('[data-allocation-remove="0"]');await click('[data-allocation-add="1"]');expect(latest).toBe('5,1,0');
    await click('[data-puzzle-undo]');expect(latest).toBe('5,0,0');
    expect(element.querySelector('[data-allocation-add="0"]').getAttribute('aria-label')).toContain(node.needs[0]);
  });
  it('offers equivalent allocation list controls and rejects over-budget changes',async()=>{
    await render('allocate');await change('[data-puzzle-select="0"]','3');await change('[data-puzzle-select="1"]','2');await change('[data-puzzle-select="2"]','1');expect(latest).toBe('3,2,1');
    await change('[data-puzzle-select="2"]','2');expect(latest).toBe('3,2,1');
    await click('[data-puzzle-clear]');expect(latest).toBe('0,0,0');await click('[data-puzzle-undo]');expect(latest).toBe('3,2,1');
  });
  it('requires explicit repair choices, never shows corrections while answering, and reverses marks',async()=>{
    const node=await render('repair');expect(latest).toBe(',,');
    await click('[data-repair-keep="0"]');await click('[data-repair-mark="1"]');expect(latest).toBe('0,1,');
    expect(element.querySelector('[data-repair-row="1"]').dataset.marked).toBe('true');expect(element.querySelector('[data-repair-mark="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(element.textContent).not.toContain(node.corrections[2]);expect(element.querySelector('[data-puzzle-feedback]')).toBeNull();
    await change('[data-puzzle-select="2"]','1');expect(latest).toBe('0,1,1');
    await click('[data-puzzle-clear]');expect(latest).toBe(',,');await click('[data-puzzle-undo]');expect(latest).toBe('0,1,1');await click('[data-puzzle-undo]');expect(latest).toBe('0,1,');
    await mount(UI.PuzzleReview,{node,value:'0,1,0',t});expect(element.querySelector('[data-repair-correction="2"]').textContent).toBe(node.corrections[2]);expect(element.querySelector('[data-puzzle-feedback]').textContent).toContain('1/3');
  });
  it.each(['allocate','repair'])('locks every %s manipulation and Undo/Clear after submission',async kind=>{
    await render(kind);await change('[data-puzzle-select="0"]','1');const saved=latest;
    await act(async()=>controls.setDisabled(true));expect([...element.querySelectorAll('button,select')].every(control=>control.disabled)).toBe(true);
    await click('[data-puzzle-clear]');await click('[data-puzzle-undo]');expect(latest).toBe(saved);
  });
  it.each(['allocate','repair'])('clears %s Undo history after external draft replacement',async kind=>{
    await render(kind);await change('[data-puzzle-select="0"]','1');const next=kind==='allocate'?'0,2,0':',0,';
    await act(async()=>controls.setValue(next));expect(element.querySelector('[data-puzzle-undo]').disabled).toBe(true);await click('[data-puzzle-undo]');expect(latest).toBe(next);expect(element.querySelector('[role=status]').textContent).toBe('');
  });
  it.each([false,true])('isolates puzzle history when its content changes (same ID: %s)',async sameId=>{
    const first=await render('allocate');await click('[data-allocation-add="0"]');const next={...getPuzzle('repair'),...(sameId?{id:first.id}:{})};
    await act(async()=>controls.replaceNode(next));expect(latest).toBe(',,');expect(element.querySelector('[data-puzzle-undo]').disabled).toBe(true);await click('[data-puzzle-undo]');expect(latest).toBe(',,');
  });
  it('bounds decorative supply even when an invalid editable budget is enormous',async()=>{
    const node={...getPuzzle('allocate'),budget:1e12};await mount(UI.PuzzleActivity,{node,value:'0,0,0',onChange(){},t});expect(element.querySelectorAll('.lb-budget-reserve .lb-puzzle-token')).toHaveLength(12);
    expect(element.querySelector('[data-allocation-budget]').textContent).toContain('1000000000000');
  });
  it('lets teachers correct keys and retains blank corrections until explicitly authored',async()=>{
    const node=getPuzzle('repair');let patch;await mount(UI.PuzzleAuthoring,{node,onChange:value=>{patch=value;},t});
    await change('[data-edit-repair="0"]','1');expect(patch.repairs).toEqual([1,0,1]);expect(patch.corrections).toEqual(node.corrections);
    await change('[data-edit-repair="2"]','0');expect(patch.corrections).toEqual(['','','']);
  });
  it.each(['allocate','repair'])('restores an unfinished %s response and retries with once-only rewards',async kind=>{
    const board=puzzleBoard(),node=board.locations.find(node=>node.kind===kind),saved=()=>readSolo(localStorage,board,'puzzle-integration','test');
    await mount(UI.LessonBoardSolo,soloProps(board));await click('[data-ready-move="'+node.id+'"]');await click('[data-board-move="'+node.id+'"]');await change('.lb-current [data-puzzle-select="0"]','1');
    expect(saved().workspace.drafts['0:'+node.id]).toBe(kind==='allocate'?'1,0,0':'1,,');await mount(UI.LessonBoardSolo,soloProps(board));expect(element.querySelector('.lb-current [data-puzzle-select="0"]').value).toBe('1');
    if(kind==='allocate'){await click('.lb-current [data-puzzle-clear]');await change('.lb-current [data-puzzle-select="0"]','6');}
    else {await change('.lb-current [data-puzzle-select="1"]','1');await change('.lb-current [data-puzzle-select="2"]','0');}
    expect(element.querySelector('[data-board-submit]').disabled).toBe(false);expect(element.querySelector('[data-puzzle-feedback]')).toBeNull();await click('[data-board-submit]');
    expect(stepOf(saved().run).result.success).toBe(false);expect(element.querySelector('[data-puzzle-feedback]')).toBeTruthy();expect(derive(board,saved().run).balance).toEqual([0,0]);
    await click('[data-board-retry]');expect(element.querySelector('.lb-current [data-puzzle-feedback]')).toBeNull();await click('.lb-current [data-puzzle-clear]');
    for(const [index,value] of puzzleSolution(node).split(',').entries())await change('.lb-current [data-puzzle-select="'+index+'"]',value);
    await click('[data-board-submit]');const run=saved().run;expect(stepOf(run).result.attempts.solo).toMatchObject({answered:2,correct:1,firstCorrect:false,lastCorrect:true});expect(derive(board,run).balance).toEqual(node.reward);
    await mount(UI.LessonBoardSolo,soloProps(board));expect(derive(board,saved().run).balance).toEqual(node.reward);
  });
});
