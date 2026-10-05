const fs=require('fs');
const dir='reports/scale-explorer-orion-front';
function json(name){const raw=fs.readFileSync(dir+'/'+name,'utf8');return JSON.parse(raw.slice(raw.indexOf('{')));}
const source=json('source-check.json'),preview=json('preview-check.json'),unit=json('unit-results.json');
const units={total:unit.numTotalTests,passed:unit.numPassedTests,failed:unit.numFailedTests};
if(units.total!==65||units.passed!==65||units.failed!==0)throw Error('Unit verification incomplete');
console.log(JSON.stringify({source,preview,units},null,2));
if(fs.existsSync(dir+'/browser-summary.json')){
  const browser=json('browser-summary.json');
  const result={source,preview,units,browser,committed:false,staged:false};
  fs.writeFileSync(dir+'/verification-summary.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(browser,null,2));
}
