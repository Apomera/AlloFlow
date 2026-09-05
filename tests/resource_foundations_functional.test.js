import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, Frames, ImageView;
const noop = () => {};
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('view_sentence_frames_module.js');
  loadAlloModule('view_image_module.js');
  loadAlloModule('export_handlers_module.js');
  Frames = window.AlloModules.SentenceFramesView;
  ImageView = window.AlloModules.ImageView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount(Component, props) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = next => act(() => root.render(React.createElement(Component, next)));
  render(props); return render;
}
const paragraph = { id: 'frame-1', type: 'sentence-frames', data: { mode: 'paragraph', text: 'The cause is [cause] and the effect is [effect].' } };
const answers = { 'paragraph-1': 'rain', 'paragraph-3': 'flooding' };
const frameProps = overrides => ({ t: key => ({'status.saved':'Saved','status.saving':'Saving','common.retry':'Try again'})[key] || '', generatedContent: paragraph, studentResponses: { 'frame-1': answers }, gradingSession: {isOpen:false}, isTeacherMode:false, studentWorkStatus:'idle', handleStudentInput:noop, renderFormattedText:text=>text, ...overrides });

describe('paragraph scaffold handoffs use persisted blank identities', () => {
  it('displays existing answers and assembles both in the right position', () => {
    mount(Frames, frameProps());
    expect([...host.querySelectorAll('input[type=text]')].map(input=>input.value)).toEqual(['rain','flooding']);
    expect(Frames.serializeParagraph(paragraph.data.text, answers)).toBe('The cause is rain and the effect is flooding.');
    expect(Frames.isParagraphComplete(paragraph.data.text, answers)).toBe(true);
    expect(Frames.isParagraphComplete(paragraph.data.text, {'paragraph-1':'rain'})).toBe(false);
  });
  it('handles leading/adjacent/trailing blanks and whitespace-only answers', () => {
    expect(Frames.serializeParagraph('[first][second]', {'paragraph-1':'One','paragraph-3':'Two'})).toBe('OneTwo');
    expect(Frames.serializeParagraph('Because [reason]', {'paragraph-1':'  '})).toBe('Because _____');
    expect(Frames.isParagraphComplete('No blanks', {})).toBe(false);
  });
  it('runs the actual host feedback handoff with two previously saved answers', () => {
    const source = readFileSync('AlloFlowANTI.txt','utf8');
    const start = source.indexOf('  const launchGradingSession = () => {');
    const end = source.indexOf('  const submitGradingSession',start);
    let session;
    const run = new Function('window','generatedContent','studentResponses','setGradingSession',source.slice(start,end)+'\nreturn launchGradingSession;')(window,paragraph,{'frame-1':answers},value=>session=value);
    run(); expect(session.draftText).toBe('The cause is rain and the effect is flooding.');
  });
  it('reports failed saving truthfully and makes retry available', () => {
    const retry = vi.fn(); mount(Frames, frameProps({studentWorkStatus:'error',onRetrySave:retry}));
    const status = host.querySelector('[role=status]');
    expect(status.textContent).toContain('could not be saved');
    expect(status.textContent).not.toContain('Saved');
    act(()=>status.querySelector('button').click()); expect(retry).toHaveBeenCalledOnce();
  });
});

describe('single-image replacement is owned by the resource', () => {
  const original = {id:'image-a',type:'image',data:{imageUrl:'data:image/png;base64,b2xk',altText:'Old diagram',altSource:'author',altHash:'old-hash',decorative:false,prompt:'Diagram'}};
  function props(resource,onUpdateResource) {return {t:()=>'',generatedContent:resource,isTeacherMode:true,leveledTextLanguage:'English',singleImageFileRef:React.createRef(),onUpdateResource,imageRefinementInput:'',addToast:noop};}
  it('round-trips original image metadata and clears stale alt text on upload', () => {
    const uploaded = ImageView.replaceSingleImage(original,'data:image/png;base64,bmV3');
    expect(uploaded.data.imageUrl).toContain('bmV3'); expect(uploaded.data.altText).toBe('');
    const restored = ImageView.restoreSingleImage(JSON.parse(JSON.stringify(uploaded)));
    expect(restored.data.imageUrl).toBe(original.data.imageUrl); expect(restored.data.altText).toBe('Old diagram');
    expect(restored.data.originalImage).toBeUndefined();
    expect(ImageView.replaceSingleImage(uploaded,'data:image/png;base64,dHdv').data.originalImage.imageUrl).toBe(original.data.imageUrl);
  });
  it('persists an asynchronous upload to its originating image even after navigation', () => {
    let reader;
    vi.stubGlobal('FileReader',class {constructor(){reader=this;} readAsDataURL() {}});
    const other = {id:'image-b',type:'image',data:{imageUrl:'data:image/png;base64,b3RoZXI=',prompt:'Other'}};
    let history = [original,other], current = original;
    const update = vi.fn((id,updater)=>{history=history.map(item=>item.id===id?updater(item):item);if(current.id===id)current=updater(current);return true;});
    const render = mount(ImageView,props(current,update));
    const input = host.querySelector('input[type=file]');
    Object.defineProperty(input,'files',{value:[new File(['new'],'new.png',{type:'image/png'})],configurable:true});
    act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
    current=other; render(props(current,update));
    act(()=>reader.onload({target:{result:'data:image/png;base64,bmV3'}}));
    expect(update.mock.calls[0][0]).toBe('image-a');
    expect(history[0].data.imageUrl).toBe('data:image/png;base64,bmV3'); expect(current.data.imageUrl).toBe(other.data.imageUrl);
    render(props(history[0],update));
    expect(host.querySelector('img').src).toBe(history[0].data.imageUrl);
    expect(JSON.parse(JSON.stringify(history))[0].data.imageUrl).toBe('data:image/png;base64,bmV3');
    act(()=>host.querySelector('button[aria-label="Restore AI image"]').click());
    expect(history[0].data.imageUrl).toBe(original.data.imageUrl);
  });
});

describe('Read This Page accepts current and legacy scaffold shapes',()=>{
  it.each([
    [[{frame:'Legacy starter'}],'Legacy starter'],
    [{mode:'list',items:[{text:'Current starter'}],rubric:'Check your evidence.'},'Current starter'],
    [{mode:'paragraph',text:'I know [idea] because [reason].'},'I know [idea] because [reason].']
  ])('narrates the scaffold text instead of a zero-frame heading', (data,expected)=>{
    const items=window.AlloModules.ExportHandlers.getReadableContent({activeView:'sentence-frames',generatedContent:{type:'sentence-frames',data}});
    expect(items.some(item=>item.type==='text' && item.text.includes(expected))).toBe(true);
  });
});
