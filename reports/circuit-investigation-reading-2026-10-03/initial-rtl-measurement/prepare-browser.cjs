const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const expected=process.argv[2];assert.match(expected||'',/^[a-f0-9]{64}$/);
let code=fs.readFileSync(path.join(__dirname,'../circuit-investigation-handoff-2026-10-02/browser-check.cjs'),'utf8');
function replace(old,next){assert.equal(code.split(old).length,2,'Unique anchor: '+old.slice(0,90));code=code.replace(old,next);}
replace('3424b78369802606dd709faf9c308c1d444b0d18633c69062a7e7486e5614453',expected);
replace('Circuit investigation-handoff audit: ','Circuit investigation-reading audit: ');
replace('<title>Circuit independent investigation handoff</title>','<title>Circuit investigation prompt reading</title>');
replace('handoffStates:[],notebookStates:[]','handoffStates:[],readingLayouts:[],desktopComparison:[],notebookStates:[]');
replace('await handoffState(name,scope,width,scale);','await handoffState(name,scope,width,scale);await readingLayout(name,width,scale);');
const start=code.indexOf('    const emptyBook='),end=code.indexOf('  }catch(error)',start);assert.ok(start>0&&end>start);
code=code.slice(0,start)+fs.readFileSync(path.join(__dirname,'workflow-fragment.txt'),'utf8')+'\n'+code.slice(end);
replace("console.log('Investigation handoff: '","console.log('Investigation reading: '");
new Function(code);fs.writeFileSync(path.join(__dirname,'browser-check.cjs'),code);
console.log(JSON.stringify({source:expected,script:crypto.createHash('sha256').update(code).digest('hex')}));
