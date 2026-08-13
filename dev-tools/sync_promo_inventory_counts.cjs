'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stemFiles = fs.readdirSync(path.join(root, 'stem_lab')).filter((name) => /^stem_tool_.*\.js$/i.test(name)).length;
const registry = childProcess.execFileSync(process.execPath, ['dev-tools/check_tool_registry.cjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
});
const stemMatch = registry.match(/StemLab tools:\s+(\d+)/);
const selMatch = registry.match(/SelHub tools:\s+(\d+)/);
if (!stemMatch || !selMatch) throw new Error('Could not read registry counts');
const stemTools = Number(stemMatch[1]);
const selTools = Number(selMatch[1]);
if (stemFiles !== 141 || stemTools !== 142 || selTools !== 70) {
    throw new Error('Expected audited August 13 inventory 141 files / 142 STEM IDs / 70 SEL tools; got ' +
        stemFiles + ' / ' + stemTools + ' / ' + selTools);
}

const targets = ['index.html', 'features.html', 'for-districts.html', 'students.html', 'README.md'];
const replacements = [
    [/137 STEM plugin files/g, stemFiles + ' STEM plugin files'],
    [/138 registered STEM IDs/g, stemTools + ' registered STEM IDs'],
    [/138 STEM IDs/g, stemTools + ' STEM IDs'],
    [/138 registered STEM tools/g, stemTools + ' registered STEM tools'],
    [/137 plugin files/g, stemFiles + ' plugin files'],
    [/137 `stem_tool_\*\.js` files/g, stemFiles + ' `stem_tool_*.js` files'],
    [/138 registered IDs/g, stemTools + ' registered IDs'],
    [/138 STEM tool registrations/g, stemTools + ' STEM tool registrations'],
    [/138 registered STEM tool IDs/g, stemTools + ' registered STEM tool IDs'],
    [/verified August 9, 2026/g, 'verified August 13, 2026'],
    [/on August 9, 2026/g, 'on August 13, 2026']
];

let total = 0;
let combined = '';
for (const file of targets) {
    const absolute = path.join(root, file);
    let source = fs.readFileSync(absolute, 'utf8');
    let changed = 0;
    for (const [pattern, replacement] of replacements) {
        source = source.replace(pattern, () => {
            changed += 1;
            return replacement;
        });
    }
    if (changed) fs.writeFileSync(absolute, source, 'utf8');
    total += changed;
    combined += '\n' + source;
    console.log(file + ': ' + changed + ' replacement(s)');
}

if (/137 STEM plugin files|138 registered STEM IDs|138 STEM tool registrations|137 `stem_tool_\*\.js` files|verified August 9, 2026/.test(combined)) {
    throw new Error('A stale inventory reference remains after synchronization');
}
if (!combined.includes(stemFiles + ' STEM plugin files') ||
    !combined.includes(stemTools + ' registered STEM IDs') ||
    !combined.includes(stemFiles + ' `stem_tool_*.js` files')) {
    throw new Error('Current inventory references are missing after synchronization');
}
console.log(total ? 'Updated ' + total + ' stale reference(s).' : 'Inventory references were already current.');
console.log('Public inventory: ' + stemFiles + ' files / ' + stemTools + ' STEM IDs / ' + selTools + ' SEL tools.');
