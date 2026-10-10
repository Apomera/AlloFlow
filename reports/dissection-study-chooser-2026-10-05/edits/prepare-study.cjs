const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm'),{execFileSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-study-chooser-2026-10-05');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceFile='stem_lab/stem_tool_dissection.js',mirrorFile='desktop/web-app/public/stem_lab/stem_tool_dissection.js';
const before=fs.readFileSync(path.join(repo,sourceFile),'utf8');
if(sha(before)!=='e7fb104c826f70b0af9478fab307cc8015bf7e42813749d3ec74f6b1254110b1'||before!==fs.readFileSync(path.join(repo,mirrorFile),'utf8'))throw Error('Renderer guard');
if(fs.existsSync(report))throw Error('Report already exists');
fs.mkdirSync(path.join(report,'edits'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'renderer-baseline.js'),before);
fs.writeFileSync(path.join(report,'edits/renderer-baseline.js.gz'),zlib.gzipSync(before));
const protectedFiles=['tests/dissection_canvas_loop.test.js','tests/dissection_workspace_bands.test.js','tests/e2e/dissection-tools-cohesion.spec.ts','tests/e2e/dissection-capture-clarity.spec.ts','tests/e2e/dissection-evidence-gallery.spec.ts','tests/e2e/dissection-reference-workbench.spec.ts'];
const workspace={startedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),stagedPaths:execFileSync('git',['diff','--cached','--name-only'],{cwd:repo,encoding:'utf8'}),statusBefore:execFileSync('git',['status','--porcelain=v1','-uno'],{cwd:repo,encoding:'utf8'}),unitBeforeSha256:sha(fs.readFileSync(path.join(repo,'tests/dissection_lab_improvements.test.js'))),unchanged:Object.fromEntries(protectedFiles.map(f=>[f,sha(fs.readFileSync(path.join(repo,f)))]))};
fs.writeFileSync(path.join(report,'workspace-before.json'),JSON.stringify(workspace,null,2));
const handoffFile=path.join(repo,'AGENT_HANDOFF.md'),handoff=fs.readFileSync(handoffFile,'utf8'),marker='## Work Log';
if(handoff.split(marker).length!==2)throw Error('Handoff marker');
const row='- 2026-10-05 | Codex Dissection study chooser IN PROGRESS: root owns canonical/public stem_lab/stem_tool_dissection.js, focused lab unit/new study chooser browser fixture, and reports/dissection-study-chooser-2026-10-05. Make reference activities and timed identification clear, show native readiness and remaining time, preserve native modes/focus/assessment guards and all prior work. No staging, commit, push or deployment.';
const handoffNext=handoff.replace(marker,marker+'\n\n'+row);if(fs.readFileSync(handoffFile,'utf8')!==handoff)throw Error('Concurrent handoff edit');fs.writeFileSync(handoffFile,handoffNext);fs.writeFileSync(path.join(report,'edits/handoff-start.json'),JSON.stringify({beforeSha256:sha(handoff),afterSha256:sha(handoffNext),row,otherContentPreserved:handoffNext.replace(marker+'\n\n'+row,marker)===handoff},null,2));
const parser=require(path.join(repo,'node_modules/@babel/parser'));let panel;function walk(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.arguments?.[1]?.type==='ObjectExpression'&&n.arguments[1].properties.some(p=>p.key?.name==='id'&&p.value?.value==='diss-study-tools')){if(panel)throw Error('Duplicate panel');panel=n;}for(const[k,v]of Object.entries(n)){if(k==='loc')continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}walk(parser.parse(before));
if(!panel||panel.arguments.length!==7)throw Error('Study panel shape');const a=panel.arguments.map(n=>before.slice(n.start,n.end));
function replaceOne(s,old,next){if(s.split(old).length!==2)throw Error('Nonunique child edit');return s.replace(old,next);}
const flash=replaceOne(replaceOne(a[3],'"aria-pressed": !!d.flashcardMode,','"aria-describedby": "diss-study-flashcard-help", "aria-pressed": !!d.flashcardMode,'),"'\\uD83C\\uDCCF ' + 'Flashcard'","'Flashcard'");
const compare=replaceOne(replaceOne(a[4],'"aria-pressed": !!d.compareMode,','"aria-describedby": "diss-study-compare-help", "aria-pressed": !!d.compareMode,'),"'\\uD83D\\uDD0D ' + 'Compare'","'Compare'");
const eyeNode=panel.arguments[2].right;if(eyeNode.type!=='CallExpression')throw Error('Eye condition shape');
const eye=replaceOne(before.slice(eyeNode.start,eyeNode.end),'"aria-pressed": !!d.eyeStudyMode,','"aria-describedby": "diss-study-eye-help", "aria-pressed": !!d.eyeStudyMode,');
function activity(key,button,id,copy){return `React.createElement("div", { className: "diss-study-activity", "data-study-activity": "${key}" }, ${button}, React.createElement("p", { id: "${id}" }, ${copy}))`;}
const eyeActivity=before.slice(panel.arguments[2].start,eyeNode.start)+activity('eye',eye,'diss-study-eye-help',"'Explore the eye schematic from different viewpoints.'");
const flashActivity=activity('flashcards',flash,'diss-study-flashcard-help',"'Recall functions, reveal the reference answer, and mark cards to review.'");
const compareActivity=activity('compare',compare,'diss-study-compare-help',"sel ? 'Compare ' + sel.name + ' across reference specimens.' : 'Choose a structure on the specimen to compare it across reference specimens.'");
let practical=replaceOne(a[5],'"aria-describedby": d.practicalMode ? "diss-practical-time-status" : undefined,','"aria-describedby": "diss-practical-study-help diss-practical-readiness" + (d.practicalMode ? " diss-practical-time-status" : ""),');
practical=replaceOne(practical,"d.practicalMode ? '\\u23F0 ' + formatScenarioTime(d.practicalTimer || 0) : '\\u23F1 Practical'","d.practicalMode ? 'End timed practical' : 'Start 2-minute timed practical'");
const timer=replaceOne(a[6],'className: "sr-only", role: "timer"','className: "diss-study-time", role: "timer"');
const nextPanel=`React.createElement(${a[0]}, ${a[1]},
              React.createElement("section", { className: "diss-study-tool-group", "data-study-tools-group": "practice", role: "group", "aria-labelledby": "diss-study-practice-heading" },
                React.createElement("h4", { id: "diss-study-practice-heading", className: "diss-study-tool-heading" }, 'Review and compare'),
                React.createElement("p", { className: "diss-study-tool-intro" }, 'Untimed activities for recall and reference study.'),
                React.createElement("div", { className: "diss-study-activity-grid" }, ${eyeActivity}, ${flashActivity}, ${compareActivity})
              ),
              React.createElement("section", { className: "diss-study-tool-group diss-advanced-only", "data-study-tools-group": "practical", role: "group", "aria-labelledby": "diss-study-practical-heading" },
                React.createElement("h4", { id: "diss-study-practical-heading", className: "diss-study-tool-heading" }, 'Timed identification'),
                React.createElement("p", { id: "diss-practical-study-help", className: "diss-study-tool-intro" }, 'Two-minute identification check. Labels and reference aids are hidden while it runs.'),
                React.createElement("p", { id: "diss-practical-readiness", className: "diss-study-readiness", role: "status", "aria-live": "polite", "aria-atomic": "true", "data-practical-ready": studyPracticalReady }, d.practicalMode ? 'The timed practical is active. End it to return to reference study.' : (d._incisionAnim && d._incisionAnim.active ? 'Finish the current layer transition before starting.' : (studyPracticalReady ? visibleQuizPool.length + ' visible structures available. Starts a new timed identification attempt.' : 'Needs at least two visible structures. Improve the field or change view.'))),
                ${practical},
                ${timer}
              )
            )`;
