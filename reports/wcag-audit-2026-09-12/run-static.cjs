const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'a11y-audit/static-audit.js');
const auditFs = {...fs, writeFileSync(file, data, ...rest) { return fs.writeFileSync(path.basename(file)==='audit-report.json' ? path.join(__dirname,'static-audit.json') : file,data,...rest); }};
vm.runInNewContext(fs.readFileSync(source,'utf8'), {require(name){return name==='fs'?auditFs:require(name);},__dirname:path.dirname(source),process:{...process,argv:[process.execPath,source,'--json']},console}, {filename:source});
