const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'verify-patient-wrist-finish.cjs'),source=fs.readFileSync(file,'utf8'),old='let low=.00001,high=root-.00001;',replacement='let low=.002,high=root-.005;';
assert.equal(source.split(old).length,2);fs.writeFileSync(path.join(__dirname,'checker-before-probe-adjustment.cjs.saved'),source);fs.writeFileSync(file,source.replace(old,replacement));assert.equal(fs.readFileSync(file,'utf8').includes(replacement),true);
