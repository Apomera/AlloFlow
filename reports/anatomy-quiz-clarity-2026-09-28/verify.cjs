const fs=require('fs'),crypto=require('crypto'),path=require('path');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const runs=['unit-results.json','targeted-unit-results.json'].map(read),passed=new Set(),failed=new Set();
for(const run of runs)for(const file of run.testResults)for(const test of file.assertionResults){if(test.status==='passed')passed.add(test.fullName);if(test.status==='failed')failed.add(test.fullName);}
const files=['stem_lab/stem_tool_anatomy.js','lang/french.js','lang/spanish_latin_america.js','lang/arabic.js'];
const mirrors=files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),identical:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file))}));
const browser=read('browser-validation.json'),application=read('application-validation.json');
const result={unit:{distinctPassed:passed.size,unresolvedFailures:[...failed].filter(name=>!passed.has(name)),mainRunPassed:runs[0].numPassedTests,mainRunTimeouts:runs[0].numFailedTests,isolatedRunPassed:runs[1].numPassedTests},browser:{quizScans:browser.scans.length+application.scans.length,violations:[...browser.scans,...application.scans].flatMap(s=>s.violations),errors:browser.errors,widths:browser.sizes,quizTop:browser.top,baselineTop:read('baseline.json').top},mirrors};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(result.unit.unresolvedFailures.length||result.browser.violations.length||result.browser.errors.length||mirrors.some(m=>!m.identical))process.exitCode=1;
