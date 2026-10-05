const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const expected=process.argv[2];assert.match(expected||'',/^[a-f0-9]{64}$/);
let code=fs.readFileSync(path.join(__dirname,'../circuit-observation-summary-2026-10-03/browser-check.cjs'),'utf8');assert.equal(crypto.createHash('sha256').update(code).digest('hex'),'2b794cb7802a0bcbc5d1542051243031b3c0fe89cd960594fe3888bd7aa4999f');
function replace(old,next){assert.equal(code.split(old).length,2,'Unique anchor: '+old.slice(0,90));code=code.replace(old,next);}
replace('81044cbe6bd8555c21d8bfd0d3b7b2afedc628eedfd855dc50f6f917590153d2',expected);
replace('summaryStates:[],disclosures:[]','summaryStates:[],probePairs:[],accessibleSummaries:[],disclosures:[]');
replace('Circuit saved-observation summary audit: ','Circuit saved-observation probe-pairs audit: ');
replace('await summaryState(name,width,scale);','await summaryState(name,width,scale);await pairState(name,width,scale);');
const insert=code.indexOf('    async function captureNormalFonts(');assert.ok(insert>0);code=code.slice(0,insert)+fs.readFileSync(path.join(__dirname,'pair-metrics.txt'),'utf8')+'\n'+code.slice(insert);
new Function(code);fs.writeFileSync(path.join(__dirname,'browser-check.cjs'),code);console.log(JSON.stringify({source:expected,script:crypto.createHash('sha256').update(code).digest('hex')}));
