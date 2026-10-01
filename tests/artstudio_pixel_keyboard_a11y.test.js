import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function canvasContext() {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  };
}

describe('Art Studio Pixel Art keyboard accessibility', () => {
  let host;
  let root;
  let config;
  let announce;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => canvasContext());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function mount(initialState) {
    let updateArtwork, updateProfile;
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: Object.assign({ tab: 'pixel', tutorialDismissed: true }, initialState),
      });
      const [profile, setProfile] = React.useState('');
      updateArtwork = patch => setToolData(prev => ({ artStudio: {...prev.artStudio, ...patch} }));
      updateProfile = setProfile;
      return React.createElement(React.Fragment, null,
        config.render(makeCtx({ toolData, setToolData, announceToSR: announce, props: {activeProfileId:profile} })),
        React.createElement('output', { 'data-testid': 'pixel-state' }, JSON.stringify(toolData.artStudio.pixelData || {})),
        React.createElement('output', { 'data-testid': 'pixel-options' }, JSON.stringify(toolData.artStudio))
      );
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
    return { updateArtwork: patch => updateArtwork(patch), updateProfile: profile => updateProfile(profile) };
  }


  async function setPixelHex(value) {
    const input=host.querySelector('#artstudio-pixel-replacement-hex');
    await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
  }

  it('replaces equivalent artwork colors through the real controls as one reversible edit',async()=>{
    const original={'0,0':'#f00','1,0':'hsl(0,100%,50%)','7,7':'rgb(255,0,0)','3,3':'#00f'};
    await mount({pixelGrid:8,pixelData:original});
    expect(host.querySelectorAll('[data-pixel-artwork-color]')).toHaveLength(2);
    expect(host.querySelector('#artstudio-pixel-color-count').textContent).toBe('2 colors · 4 painted cells');
    await setPixelHex('#12aBCd');
    await act(async()=>host.querySelector('#artstudio-pixel-replace-color').click());
    const canvas=host.querySelector('#pixelCanvas'),changed={'0,0':'#12abcd','1,0':'#12abcd','7,7':'#12abcd','3,3':'#00f'};
    expect(canvas._captureArtStudioState().pixelData).toEqual(changed);
    expect(announce).toHaveBeenCalledWith('Recolored 3 cells. Undo restores the original colors.');
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Redo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(changed);
  });

  it('guards incomplete hex input and uses exact RGB brush colors without painting',async()=>{
    const original={'0,0':'#f00'};await mount({pixelGrid:8,pixelData:original});
    await setPixelHex('#gg');
    expect(host.querySelector('#artstudio-pixel-replace-color').disabled).toBe(true);
    expect(host.querySelector('#artstudio-pixel-use-color').disabled).toBe(true);
    expect(host.querySelector('#artstudio-pixel-replacement-hex').getAttribute('aria-invalid')).toBe('true');
    await setPixelHex('#234567');
    await act(async()=>host.querySelector('#artstudio-pixel-use-color').click());
    const state=JSON.parse(host.querySelector('[data-testid=pixel-options]').textContent);
    expect(state.pixelTool).toBe('brush');expect(state.pixelHue).toBeCloseTo(210);expect(state.pixelSat).toBeCloseTo(49.2753623188);
    expect(state.pixelData).toEqual(original);
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
  });

  it('fills a connected visible color across equivalent hex, RGB and HSL spellings',async()=>{
    await mount({pixelGrid:8,pixelTool:'fill',pixelHue:120,pixelSat:100,pixelLit:50,pixelData:{'0,0':'#f00','1,0':'rgb(255,0,0)','2,0':'hsl(0,100%,50%)','7,7':'#f00','3,0':'#00f'}});
    const canvas=host.querySelector('#pixelCanvas');
    await act(async()=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));
    const data=canvas._captureArtStudioState().pixelData;
    expect(data['0,0']).toBe('hsl(120,100%,50%)');expect(data['1,0']).toBe(data['0,0']);expect(data['2,0']).toBe(data['0,0']);
    expect(data['7,7']).toBe('#f00');expect(data['3,0']).toBe('#00f');expect(data['0,1']).toBeUndefined();
  });

  it('keeps preview choices separate from artwork history and restores editing drafts on owner change',async()=>{
    const controls=await mount({pixelGrid:8,pixelData:{'0,0':'#f00'}});
    await setPixelHex('#abc');
    const select=host.querySelector('#artstudio-pixel-preview-mode');
    await act(async()=>{select.value='tile';select.dispatchEvent(new Event('change',{bubbles:true}));});
    expect(host.querySelector('#pixelArtworkPreview').width).toBe(24);
    expect(host.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).toEqual({'0,0':'#f00'});
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>controls.updateProfile('another-learner'));
    expect(host.querySelector('#artstudio-pixel-replacement-hex').value).toBe('#ff0000');
  });

  it('rotates a rectangular selection at the edge without clipping, and undoes the whole edit', async () => {
    const original={'6,3':'red','7,3':'blue','6,4':'green','7,5':'gold','1,1':'purple','5,4':'orange'};
    await mount({pixelGrid:8,pixelTool:'select',pixelData:original});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type)=>({clientX:x,clientY:y,type,pointerId:1,button:0,preventDefault(){}});
    const rotate=host.querySelector('#artstudio-pixel-selection-rotate');
    expect(rotate.disabled).toBe(true);
    await act(async()=>{canvas.onpointerdown(event(65,35,'pointerdown'));canvas.onpointerup(event(75,55,'pointerup'));});
    await act(async()=>host.querySelector('#artstudio-pixel-selection-copy').click());
    const copied=canvas._pixelClipboard;
    expect(rotate.disabled).toBe(false);
    await act(async()=>rotate.click());
    expect(canvas._pixelSelection).toEqual({x:5,y:3,w:3,h:2});
    const rotated={'7,3':'red','7,4':'blue','6,3':'green','5,4':'gold','1,1':'purple'};
    expect(canvas._captureArtStudioState().pixelData).toEqual(rotated);
    expect(canvas._pixelClipboard).toEqual(copied);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Redo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(rotated);
  });

  it.each([
    ['flip-x',{'4,2':'red','2,3':'blue','0,0':'gold'}],
    ['flip-y',{'2,3':'red','4,2':'blue','0,0':'gold'}],
  ])('flips only the selected pixels with %s and keeps transparent cells empty', async (action,expected) => {
    const original={'2,2':'red','4,3':'blue','0,0':'gold'};
    await mount({pixelGrid:8,pixelTool:'select',pixelData:original});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type)=>({clientX:x,clientY:y,type,pointerId:1,button:0,preventDefault(){}});
    await act(async()=>{canvas.onpointerdown(event(25,25,'pointerdown'));canvas.onpointerup(event(45,35,'pointerup'));});
    await act(async()=>host.querySelector('#artstudio-pixel-selection-'+action).click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(expected);
    expect(canvas._pixelSelection).toEqual({x:2,y:2,w:3,h:2});
    await act(async()=>host.querySelector('#artstudio-pixel-selection-'+action).click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
  });

  it('keeps selection transforms disabled during a drag and skips history for an unchanged transform', async () => {
    await mount({pixelGrid:8,pixelTool:'select',pixelData:{'2,2':'red'}});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=type=>({clientX:25,clientY:25,type,pointerId:1,button:0,preventDefault(){}});
    const rotate=host.querySelector('#artstudio-pixel-selection-rotate');
    await act(async()=>canvas.onpointerdown(event('pointerdown')));
    expect(rotate.disabled).toBe(true);
    await act(async()=>canvas.onpointerup(event('pointerup')));
    await act(async()=>rotate.click());
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>canvas.onpointerdown(event('pointerdown')));
    expect(rotate.disabled).toBe(true);
    expect(canvas._pixelSelectionAction('rotate')).toBe(false);
    await act(async()=>canvas.onpointercancel(event('pointercancel')));
    expect(rotate.disabled).toBe(false);
    expect(canvas._captureArtStudioState().pixelData).toEqual({'2,2':'red'});
  });

  it('moves an overlapping selection as one undoable edit without saving the drag preview', async () => {
    const original={'1,1':'red','2,1':'blue','1,2':'green','6,6':'gold'};
    await mount({pixelGrid:8,pixelTool:'select',pixelData:original});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type,id=1)=>({clientX:x,clientY:y,type,pointerId:id,button:0,preventDefault(){}});
    await act(async()=>{canvas.onpointerdown(event(15,15,'pointerdown'));canvas.onpointerup(event(25,25,'pointerup'));});
    expect(canvas._pixelSelection).toEqual({x:1,y:1,w:2,h:2});
    expect(host.querySelector('#artstudio-pixel-selection-copy').disabled).toBe(false);
    await act(async()=>host.querySelector('#artstudio-pixel-selection-copy').click());
    expect(canvas._pixelClipboard).toEqual({w:2,h:2,pixels:{'0,0':'red','1,0':'blue','0,1':'green'}});
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>{canvas.onpointerdown(event(15,15,'pointerdown'));canvas.onpointermove(event(25,15,'pointermove'));});
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
    expect(canvas._pixelSelectionPreview.grid['3,1']).toBe('blue');
    await act(async()=>canvas.onpointerup(event(25,15,'pointerup')));
    const moved={'2,1':'red','3,1':'blue','2,2':'green','6,6':'gold'};
    expect(canvas._captureArtStudioState().pixelData).toEqual(moved);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Redo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(moved);
  });

  it('cancels moved selections and ignores unrelated pointers without adding history', async () => {
    const original={'1,1':'red','2,1':'blue'};
    await mount({pixelGrid:8,pixelTool:'select',pixelData:original});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type,id=1)=>({clientX:x,clientY:y,type,pointerId:id,button:0,preventDefault(){}});
    await act(async()=>{canvas.onpointerdown(event(15,15,'pointerdown'));canvas.onpointerup(event(25,15,'pointerup'));});
    await act(async()=>{canvas.onpointerdown(event(15,15,'pointerdown'));canvas.onpointermove(event(45,45,'pointermove',2));canvas.onpointerup(event(45,45,'pointerup',2));});
    expect(canvas._pixelSelectionPreview.bounds).toEqual({x:1,y:1,w:2,h:1});
    await act(async()=>{canvas.onpointermove(event(35,35,'pointermove'));canvas.onpointercancel(event(35,35,'pointercancel'));canvas.onpointerup(event(35,35,'pointerup'));});
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
    expect(canvas._pixelSelection).toEqual({x:1,y:1,w:2,h:1});
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>{canvas.onpointerdown(event(15,15,'pointerdown'));canvas.onpointerup(event(15,15,'pointerup'));});
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
  });

  it('cuts and pastes with keyboard shortcuts, preserving transparent holes and destination colors', async () => {
    const original={'1,1':'red','2,2':'blue','4,5':'gold','4,4':'green'};
    await mount({pixelGrid:8,pixelTool:'select',pixelData:original});
    const canvas=host.querySelector('#pixelCanvas');
    const press=(key,options={})=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));
    await act(async()=>{press('ArrowRight');press('ArrowDown');press('Enter');press('ArrowRight');press('ArrowDown');press('Enter');press('x',{ctrlKey:true});});
    expect(canvas._captureArtStudioState().pixelData).toEqual({'4,5':'gold','4,4':'green'});
    expect(canvas._pixelClipboard).toEqual({w:2,h:2,pixels:{'0,0':'red','1,1':'blue'}});
    await act(async()=>{press('Escape');press('Home');for(let i=0;i<4;i++){press('ArrowRight');press('ArrowDown');}press('v',{metaKey:true});});
    expect(canvas._captureArtStudioState().pixelData).toEqual({'4,4':'red','4,5':'gold','5,5':'blue'});
    await act(async()=>press('z',{ctrlKey:true}));
    expect(canvas._captureArtStudioState().pixelData).toEqual({'4,4':'green','4,5':'gold'});
    await act(async()=>press('z',{ctrlKey:true}));
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
  });

  it('nudges and pastes whole selections within the canvas bounds', async () => {
    await mount({pixelGrid:8,pixelTool:'select',pixelData:{'0,0':'red','1,1':'blue'}});
    const canvas=host.querySelector('#pixelCanvas');
    const press=(key,options={})=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));
    await act(async()=>{press('Enter');press('ArrowRight');press('ArrowDown');press('Enter');press('c',{ctrlKey:true});press('ArrowRight',{shiftKey:true});press('ArrowRight',{shiftKey:true});press('ArrowDown',{shiftKey:true});press('ArrowDown',{shiftKey:true});});
    expect(canvas._pixelSelection).toEqual({x:6,y:6,w:2,h:2});
    expect(canvas._captureArtStudioState().pixelData).toEqual({'6,6':'red','7,7':'blue'});
    await act(async()=>{press('Escape');press('End');press('v',{ctrlKey:true});});
    expect(canvas._captureArtStudioState().pixelData).toEqual({'6,6':'red','7,7':'blue'});
    await act(async()=>{press('a',{ctrlKey:true});press('Delete');});
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
  });

  it('keeps the keyboard anchor visible while nudging a zoomed selection', async () => {
    await mount({pixelGrid:8,pixelTool:'select',pixelData:{'0,0':'red'}});
    const canvas=host.querySelector('#pixelCanvas'),viewport=host.querySelector('.artstudio-pixel-viewport');
    Object.defineProperties(viewport,{clientWidth:{value:50},clientHeight:{value:50}});
    viewport.getBoundingClientRect=()=>({left:0,top:0,width:50,height:50});
    canvas.getBoundingClientRect=()=>({left:-viewport.scrollLeft,top:-viewport.scrollTop,width:160,height:160});
    const press=(key,options={})=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));
    await act(async()=>{press('Enter');press('Enter');press('ArrowRight',{shiftKey:true});press('ArrowDown',{shiftKey:true});});
    expect(canvas._captureArtStudioState().pixelData).toEqual({'4,4':'red'});
    expect(viewport.scrollLeft).toBeGreaterThan(0);expect(viewport.scrollTop).toBeGreaterThan(0);
    const rect=canvas.getBoundingClientRect();
    expect(rect.left+80).toBeGreaterThanOrEqual(0);expect(rect.left+100).toBeLessThanOrEqual(50);
    expect(rect.top+80).toBeGreaterThanOrEqual(0);expect(rect.top+100).toBeLessThanOrEqual(50);
  });

  it('discards selection and its internal clipboard when the learner or artwork changes', async () => {
    const {updateProfile,updateArtwork}=await mount({pixelGrid:8,pixelTool:'select',pixelData:{'0,0':'red'}});
    const canvas=host.querySelector('#pixelCanvas');
    await act(async()=>{canvas._pixelSelectionAction('all');canvas._pixelSelectionAction('copy');});
    expect(canvas._pixelClipboard).toBeTruthy();
    await act(async()=>updateProfile('another-learner'));
    expect(canvas._pixelClipboard).toBeNull();expect(canvas._pixelSelection).toBeNull();
    expect(host.querySelector('#artstudio-pixel-selection-paste').disabled).toBe(true);
    await act(async()=>{canvas._pixelSelectionAction('all');canvas._pixelSelectionAction('copy');});
    await act(async()=>updateArtwork({pixelRestoreToken:'new-study'}));
    expect(canvas._pixelClipboard).toBeNull();expect(canvas._pixelSelection).toBeNull();
  });

  it.each([['square',16],['round',12]])('paints a %s brush footprint and undoes the whole stamp', async (tip,count) => {
    await mount({pixelGrid:8,pixelBrushSize:4,pixelBrushShape:tip});
    const canvas=host.querySelector('#pixelCanvas');
    const press=key=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    await act(async()=>{for(let i=0;i<4;i++){press('ArrowRight');press('ArrowDown');}press('Enter');});
    expect(Object.keys(canvas._captureArtStudioState().pixelData)).toHaveLength(count);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
  });

  it('rounds larger brush corners, clips at the grid edge, and erases without dithering', async () => {
    const {updateArtwork}=await mount({pixelGrid:8,pixelBrushSize:4,pixelBrushShape:'round'});
    const canvas=host.querySelector('#pixelCanvas');
    const press=key=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    await act(async()=>{for(let i=0;i<4;i++){press('ArrowRight');press('ArrowDown');}press('Enter');});
    expect(Object.keys(canvas._captureArtStudioState().pixelData)).toHaveLength(12);
    expect(canvas._captureArtStudioState().pixelData['2,2']).toBeUndefined();
    await act(async()=>updateArtwork({pixelTool:'eraser',pixelBrushPattern:25}));
    await act(async()=>press('Enter'));
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
    await act(async()=>updateArtwork({pixelTool:'brush',pixelBrushPattern:100,pixelBrushShape:'square'}));
    await act(async()=>{press('Home');press('Enter');});
    expect(Object.keys(canvas._captureArtStudioState().pixelData).sort()).toEqual(['0,0','0,1','1,0','1,1']);
  });

  it.each([25,50,75])('keeps %s%% dithering anchored across overlapping strokes and preserves the other color', async coverage => {
    const background=Object.fromEntries(Array.from({length:64},(_,i)=>[(i%8)+','+Math.floor(i/8),'blue']));
    await mount({pixelGrid:8,pixelBrushSize:8,pixelBrushPattern:coverage,pixelData:background});
    const canvas=host.querySelector('#pixelCanvas');
    const press=key=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    await act(async()=>{for(let i=0;i<4;i++){press('ArrowRight');press('ArrowDown');}press('Enter');});
    const first=canvas._captureArtStudioState().pixelData;
    expect(Object.values(first).filter(v=>v!=='blue')).toHaveLength(64*coverage/100);
    await act(async()=>{press('ArrowLeft');press('Enter');press('ArrowUp');press('Enter');});
    expect(canvas._captureArtStudioState().pixelData).toEqual(first);
  });

  it('shows the mirrored brush footprint on hover without changing artwork or export', async () => {
    await mount({pixelGrid:8,pixelBrushSize:2,pixelMirrorX:true});
    const canvas=host.querySelector('#pixelCanvas');
    const context=HTMLCanvasElement.prototype.getContext.mock.results[HTMLCanvasElement.prototype.getContext.mock.contexts.lastIndexOf(canvas)].value;
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    await act(async()=>canvas.onpointermove({clientX:25,clientY:25,pointerType:'mouse'}));
    expect(canvas._pixelHoverCell).toEqual([2,2]);
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
    expect(context.strokeRect.mock.calls).toHaveLength(16);
    context.strokeRect.mockClear();
    vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(()=>{
      expect(context.strokeRect).not.toHaveBeenCalled();return 'data:image/png;base64,cGl4ZWw=';
    });
    canvas._pixelExport();
    expect(context.strokeRect.mock.calls).toHaveLength(16);
    await act(async()=>canvas.onpointerleave());
    expect(canvas._pixelHoverCell).toBeNull();
  });

  it('previews one straight line, cancels it without history, and commits just the final path', async () => {
    await mount({pixelGrid:8,pixelTool:'line',pixelData:{'7,0':'blue'}});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type)=>({clientX:x,clientY:y,type,pointerId:1,button:0,preventDefault(){}});
    await act(async()=>{
      canvas.onpointerdown(event(5,5,'pointerdown'));
      canvas.onpointermove(event(75,75,'pointermove'));
    });
    expect(canvas._captureArtStudioState().pixelData).toEqual({'7,0':'blue'});
    await act(async()=>canvas.onpointercancel(event(75,75,'pointercancel')));
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>{
      canvas.onpointerdown(event(5,5,'pointerdown'));
      canvas.onpointermove(event(75,75,'pointermove'));
      canvas.onpointerup(event(75,5,'pointerup'));
    });
    const cells=canvas._captureArtStudioState().pixelData;
    expect(Object.keys(cells)).toHaveLength(8);
    for(let i=0;i<8;i++) expect(cells[i+',0']).toBeTruthy();
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual({'7,0':'blue'});
  });

  it.each([false,true])('draws an exact rectangle with filled=%s as one undoable gesture', async filled => {
    await mount({pixelGrid:8,pixelTool:'rectangle',pixelShapeFilled:filled});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type)=>({clientX:x,clientY:y,type,pointerId:1,button:0,preventDefault(){}});
    await act(async()=>{canvas.onpointerdown(event(45,35,'pointerdown'));canvas.onpointermove(event(15,15,'pointermove'));});
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
    await act(async()=>canvas.onpointerup(event(15,15,'pointerup')));
    const cells=canvas._captureArtStudioState().pixelData;
    expect(Object.keys(cells)).toHaveLength(filled?12:10);
    expect(!!cells['2,2']).toBe(filled);
    expect(cells['1,1']).toBeTruthy();expect(cells['4,3']).toBeTruthy();
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
  });

  it('draws symmetric ellipse outlines and filled ellipses with the keyboard', async () => {
    await mount({pixelGrid:8,pixelTool:'ellipse'});
    const canvas=host.querySelector('#pixelCanvas');
    const press=key=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,cancelable:true,bubbles:true}));
    const draw=()=>{press('Home');press('Enter');for(let i=0;i<6;i++){press('ArrowRight');press('ArrowDown');}press('Enter');};
    await act(async()=>draw());
    const outline=canvas._captureArtStudioState().pixelData;
    expect(outline['0,0']).toBeUndefined();expect(outline['3,3']).toBeUndefined();expect(outline['3,0']).toBeTruthy();
    for(const key of Object.keys(outline)){const [x,y]=key.split(',').map(Number);expect(outline[(6-x)+','+y]).toBe(outline[key]);expect(outline[x+','+(6-y)]).toBe(outline[key]);}
    await act(async()=>[...host.querySelectorAll('label')].find(l=>l.textContent==='Fill shape').querySelector('input').click());
    await act(async()=>draw());
    const filled=canvas._captureArtStudioState().pixelData;
    expect(filled['3,3']).toBeTruthy();expect(filled['0,0']).toBeUndefined();expect(Object.keys(filled).length).toBeGreaterThan(Object.keys(outline).length);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual(outline);
  });

  it('mirrors shapes and discards interrupted previews without affecting saved cells', async () => {
    await mount({pixelGrid:8,pixelTool:'rectangle',pixelMirrorX:true,pixelMirrorY:true});
    const canvas=host.querySelector('#pixelCanvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type)=>({clientX:x,clientY:y,type,pointerId:1,button:0,preventDefault(){}});
    await act(async()=>{canvas.onpointerdown(event(15,15,'pointerdown'));canvas.onpointerup(event(25,25,'pointerup'));});
    const cells=canvas._captureArtStudioState().pixelData;
    expect(Object.keys(cells)).toHaveLength(16);
    for(const x of [1,2,5,6]) for(const y of [1,2,5,6]) expect(cells[x+','+y]).toBeTruthy();
    await act(async()=>{canvas.onpointerdown(event(35,35,'pointerdown'));canvas.onpointermove(event(65,65,'pointermove'));canvas.onlostpointercapture(event(65,65,'lostpointercapture'));});
    expect(canvas._captureArtStudioState().pixelData).toEqual(cells);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
  });

  it('pans with pointer or keyboard without painting and ignores unrelated pointers', async () => {
    const harness=await mount({pixelGrid:8,pixelTool:'pan',pixelData:{'0,0':'red'}});
    const canvas=host.querySelector('#pixelCanvas'), viewport=canvas.parentElement;
    viewport.scrollLeft=100;viewport.scrollTop=80;
    const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,button:0,preventDefault(){}});
    await act(async()=>{
      canvas.onpointerdown(event(300,300));
      canvas.onpointermove(event(200,220,2));
    });
    expect(viewport.scrollLeft).toBe(100);expect(viewport.scrollTop).toBe(80);
    await act(async()=>{canvas.onpointermove(event(200,220));canvas.onpointerup(event(200,220));});
    expect(viewport.scrollLeft).toBe(200);expect(viewport.scrollTop).toBe(160);
    await act(async()=>{
      canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
      canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    });
    expect(viewport.scrollLeft).toBe(248);
    expect(canvas._captureArtStudioState().pixelData).toEqual({'0,0':'red'});
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>canvas.onpointerdown(event(300,300)));
    await act(async()=>harness.updateArtwork({pixelRestoreToken:'new-artwork'}));
    expect(canvas._pixelPan).toBeNull();
  });

  it.each([
    ['Rotate 90°',{'6,0':'red','5,7':'blue','2,4':'green'},4],
    ['Flip left / right',{'7,1':'red','0,2':'blue','3,5':'green'},2],
    ['Flip top / bottom',{'0,6':'red','7,5':'blue','4,2':'green'},2],
  ])('transforms pixels exactly with %s and supports complete Undo/Redo', async (label,expected,cycles) => {
    const original={'0,1':'red','7,2':'blue','4,5':'green'};
    await mount({pixelGrid:8,pixelData:original});
    const canvas=host.querySelector('#pixelCanvas');
    const click=text=>[...host.querySelectorAll('button')].find(b=>b.textContent===text).click();
    await act(async()=>click(label));
    expect(canvas._captureArtStudioState().pixelData).toEqual(expected);
    await act(async()=>click('Undo'));
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
    await act(async()=>click('Redo'));
    expect(canvas._captureArtStudioState().pixelData).toEqual(expected);
    for(let i=1;i<cycles;i++) await act(async()=>click(label));
    expect(canvas._captureArtStudioState().pixelData).toEqual(original);
  });

  it('draws mirrored keyboard lines and picks their color without adding an undo step', async () => {
    await mount({pixelGrid:8,pixelTool:'line',pixelMirrorX:true,pixelMirrorY:true,pixelHue:210,pixelSat:70,pixelLit:50});
    const canvas=host.querySelector('#pixelCanvas');
    const press=key=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    await act(async()=>{press('Enter');press('ArrowRight');press('ArrowRight');});
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
    await act(async()=>press('Enter'));
    const cells=canvas._captureArtStudioState().pixelData;
    expect(Object.keys(cells)).toHaveLength(12);
    for(const y of [0,7]) for(const x of [0,1,2,5,6,7]) expect(cells[x+','+y]).toBe('hsl(210,70%,50%)');
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Pick color').click());
    await act(async()=>press('Enter'));
    const options=JSON.parse(host.querySelector('[data-testid="pixel-options"]').textContent);
    expect(options).toMatchObject({pixelTool:'brush',pixelHue:210,pixelSat:70,pixelLit:50});
    expect(canvas._captureArtStudioState().pixelData).toEqual(cells);
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').click());
    expect(canvas._captureArtStudioState().pixelData).toEqual({});
  });

  it('drops old history and active strokes when restoring a study or changing learner', async () => {
    const harness=await mount({pixelGrid:8});
    const canvas=host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
    const event=(x,y,type)=>({clientX:x,clientY:y,type,pointerId:1,button:0,preventDefault(){}});
    await act(async()=>canvas.onpointerdown(event(5,5,'pointerdown')));
    await act(async()=>harness.updateArtwork({pixelRestoreToken:'restored',pixelData:{'7,7':'green'}}));
    await act(async()=>canvas.onpointerup(event(75,5,'pointerup')));
    expect(canvas._captureArtStudioState().pixelData).toEqual({'7,7':'green'});
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
    await act(async()=>{canvas.onpointerdown(event(5,5,'pointerdown'));canvas.onpointerup(event(5,5,'pointerup'));});
    await act(async()=>harness.updateProfile('different-learner'));
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
  });

  it('renders visible keyboard instructions, shortcuts, focus styling, and accurate tool states', () => {
    const html = (() => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
      return renderTool('artStudio', {
        artStudio: { tab: 'pixel', pixelTool: 'eraser', activePalette: 'nature' },
      });
    })();

    expect(html).toContain('move the cell cursor with Arrow keys');
    expect(html).toContain('aria-describedby="artstudio-pixel-keyboard-help"');
    const shortcuts=html.match(/id="pixelCanvas"[^>]*aria-keyshortcuts="([^"]+)"/)[1].split(' ');
    expect(shortcuts).toEqual(expect.arrayContaining(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter','Space','Control+C','Control+X','Control+V','Meta+C','Meta+X','Meta+V','Delete','Escape']));
    expect(html).toContain('focus-visible:ring-4');
    expect(html).toMatch(/aria-label="Eraser" aria-pressed="true"/);
    expect(html).toContain('aria-label="Choose color: hue');
    expect(html).not.toContain('aria-label="HSL("');
  });

  it('moves the keyboard cursor, paints the selected cell, and announces both actions', async () => {
    await mount({ pixelGrid: 8, pixelTool: 'brush', pixelData: {} });
    const canvas = host.querySelector('canvas[aria-describedby="artstudio-pixel-keyboard-help"]');
    canvas.focus();

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(announce).toHaveBeenCalledWith('Pixel row 1, column 2.');
    expect(announce).toHaveBeenCalledWith('Pixel row 2, column 2.');
    expect(announce).toHaveBeenCalledWith('Painted row 2, column 2.');
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).toContain('"1,1"');
    expect(document.activeElement).toBe(canvas);
  });

  it('supports Home, End, Enter, and erasing without requiring a pointer', async () => {
    await mount({
      pixelGrid: 8,
      pixelTool: 'eraser',
      pixelData: { '0,0': 'red', '7,7': 'blue' },
    });
    let canvas = host.querySelector('canvas[aria-describedby="artstudio-pixel-keyboard-help"]');
    canvas.focus();

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).not.toContain('"7,7"');

    canvas = host.querySelector('canvas[aria-describedby="artstudio-pixel-keyboard-help"]');
    canvas.focus();
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).toBe('{}');
    expect(announce).toHaveBeenCalledWith('Erased row 8, column 8.');
    expect(announce).toHaveBeenCalledWith('Erased row 1, column 1.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });

  it('fills fast pointer strokes through the release cell and undoes the whole gesture', async () => {
    await mount({ pixelGrid: 32 });
    const canvas = host.querySelector('#pixelCanvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 });
    const pointer = (x, y, type, id = 1) => ({ clientX:x, clientY:y, type, pointerId:id, pointerType:'mouse', button:0, preventDefault(){} });
    await act(async () => {
      canvas.onpointerdown(pointer(10, 10, 'pointerdown'));
      canvas.onpointermove(pointer(630, 10, 'pointermove', 2)); // Another pointer must not draw.
      canvas.onpointerup(pointer(630, 630, 'pointerup'));
    });
    let state = JSON.parse(host.querySelector('[data-testid="pixel-state"]').textContent);
    expect(Object.keys(state)).toHaveLength(32);
    for (let i = 0; i < 32; i++) expect(state[i + ',' + i]).toBeTruthy();
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Undo').click());
    expect(host.querySelector('[data-testid="pixel-state"]').textContent).toBe('{}');
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Redo').click());
    expect(Object.keys(JSON.parse(host.querySelector('[data-testid="pixel-state"]').textContent))).toHaveLength(32);
  });

  it('resamples artwork on grid changes and restores the original resolution with Undo', async () => {
    await mount({ pixelGrid: 8, pixelData: { '2,3':'red' } });
    const select = host.querySelector('select[aria-label="Grid size"]');
    await act(async () => { select.value = '16'; select.dispatchEvent(new Event('change', {bubbles:true})); });
    const state = JSON.parse(host.querySelector('[data-testid="pixel-state"]').textContent);
    expect(state).toEqual({'4,6':'red','5,6':'red','4,7':'red','5,7':'red'});
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Undo').click());
    expect(select.value).toBe('8');
    expect(JSON.parse(host.querySelector('[data-testid="pixel-state"]').textContent)).toEqual({'2,3':'red'});
  });

  it('exports artwork without grid lines or the focused keyboard cursor', async () => {
    await mount({ pixelGrid: 16, pixelData: { '1,1':'red' } });
    const canvas = host.querySelector('#pixelCanvas');
    const contextMock = HTMLCanvasElement.prototype.getContext.mock;
    const contextIndex = contextMock.contexts.lastIndexOf(canvas);
    const drawingContext = contextMock.results[contextIndex].value;
    canvas.focus();
    let strokesAtExport;
    vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
      strokesAtExport = drawingContext.stroke.mock.calls.length + drawingContext.strokeRect.mock.calls.length;
      return 'data:image/png;base64,cGl4ZWw=';
    });
    drawingContext.stroke.mockClear(); drawingContext.strokeRect.mockClear();
    expect(canvas._pixelExport()).toMatch(/^data:image\/png/);
    expect(strokesAtExport).toBe(0);
    expect(drawingContext.stroke).toHaveBeenCalled(); // The on-screen grid returns.
  });
});
