const fs=require('fs');const file='dev-tools/run_applied_challenge_live_pilot.cjs';let src=fs.readFileSync(file,'utf8');
const old="lockedLessonFacts: [sources[index].split('. ')[0] + '.'], factSources: [{text: sources[index].split('. ')[0] + '.', sourceQuote: sources[index].split('. ')[0] + '.'}]";
if(!src.includes(old))throw Error('Seed already updated');
src=src.replace(old,"lockedLessonFacts: sources[index].split('. ').slice(0,2).map(text=>text.replace(/\\.$/,'')+'.'), factSources: sources[index].split('. ').slice(0,2).map(text=>({text:text.replace(/\\.$/,'')+'.',sourceQuote:text.replace(/\\.$/,'')+'.'}))");fs.writeFileSync(file,src);
