const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..'),file=path.join(root,'tests/applied_challenge_interaction.test.js');
let text=fs.readFileSync(file,'utf8');
const before="it('persists workspace edits, retains earlier feedback, and counts learner work', async () => {\n    await renderChallenge();";
if(!text.includes(before))throw Error('Missing interaction case');
text=text.replace(before,"it('persists workspace edits and retains earlier feedback in the active stage', async () => {\n    await renderChallenge();\n    await act(async () => [...host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === '3. Build').click());");
fs.writeFileSync(file,text);
console.log('The navigation regression now opens Build before editing the response.');
