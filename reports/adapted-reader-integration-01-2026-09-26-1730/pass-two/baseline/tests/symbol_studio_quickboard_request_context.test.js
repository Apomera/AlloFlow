 import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
 import { createRequire } from 'node:module';
 import { resolve } from 'node:path';
 import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
 const require = createRequire(import.meta.url);
 const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
 const act = React.act;
 let SymbolStudio, root, host, mountedProps;
 const oldImage = 'data:image/png;base64,b2xk';
 const newImage = 'data:image/png;base64,bmV3';
 beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
 afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });
 function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
 async function mount(overrides = {}) {
   localStorage.setItem('alloStudentProfiles', JSON.stringify([{id:'quick-a',name:'Learner A',codename:'Sky Fox'},{id:'quick-b',name:'Learner B',codename:'Bright Otter'}]));
   localStorage.setItem('alloActiveProfileId', JSON.stringify('quick-a'));
   host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
   mountedProps = baseProps({ initialTab:'quickboards', ...overrides });
   await act(async () => root.render(React.createElement(SymbolStudio, mountedProps)));
 }
 function control(label) { const el = [...host.querySelectorAll('[aria-label]')].find(el => el.getAttribute('aria-label') === label); expect(el,label).toBeTruthy(); return el; }
 function change(label,value) { const el=control(label); act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value); el.dispatchEvent(new Event('input',{bubbles:true})); }); }
 function imagePresent(image) { return !!host.querySelector('#ss-pq img[src="'+image+'"]'); }
 describe('Quick Board image request association', () => {
   it('discards a slow apple image after the first activity changes to toilet', async () => {
     const slow=deferred(); await mount({onCallImagen:()=>slow.promise});
     change('First activity','apple'); act(()=>control('Generate image for first activity').click());
     change('First activity','toilet');
     await act(async()=>slow.resolve(oldImage));
     expect(control('First activity').value).toBe('toilet'); expect(imagePresent(oldImage)).toBe(false);
     expect(control('Generate image for first activity').disabled).toBe(false);
   });
   it('retains a newer label request when the obsolete request resolves last', async () => {
     const first=deferred(),second=deferred();
     const onCallImagen=vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
     await mount({onCallImagen});
     change('First activity','apple'); act(()=>control('Generate image for first activity').click());
     change('First activity','toilet'); expect(control('Generate image for first activity').disabled).toBe(false);
     act(()=>control('Generate image for first activity').click());
     await act(async()=>second.resolve(newImage)); expect(imagePresent(newImage)).toBe(true);
     await act(async()=>first.resolve(oldImage)); expect(imagePresent(newImage)).toBe(true); expect(imagePresent(oldImage)).toBe(false);
   });
   it('discards a personalized request after switching profiles', async () => {
     const slow=deferred(); const addToast=vi.fn(); await mount({onCallImagen:()=>slow.promise,addToast});
     change('First activity','apple'); act(()=>control('Generate image for first activity').click());
     act(()=>control('Profile: Learner B').click()); await act(async()=>slow.resolve(oldImage));
     expect(imagePresent(oldImage)).toBe(false);
     expect(control('First activity').value).toBe('');
     expect(control('Generate image for first activity').disabled).toBe(true);
     change('First activity','Learner B independent activity');
     expect(control('Generate image for first activity').disabled).toBe(false);
     expect(addToast.mock.calls.some(([,type])=>type==='success')).toBe(false);
   });
   it('discards a pending result after close and reopen', async () => {
     const slow=deferred(); await mount({onCallImagen:()=>slow.promise});
     change('First activity','apple'); act(()=>control('Generate image for first activity').click());
     await act(async()=>root.render(React.createElement(SymbolStudio,{...mountedProps,isOpen:false})));
     await act(async()=>root.render(React.createElement(SymbolStudio,mountedProps)));
     await act(async()=>slow.resolve(oldImage)); expect(imagePresent(oldImage)).toBe(false);
   });
   it('does not attach a delayed upload to a renamed first activity', async () => {
     let reader;
     vi.stubGlobal('FileReader',class { constructor(){reader=this;} readAsDataURL(){} });
     await mount(); change('First activity','apple'); act(()=>control('Upload image for first activity').click());
     const input=[...host.querySelectorAll('.ss-workspace input[type=file]')].find(el=>el.accept==='image/*'); expect(input).toBeTruthy();
     Object.defineProperty(input,'files',{configurable:true,value:[new File(['local fixture'],'apple.png',{type:'image/png'})]});
     act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
     change('First activity','toilet'); await act(async()=>reader.onload({target:{result:oldImage}}));
     expect(imagePresent(oldImage)).toBe(false); expect(control('Generate image for first activity').disabled).toBe(false);
   });
   it('clears the old image when its activity label is changed', async () => {
     await mount({onCallImagen:async()=>oldImage});
     change('First activity','apple'); await act(async()=>control('Generate image for first activity').click());
     expect(imagePresent(oldImage)).toBe(true); change('First activity','toilet'); expect(imagePresent(oldImage)).toBe(false);
   });
 });
