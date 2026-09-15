const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
let source=read('applied_challenge_source.jsx');source=source.replace('lessonBoundary: { teacherReviewedFacts: data.brief.factVerified,',"lessonBoundary: { teacherReviewedFacts: data.brief.factVerified, factReviewStatus: data.brief.factVerified ? 'Teacher reviewed.' : 'Teacher review pending.',");fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),source);
let live=read('live_aac_source.jsx');live=live.replace("active && key === 'sourceExcerpt'", "active && ['sourceExcerpt', 'qualityReview'].includes(key)");fs.writeFileSync(path.join(root,'live_aac_source.jsx'),live);
let doc=read('doc_pipeline_source.jsx');
doc=doc.replace('strength: str(feedback.strength, 1200), lessonConnectionCheck:', 'coverage: feedback.coverage, strength: str(feedback.strength, 1200), lessonConnectionCheck:');
const anchor='          const fb = m.feedback;';if(!doc.includes(anchor))throw Error('No feedback anchor');
doc=doc.replace(anchor,anchor+String.raw`
          const feedbackCoverageText = (() => {
              if (typeof _acModule?.coverageText === 'function') return _acModule.coverageText(fb?.coverage, t);
              const raw = fb?.coverage;
              if (!raw || raw.version !== 1) return tx('applied_challenge.coverage.unknown', 'The input coverage of this older feedback was not recorded.');
              const limits = { workspaceFields: 11, evidenceRows: 12, validationChecks: 6, selfChecks: 24, shortenedFields: 500 };
              const counts = Object.fromEntries(Object.entries(limits).map(([key, max]) => [key, Math.min(max, Math.max(0, Math.floor(Number(raw[key]) || 0)))]));
              const fillCoverage = text => Object.entries(counts).reduce((result, [key, value]) => result.split('{' + key + '}').join(String(value)), text);
              return fillCoverage(tx('applied_challenge.coverage.counts', 'Included: {workspaceFields} writing sections, {evidenceRows} evidence rows, {validationChecks} saved checks, and {selfChecks} self-ratings.')) + ' ' + (counts.shortenedFields ? fillCoverage(tx('applied_challenge.coverage.shortened', '{shortenedFields} long text fields were shortened for this review. Your saved work is complete.')) : tx('applied_challenge.coverage.complete', 'Text is included in full.'));
          })();`);
doc=doc.replace("pre(typeof _acModule?.coverageText === 'function' ? _acModule.coverageText(fb.coverage, t) : tx('applied_challenge.coverage.unknown', 'The input coverage of this older feedback was not recorded.'))",'pre(feedbackCoverageText)');fs.writeFileSync(path.join(root,'doc_pipeline_source.jsx'),doc);
let boundaryTest=read('tests/studio_response_boundary.test.js');boundaryTest=boundaryTest.replace("const shared={sourceExcerpt:'teacher-only',workspace:{response:'Draft'}};","const shared={sourceExcerpt:'teacher-only',qualityReview:{checks:{lessonUse:{reason:'PRIVATE TASK REVIEW'}}},workspace:{response:'Draft'}};");boundaryTest=boundaryTest.replace("expect(safe.data.child.data.sourceExcerpt).toBeUndefined();","expect(safe.data.child.data.sourceExcerpt).toBeUndefined();\n    expect(safe.data.child.data.qualityReview).toBeUndefined();\n    expect(r.data.child.data.qualityReview.checks.lessonUse.reason).toBe('PRIVATE TASK REVIEW');");fs.writeFileSync(path.join(root,'tests/studio_response_boundary.test.js'),boundaryTest);
let printTest=read('tests/applied_challenge_print_presets.test.js');printTest+=String.raw`
it('retains feedback input coverage in teacher print, full export and the module-free fallback',()=>{
 const item=resource();item.data.feedback.coverage={version:1,workspaceFields:2,evidenceRows:12,validationChecks:6,selfChecks:3,shortenedFields:4};
 expect(AC.renderPreset(item.data,'teacher')).toContain('12 evidence rows');
 expect(render(item)).toContain('4 long text fields were shortened');
 const module=window.AlloModules.AppliedChallenge;
 try{delete window.AlloModules.AppliedChallenge;expect(render(item)).toContain('12 evidence rows');expect(render(item)).toContain('4 long text fields were shortened');}finally{window.AlloModules.AppliedChallenge=module;}
});
`;fs.writeFileSync(path.join(root,'tests/applied_challenge_print_presets.test.js'),printTest);
let fixture=read('reports/applied-problem-solving-review-2026-09-12/build-fixture.cjs');
fixture=fixture.replace("  fs.writeFileSync(path.join(__dirname,'fixture.json'),",`  fixture.data.plan={learningTarget:'Apply infiltration and runoff to compare options.',availableTime:'25 minutes',materials:'Lesson text, paper and pencil; a proposed trial only.'};
  fixture.data.brief.factSources=fixture.data.brief.lockedLessonFacts.map((text,index)=>({text,sourceQuote:['Water infiltrates soil','Deliberately unmatched quotation',''][index],sourceLocation:''}));
  fs.writeFileSync(path.join(__dirname,'fixture.json'),`);
fixture=fixture.replace('window.reviewToasts=[];', 'window.reviewToasts=[]; window.reviewAiPrompts=[];');
fixture=fixture.replace("async(prompt)=>prompt.includes('strength')?",`async(prompt)=>(window.reviewAiPrompts.push(prompt),prompt.includes('Review the quality of an applied')?JSON.stringify({checks:{lessonUse:{status:'supported',reason:'The criteria require two lesson ideas, including infiltration.',nextStep:'Ask learners to explain the connection.'},alternatives:{status:'supported',reason:'The task requires two approaches and a tradeoff.',nextStep:'Keep the choice open.'},feasibility:{status:'revise',reason:'The deliverable could imply a completed trial in 25 minutes.',nextStep:'Clarify that learners plan a small check; no local measurements are required.'}}}):prompt.includes('strength')?`);
fixture=fixture.replace("What observation could change your choice?'}),addToast:","What observation could change your choice?'})),addToast:");
fs.writeFileSync(path.join(root,'reports/applied-problem-solving-review-2026-09-12/build-fixture.cjs'),fixture);
console.log('Finalized source status, export fallback, student-pack privacy and authored preview.');
