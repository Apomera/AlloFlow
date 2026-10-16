import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {verifyBoardImage} from '../lesson_board_support.js';

const picture='data:image/png;base64,AAAA';
let images;
beforeEach(()=>{
  vi.useFakeTimers();images=[];
  vi.stubGlobal('Image',class{
    constructor(){this.naturalWidth=0;this.naturalHeight=0;this.assignments=[];images.push(this);}
    set src(value){this.value=value;this.assignments.push({src:value,referrerPolicy:this.referrerPolicy});}
    get src(){return this.value;}
    load(width=960,height=640){this.naturalWidth=width;this.naturalHeight=height;this.onload?.();}
    fail(){this.onerror?.();}
  });
});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
const monitor=()=>{const controller=new AbortController();return {controller,add:vi.spyOn(controller.signal,'addEventListener'),remove:vi.spyOn(controller.signal,'removeEventListener')};};
const expectClean=(image,signal)=>{
  expect(image.onload).toBeNull();expect(image.onerror).toBeNull();expect(vi.getTimerCount()).toBe(0);
  if(signal)expect(signal.remove).toHaveBeenCalledWith('abort',signal.add.mock.calls[0][1]);
};

describe('Generated board image verification',()=>{
  it('waits for actual loading and returns the original URI without re-encoding it',async()=>{
    const signal=monitor(),uri='https://example.com/terrain.webp',verified=verifyBoardImage(uri,{signal:signal.controller.signal});
    let resolved=false;verified.then(()=>{resolved=true;});await Promise.resolve();expect(resolved).toBe(false);
    expect(images).toHaveLength(1);expect(images[0].assignments).toEqual([{src:uri,referrerPolicy:'no-referrer'}]);
    images[0].load();await expect(verified).resolves.toBe(uri);expectClean(images[0],signal);
    signal.controller.abort();expect(images[0].src).toBe(uri);
  });
  it('rejects an undecodable small data URI even though it fits the storage limit',async()=>{
    const signal=monitor(),verified=verifyBoardImage(picture,{signal:signal.controller.signal}),failure=expect(verified).rejects.toThrow('board-image-invalid');
    expect(images[0].src).toBe(picture);images[0].fail();await failure;expect(images[0].src).toBe('');expectClean(images[0],signal);
  });
  it.each([[0,640],[960,0],[NaN,640],[960,Infinity]])('rejects a loaded picture with invalid dimensions %s × %s',async(width,height)=>{
    const verified=verifyBoardImage(picture),failure=expect(verified).rejects.toThrow('board-image-invalid');images[0].load(width,height);await failure;expectClean(images[0]);
  });
  it('times out at twelve seconds and removes pending handlers and cancellation listeners',async()=>{
    const signal=monitor(),verified=verifyBoardImage(picture,{signal:signal.controller.signal}),failure=expect(verified).rejects.toThrow('board-image-timeout'),lateLoad=images[0].onload;
    await vi.advanceTimersByTimeAsync(11999);expect(images[0].src).toBe(picture);await vi.advanceTimersByTimeAsync(1);await failure;
    expect(images[0].src).toBe('');expectClean(images[0],signal);lateLoad();expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels a pending decode and ignores a late load',async()=>{
    const signal=monitor(),verified=verifyBoardImage(picture,{signal:signal.controller.signal}),failure=expect(verified).rejects.toMatchObject({name:'AbortError'}),lateLoad=images[0].onload;
    signal.controller.abort();await failure;expect(images[0].src).toBe('');expectClean(images[0],signal);images[0].naturalWidth=960;images[0].naturalHeight=640;lateLoad();expect(vi.getTimerCount()).toBe(0);
  });
  it('does not start image loading after cancellation or for an unsafe URI',async()=>{
    const signal=monitor();signal.controller.abort();await expect(verifyBoardImage(picture,{signal:signal.controller.signal})).rejects.toMatchObject({name:'AbortError'});
    for(const uri of ['javascript:alert(1)','data:image/svg+xml,<svg/>',null])await expect(verifyBoardImage(uri)).rejects.toThrow('board-image-invalid');
    expect(images).toHaveLength(0);expect(signal.add).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  });
});
