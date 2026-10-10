const fs=require('fs'),path=require('path'),file=path.join(__dirname,'finalize.cjs');let text=fs.readFileSync(file,'utf8');
function replace(before,after){if(!text.includes(before))throw Error('Missing helper adjustment: '+before);text=text.replace(before,after);}
replace("assert(read('sequence-1.json').success&&read('sequence-3.json').success,'Required sequence incomplete');","assert(read('sequence-1.json').success,'Required before capture incomplete');");
replace("const accepted=['unit-2','browser-3','checkpoint-3'];","const accepted=['unit-2','browser-3'];");
replace("const browserResults=['browser-3','checkpoint-3']","const browserResults=['browser-3']");
replace("===20,'Browser count'","===5,'Browser count'");
replace("audit.reports===18","audit.reports===4");
replace("browser:{passed:20,runs:browserResults}","browser:{passed:5,runs:browserResults}");
replace("accessibility:{reports:18,violations:0","accessibility:{reports:4,violations:0");
replace("environmentNotes:'One PowerShell", "broaderRegressionLimit:'checkpoint-3 was interrupted by ENOSPC disk-write errors, an afterAll timeout and fatal process out-of-memory errors. It exited with code2147483651 without results JSON. Partial tests/captures are retained and excluded from accepted totals. No app assertion failure was established in that run.',environmentNotes:'One PowerShell");
replace("audit.minimumGradientRatio.toFixed(2)","String(audit.minimumGradientRatio)");
replace(";24 targeted unit cases and20 browser cases pass,18 scoped axe audits show zero violations with gradient checks manually resolved.315 protected files", ";24 targeted unit cases and5 browser cases pass,4 scoped axe audits show zero violations/incomplete items. Additional checkpoint rerun interrupted by disk/memory exhaustion and excluded from totals.315 protected files");
replace(".replace(/and20/g,'and 20').replace(/,18/g,', 18')",".replace(/and5/g,'and 5').replace(/,4/g,', 4')");
replace("unit:24,browser:20,audits:18","unit:24,browser:5,audits:4");
fs.writeFileSync(file,text);
console.log('Report will count completed checks and document the interrupted broader run.');
