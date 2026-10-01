const fs = require('fs');
const target = 'C:/tmp/alloflow_dispatch/wave2/deep-classroom-2026-09-29/verify.cjs';
let text = fs.readFileSync(target, 'utf8');
function replace(from, to) { if (text.split(from).length !== 2) throw Error('App harness anchor ambiguous: ' + from); text = text.replace(from, to); }
replace("for(const scenario of [{role:'Parent',width:1280},{role:'Parent',width:390},{role:'Independent',width:1280}]){", "for(const scenario of [{role:'Parent',width:1280},{role:'Parent',width:390},{role:'Independent',width:1280}].filter(scenario=>!process.env.COMPACT_PHONE_ONLY||scenario.width===390)){");
replace("const record={...scenario,errors}; results.push(record);", "const record={...scenario,errors}; results.push(record);\n   if(process.env.ALLO_HEADER_CANDIDATE) await page.route('**/view_header_module.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(process.env.ALLO_HEADER_CANDIDATE,'utf8')}));");
replace("path.join(out,'full-app-results.json')", "path.join(out,process.env.ALLO_APP_RESULT||'full-app-results.json')");
fs.writeFileSync(target, text);
console.log('App harness can verify the compact-header regression without shared source mutations.');
