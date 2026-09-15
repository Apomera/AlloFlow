const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const tests=JSON.parse(fs.readFileSync(path.join(__dirname,'pass2-tests.json'),'utf8'));
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'pass2-browser-results.json'),'utf8'));
assert.equal(tests.numFailedTests,0);assert.equal(tests.numPassedTests,90);assert.deepEqual(browser.errors,[]);
const mirrors=['applied_challenge_module.js','ui_strings.js'];
for(const file of mirrors)assert(fs.readFileSync(file).equals(fs.readFileSync(path.join('desktop/web-app/public',file))),file+' mirror');
const before={1280:829,390:1160,320:1379};
const rows=browser.layouts.map(row=>'| '+row.viewport+'px | '+before[row.viewport]+'px | '+Math.round(row.firstFieldTop)+'px | '+row.width+'px |').join('\n');
const note=[
'# Applied Problem Solving: second refinement pass',
'',
'Implemented locally on September 12, 2026. This extends the [first implementation](IMPLEMENTATION.md).',
'',
'## Improvements',
'',
'- **A more useful final review.** Learners can review writing, linked work, evidence connections, detailed-check summaries, criteria notes, and saved AI feedback together. A checklist shows which parts have recorded content; it explicitly does not grade that content or submit it. Edit controls return to the relevant stage and focus its writing field.',
'- **Linked work is a real response option.** A valid link plus an explanation now qualifies for coaching and counts as a started response section. A bare link does not. AI receives the written explanation and an explicit instruction that it has not inspected the linked artifact; the stored URL is omitted from that coaching context. Existing stale-response guards include edits to the explanation and link.',
'- **Quicker evidence connections.** In Explore, “Connect a lesson idea” links a selected source fact to an empty evidence row and focuses the learner’s claim. It leaves claim and explanation blank. Repeated clicks reuse an untouched row. Edited source facts appear unselected until reconnected, making changed references easier to resolve.',
'- **Tighter mobile navigation.** The five stages share one row, with a wider first button to keep Understand readable. Progress and the all-steps toggle share a row. The smaller phone header reduces scrolling while preserving the challenge context and reading controls.',
'- **Clearer question actions.** Accepting the suggested question focuses the writing field and changes the control to “Question added.” Replacing an existing custom question is labeled explicitly.',
'',
'## Validation',
'',
'90 tests passed across eight focused suites. New cases cover linked-work readiness, coaching boundaries, review coverage, keyboard focus, source reconnection, and preserving student authorship. Existing generation, export, and shared-response protections continue to pass.',
'',
'Chromium checks passed at 1280, 390, and 320 pixels, including the evidence shortcut and a linked-work-only response through coaching, revision, review, and editing. The tested screens had no horizontal overflow, no axe violations, and no browser errors. The response stayed separate from the teacher template. The module compiled and its public copy and English string catalog match the root files.',
'',
'| Viewport | Previous first writing field | Current first writing field | Document width |',
'| --- | --- | --- | --- |',rows,
'',
'These measurements include the authored preview’s shared workspace controls. Real task lengths vary. Automated accessibility checks do not establish conformance.',
'',
'## Preview and evidence',
'',
'Refresh the [component preview](current-preview.html) to load this pass. Its scenario is authored and AI responses are mocked; no deployment or live-provider validation was performed.',
'',
'Screenshots: [phone](pass2-390.png), [small phone](pass2-320.png), [desktop](pass2-1280.png), [response review](pass2-review-390.png).',
'',
'Results: [tests](pass2-tests.json), [browser checks](pass2-browser-results.json).',
''
].join('\n');
fs.writeFileSync(path.join(__dirname,'PASS2.md'),note);
for(const name of ['README.md','IMPLEMENTATION.md']){const p=path.join(__dirname,name);let text=fs.readFileSync(p,'utf8');if(!text.includes('PASS2.md'))text=text.replace(/^(# .*)\r?\n/,'$1\n\nLatest refinement: [second pass and validation](PASS2.md).\n');fs.writeFileSync(p,text);}
fs.writeFileSync(path.join(__dirname,'pass2-build-results.json'),JSON.stringify(Object.fromEntries(mirrors.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),null,2));
console.log('Saved second-pass notes. 90 tests passed; browser checks and public mirrors verified.');
