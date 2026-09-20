const fs=require('fs');
fs.writeFileSync('desktop/web-app/public/studio_response_module.js',fs.readFileSync('studio_response_module.js','utf8'));
const strings=JSON.parse(fs.readFileSync('ui_strings.js','utf8')),source=fs.readFileSync('applied_challenge_source.jsx','utf8');
const insert=(key,value)=>{const parts=key.split('.');let object=strings;for(const part of parts.slice(0,-1))object=object[part]??=( {} );object[parts.at(-1)]=value;};
const decode=s=>s.replace(/\\'/g,"'").replace(/\\n/g,'\n');
for(const m of source.matchAll(/(?:_apsT\(t,\s*|tx\()'(applied_challenge\.[^']+)',\s*'((?:\\.|[^'\\])*)'/g))insert(m[1],decode(m[2]));
for(const [start,end,prefix] of [['function AppliedChallengeSourceNotebook','const APPLIED_REASONING_PARTS','sources'],['function appliedChallengeSourceConnection','function AppliedChallengeSourceNotebook','sources'],['function AppliedReasoningReferenceEditor','function normalizeAppliedChallengeData','references'],['function appliedChallengeReviewFollowups','function appliedChallengeReviewItems','review_next'],['function AppliedChallengeSourceSearch','function AppliedChallengeView','search']]){
 const text=source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
 for(const m of text.matchAll(/tx\('([^']+)',\s*'((?:\\.|[^'\\])*)'/g))insert('applied_challenge.'+prefix+'.'+m[1],decode(m[2]));
}
insert('applied_challenge.references.sourceNote','Pointed to in my source-check note');
const json=JSON.stringify(strings,null,2)+'\n';fs.writeFileSync('ui_strings.js',json);fs.writeFileSync('desktop/web-app/public/ui_strings.js',json);
console.log('Source notebook shared assets synchronized.');
