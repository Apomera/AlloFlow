const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-view-chooser-2026-10-06');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),before=fs.readFileSync(path.join(__dirname,'renderer-baseline.js'),'utf8');
if(sha(before)!=='72c75cc596b0ee7307b7b7549fcd34e02cefdf9cdfb00f445bb21a26cc2dfeed')throw Error('Baseline guard');
const parser=require(path.join(repo,'node_modules/@babel/parser'));let section;
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.arguments?.[1]?.type==='ObjectExpression'&&n.arguments[1].properties.some(p=>p.key?.value==='data-diss-view-group'&&p.value?.value==='specimen')){if(section)throw Error('Duplicate specimen group');section=n;}for(const[k,v]of Object.entries(n)){if(k==='loc')continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
walk(parser.parse(before));if(!section||section.arguments.length!==4)throw Error('Section shape');
const grid=section.arguments[3],fragment=grid.arguments[3];if(grid.arguments.length!==4||fragment.type!=='LogicalExpression'||fragment.right.arguments.length!==22)throw Error('Native grid shape');
const nodes=[grid.arguments[2],...fragment.right.arguments.slice(2)],original=nodes.map(n=>before.slice(n.start,n.end));if(nodes.length!==21)throw Error('Native action count');
const controls=original.slice();
function describe(i,id){const s=controls[i],button=s.indexOf('React.createElement("button", { ');if(button<0)throw Error('Button '+i);controls[i]=s.slice(0,button)+s.slice(button).replace('React.createElement("button", { ','React.createElement("button", { "aria-describedby": "'+id+'", ');}
describe(0,'diss-view-presentation-help');describe(5,'diss-view-quality-help');for(let i=6;i<=9;i++)describe(i,'diss-view-inspection-help'+(i===7?' diss-view-pin-help':''));describe(18,'diss-view-reference-help');describe(20,'diss-view-tissue-help');
const presentation="!advancedWorkspace ? 'Essentials uses Guided presentation. Select Advanced workspace to use the other presentation modes.' : (visualRealism === 'realistic' ? 'Realistic uses richer materials, natural landmark variation, and reduced teaching emphasis.' : visualRealism === 'accessible' ? 'Accessible applies high contrast, larger visual targets, and slower animation. High contrast and slow animation stay active when you change presentation.' : 'Guided uses balanced materials and visible technique targets.')";
function group(key,title,helpId,copy,buttons,extra=''){return `React.createElement("section", { className: "diss-view-subgroup", "data-diss-view-subgroup": "${key}", role: "group", "aria-labelledby": "diss-view-subgroup-${key}" }, React.createElement("h5", { id: "diss-view-subgroup-${key}", className: "diss-view-subgroup__title" }, '${title}'), React.createElement("p", { id: "${helpId}", className: "diss-view-help" }, ${copy}), React.createElement("div", { className: "diss-view-control-grid" }, ${buttons.join(',\n                  ')}), ${extra||'null'})`;}
const anatomy=group('presentation','Anatomy and presentation','diss-view-presentation-help',presentation,[controls[0],`!d.quizMode && React.createElement(React.Fragment, null, ${controls.slice(1,6).join(',\n                  ')})`],`!d.quizMode && React.createElement("p", { id: "diss-view-quality-help", className: "diss-view-help diss-view-help--after diss-advanced-only" }, 'Quality balances animation smoothness with device load.')`);
const inspection=group('inspection','Local inspection','diss-view-inspection-help',"advancedWorkspace ? 'Magnify a local area and choose its tissue depth. Specimen zoom stays separate.' : 'Local lens inspection is available in Advanced workspace.'",controls.slice(6,10),`React.createElement("p", { id: "diss-view-pin-help", className: "diss-view-help diss-view-help--after" }, 'Select a structure or move over the specimen before pinning.')`);
const scene=group('scene','Scene and landmarks','diss-view-scene-help',"advancedWorkspace ? 'Choose instrument, landmark, and depth cues for the specimen.' : 'Essentials uses the default scene display. Select Advanced workspace to adjust depth and landmark cues.'",controls.slice(10,18));
const reference=group('reference','Reference and variation','diss-view-reference-help',"!advancedWorkspace ? 'Saved-frame split comparison is available in Advanced workspace. Capture a frame in Lab tools to choose a reference.' : (referenceEvidence ? 'Compare the live specimen with Frame ' + evidenceFrameNumber(referenceEvidence) + ' from ' + evidenceLayerLabel(referenceEvidence) + '.' : 'Capture a frame in Lab tools to enable the live/reference split.')",controls.slice(18),`React.createElement("p", { id: "diss-view-tissue-help", className: "diss-view-help diss-view-help--after" }, 'Tissue before/after changes the displayed technique overlay. Your recorded technique stays saved.')`);
const args=section.arguments.slice(0,3).map(n=>before.slice(n.start,n.end));
const nextSection=`React.createElement(${args.join(',\n                ')}, React.createElement("div", { className: "diss-view-subgroup-grid" }, ${anatomy}, !d.quizMode && ${inspection}, !d.quizMode && ${scene}, !d.quizMode && ${reference}))`;
let next=before;const edits=[];function edit(name,old,replacement){if(next.split(old).length!==2)throw Error('Unique edit '+name);next=next.replace(old,replacement);edits.push({name,before:old,after:replacement});}
edit('Partition specimen controls without changing native order, visibility or handlers',before.slice(section.start,section.end),nextSection);
// Keep native controls readable at the same text sizes and focus treatment as Lab and Study.
const css=`/* Clarify presentation, local inspection, scene cues and saved-frame comparison. */
#diss-view-tools .diss-view-subgroup-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: .75rem; }
#diss-view-tools .diss-view-subgroup { min-width: 0; padding: .75rem; border: 1px solid #c3d5dd; border-radius: .7rem; background: #f8fbfc; }
#diss-view-tools .diss-view-subgroup__title { margin: 0 0 .5rem; color: #173f4c; font-size: 1rem; font-weight: 850; line-height: 1.4; }
#diss-view-tools .diss-view-help { margin: 0 0 .7rem; color: #334155; font-size: .875rem; line-height: 1.55; overflow-wrap: anywhere; }
#diss-view-tools .diss-view-help--after { margin: .7rem 0 0; }
#diss-view-tools .diss-view-subgroup .diss-view-control-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
[data-dissection-root] #diss-view-tools .diss-view-control-grid button { font-size: 1rem !important; overflow-wrap: anywhere; }
[data-dissection-root] #diss-view-tools .diss-view-control-grid button[aria-pressed="true"] { border: 3px solid #0f766e; box-shadow: none; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .2em; }
[data-dissection-root] #diss-view-tools .diss-view-control-grid button:focus-visible { outline: 3px solid #1766d2; outline-offset: -5px; box-shadow: none; }
[data-dissection-root] #diss-view-tools .diss-view-control-grid button:disabled { border-style: dashed; }
#diss-view-tools .diss-light-intensity :is(span, output) { font-size: 1rem; }
#diss-view-tools .diss-light-intensity input { min-height: 3rem; }
#diss-view-tools .diss-light-intensity input:focus-visible { outline: 3px solid #1766d2; outline-offset: -3px; }
[data-dissection-root][data-text-size="large"] #diss-view-tools :is(button, .diss-view-group__title, .diss-view-subgroup__title, .diss-view-help, .diss-light-intensity span, .diss-light-intensity output) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] #diss-view-tools :is(.diss-view-subgroup, .diss-view-subgroup__title, .diss-view-help) { border-color: #111827; background: #fff; color: #000; }
[data-dissection-root][data-high-contrast="true"] #diss-view-tools .diss-view-control-grid button[aria-pressed="true"] { border-color: #111827; box-shadow: none; }
@container dissection (max-width: 980px) { #diss-view-tools .diss-view-subgroup-grid { grid-template-columns: minmax(0, 1fr); } }
@container dissection (max-width: 520px) { #diss-view-tools .diss-view-subgroup .diss-view-control-grid { grid-template-columns: minmax(0, 1fr); } }
@media print { [data-dissection-root] #diss-view-tools.diss-view-controls { display: none !important; } }
@media (forced-colors: active) {
  [data-dissection-root] #diss-view-tools :is(.diss-view-subgroup, .diss-view-subgroup__title, .diss-view-help) { border-color: CanvasText !important; background: Canvas !important; color: CanvasText !important; }
  [data-dissection-root] #diss-view-tools .diss-view-control-grid button[aria-pressed="true"] { border: 3px solid Highlight !important; background: Canvas !important; color: CanvasText !important; box-shadow: none; }
  [data-dissection-root] #diss-view-tools .diss-view-control-grid button:disabled { border-style: dashed !important; color: GrayText !important; }
  [data-dissection-root] #diss-view-tools :is(button, .diss-light-intensity input):focus-visible { outline-color: Highlight !important; }
}
`;
edit('Align View typography, selected states, focus, reflow and contrast','.diss-light-intensity { display: grid;',css+'.diss-light-intensity { display: grid;');
for(const e of JSON.parse(fs.readFileSync(path.join(__dirname,'mapping-route-edits.json'),'utf8')).edits)edit(e.id,e.old,e.new);
new vm.Script(next);let inverse=next;for(const e of edits.slice().reverse()){if(inverse.split(e.after).length!==2)throw Error('Inverse uniqueness');inverse=inverse.replace(e.after,e.before);}if(inverse!==before)throw Error('Byte preservation');
fs.writeFileSync(path.join(__dirname,'renderer-next.js'),next);fs.writeFileSync(path.join(report,'edits/renderer-edits.json'),JSON.stringify({beforeSha256:sha(before),afterSha256:sha(next),edits,exactReversal:true,syntax:'passed',nativeControlCount:21},null,2));
fs.copyFileSync(__filename,path.join(report,'edits/prepare-view.cjs'));console.log(JSON.stringify({candidateSha256:sha(next),edits:edits.length,sourceWrites:false}));
