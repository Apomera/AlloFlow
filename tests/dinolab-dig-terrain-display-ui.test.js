import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n');
const mirrorSource=readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n');
const english=JSON.parse(readFileSync('ui_strings.js','utf8')).stem.dinolab;
const mirrorEnglish=JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js','utf8')).stem.dinolab;
function section(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<=a||text.indexOf(start,a+start.length)>=0)throw Error('Missing or ambiguous terrain UI seam '+start);return text.slice(a,b);}
const helperSource=section(source,'// DINO_VOXEL_TERRAIN_UI_START','// DINO_VOXEL_TERRAIN_UI_END');
const renderDisplay=new Function(helperSource+'\nreturn renderDinoDigTerrainDisplay;')();
const componentSource=section(source,'  function makeDinoVoxelDig3D(React)','  var DinoVoxelDig3DStable = null;');
// Execute actual render branches; no GPU effects run in this native-markup fixture.
const makeComponent=new Function('digVoxelFind','digVoxelFindLook','digVoxelTerrainLook',componentSource+'\nreturn makeDinoVoxelDig3D;')(()=>({selected:null}),value=>value==='raking'||value==='outline'?value:'surface',value=>value==='raking'?'raking':'daylight');
const React={createElement(type,props,...children){return{type,props:props||{},children:children.flat(Infinity).filter(child=>child!=null&&child!==false)};},useRef(value){return{current:value};},useEffect(){},useState(value){return[value,()=>{throw Error('Render changed state');}];}};
const Component=makeComponent(React);
const keys=['title','controls','daylight','raking','hint','faces','model_note','section_note'].map(key=>'terrain_'+key);
const themes=[
 {name:'default',panel:'#ffffff',deeper:'#eee7db',text:'#181511',soft:'#595044',border:'#b9ad9b'},
 {name:'dark',panel:'#142126',deeper:'#0a1418',text:'#edf8f3',soft:'#becdc8',border:'#5c7870'},
 {name:'contrast',panel:'#000000',deeper:'#000000',text:'#ffffff',soft:'#ffffff',border:'#ffffff'}
];
function nodes(tree){return tree&&typeof tree==='object'?[tree,...tree.children.flatMap(nodes)]:[];}
function byId(tree,id){return nodes(tree).find(node=>node.props.id===id);}
function text(tree){if(tree==null||tree===false)return'';if(typeof tree!=='object')return String(tree);if(tree.type==='style'||tree.props.hidden||tree.props['aria-hidden']==='true')return'';return tree.children.map(text).join(' ').replace(/\s+/g,' ').trim();}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function translate(key,fallback){const value=english[key.slice('stem.dinolab.'.length)];expect(typeof value,'Unregistered key '+key).toBe('string');expect(value,'Different fallback '+key).toBe(fallback);return value;}
function display(extras={}){return renderDisplay(React,{look:'daylight',inspect:false,findMode:false,T:themes[0],translate,onLook(){},...extras});}
function stage(extras={}){return Component({site:{seed:1},state:{version:1,seed:1,depths:Array(24).fill(0),contacts:Array(24).fill(false),tool:'brush',focus:7},focus:7,inspect:false,findMode:false,preview:false,surveyGuides:false,terrainLook:'daylight',translate,...extras});}
function associations(tree){const ids=nodes(tree).filter(node=>node.props.id).map(node=>node.props.id);expect(new Set(ids).size).toBe(ids.length);for(const node of nodes(tree))for(const attr of ['aria-labelledby','aria-describedby'])if(node.props[attr])for(const id of node.props[attr].split(' '))expect(ids,attr+': '+id).toContain(id);}
function readable(tree){expect(text(tree)).not.toMatch(/\{[A-Za-z_]+\}|\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);}

