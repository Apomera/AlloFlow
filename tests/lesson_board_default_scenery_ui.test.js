import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import * as support from '../lesson_board_support.js';
import { saveBoard, readLibrary, readSolo } from '../lesson_board_storage.js';
import { exportBoardFile } from '../lesson_board_transfer.js';
const require=createRequire(import.meta.url),{makeBoard,source,png,glossary}=require('../dev-tools/fixtures/lesson_board_support.cjs');
const React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let UI,root,element,currentProps;
const t=key=>key,secondPng=png.replace('iVBOR','iVBOQ');
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
const props=extra=>({inputText:source,language:'English',history:[],appId:'scenery-ui',user:{uid:'u'},allowLive:false,onClose:vi.fn(),callGemini:vi.fn(async()=>JSON.stringify(makeBoard())),...extra});
const named=name=>[...element.querySelectorAll('button')].find(button=>button.textContent===name);
async function render(next){currentProps=next;if(!root){element=document.createElement('div');document.body.append(element);root=createRoot(element);}await act(async()=>{root.render(React.createElement(UI.LessonBoardSetup,{t,...next}));await settle();});}
async function click(selector){const node=typeof selector==='string'?element.querySelector(selector):selector;expect(node).toBeTruthy();await act(async()=>{node.click();await settle();});}
async function change(selector,value){await act(async()=>{const node=element.querySelector(selector);expect(node).toBeTruthy();if(node.tagName==='INPUT')Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);else node.value=value;node.dispatchEvent(new Event(node.tagName==='INPUT'?'input':'change',{bubbles:true}));if(node.tagName==='INPUT')node.dispatchEvent(new Event('change',{bubbles:true}));await settle();});}
async function finish(deferred,value=png){await act(async()=>{deferred.resolve(value);await settle();});}
async function unmount(){if(root)await act(async()=>root.unmount());root=null;element?.remove();element=null;}
async function reload(){const next=currentProps;await unmount();await render(next);}
const storedBoard=()=>readLibrary(localStorage,source,'English')[0];
const scene=()=>element.querySelector('[data-artwork-slot="scene:tabletop"] img');

beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t});
  const bundle=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {LessonBoardSetup} from './lesson_board_source.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'DefaultSceneryUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{ encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  UI=new Function(bundle+';return DefaultSceneryUI;')();
});
beforeEach(()=>vi.stubGlobal('Image',class {naturalWidth=1;naturalHeight=1;set src(value){queueMicrotask(()=>{if(value==='data:image/png;base64,AAAA')this.onerror?.();else if(value)this.onload?.();});}}));
afterEach(async()=>{await unmount();localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

describe('Default generated tabletop scenery',()=>{
  it('defaults to illustrated, starts one request only after successful generation, and uses the chosen style',async()=>{
    const boardReply=pending(),imageReply=pending(),callGemini=vi.fn(()=>boardReply.promise),callImagen=vi.fn(()=>imageReply.promise);
    await render(props({callGemini,callImagen}));expect(element.querySelector('[data-board-scenery-mode]').value).toBe('illustrated');expect(callImagen).not.toHaveBeenCalled();
    await change('[data-board-scenery-style]','Quiet paper cut river landscape');await click('[data-generate-board]');expect(callImagen).not.toHaveBeenCalled();
    await finish(boardReply,JSON.stringify(makeBoard()));expect(callImagen).toHaveBeenCalledTimes(1);expect(callImagen.mock.calls[0][0]).toContain('Quiet paper cut river landscape');expect(element.querySelector('[data-board-play-solo]').disabled).toBe(false);
    await render(currentProps);expect(callImagen).toHaveBeenCalledTimes(1);await finish(imageReply);expect(scene().src).toBe(png);expect(element.querySelector('[data-board-scenery-status="ready"]')).toBeTruthy();
    await click(named('Save board'));await reload();expect(scene().src).toBe(png);expect(callImagen).toHaveBeenCalledTimes(1);
  });

  it('remembers simple mode and its style without generating images',async()=>{
    const callImagen=vi.fn(async()=>png);await render(props({callImagen}));await change('[data-board-scenery-style]','Muted ink and paper');await change('[data-board-scenery-mode]','simple');await reload();
    expect(element.querySelector('[data-board-scenery-mode]').value).toBe('simple');await click('[data-generate-board]');expect(callImagen).not.toHaveBeenCalled();expect(element.querySelector('[data-board-play-solo]').disabled).toBe(false);
    await change('[data-board-scenery-mode]','illustrated');expect(element.querySelector('[data-board-scenery-style]').value).toBe('Muted ink and paper');expect(callImagen).not.toHaveBeenCalled();
  });

  it('keeps a generated board playable when no image provider is available',async()=>{
    await render(props());await click('[data-generate-board]');expect(element.querySelector('[data-board-scenery-status="unavailable"]')).toBeTruthy();expect(element.querySelector('[data-board-play-solo]').disabled).toBe(false);await click('[data-board-play-solo]');expect(element.querySelector('[data-board-play]')).toBeTruthy();
  });

  it('does not generate on sample selection, play, or resume',async()=>{
    const callImagen=vi.fn(async()=>png);await render(props({callImagen}));await click('[data-board-sample]');expect(callImagen).not.toHaveBeenCalled();await click('[data-board-play-solo]');await click(named('Back to board setup'));await click('[data-board-play-solo]');expect(callImagen).not.toHaveBeenCalled();
  });

  it('reuses a saved picture across open, refinement, and resume without calling the image provider',async()=>{
    const board=engine.prepareBoard({...makeBoard(),playStyle:'tabletop'});saveBoard(localStorage,source,'English',board);support.saveSupport(localStorage,board,'scenery-ui','u',support.addSupportImage(support.emptySupport(),png,'scene:tabletop',board),null);
    const callImagen=vi.fn(async()=>png),callGemini=vi.fn(async()=>JSON.stringify({...board,title:'Refined Waterworks'}));await render(props({callImagen,callGemini}));expect(scene().src).toBe(png);expect(callImagen).not.toHaveBeenCalled();
    await click('[data-refine-board-preset]');expect(callGemini).toHaveBeenCalled();expect(scene().src).toBe(png);await click('[data-board-play-solo]');await click(named('Back to board setup'));await click('[data-board-play-solo]');expect(callImagen).not.toHaveBeenCalled();
  });

  it('does not generate scenery for exploration boards or failed board generation',async()=>{
    const callImagen=vi.fn(async()=>png),callGemini=vi.fn().mockRejectedValueOnce(Error('Board provider unavailable')).mockResolvedValue(JSON.stringify(makeBoard()));
    await render(props({callImagen,callGemini}));await click('[data-generate-board]');expect(callImagen).not.toHaveBeenCalled();await change('[data-board-play-style]','exploration');await click('[data-generate-board]');expect(element.querySelector('[data-board-play-solo]').disabled).toBe(false);expect(callImagen).not.toHaveBeenCalled();
  });

  it('finishes scenery during solo play, saves it, and preserves the active run and draft on resume',async()=>{
    const imageReply=pending(),callImagen=vi.fn(()=>imageReply.promise);await render(props({callImagen}));await click('[data-generate-board]');await click('[data-board-play-solo]');const board=storedBoard();
    await click('[data-board-move="heater"]');await change('.lb-current [data-board-choice]','1');const before=readSolo(localStorage,board,'scenery-ui','u');expect(before.run.turn).toBeGreaterThanOrEqual(0);
    await finish(imageReply);expect(element.querySelector('[data-tabletop-scenery] img').src).toBe(png);expect(support.readSupport(localStorage,board,'scenery-ui','u').support.art.tabletop).toBeTruthy();expect(readSolo(localStorage,board,'scenery-ui','u').run).toEqual(before.run);
    await reload();await click('[data-board-play-solo]');expect(element.querySelector('[data-tabletop-scenery] img').src).toBe(png);expect(element.querySelector('.lb-current [data-board-choice]').value).toBe('1');expect(readSolo(localStorage,board,'scenery-ui','u').run).toEqual(before.run);expect(callImagen).toHaveBeenCalledTimes(1);
  });

  it('merges arriving scenery with attached glossary terms and support changes made while it was pending',async()=>{
    const imageReply=pending(),callImagen=vi.fn(()=>imageReply.promise);await render(props({callImagen,history:[glossary()]}));await click('[data-generate-board]');expect(callImagen).toHaveBeenCalledTimes(1);expect(element.querySelectorAll('[data-term-location]')).toHaveLength(24);
    await change('[data-board-definition-mode]','review');const link=element.querySelector('[data-term-location$=":heater"]');expect(link).toBeTruthy();const termId=link.getAttribute('data-term-location').slice(0,-':heater'.length),wasLinked=link.checked;await click(link);await finish(imageReply);await click(named('Save board'));
    const saved=support.readSupport(localStorage,storedBoard(),'scenery-ui','u').support;expect(saved.terms).toHaveLength(3);expect(saved.definitionMode).toBe('review');expect(saved.terms.find(term=>term.id===termId).locations.includes('heater')).toBe(!wasLinked);expect(saved.art.tabletop).toBeTruthy();expect(saved.terms.every(term=>term.imageId)).toBe(true);
  });

  it('lets a manual scenery request supersede the automatic request and discards the old image',async()=>{
    const automatic=pending(),manual=pending(),callImagen=vi.fn().mockReturnValueOnce(automatic.promise).mockReturnValueOnce(manual.promise);await render(props({callImagen}));await click('[data-generate-board]');await click('[data-generate-board-image="scene:tabletop"]');
    expect(callImagen).toHaveBeenCalledTimes(2);expect(callImagen.mock.calls[0][3].signal.aborted).toBe(true);await finish(manual,secondPng);expect(scene().src).toBe(secondPng);await finish(automatic);expect(scene().src).toBe(secondPng);
  });

  it.each(['simple','cancel','close','unmount','lesson','account'])('discards late scenery after %s',async action=>{
    const imageReply=pending(),callImagen=vi.fn(()=>imageReply.promise),initial=props({callImagen});await render(initial);await click('[data-generate-board]');expect(callImagen).toHaveBeenCalledTimes(1);
    if(action==='simple')await change('[data-board-scenery-mode]','simple');
    if(action==='cancel')await click('[data-cancel-default-scenery]');
    if(action==='close'){await click(named('Close'));expect(initial.onClose).toHaveBeenCalledTimes(1);}
    if(action==='unmount')await unmount();
    if(action==='lesson')await render({...initial,inputText:'A new lesson explains forces, balanced structures, and how bridges carry weight.'});
    if(action==='account')await render({...initial,user:{uid:'another-user'}});
    expect(callImagen.mock.calls[0][3].signal.aborted).toBe(true);await finish(imageReply);expect(element?.querySelector('[data-artwork-slot="scene:tabletop"] img')||null).toBeNull();expect(Object.keys(localStorage).some(key=>key.startsWith('allo-board-support'))).toBe(false);
  });

  it('cancels a pending request on import without generating for the imported board',async()=>{
    const imageReply=pending(),callImagen=vi.fn(()=>imageReply.promise);await render(props({callImagen}));await click('[data-generate-board]');
    const imported=engine.prepareBoard({...makeBoard(),title:'Imported Waterworks',playStyle:'tabletop'}),fileText=exportBoardFile(imported,source,'English'),input=element.querySelector('[data-import-board]');Object.defineProperty(input,'files',{value:[{size:fileText.length,text:async()=>fileText}],configurable:true});
    await act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));await settle();});await click('[data-open-board-file]');expect(callImagen.mock.calls[0][3].signal.aborted).toBe(true);await finish(imageReply);expect(scene()).toBeNull();expect(callImagen).toHaveBeenCalledTimes(1);expect(element.textContent).toContain('Imported Waterworks');
  });

  it.each(['provider','decode'])('keeps the board playable after an image %s failure',async failure=>{
    const callImagen=vi.fn(failure==='provider'?async()=>{throw Error('Image provider offline');}:async()=>'data:image/png;base64,AAAA');await render(props({callImagen}));await click('[data-generate-board]');expect(element.querySelector('[data-board-scenery-status="failed"]')).toBeTruthy();expect(scene()).toBeNull();expect(element.querySelector('[data-board-play-solo]').disabled).toBe(false);await click('[data-board-play-solo]');expect(element.querySelector('[data-board-play]')).toBeTruthy();
  });
});
