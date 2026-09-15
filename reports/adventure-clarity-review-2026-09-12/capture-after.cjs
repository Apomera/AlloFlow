const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'after');
fs.mkdirSync(output, { recursive: true });
let script = fs.readFileSync(path.join(__dirname, 'audit.cjs'), 'utf8');
script = script.replace("new Function('require','__dirname',harness)(require,__dirname);", `
harness = harness.replace("const root = path.resolve(__dirname, '../..');", "const root = process.cwd();");
new Function('require','__dirname',harness)(require,${JSON.stringify(output)});`);
new Function('require', '__dirname', script)(require, __dirname);
