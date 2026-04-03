const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const modules = [
    { source: 'ui_modals_source.jsx', output: 'ui_modals_module.js', name: 'UIModalsModule' },
    { source: 'immersive_reader_source.jsx', output: 'immersive_reader_module.js', name: 'ImmersiveReaderModule' },
    { source: 'persona_ui_source.jsx', output: 'persona_ui_module.js', name: 'PersonaUIModule' },
];

for (const mod of modules) {
    const inputPath = path.join(baseDir, mod.source);
    const outputPath = path.join(baseDir, mod.output);

    console.log(`\nCompiling ${mod.source}...`);
    const code = fs.readFileSync(inputPath, 'utf-8');

    try {
        const result = babel.transformSync(code, {
            filename: inputPath,
            presets: [
                ['@babel/preset-react', { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }],
            ],
            parserOpts: {
                plugins: ['optionalChaining', 'nullishCoalescingOperator', 'optionalCatchBinding', 'classProperties', 'objectRestSpread']
            },
        });

        // Wrap in IIFE with duplicate-load guard
        const wrapped = `(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.${mod.name}) { console.log('[CDN] ${mod.name} already loaded, skipping'); return; }\n${result.code}\n})();\n`;

        fs.writeFileSync(outputPath, wrapped, 'utf-8');

        const ceCount = (wrapped.match(/React\.createElement/g) || []).length;
        const jsxLeft = (wrapped.match(/<[a-z][a-zA-Z]*[\s/>]/g) || []).length;
        console.log(`  ✓ Saved ${mod.output} (${wrapped.length} bytes, ${ceCount} createElement calls, ${jsxLeft} remaining JSX-like)`);
    } catch (err) {
        console.error(`  ✗ FAILED: ${err.message}`);
        if (err.loc) console.error(`    At line ${err.loc.line}, column ${err.loc.column}`);
    }
}
