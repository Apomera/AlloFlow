import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const hit=find(child,predicate);if(hit)return hit;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
beforeEach(resetStemLab);
describe('Regional learning connections',()=>{
 it.each(paths)('offers valid region-specific starting points and explains detail changes in %s',file=>{
  loadTool(file,'anatomy');const root=document.createElement('div');root.innerHTML=renderTool('anatomy',{anatomy:{_activeTab:'explore',_bodyView3d:true,_body3dStyle:'realistic',system:'skeletal',complexity:1}});
  const ids=region=>[...root.querySelectorAll('[data-anatomy-region-group="'+region+'"] [data-anatomy-region-card]')].map(n=>n.dataset.anatomyRegionCard);
  expect(ids('head')).toEqual(['skull','brain','mandible']);expect(ids('torso')).toEqual(['heart','ribs','lungs']);expect(ids('hand')).toEqual(['carpals','metacarpals','median']);expect(ids('feet')).toEqual(['tarsals','metatarsals']);
  expect(root.querySelector('[data-anatomy-region-group=hand]').textContent).toContain('Opens at detail level 2');
  expect(root.querySelector('[data-anatomy-region-learning]').hasAttribute('open')).toBe(false);
 });
 it.each(paths)('selects across systems and raises detail only when required in %s',file=>{
  const tool=loadTool(file,'anatomy');let data={anatomy:{_activeTab:'explore',_bodyView3d:true,_body3dStyle:'realistic',system:'skeletal',view:'posterior',complexity:1,search:'unrelated',_studyFilter:'notes',_structureNotes:{skull:'Keep this'}}};
  const render=()=>tool.render(makeCtx({toolData:data,setToolData:update=>{data=typeof update==='function'?update(data):update;}}));
  find(render(),n=>n.props?.['data-anatomy-region-open']==='heart').props.onClick();
  expect(data.anatomy).toMatchObject({system:'circulatory',view:'anterior',selectedStructure:'heart',complexity:1,search:'',_body3dStyle:'blueprint',_studyFilter:'all',_lastSelectedSource:'region-learning',_structureNotes:{skull:'Keep this'}});
  find(render(),n=>n.props?.['data-anatomy-region-open']==='carpals').props.onClick();
  expect(data.anatomy).toMatchObject({system:'skeletal',view:'anterior',selectedStructure:'carpals',complexity:2,_bodyView3d:true});
 });
 it.each(paths)('keeps the panel out of 2D views in %s',file=>{
  loadTool(file,'anatomy');
  const html=renderTool('anatomy',{anatomy:{_activeTab:'explore',_bodyView3d:false}});
  expect(html).not.toContain('data-anatomy-region-learning="true"');
 });

 it.each(paths)('offers complete in-place reading while respecting learner-level descriptions in %s',file=>{
  loadTool(file,'anatomy');
  function card(complexity){const root=document.createElement('div');root.innerHTML=renderTool('anatomy',{anatomy:{_activeTab:'explore',_bodyView3d:true,_body3dStyle:'realistic',system:'skeletal',complexity}});return root.querySelector('[data-anatomy-region-group=head] [data-anatomy-region-card=skull]');}
  const detailed=card(3);expect(detailed.querySelector('[data-anatomy-region-reading=skull]')).not.toBeNull();expect(detailed.textContent).toContain('cranial nerve foramina');expect(detailed.textContent).toContain('8 cranial bones');
  expect(card(1).textContent).not.toContain('cranial nerve foramina');expect(card(1).textContent).not.toContain('8 cranial bones');
 });

 it.each(paths)('restores viewing context while retaining new notes and progress in %s',file=>{
  const tool=loadTool(file,'anatomy');const saved={system:'skeletal',view:'posterior',complexity:1,style:'realistic',source:'detailed',lighting:'contour',focus:true,selectedStructure:'skull',camera:{preset:'head',position:[0,2,3],target:[0,2,0],rotation:[0,1,0,0],radius:0.67,detailed:true}};
  let data={anatomy:{_bodyView3d:true,_body3dStyle:'blueprint',_activeTab:'explore',system:'nervous',view:'anterior',complexity:3,selectedStructure:'brain',_regionReturnView:saved,_structureNotes:{brain:'New note'},_structuresViewed:{brain:true}}};
  const tree=()=>tool.render(makeCtx({toolData:data,setToolData:update=>{data=typeof update==='function'?update(data):update;}}));
  find(tree(),n=>n.props?.['data-anatomy-return-action']==='restore').props.onClick();
  expect(data.anatomy).toMatchObject({system:'skeletal',view:'posterior',complexity:1,selectedStructure:'skull',_body3dStyle:'realistic',_surfaceLighting:'contour',_anatomyModelFocus:true,_regionReturnView:null,_structureNotes:{brain:'New note'},_structuresViewed:{brain:true}});
 });
 it.each(paths)('ignores malformed or unknown-system saved views in %s',file=>{
  loadTool(file,'anatomy');for(const saved of [{},{system:'unknown',view:'anterior',complexity:1,style:'realistic',source:'detailed',camera:{preset:'head',position:[0,2,3],target:[0,2,0],rotation:[0,0,0,1],radius:0.67}},{system:'skeletal',view:'anterior',complexity:1,style:'realistic',source:'detailed',camera:{preset:'head',position:[NaN,2,3],target:[0,2,0],rotation:[0,0,0,1],radius:0.67}}]){
   const root=document.createElement('div');root.innerHTML=renderTool('anatomy',{anatomy:{_activeTab:'explore',_bodyView3d:true,_body3dStyle:'blueprint',_regionReturnView:saved}});expect(root.querySelector('[data-anatomy-return-view]')).toBeNull();
  }
 });
});