let next=before;const edits=[];function edit(name,old,replacement){if(next.split(old).length!==2)throw Error('Edit context '+name);next=next.replace(old,replacement);edits.push({name,before:old,after:replacement});}
edit('Explain native Study activities and expose timed identification state',before.slice(panel.start,panel.end),nextPanel);
edit('Derive readiness from native practical guard','          var studyRoute =','          var studyPracticalReady = visibleQuizPool.length >= 2 && !(d._incisionAnim && d._incisionAnim.active);\n          var studyRoute =');
const markerCss='/* Organize display settings into readable groups with visible toggle states. */';
const css=`/* Explain Study activities and separate untimed reference work from timed identification. */
[data-dissection-root] #diss-study-tools { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; }
#diss-study-tools .diss-study-tool-group { min-width: 0; padding: .8rem; border: 1px solid #c9b894; border-radius: .85rem; background: #fff; }
#diss-study-tools [data-study-tools-group="practice"] { grid-column: span 2; }
#diss-study-tools .diss-study-tool-heading { margin: 0 0 .7rem; padding-bottom: .6rem; border-bottom: 1px solid #e0d4bd; color: #78350f; font-size: 1rem; font-weight: 850; line-height: 1.4; }
#diss-study-tools .diss-study-tool-intro, #diss-study-tools .diss-study-activity p { margin: 0 0 .75rem; color: #334155; font-size: .875rem; line-height: 1.55; overflow-wrap: anywhere; }
#diss-study-tools .diss-study-activity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: .65rem; }
#diss-study-tools .diss-study-activity { min-width: 0; padding: .65rem; border: 1px solid #d7c6a7; border-radius: .7rem; background: #fffcf5; }
#diss-study-tools .diss-study-activity p { margin: .65rem 0 0; }
#diss-study-tools [data-study-activity="eye"] { grid-column: 1 / -1; }
[data-dissection-root] #diss-study-tools button { font-size: 1rem !important; }
[data-dissection-root] #diss-study-tools button:is([aria-pressed="true"], [aria-expanded="true"]) { border: 3px solid #92400e; background: #fff4d6; color: #78350f; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .2em; }
[data-dissection-root] #diss-study-tools button:hover:not(:disabled) { background: #fff4d6; border-color: #92400e; }
[data-dissection-root] #diss-study-tools button:disabled { opacity: 1; border-style: dashed; background: #f1f5f9; color: #475569; cursor: not-allowed; }
#diss-study-tools .diss-study-readiness { margin: 0 0 .75rem; padding: .65rem; border: 1px solid #b88745; border-radius: .6rem; background: #fff9ed; color: #78350f; font-size: .875rem; line-height: 1.55; overflow-wrap: anywhere; }
#diss-study-tools .diss-study-readiness[data-practical-ready="false"] { border-style: dashed; }
#diss-study-tools .diss-study-time { display: block; margin-top: .75rem; padding: .65rem; border: 2px solid #92400e; border-radius: .6rem; background: #fff4d6; color: #78350f; font-size: 1rem; font-weight: 800; line-height: 1.5; overflow-wrap: anywhere; }
[data-dissection-root][data-text-size="large"] #diss-study-tools :is(button, .diss-study-tool-heading, .diss-study-tool-intro, .diss-study-activity p, .diss-study-readiness, .diss-study-time) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] #diss-study-tools :is(.diss-study-tool-group, .diss-study-activity, .diss-study-readiness, .diss-study-time) { border-color: #111827; background: #fff; color: #000; }
[data-dissection-root][data-high-contrast="true"] #diss-study-tools :is(.diss-study-tool-heading, .diss-study-tool-intro, .diss-study-activity p) { color: #000; border-color: #111827; }
[data-dissection-root][data-workspace-mode="essentials"] #diss-study-tools { grid-template-columns: minmax(0, 1fr); }
[data-dissection-root][data-workspace-mode="essentials"] #diss-study-tools [data-study-tools-group="practice"] { grid-column: auto; }
@container dissection (max-width: 980px) { [data-dissection-root] #diss-study-tools { grid-template-columns: repeat(2, minmax(0, 1fr)); } #diss-study-tools [data-study-tools-group="practice"] { grid-column: auto; } }
@container dissection (max-width: 520px) { [data-dissection-root] #diss-study-tools { grid-template-columns: minmax(0, 1fr); } #diss-study-tools .diss-study-activity-grid { grid-template-columns: minmax(0, 1fr); } }
@media (forced-colors: active) {
  [data-dissection-root] #diss-study-tools :is(.diss-study-tool-group, .diss-study-activity, .diss-study-readiness, .diss-study-time) { border-color: CanvasText !important; background: Canvas !important; color: CanvasText !important; }
  [data-dissection-root] #diss-study-tools :is(.diss-study-tool-heading, .diss-study-tool-intro, .diss-study-activity p) { color: CanvasText !important; border-color: CanvasText !important; }
  [data-dissection-root] #diss-study-tools button:is([aria-pressed="true"], [aria-expanded="true"]) { border: 3px solid Highlight !important; }
  [data-dissection-root] #diss-study-tools button:disabled { color: GrayText !important; border-style: dashed !important; }
}
`;
edit('Style Study groups, purpose cues, native selection and timer',markerCss,css+markerCss);
new vm.Script(next);let inverse=next;for(const e of edits.slice().reverse()){if(inverse.split(e.after).length!==2)throw Error('Inverse uniqueness');inverse=inverse.replace(e.after,e.before);}if(inverse!==before)throw Error('Source byte preservation');
fs.writeFileSync(path.join(__dirname,'renderer-next.js'),next);fs.writeFileSync(path.join(report,'edits/renderer-edits.json'),JSON.stringify({beforeSha256:sha(before),afterSha256:sha(next),edits,exactReversal:true,syntax:'passed'},null,2));
fs.copyFileSync(__filename,path.join(report,'edits/prepare-study.cjs'));
console.log(JSON.stringify({candidateSha256:sha(next),edits:edits.length,syntax:'passed',sourceWrites:false,report}));
