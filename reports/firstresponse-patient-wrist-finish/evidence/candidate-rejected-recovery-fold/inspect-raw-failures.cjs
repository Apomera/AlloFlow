const fs=require('node:fs');
const result=JSON.parse(fs.readFileSync(__dirname+'/raw-wrist-tests/candidate-results.json'));
console.log(JSON.stringify(result.testResults.map(file=>({name:file.name,status:file.status,assertions:file.assertionResults.map(test=>({name:test.fullName,status:test.status,...(test.status==='failed'?{messages:test.failureMessages}: {})}))})),null,2));
