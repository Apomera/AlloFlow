const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
let source=read('applied_challenge_source.jsx');const bad="            </dd></div>\n            <div><dt className='font-black text-emerald-900'>{tx('applied_challenge.feedback.lesson'";if(!source.includes(bad))throw Error('JSX anchor missing');source=source.replace(bad,bad.replace('</dd></div>','</dd></div>}'));fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),source);
let tests=read('tests/applied_challenge_interaction.test.js');tests=tests.replace('afterEach, beforeAll, describe','afterEach, beforeAll, beforeEach, describe');tests=tests.replace('afterEach(() => {','beforeEach(() => sessionStorage.clear());\n\nafterEach(() => {');
tests=tests.replace("      gradeLevel: '8th Grade',", "      gradeLevel: '8th Grade',\n      activeProfileId: options.profile, previewMode: options.preview === true,");
tests=tests.replace('if (!options.teacher && Array.from(host.querySelectorAll', 'if (!options.teacher && !options.focus && Array.from(host.querySelectorAll');
tests+='\n'+fs.readFileSync(path.join(__dirname,'pass4-interactions.txt'),'utf8');fs.writeFileSync(path.join(root,'tests/applied_challenge_interaction.test.js'),tests);
console.log('Added resume, feedback-editing and backup regressions.');
