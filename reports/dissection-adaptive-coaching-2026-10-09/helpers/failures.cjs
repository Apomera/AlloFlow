const fs=require('fs'),path=require('path');
const report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-adaptive-coaching-2026-10-09',run=process.argv[2];
const r=JSON.parse(fs.readFileSync(path.join(report,run,'results.json')));console.log(JSON.stringify({passed:r.numPassedTests,failed:r.numFailedTests,excluded:r.numPendingTests}));for(const suite of r.testResults||[])for(const test of suite.assertionResults||[])if(test.status==='failed')console.log(JSON.stringify({name:test.fullName,messages:test.failureMessages}));
