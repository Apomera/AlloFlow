'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function getPromoFacts() {
    const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(release.version)) throw new Error('Invalid release version');
    const registry = execFileSync(process.execPath, ['dev-tools/check_tool_registry.cjs'], {cwd:root, encoding:'utf8'});
    const stemTools = Number(registry.match(/StemLab tools:\s+(\d+)/)?.[1]);
    const selTools = Number(registry.match(/SelHub tools:\s+(\d+)/)?.[1]);
    const stemFiles = fs.readdirSync(path.join(root, 'stem_lab')).filter(name => /^stem_tool_.*\.js$/i.test(name)).length;
    if (!stemFiles || !stemTools || !selTools) throw new Error('Missing registry inventory');
    return {release, stemFiles, stemTools, selTools};
}
module.exports = {getPromoFacts};
