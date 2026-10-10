const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-checkpoint-coaching-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),json=f=>JSON.parse(fs.readFileSync(path.join(report,f)));
const verified=json('verification.json');
const auditSummary={at:new Date().toISOString(),scope:'.diss-learning-check__options',layouts:{},visualReview:{screenshots:['after-phone-choices.png','after-desktop-choices.png','after-embedded-large-coaching.png','after-forced-colors-guided-coaching.png'],result:'Inspected all four layouts. Coaching sits directly below the selected answer, stays outside its accessible name, wraps within the card, and retains clear focus/selection styling.'}};
for(const [name,a] of Object.entries(verified.audits)){
 assert.equal(a.violations,0);assert.equal(a.incomplete.length,0);assert.equal(hash(fs.readFileSync(path.join(report,a.auditFile))),a.auditSha256);assert.equal(hash(fs.readFileSync(path.join(report,a.metricsFile))),a.metricsSha256);
 const m=a.metrics;assert.equal(m.client,m.scroll);for(const c of m.choices){assert(c.height>=64);assert.equal(c.client,c.scroll);}for(const t of m.text){assert(t.font>=(name==='embedded-large'?18:16));assert.equal(t.client,t.scroll);}
 auditSummary.layouts[name]={auditFile:a.auditFile,auditSha256:a.auditSha256,violations:0,incomplete:0,metricsFile:a.metricsFile,metricsSha256:a.metricsSha256,minimumControlHeight:Math.min(...m.choices.map(c=>c.height)),minimumTextSize:Math.min(...m.text.map(t=>t.font)),horizontalOverflow:false};
}
fs.writeFileSync(path.join(report,'accessibility-review.json'),JSON.stringify(auditSummary,null,2));
const readme=`# Dissection Lab: coaching beside the selected answer

Completed locally on October 9, 2026. Everything remains uncommitted; nothing was staged, pushed or deployed.

## Improvements

- Incorrect-answer coaching now appears directly below the selected answer in planning, reflection and Guided observation checkpoints. Learners can read the explanation without searching below the remaining choices.
- **Try another choice** introduces the existing coaching. Selecting another answer moves the coaching to that answer, with one feedback message on screen.
- Answers and feedback use 16px text, or 18px with large text. Cards wrap at narrow widths and retain high-contrast and forced-color support.
- Answer names remain unchanged for assistive technology. The selected answer is described by its coaching; the paragraph is outside the button.
- Confirmed-plan feedback remains in the preparation phase. Saved feedback with a missing or obsolete choice remains available below the choices; blank or non-text saved messages create no dangling description references.

The existing answer checking, attempt tracking, Guided advancement, announcements and keyboard handlers are unchanged. Stable choice wrappers preserve focus when feedback appears or moves.

## Validation

| Check | Result |
| --- | --- |
| Focused unit tests | 30 passed: 10 new coaching cases plus 20 monitor and availability regressions; 202 unrelated cases excluded by name filter |
| New browser scenarios | Four passed: phone planning, desktop reflection, narrow embedded large text/high contrast, and forced-color Guided observation |
| Existing browser regressions | Two passed: checkpoint keyboard/coaching confirmation and Guided observation keyboard confirmation |
| Before capture | One phone scenario captured on the original source |
| Accessibility | Four primary scoped axe audits: zero violations and zero incomplete checks |
| Layout | Text at least 16px/18px; buttons at least 64px; no measured horizontal overflow |
| Preservation | All 507 protected files unchanged; source edits and the appended unit tests reverse exactly to their archived baselines |
| Repository checks | JavaScript syntax, runtime parity and scoped whitespace checks passed; HEAD and staging unchanged |

The browser scenarios verify original answer names, descriptions, unique feedback IDs, placement beneath the selected answer, Tab/arrow navigation, unchanged state when browsing, two incorrect attempts, and native correct-answer transitions. Physical specimen work, observations and scoring remain preserved except for the explicitly checked learning or Guided-identification updates. These are focused checks, not a full application or screen-reader audit.

Accepted final runs are **unit-3**, **browser-4**, and **adjacent-5**, with stable source and relevant fixture hashes. The initial unit-2 process stopped with a memory-allocation error before producing test results. It is retained and excluded from pass totals. The same unit checks passed after resources recovered. All test jobs used one worker, no retries, and no video recording.

## Visual review

### Phone: coaching stays with the selected answer

![Inline coaching on a phone](browser-4/captures/after-phone-choices.png)

### Desktop: explanation belongs to its answer card

![Inline reflection coaching](browser-4/captures/after-desktop-choices.png)

### Large text and high contrast

![Readable large-text coaching](browser-4/captures/after-embedded-large-coaching.png)

Forced-color and moved-feedback captures are in browser-4/captures. Before screenshots are in before-1/captures; existing keyboard regression evidence is in adjacent-5/captures.

## Evidence

- verification.json records final hashes, source parity, exact edit reversal and passing test runs.
- accessibility-review.json records the four raw audit hashes, typography and geometry checks.
- edits contains reversible source receipts and compressed baseline/final source and test archives. The test addition preserves the original CRLF convention.
- helpers preserves the scripts for this pass; manifest.json hashes the report files.

No dependencies or test configuration were changed. The normal sandbox could not initialize its ACLs, so scoped commands used approved execution outside that sandbox. No cleanup, commit, push or deployment was performed.
`;
fs.writeFileSync(path.join(report,'README.md'),readme);
const handoffPath=path.join(repo,'AGENT_HANDOFF.md'),before=fs.readFileSync(handoffPath,'utf8'),row=json('edits/handoff-start.json').row;assert.equal(before.split(row).length,2);
const done='- 2026-10-09 | Codex Dissection checkpoint coaching COMPLETE LOCALLY; ownership RELEASED. Selected answers now carry adjacent retry coaching; original accessible answer names, keyboard flow, grading and saved feedback preserved. Readable 16/18px answers and guidance across narrow/contrast layouts. Canonical/public synchronized. 30 focused unit tests and six browser scenarios pass; four primary scoped axe audits have zero violations/incompletes. 507 protected files and shared HEAD/index unchanged. Report: reports/dissection-checkpoint-coaching-2026-10-09/README.md records the initial memory interruption. No staging, commit, push or deployment.';
const next=before.replace(row,done);assert.equal(next.replace(done,row),before);assert.equal(fs.readFileSync(handoffPath,'utf8'),before);fs.writeFileSync(handoffPath,next);fs.writeFileSync(path.join(report,'edits/handoff-complete.json'),JSON.stringify({before:row,after:done,otherContentPreserved:true},null,2));
const helpers=path.join(report,'helpers');fs.mkdirSync(helpers,{recursive:true});for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.cjs')))fs.copyFileSync(path.join(__dirname,name),path.join(helpers,name));
for(const name of ['unit-3','browser-4','adjacent-5'])for(const [f,pin] of Object.entries(verified.runs[name].inputHashes))assert.equal(hash(fs.readFileSync(path.join(repo,f))),pin);
const baseline=json('baseline.json'),git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',windowsHide:true}).trim();assert.equal(git(['rev-parse','HEAD']),baseline.head);assert.equal(git(['diff','--cached','--name-status']),baseline.staged);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]),files=Object.fromEntries(walk(report).filter(f=>path.basename(f)!=='manifest.json').map(f=>[path.relative(report,f).replaceAll('\\','/'),hash(fs.readFileSync(f))]));fs.writeFileSync(path.join(report,'manifest.json'),JSON.stringify({at:new Date().toISOString(),files},null,2));console.log(JSON.stringify({readme:path.join(report,'README.md'),files:Object.keys(files).length,unit:30,browser:6,axeAudits:4,headAndIndexUnchanged:true}));
