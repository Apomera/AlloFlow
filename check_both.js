const fs = require('fs');
const acorn = require('acorn');

function testSlice(filename) {
    const code = fs.readFileSync(filename, 'utf8');
    const start = code.search(/\(function _funcGrapherTool\(\) \{/);
    const end = code.search(/\(function _circuitTool\(\) \{/);
    let blk = code.substring(start, end).trim().replace(/,\s*$/, '').replace(/\)\(\)$/, '');
    try {
        acorn.parse('const x=' + blk + ');', { ecmaVersion: 2020 });
        console.log(filename + " PASSED");
    } catch(e) {
        console.log(filename + " FAILED: " + e.message);
    }
}

testSlice('src/stem_lab_module.js');
testSlice('stem_lab/stem_lab_module.js');
