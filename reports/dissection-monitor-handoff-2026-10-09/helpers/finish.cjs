const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-monitor-handoff-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),json=f=>JSON.parse(fs.readFileSync(path.join(report,f)));
const verified=json('verification.json'),source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8');assert.equal(hash(source),verified.sourceSha256);
const rgb=h=>h.match(/[a-f\d]{2}/gi).map(c=>parseInt(c,16)),lum=c=>c.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0),contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const stops=['#f0f9ff','#f8fbff','#ecfeff'];assert(stops.every(c=>source.includes(c)));assert(source.includes('color: #164e63'));assert(source.includes('opacity: .78'));
const foreground=rgb('#164e63'),minimum=rgb('#ecf9ff'),maximum=rgb('#f8feff'),brightestPriority=foreground.map((c,i)=>.78*c+.22*maximum[i]);
const accessibility={at:new Date().toISOString(),scope:'.diss-stage__telemetry-foot',auditResults:Object.fromEntries(Object.entries(verified.audits).map(([k,v])=>[k,{file:v.auditFile,sha256:v.auditSha256,violations:v.violations,incompleteRules:v.incomplete.length,manuallyResolvedNodes:v.incomplete.reduce((sum,r)=>sum+r.nodes.length,0)}])),manualContrastReview:{foreground:'#164e63',gradientStops:stops,minimumBackground:'#ecf9ff',maximumBackground:'#f8feff',actionOpacity:1,priorityOpacity:.78,conservativeActionRatio:contrast(foreground,minimum),conservativePriorityRatio:contrast(brightestPriority,minimum),requiredRatio:4.5,method:'Bound the background by per-channel gradient minima and maxima. Compare the minimum background luminance with the fully opaque text and with the brightest possible priority text after alpha compositing against the maximum background. This gives conservative bounds across the gradient.'},visualReview:{result:'Inspected phone, desktop, embedded large-text/high-contrast, forced-color, final-completion and normal-preparation captures. Status text wraps within the available width; keyboard focus is visible; pending and completed wording agree across the views.'}};
assert(accessibility.manualContrastReview.conservativeActionRatio>=4.5);assert(accessibility.manualContrastReview.conservativePriorityRatio>=4.5);
for(const audit of Object.values(verified.audits))for(const rule of audit.incomplete){assert.equal(rule.id,'color-contrast');for(const n of rule.nodes){assert(['.diss-stage__telemetry-action','.diss-stage__telemetry-priority'].includes(n.target[0]));assert(n.any.some(c=>c.data?.messageKey==='bgGradient'));}}
fs.writeFileSync(path.join(report,'accessibility-review.json'),JSON.stringify(accessibility,null,2));
const readme=`# Dissection Lab: consistent monitor and technique guidance

Completed locally on 2026-10-09. Changes remain uncommitted; nothing was staged, pushed, or deployed.

## Improvements

- The Field monitor offers **Review plan** or **Explain result** when that learning checkpoint is required. Keyboard activation focuses the checkpoint heading and preserves the entire saved state.
- **Prepare next** keeps the existing preparation behavior. It opens the instrument tray and focuses the required instrument without selecting or performing it automatically.
- Completed techniques, revealed layers and running animations have accurate disabled labels. The procedure action is absent in Guided, quiz, practical and study modes, where its checkpoint is unavailable.
- Simple steps, the technique summary and heading now agree on whether a plan, an explanation or an action is next. Final completion appears after the explanation.
- The physical progress strip is named **actions performed**, so it does not imply that the learning checks are finished.
- The monitor button, summary, heading and Simple steps cue use 16px text, or 18px in large-text mode. The button is at least 48px high; narrow layouts wrap the summary; contrast modes and keyboard focus remain clear.

The shared preparation handler and physical action gates are unchanged. Canonical and public runtime copies are identical.

## Validation

| Check | Result |
| --- | --- |
| Focused unit tests | 21 passed: 10 new monitor cases, 10 availability regressions and one existing instrument rendering case; 201 unrelated cases excluded by name filter |
| Browser scenarios | 5 passed: phone planning, desktop final reflection, narrow embedded large text/high contrast, forced colors, and native preparation |
| Before captures | 2 passed on the original source, recorded separately |
| Scoped axe audits | Four audits with zero violations; three gradient checks covering six existing text nodes resolved manually |
| Contrast bounds | Response text at least 8.49:1; priority text at least 4.72:1 including its existing opacity |
| Preservation | All 391 protected files unchanged; eight source edits and the focused test edits reverse exactly to their archived baselines |
| Repository checks | JavaScript syntax and scoped whitespace checks passed; HEAD and staging unchanged |

Browser tests verify keyboard navigation, whole-state preservation for checkpoint routes, final native explanation, preparation without automatic tool selection, 16px/18px text, 48px controls, visible focus and horizontal overflow. Unit cases also cover revealed layers, animation guards and the four alternate modes. These focused checks do not represent a full application or screen-reader audit.

The first browser run checked programmatic focus after a pointer click, which did not activate the browser's keyboard focus indicator. The fixture now tabs from the monitor summary to its action and retains the same solid 3px outline assertion. The failed browser-3 run is retained; accepted final runs are **unit-2** and **browser-4**, both pinned to the final source and relevant fixture hashes. Two independent source reviews also corrected past-tense step naming and a large-text CSS specificity conflict before those runs.

The earlier attempt was blocked by a full system drive before application edits. Work resumed after storage recovered. The original blocker record is retained. No temporary-file cleanup, dependency changes or configuration changes were needed. The normal sandbox failed to initialize its ACLs, so scoped commands used approved execution outside that sandbox.

## Visual review

### Phone: the monitor points to the pending plan

![Phone monitor action](browser-4/captures/after-phone-monitor.png)

![Phone technique summary](browser-4/captures/after-phone-summary.png)

### Final reflection: completion waits for the explanation

![Pending final reflection](browser-4/captures/after-desktop-final-summary.png)

![Completed explanation](browser-4/captures/after-final-explanation-summary.png)

Large-text, forced-color, heading, Simple steps and preparation captures are in browser-4/captures. Layout metrics and raw accessibility results accompany them.

## Evidence

- verification.json records final hashes, passing run counts, source parity and preservation checks.
- accessibility-review.json records raw audit hashes and the contrast calculations.
- edits contains reversible receipts and compressed baseline/final source and test archives. The test addition uses the existing CRLF newline convention.
- helpers preserves this pass's scripts; manifest.json hashes the report files.
`;
fs.writeFileSync(path.join(report,'README.md'),readme);
const handoffPath=path.join(repo,'AGENT_HANDOFF.md'),handoff=fs.readFileSync(handoffPath,'utf8'),row=json('edits/handoff-resume.json').row;assert.equal(handoff.split(row).length,2);
const done='- 2026-10-09 | Codex Dissection monitor handoff COMPLETE LOCALLY; ownership RELEASED. Monitor checkpoint routes, Simple steps and technique headings now follow the learning phase; physical progress named actions performed. Readable 16/18px guidance and 48px monitor control. Canonical/public synchronized. 21 focused unit tests and 5 browser cases pass; four scoped axe audits report zero violations with gradient checks manually resolved. 391 protected files and shared HEAD/index unchanged. Report: reports/dissection-monitor-handoff-2026-10-09/README.md. No staging, commit, push or deployment.';
const next=handoff.replace(row,done);assert.equal(next.replace(done,row),handoff);assert.equal(fs.readFileSync(handoffPath,'utf8'),handoff);fs.writeFileSync(handoffPath,next);fs.writeFileSync(path.join(report,'edits/handoff-complete.json'),JSON.stringify({before:row,after:done,otherContentPreserved:true},null,2));
const helpers=path.join(report,'helpers');fs.mkdirSync(helpers,{recursive:true});for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.cjs')))fs.copyFileSync(path.join(__dirname,name),path.join(helpers,name));
const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true}).trim(),resume=json('resume.json');assert.equal(git(['rev-parse','HEAD']),resume.head);assert.equal(git(['diff','--cached','--name-status']),resume.staged);
for(const [f,h] of Object.entries(verified.runs['unit-2'].inputHashes))assert.equal(hash(fs.readFileSync(path.join(repo,f))),h);for(const [f,h] of Object.entries(verified.runs['browser-4'].inputHashes))assert.equal(hash(fs.readFileSync(path.join(repo,f))),h);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]),files=Object.fromEntries(walk(report).filter(f=>path.basename(f)!=='manifest.json').map(f=>[path.relative(report,f).replaceAll('\\','/'),hash(fs.readFileSync(f))]));fs.writeFileSync(path.join(report,'manifest.json'),JSON.stringify({at:new Date().toISOString(),files},null,2));
console.log(JSON.stringify({readme:path.join(report,'README.md'),reportFiles:Object.keys(files).length,contrast:accessibility.manualContrastReview,headAndIndexUnchanged:true}));
