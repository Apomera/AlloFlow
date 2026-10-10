const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-technique-availability-2026-10-09');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.join(report,f)),json=f=>JSON.parse(read(f));
const verification=json('verification.json'),source=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8');
assert.equal(hash(source),verification.sourceSha256);
const sourceLines=source.split(/\r?\n/),gradient=sourceLines.findIndex(s=>s.startsWith('.diss-procedure {')),hint=sourceLines.findIndex(s=>s.startsWith('.diss-equivalent-action__hint {'));
assert(sourceLines[gradient].includes('#f0fdfa')&&sourceLines[gradient].includes('#f8fbff'));assert(sourceLines[hint].includes('#244744'));
const rgb=hex=>hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)),luminance=hex=>rgb(hex).map(c=>c/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[0.2126,0.7152,0.0722][i],0);
const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const audits={};
for(const layout of ['phone','desktop-final','embedded-large','forced-colors']){
 const auditPath='browser-3/captures/'+layout+'-axe.json',metricsPath='browser-3/captures/'+layout+'-metrics.json',audit=json(auditPath),metrics=json(metricsPath);
 assert.equal(audit.violations.length,0);assert.equal(metrics.scroll,metrics.client);
 for(const item of metrics.text){assert.equal(item.scroll,item.client);assert(item.font>=(layout==='embedded-large'?18:16));}
 assert(metrics.text[0].height>=48);assert(metrics.text[2].height>=48);
 for(const rule of audit.incomplete){assert.equal(rule.id,'color-contrast');for(const node of rule.nodes){assert.deepEqual(node.target,['#diss-equivalent-technique-note']);assert(node.any.some(x=>x.data?.messageKey==='bgGradient'));}}
 audits[layout]={auditPath,auditSha256:hash(read(auditPath)),metricsPath,metricsSha256:hash(read(metricsPath)),violations:0,incomplete:audit.incomplete.length,manuallyResolved:audit.incomplete.length,metrics};
}
const accessibility={at:new Date().toISOString(),scope:'.diss-equivalent-action',audits,manualContrastReview:{foreground:'#244744',gradientStops:['#f0fdfa','#f8fbff'],conservativeBackground:'#f0fbfa',method:'Use the minimum of each sRGB channel across both light gradient stops to bound background luminance from below.',ratio:ratio('#244744','#f0fbfa'),requiredRatio:4.5,sourceGradientLine:gradient+1,sourceHintLine:hint+1},visualReview:{screenshots:['after-phone.png','after-desktop-final.png','after-embedded-large.png','after-forced-colors.png','after-explanation-complete.png'],result:'Inspected all five screenshots. Text wraps within the group, the checkpoint route stays visible, focus is clear, and completion wording updates after the explanation.'}};
assert(accessibility.manualContrastReview.ratio>=4.5);
fs.writeFileSync(path.join(report,'accessibility-review.json'),JSON.stringify(accessibility,null,2));
const readme=`# Dissection Lab: clearer technique availability

Completed locally on 2026-10-09. Changes are uncommitted; nothing was staged, pushed, or deployed.

## What changed

- The motor-neutral action now has a visible explanation of its current availability: pending plan or reflection, animation, instrument selection, preparation, readiness, or completion.
- Review plan and Explain result move keyboard focus to the existing learning checkpoint. They preserve the current work and appear only when that checkpoint is available.
- The last technique shows **Final explanation needed** until the learner completes the reflection. Its visible and accessible names agree.
- Guidance uses 16px text, 18px in large-text mode, wrapping layouts, controls at least 48px high, and high-contrast/forced-color styles.

The existing disabled condition and technique action handler are unchanged. Canonical and public source files are identical.

## Verification

| Check | Result |
| --- | --- |
| Focused unit tests | 21 passed: 10 availability cases and 11 action-handoff regressions; 191 unrelated cases excluded by name filter |
| Browser interactions | 4 passed: 320px phone, desktop final reflection, narrow embedded large text/high contrast, and forced colors |
| Before captures | 2 passed on the original source, recorded separately |
| Scoped axe audits | 4 audits, zero violations; two gradient contrast checks resolved manually at a conservative 9.65:1 |
| Preservation | Exact baseline unit bytes and all 324 protected files preserved; source edits reverse to the original archived bytes |
| Repository checks | JavaScript syntax and scoped whitespace checks passed; HEAD and staging unchanged |

Browser checks cover visible guidance, accessible labels, keyboard focus, exact state preservation when opening the checkpoint, native completion after an explanation, text size, control size, and horizontal overflow. These are focused checks, not a full application or assistive-technology audit.

The first unit run exposed missing preexisting metadata in the final-reflection fixture. The fixture now starts with the normal tissue and caution metadata; exact preservation assertions remain intact. The failed run is retained in unit-2. Accepted final runs are browser-3 and unit-4, both pinned to the final source and relevant test hashes. The source also received a reviewed correction aligning the final-reflection accessible name with the visible label before both accepted runs.

## Visual review

### Phone: visible reason and direct checkpoint route

![Phone technique availability](browser-3/captures/after-phone.png)

### Final reflection: honest pending state

![Final explanation needed](browser-3/captures/after-desktop-final.png)

### After the explanation

![Technique complete](browser-3/captures/after-explanation-complete.png)

Large-text and forced-color screenshots, metrics, and raw accessibility reports are in browser-3/captures. All five final screenshots were inspected.

## Evidence

- verification.json records source/test hashes, successful runs, source parity, and preservation checks.
- accessibility-review.json records audit hashes and the manual contrast calculation.
- edits contains reversible source receipts and compressed baseline/final source and test archives. The LF unit-addition archive was normalized to CRLF and prefixed with CRLF for insertion into the existing test file.
- helpers contains the scripts used for this pass. manifest.json hashes this report's files.

Validation used one worker, no retries, and no videos. The normal execution sandbox could not start because of its ACL initialization error; scoped commands ran through approved elevated execution. No dependencies or test configuration were changed.
`;
fs.writeFileSync(path.join(report,'README.md'),readme);
const row=json('edits/handoff-start.json').row,handoffPath=path.join(repo,'AGENT_HANDOFF.md'),handoff=fs.readFileSync(handoffPath,'utf8');
assert.equal(handoff.split(row).length,2);
const completed='- 2026-10-09 | Codex Dissection technique availability COMPLETE LOCALLY; ownership RELEASED: visible equivalent-action reasons, focus-only Review plan / Explain result routes, truthful final-explanation status, responsive large-text/contrast styling. Canonical/public synchronized. Validation: 21 focused unit tests, 4 browser cases, 4 scoped axe audits (zero violations; two gradient checks manually resolved), syntax and scoped diff checks passed; 324 protected files preserved. Evidence: reports/dissection-technique-availability-2026-10-09/README.md. No staging, commit, push or deployment.';
const next=handoff.replace(row,completed);assert.equal(next.replace(completed,row),handoff);
assert.equal(fs.readFileSync(handoffPath,'utf8'),handoff);fs.writeFileSync(handoffPath,next);
fs.writeFileSync(path.join(report,'edits/handoff-complete.json'),JSON.stringify({before:row,after:completed,otherContentPreserved:true},null,2));
const helperDir=path.join(report,'helpers');fs.mkdirSync(helperDir,{recursive:true});
for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.cjs')))fs.copyFileSync(path.join(__dirname,name),path.join(helperDir,name));
const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true}).trim(),baseline=json('baseline.json');
assert.equal(git(['rev-parse','HEAD']),baseline.head);assert.equal(git(['diff','--cached','--name-status']),baseline.staged);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const manifest=Object.fromEntries(walk(report).filter(f=>path.basename(f)!=='manifest.json').map(f=>[path.relative(report,f).replaceAll('\\','/'),hash(fs.readFileSync(f))]));
fs.writeFileSync(path.join(report,'manifest.json'),JSON.stringify({at:new Date().toISOString(),files:manifest},null,2));
console.log(JSON.stringify({readme:path.join(report,'README.md'),reportFiles:Object.keys(manifest).length,availability:'complete locally',contrast:accessibility.manualContrastReview.ratio,headUnchanged:true,stagingUnchanged:true}));
