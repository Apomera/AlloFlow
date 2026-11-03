import {afterEach,beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act}=React;
// Pre-activity review thumbnails used to hard-code alt="", discarding each card's
// reviewed picture description. They now announce the current, non-decorative description.
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const other='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';
const description='A paper lamp lights one open book.';
let host,root;
beforeAll(()=>{window.React=globalThis.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('alt_text_module.js');delete window.AlloModules.ConceptSortView;new Function(readFileSync(process.env.ALLO_CONCEPT_VIEW||'view_concept_sort_module.js','utf8'))();});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;document.body.innerHTML='';});
function thumbnail(overrides={},props={}){
  const item={id:'i1',content:'Record 1. A reply asks which spot the lamp lights.',categoryId:'c1',image,imageAlt:description,imageAltHash:window.AlloModules.AltText.hashImage(image),imageDecorative:false,...overrides};
  const generatedContent={id:'sort',type:'concept-sort',data:{categories:[{id:'c1',label:'Reply'}],items:[item]}};
  const noop=()=>{};
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  act(()=>root.render(React.createElement(window.AlloModules.ConceptSortView,{t:k=>k,isTeacherMode:true,isIndependentMode:false,generatedContent,csEdit:null,setCsEdit:noop,csAddingCatId:null,csAddingText:'',csBusyId:null,setCsAddingCatId:noop,setCsAddingText:noop,csUpdateItemText:noop,csUpdateCategoryLabel:noop,csMoveItem:noop,csRegenerateItem:noop,csRegenerateItemImage:noop,csUploadItemImage:noop,csClearItemImage:noop,csDeleteItem:noop,csRefineItemImage:noop,handleSetIsConceptSortGameToTrue:noop,csAddItem:noop,setConceptSortImageScale:noop,conceptSortImageScale:1,...props})));
  return host.querySelector('[data-help-key="concept_sort_item"] img');
}
describe('Concept Sort review thumbnail descriptions',()=>{
  it('keeps the reviewed description of the current picture',()=>{expect(thumbnail().getAttribute('alt')).toBe(description);});
  it('keeps legacy descriptions that carry no image hash',()=>{expect(thumbnail({imageAltHash:undefined}).getAttribute('alt')).toBe(description);});
  it('stays silent for decorative artwork',()=>{expect(thumbnail({imageDecorative:true}).getAttribute('alt')).toBe('');});
  it('does not announce a description that belongs to an earlier picture',()=>{expect(thumbnail({image:other}).getAttribute('alt')).toBe('');});
  it('does not repeat the adjacent card text or announce an empty description',()=>{
    expect(thumbnail({imageAlt:'Record 1. A reply asks which spot the lamp lights.'}).getAttribute('alt')).toBe('');
    act(()=>root.unmount());root=null;document.body.innerHTML='';
    expect(thumbnail({imageAlt:'   '}).getAttribute('alt')).toBe('');
  });
});
