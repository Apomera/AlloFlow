import fs from 'node:fs';
import {describe,it,expect,vi} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_lab_module.js','utf8');
const start=source.indexOf('localS.observer = new window.IntersectionObserver(function(entries) {');
if(start<0)throw new Error('Missing orbit viewer visibility observer');
const body=source.slice(source.indexOf('{',start)+1,source.indexOf('});',start));
function observer(state={}){const local={visible:true,raf:0,dirty:false,disposing:false,...state},resume=vi.fn(),cancel=vi.fn(),callback=new Function('localS','ensureFrame','cancelAnimationFrame','return function(entries){'+body+'};')(local,resume,cancel);return {local,resume,cancel,notify:(...values)=>callback(values.map(isIntersecting=>({isIntersecting})))};}
describe('orbit viewer visibility batches',()=>{
 it('resumes pending rendering when the latest entry is visible',()=>{const o=observer({visible:false});o.notify(false,true);expect(o.local.visible).toBe(true);expect(o.local.dirty).toBe(true);expect(o.resume).toHaveBeenCalledOnce();expect(o.cancel).not.toHaveBeenCalled();});
 it('pauses rendering when the latest entry is offscreen',()=>{const o=observer({raf:42});o.notify(true,false);expect(o.local.visible).toBe(false);expect(o.local.raf).toBe(0);expect(o.cancel).toHaveBeenCalledWith(42);expect(o.resume).not.toHaveBeenCalled();});
 it('handles single visible observations',()=>{const o=observer({visible:false});o.notify(true);expect(o.local.visible).toBe(true);expect(o.resume).toHaveBeenCalledOnce();});
 it('cancels only a pending frame when hidden',()=>{const o=observer({raf:42});o.notify(false);o.notify(false);expect(o.cancel).toHaveBeenCalledOnce();expect(o.local.raf).toBe(0);});
 it('ignores empty observation batches',()=>{const o=observer();o.notify();expect(o.local.visible).toBe(true);expect(o.resume).not.toHaveBeenCalled();expect(o.cancel).not.toHaveBeenCalled();});
 it('ignores late batches after the viewer is disposed',()=>{const o=observer({disposing:true,raf:42});o.notify(true,false);expect(o.local.visible).toBe(true);expect(o.local.raf).toBe(42);expect(o.resume).not.toHaveBeenCalled();expect(o.cancel).not.toHaveBeenCalled();});
});
