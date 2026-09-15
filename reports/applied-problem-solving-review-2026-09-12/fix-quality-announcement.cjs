const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
let source=read('applied_challenge_source.jsx');
source=source.replace('  }, [qualityScope, qualityAi]);', '  }, [qualityScope]);');
source=source.replace('  const sourceReview = appliedChallengeSourceReview(data);', '  const sourceReview = appliedChallengeSourceReview({ ...data, sourceExcerpt: opts.sourceExcerpt || data.sourceExcerpt });');
fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),source);
let test=read('tests/applied_challenge_interaction.test.js');
test=test.replace('callGemini: options.callGemini || null,','callGemini: options.recreateProvider && options.callGemini ? (...args) => options.callGemini(...args) : options.callGemini || null,');
test=test.replace('await renderChallenge({teacher:true,data:value,callGemini});','await renderChallenge({teacher:true,data:value,callGemini,recreateProvider:true});');
test=test.replace("expect(latest.data.qualityReview.checks.lessonUse.status).toBe('revise');", "expect(host.textContent).toContain('Task review saved.');expect(latest.data.qualityReview.checks.lessonUse.status).toBe('revise');");
fs.writeFileSync(path.join(root,'tests/applied_challenge_interaction.test.js'),test);
let pure=read('tests/applied_challenge_pass3.test.js');pure+=`
it('compares source quotations against the actual excerpt supplied for feedback',()=>{
 const value=task();value.brief.factSources[0].sourceQuote='A different supplied excerpt.';
 const result=H.appliedChallengeFeedbackContext(value,{sourceExcerpt:'A different supplied excerpt.'});
 expect(result.context.lessonBoundary.facts[0].quoteMatch).toBe('found');
 expect(result.context.lessonSourceExcerpt).toBe('A different supplied excerpt.');
});
`;fs.writeFileSync(path.join(root,'tests/applied_challenge_pass3.test.js'),pure);
console.log('Kept the quality-review announcement stable across provider rerenders and aligned quote matching with the supplied feedback source.');
