// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act=React.act||require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
const source=readFileSync('word_sounds_module.js','utf8');
const between=(start,end,from=0)=>{const a=source.indexOf(start,from),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw Error(start);return source.slice(a,b);};
const usePictures=new Function('React',between('function useWordSoundsPreparedPictures(', '// END WORD SOUNDS PREPARED PICTURE CACHE')+';return useWordSoundsPreparedPictures;')(React);
const librarySource=between('const preparedImageLibrary = React.useMemo(', 'const hasPreparedImages = React.useMemo(');
const decodingStart=source.indexOf('const dWord = currentWordSoundsWord ||');
const imageSource=between('const imgFor = (w) =>','const dAnyImg =',decodingStart);
const renderImage=new Function('optionImages','preparedImageLibrary','wordPool',imageSource+';return dSrc(imgFor("dog"));');
function Host({words,resourceKey,provider,capture}) {
  const preparedImageLibrary=new Function('React','preloadedWords',librarySource+';return preparedImageLibrary;')({useMemo:fn=>fn()},words);
  const pictures=usePictures(preparedImageLibrary,resourceKey,provider);
  capture(pictures);
  return React.createElement('img',{alt:'dog',src:renderImage(pictures.optionImages,preparedImageLibrary,[])});
}
let root,container,state,props;
const render=async changes=>{props={...props,...changes};await act(async()=>root.render(React.createElement(Host,props)));};
const request=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const uri=value=>'data:image/png;base64,'+value;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);props={words:[],resourceKey:'pack-a',capture:value=>{state=value;}};});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals();});

describe('prepared pictures and their pending provider work have revision ownership',()=>{
  it('updates an already mounted Read & Match player when its pack picture is replaced',async()=>{
    installCanvasStub();const Modal=setupWordSounds().WordSoundsModal;
    const playerProps={...studentProps('decoding',[]),resourceId:'picture-pack',isTeacherMode:false};
    const original={...playerProps.wsPreloadedWords[0],_decodingAssets:{...playerProps.wsPreloadedWords[0]._decodingAssets,dog:uri('OLD-DOG')}};
    playerProps.wsPreloadedWords=[original];playerProps.wordSoundsPhonemes=original;
    await act(async()=>{root.render(React.createElement(Modal,playerProps));await new Promise(done=>setTimeout(done,20));});
    expect([...container.querySelectorAll('img')].some(img=>img.getAttribute('src')===uri('OLD-DOG'))).toBe(true);
    const updated={...original,_decodingAssets:{...original._decodingAssets,dog:uri('NEW-DOG')}};
    await act(async()=>root.render(React.createElement(Modal,{...playerProps,wsPreloadedWords:[updated],wordSoundsPhonemes:updated})));
    const rendered=[...container.querySelectorAll('img')].map(img=>img.getAttribute('src'));
    expect(rendered).toContain(uri('NEW-DOG'));expect(rendered).not.toContain(uri('OLD-DOG'));
  });

  it('shows a replacement on the next render, before any image request',async()=>{
    await render({words:[{word:'dog',_aacAssets:{dog:uri('OLD')}}]});
    await act(async()=>state.generatePreparedOptionImages(['dog']));
    expect(container.querySelector('img').getAttribute('src')).toBe(uri('OLD'));
    await render({words:[{word:'dog',_aacAssets:{dog:uri('NEW')}}]});
    expect(state.optionImages.dog).toBe('NEW');
    expect(container.querySelector('img').getAttribute('src')).toBe(uri('NEW'));
  });

  it('uses a refined row image ahead of a stale shared manifest for the same target',async()=>{
    await render({words:[{word:'dog',image:uri('OLD'),_decodingAssets:{dog:uri('OLD')}}]});
    await render({words:[{word:'dog',image:uri('REFINED'),_decodingAssets:{dog:uri('OLD')}}]});
    expect(container.querySelector('img').getAttribute('src')).toBe(uri('REFINED'));
  });

  it('aborts and ignores an old generation when a teacher-prepared clip arrives',async()=>{
    const pending=request(),provider=vi.fn(()=>pending.promise);
    await render({provider});let work;
    await act(async()=>{work=state.generatePreparedOptionImages(['dog']);});
    expect(provider).toHaveBeenCalledTimes(1);
    await render({words:[{word:'dog',_aacAssets:{dog:uri('REVIEWED')}}]});
    expect(provider.mock.calls[0][3].signal.aborted).toBe(true);
    await act(async()=>{pending.resolve(uri('STALE'));await work;});
    expect(container.querySelector('img').getAttribute('src')).toBe(uri('REVIEWED'));
    expect(state.optionImages.dog).toBe('REVIEWED');
  });

  it('isolates pending/generated images between resources and deduplicates requests',async()=>{
    const old=request(),fresh=request(),provider=vi.fn().mockImplementationOnce(()=>old.promise).mockImplementationOnce(()=>fresh.promise);
    await render({provider});let oldWork,newWork;
    await act(async()=>{oldWork=state.generatePreparedOptionImages(['DOG','dog']);state.generatePreparedOptionImages(['dog']);});
    expect(provider).toHaveBeenCalledTimes(1);
    await render({resourceKey:'pack-b'});
    await act(async()=>{newWork=state.generatePreparedOptionImages(['dog']);});
    expect(provider).toHaveBeenCalledTimes(2);
    await act(async()=>{fresh.resolve(uri('PACK-B'));await newWork;old.resolve(uri('PACK-A'));await oldWork;});
    expect(state.optionImages.dog).toBe('PACK-B');
    expect(container.querySelector('img').getAttribute('src')).toBe(uri('PACK-B'));
  });

  it('drops removed prepared art, retries a missing image, and ignores completion after unmount',async()=>{
    const pending=request(),provider=vi.fn(()=>pending.promise);
    await render({words:[{word:'dog',_aacAssets:{dog:uri('REMOVED')}}],provider});
    await render({words:[]});expect(state.optionImages.dog).toBeUndefined();
    let work;await act(async()=>{work=state.generatePreparedOptionImages(['dog']);});
    await act(async()=>root.unmount());root=createRoot(container);
    expect(provider.mock.calls[0][3].signal.aborted).toBe(true);
    await act(async()=>{pending.resolve(uri('TOO-LATE'));await work;});
    await render();expect(state.optionImages.dog).toBeUndefined();
  });
});
