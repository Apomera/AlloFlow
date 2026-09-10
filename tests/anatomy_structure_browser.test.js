import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const match=find(child,predicate);if(match)return match;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
function session(file,extra={}){
 const tool=loadTool(file,'anatomy');let data={anatomy:{_activeTab:'explore',_bodyView3d:false,system:'skeletal',view:'anterior',complexity:3,_structuresViewed:{skull:true},_structureNotes:{skull:'Skull note',femur:'Femur note'},...extra}};
 const tree=()=>tool.render(makeCtx({toolData:data,setToolData:update=>{data=typeof update==='function'?update(data):update;}}));
 return {state:()=>data.anatomy,patch:p=>Object.assign(data.anatomy,p),node:(key,value)=>find(tree(),n=>n.props?.[key]===value),html:()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data);return root;}};
}
beforeEach(resetStemLab);
describe('Anatomy structure browser',()=>{
 it.each(paths)('sorts names and prioritizes practice, stale, and learning without changing progress in %s',file=>{
  const s=session(file,{_explorerListSort:'name'});let rows=[...s.html().querySelectorAll('[data-anatomy-structure-option]')];const names=rows.map(r=>r.querySelector('.truncate').textContent);expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b)));
  s.patch({_explorerListSort:'review',_structureConfidence:{ribs:'practice',skull:'mastered',femur:'learning'},_confidenceAt:{skull:Date.now()-10*86400000,femur:Date.now()}});
  expect([...s.html().querySelectorAll('[data-anatomy-structure-option]')].slice(0,3).map(r=>r.dataset.anatomyStructureOption)).toEqual(['ribs','skull','femur']);
  expect(s.state()._structuresViewed).toEqual({skull:true});
 });
 it.each(paths)('filters real notes, counts search matches and explains empty notes in %s',file=>{
  const s=session(file,{_studyFilter:'notes',_structureNotes:{skull:'  ',femur:'My note',unknown:'Ignored'}});
  expect([...s.html().querySelectorAll('[data-anatomy-structure-option]')].map(r=>r.dataset.anatomyStructureOption)).toEqual(['femur']);
  expect(s.html().querySelector('[data-anatomy-browser-filter=notes] .anatomy-browser-filter-count').textContent).toBe('1');
  s.patch({search:'skull'});expect(s.html().querySelectorAll('[data-anatomy-structure-option]')).toHaveLength(0);
  expect(s.html().querySelector('[data-anatomy-browser-filter=all] .anatomy-browser-filter-count').textContent).toBe('2');
  s.patch({search:'',_structureNotes:{}});expect(s.html().textContent).toContain('No notes in this view yet.');expect(s.html().textContent).toContain('In your own words');
 });
 it.each(paths)('keeps a filtered sequence stable when notes change and preserves list settings on return in %s',file=>{
  const s=session(file,{_studyFilter:'notes',_explorerListSort:'name',_explorerListCompact:true});
  s.node('data-anatomy-structure-option','femur').props.onClick();expect(s.state()._explorerBrowseIds).toEqual(['femur','skull']);
  s.patch({_structureNotes:{skull:'Kept'}});s.node('data-anatomy-browse','next').props.onClick();expect(s.state().selectedStructure).toBe('skull');expect(s.node('data-anatomy-browse','next').props.disabled).toBe(true);
  s.node('data-anatomy-browse','previous').props.onClick();expect(s.state().selectedStructure).toBe('femur');
  expect(s.state()).toMatchObject({_studyFilter:'notes',_explorerListSort:'name',_explorerListCompact:true,_structureNotes:{skull:'Kept'}});
 });
 it.each(paths)('ignores invalid saved sequences and preferences in %s',file=>{
  const s=session(file,{selectedStructure:'skull',_explorerBrowseSelected:'skull',_explorerBrowseContext:'skeletal:anterior:3',_explorerBrowseIds:['skull','unknown'],_explorerListSort:'forged',_studyFilter:'forged'});
  s.node('data-anatomy-browse','next').props.onClick();expect(s.state().selectedStructure).toBe('mandible');
  s.patch({selectedStructure:null});expect(s.html().querySelector('#anatomy-browser-sort').value).toBe('diagram');expect(s.html().querySelector('[data-anatomy-browser-filter=all]').getAttribute('aria-pressed')).toBe('true');
 });
});
