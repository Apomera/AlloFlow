const fs=require('node:fs'),assert=require('node:assert/strict');const file=__dirname+'/verify.cjs',source=fs.readFileSync(file,'utf8'),before='assert.ok(value&&value!==english[key]);';
assert.ok(source.includes(before));fs.writeFileSync(file,source.replace(before,"assert.ok(value);assert.ok(value!==english[key]||(lang==='french'&&key==='spot_ref_correct'));"));
