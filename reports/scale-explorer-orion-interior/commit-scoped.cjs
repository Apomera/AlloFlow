const fs=require('fs'),cp=require('child_process'),dir='reports/scale-explorer-orion-interior';
function git(args,opt={}){return cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:16e6,...opt}).trim();}
const m=JSON.parse(fs.readFileSync(dir+'/commit-manifest.json','utf8'));
if(git(['rev-parse','HEAD'])!==m.head)throw Error('HEAD moved; regenerate candidates.');
if(git(['diff','--cached','--name-only']))throw Error('Another task has staged work; wait for the index.');
for(const f of m.files){const content=fs.readFileSync(f.file,'utf8');if(git(['hash-object','--path='+f.path,'--stdin'],{input:content})!==f.oid)throw Error('Candidate changed '+f.path);}
const expected=m.files.map(f=>f.path).sort();
if(m.files[0].oid!==m.files[1].oid||m.files[2].oid!==m.files[3].oid)throw Error('Mirror drift.');
git(['update-index','--add','--index-info'],{input:m.files.map(f=>'100644 '+f.oid+'\t'+f.path).join('\n')+'\n'});
if(JSON.stringify(git(['diff','--cached','--name-only']).split('\n').sort())!==JSON.stringify(expected))throw Error('Staged scope changed.');
if(git(['rev-parse','HEAD'])!==m.head)throw Error('HEAD moved during staging.');
for(const f of m.files)if(git(['rev-parse',':'+f.path])!==f.oid)throw Error('Staged content changed '+f.path);
fs.writeFileSync(dir+'/staged-scope.json',JSON.stringify({head:m.head,paths:expected},null,2));
fs.writeFileSync(dir+'/commit-message.txt','Add immersive Orion navigation and alpine waypoints\n\nMove through Orion gas and dust with free camera controls, interior viewpoints and light-year readouts. Keep model dimensions and star positions fixed, and restore interior poses through the notebook and portable backups.\n\nRefine Everest rock and snow materials and add map-selected terrain waypoints with live course information and ridge visibility.\n\nValidation: 55 targeted unit checks and 12 real WebGL browser scenarios, including WebGL 1, phones, camera transforms, notebook restore, shared flight controls and waypoint occlusion.\n');
console.log(git(['commit','-F',dir+'/commit-message.txt']));const final=git(['rev-parse','HEAD']);fs.writeFileSync(dir+'/final-commit.txt',final+'\n');console.log('Final commit '+final);