describe('shipped Dino terrain surface display controls',()=>{
 it('ships the same pure helper and eight exact registered English phrases in both mirrors',()=>{
  expect(section(mirrorSource,'// DINO_VOXEL_TERRAIN_UI_START','// DINO_VOXEL_TERRAIN_UI_END')).toBe(helperSource);
  expect(Object.keys(english).filter(key=>key.startsWith('terrain_')).sort()).toEqual([...keys].sort());
  const calls=[...helperSource.matchAll(/tt\('([^']+)', ('(?:\\.|[^'\\])*')/g)];expect([...new Set(calls.map(([,suffix])=>'terrain_'+suffix))].sort()).toEqual([...keys].sort());
  for(const[,suffix,literal]of calls)expect(english['terrain_'+suffix]).toBe(new Function('return '+literal+';')());
  for(const key of keys){expect(mirrorEnglish[key]).toBe(english[key]);expect(english[key]).not.toMatch(/\\u[0-9a-f]{4}/i);}
 });
 it.each(['daylight','raking'])('marks exactly the current %s light with two native named buttons',look=>{
  const tree=display({look}),buttons=nodes(tree).filter(node=>node.props['data-dig-terrain-look']);
  expect(tree.props['data-dig-terrain-look-current']).toBe(look);expect(buttons.map(node=>node.props.id)).toEqual(['dino-terrain-daylight','dino-terrain-raking']);
  expect(buttons.map(text)).toEqual([english.terrain_daylight,english.terrain_raking]);expect(buttons.every(node=>node.type==='button'&&node.props.type==='button'&&!node.props.disabled)).toBe(true);
  expect(buttons.filter(node=>node.props['aria-pressed']).map(node=>node.props['data-dig-terrain-look'])).toEqual([look]);associations(tree);readable(tree);
 });
 it('normalizes malformed restored looks to daylight without reading arbitrary payload fields',()=>{
  const denied={};Object.defineProperty(denied,'look',{get(){throw Error('Read hidden payload');}});
  for(const look of [undefined,null,false,[],{},denied,'Raking','unknown',9])expect(display({look}).props['data-dig-terrain-look-current']).toBe('daylight');
 });
 it.each([false,true])('offers the same two lighting choices in full/Section mode (%s)',inspect=>{
  const tree=display({inspect});expect(tree.props['data-dig-terrain-view']).toBe(inspect?'section':'full');
  const note=nodes(tree).find(node=>node.props.className==='dinolab-terrain-section-note');expect(note===undefined).toBe(!inspect);
  if(inspect)expect(text(note)).toBe(english.terrain_section_note);
  expect(nodes(tree).filter(node=>node.type==='button').every(node=>node.props.disabled===false)).toBe(true);
 });
 it('declines Find mode so its independent controls and lighting retain ownership',()=>{
  for(const look of ['daylight','raking'])for(const inspect of [false,true])expect(display({look,inspect,findMode:true})).toBeNull();
 });
 it('forwards only bounded lighting values, with no excavation, selection or progress mutation',()=>{
  const calls=[],forbidden=[],progress=freeze({seed:7,depths:Array(24).fill(2),contacts:Array(24).fill(false),undo:[{focus:7}],clues:['observed']}),before=JSON.stringify(progress);
  const tree=display({state:progress,onLook:(...args)=>calls.push(args),onSelect:()=>forbidden.push('select'),onExcavate:()=>forbidden.push('dig'),onReveal:()=>forbidden.push('reveal')});
  nodes(tree).filter(node=>node.type==='button').forEach(node=>node.props.onClick());expect(calls).toEqual([['daylight'],['raking']]);expect(forbidden).toEqual([]);expect(JSON.stringify(progress)).toBe(before);
 });
 it('keeps unavailable callbacks disabled and safe while retaining readable choices',()=>{
  for(const onLook of [undefined,null,'callback']){const buttons=nodes(display({onLook})).filter(node=>node.type==='button');expect(buttons).toHaveLength(2);expect(buttons.every(node=>node.props.disabled&&text(node))).toBe(true);for(const button of buttons)expect(()=>button.props.onClick()).not.toThrow();}
 });
 it('adds no live announcements or editable data controls',()=>{
  const tree=display();expect(nodes(tree).some(node=>node.props['aria-live']||node.props.role==='status')).toBe(false);
  expect(nodes(tree).some(node=>['input','select','textarea'].includes(node.type))).toBe(false);expect(nodes(tree).filter(node=>node.type==='button')).toHaveLength(2);
 });
 it('explains display-only relief, illustrative texture, and virtual Section walls',()=>{
  const tree=display({inspect:true});expect(text(byId(tree,'dino-terrain-light-hint'))).toBe(english.terrain_hint);
  expect(text(tree)).toContain(english.terrain_faces);expect(text(tree)).toContain(english.terrain_model_note);expect(text(tree)).toContain(english.terrain_section_note);
  expect(text(tree)).not.toMatch(/older than|younger than|contains fossils|sandstone|mudstone|million years|unlock/i);
 });
 it('uses a decorative code-native face diagram with noncolor speckle and wall detail',()=>{
  const tree=display(),svg=nodes(tree).find(node=>node.type==='svg');expect(svg.props).toMatchObject({'aria-hidden':'true',focusable:'false'});
  expect(nodes(svg).filter(node=>node.props['data-dig-terrain-face']).map(node=>node.props['data-dig-terrain-face'])).toEqual(['top','wall']);
  const top=nodes(svg).find(node=>node.props['data-dig-terrain-detail']==='top-speckle'),wall=nodes(svg).find(node=>node.props['data-dig-terrain-detail']==='wall-texture');
  expect(nodes(top).filter(node=>node.type==='circle').length).toBeGreaterThan(1);expect(wall.type).toBe('path');expect(wall.props.fill).toBe('none');expect(wall.props.stroke).toBe('currentColor');
  expect(nodes(svg).some(node=>node.props.onClick||node.props.tabIndex)).toBe(false);
 });
 it.each(themes)('keeps readable wrapped native text and 44px controls in the $name theme',T=>{
  const tree=display({T,inspect:true}),css=nodes(tree).find(node=>node.type==='style').children.join('');
  expect(text(tree)).toBe(text(display({inspect:true})));expect(css).toContain(T.text);expect(css).toContain(T.soft);expect(css).toContain(T.border);
  expect(css).toContain('min-height:44px');expect(css).toContain('white-space:normal');expect(css).toContain('overflow-wrap:anywhere');associations(tree);readable(tree);
 });
 it('retains readable fallback descriptions without a translator result',()=>{
  for(const translate of [undefined,()=>null,()=>undefined])expect(text(display({translate,inspect:true}))).toBe(text(display({inspect:true})));
 });
 it('ignores hidden burial, anatomy and catalog state supplied alongside its public display props',()=>{
  const state={};for(const key of ['burial','hasBone','fossilY','boneCells','species','catalog','clues'])Object.defineProperty(state,key,{enumerable:true,get(){throw Error('Hidden read '+key);}});
  expect(()=>display({state})).not.toThrow();
 });
 it.each([{inspect:false,findMode:false},{inspect:true,findMode:false},{inspect:false,findMode:true}])('associates the canvas with terrain guidance only where controls exist: %j',branch=>{
  const tree=stage(branch),canvas=byId(tree,'dino-voxel-canvas'),ids=canvas.props['aria-describedby'].split(' ');
  expect(ids.includes('dino-terrain-light-hint')).toBe(!branch.findMode);
  const combined=React.createElement('div',{},tree,display(branch),React.createElement('p',{id:'dino-voxel-controls-hint'},'Existing controls'));associations(combined);
 });
 it('keeps canvas guidance associated even when the independent stroke preview is hidden',()=>{
  const ids=byId(stage({preview:false}),'dino-voxel-canvas').props['aria-describedby'].split(' ');expect(ids).toContain('dino-terrain-light-hint');expect(ids).not.toContain('dino-preview-volume-legend');
 });
 it.each([false,true])('limits the actual root action to this display field and rejects Find/invalid values (%s)',inspectFind=>{
  const actionSource=section(source,'        function setTerrainLook(value) {','        function setFindLook(value) {'),calls=[];
  const action=new Function('inspectFind','upd',actionSource+'\nreturn setTerrainLook;')(inspectFind,(...args)=>calls.push(args));
  for(const value of [null,undefined,{},[],'surface','outline','Raking',4])action(value);expect(calls).toEqual([]);
  action('daylight');action('raking');expect(calls).toEqual(inspectFind?[]:[['digVoxelTerrainLook','daylight'],['digVoxelTerrainLook','raking']]);
 });
});
