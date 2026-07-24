const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const files = [
    {
        input: path.resolve(__dirname, '../scripts/word_sounds_module_clean.js'),
        output: path.resolve(__dirname, '../word_sounds_module.js'),
        name: 'WordSoundsModal',
        // Strip everything after the component definition (FONT_OPTIONS, CSS injection, localization loaders)
        stripAfter: 'const FONT_OPTIONS',
    },
    {
        input: path.resolve(__dirname, '../scripts/stem_lab_module_clean.js'),
        output: path.resolve(__dirname, '../stem_lab_module.js'),
        name: 'StemLab',
        stripAfter: null,
    }
];

for (const { input, output, name, stripAfter } of files) {
    console.log(`\nTranspiling ${path.basename(input)}...`);

    if (!fs.existsSync(input)) {
        console.log(`  Skipping - file not found: ${input}`);
        continue;
    }

    let code = fs.readFileSync(input, 'utf-8');

    // Strip trailing infrastructure code if specified
    if (stripAfter) {
        const stripIdx = code.indexOf(stripAfter);
        if (stripIdx > 0) {
            console.log(`  Stripping code after "${stripAfter}" (at char ${stripIdx})`);
            code = code.substring(0, stripIdx).trimEnd() + '\n';
            // Do NOT re-add window.AlloModules assignment - it's already done inline at the start
        }
    }

    // Remove any trailing window.AlloModules assignment that references a non-existent const
    // The component is already assigned inline as window.AlloModules.X = function(props){...}
    const danglingPattern = new RegExp(
        `\\nwindow\\.AlloModules\\s*=\\s*window\\.AlloModules\\s*\\|\\|\\s*\\{\\};\\s*\\nwindow\\.AlloModules\\.${name}\\s*=\\s*${name};\\s*$`
    );
    if (danglingPattern.test(code)) {
        console.log(`  Removing dangling AlloModules.${name} assignment`);
        code = code.replace(danglingPattern, '\n');
    }

    try {
        const result = babel.transformSync(code, {
            filename: input,
            presets: [
                ['@babel/preset-react', { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }],
            ],
            parserOpts: {
                plugins: [
                    'optionalChaining',
                    'nullishCoalescingOperator',
                    'optionalCatchBinding',
                    'classProperties',
                    'objectRestSpread',
                ]
            },
        });

        // Wrap in IIFE with double-load guard
        const guard = `if (window.AlloModules && window.AlloModules.${name}) { console.log('[CDN] ${name} already loaded, skipping duplicate'); } else {\n`;
        const wrapped = `(function() {\n${guard}${result.code}\n}\n})();\n`;

        fs.writeFileSync(output, wrapped, 'utf-8');

        // Verify no dangling reference
        const hasDangling = wrapped.includes(`window.AlloModules.${name} = ${name};`);
        const hasInlineReg = wrapped.includes(`window.AlloModules.${name} = function`);
        const jsxLeft = (wrapped.match(/<[a-z][a-zA-Z]*[\s/>]/g) || []).length;
        const ceCount = (wrapped.match(/React\.createElement/g) || []).length;

        console.log(`  ✓ Saved to ${path.basename(output)} (${wrapped.length} bytes)`);
        console.log(`    createElement: ${ceCount}, remaining JSX-like: ${jsxLeft}`);
        console.log(`    Inline registration: ${hasInlineReg}, Dangling ref: ${hasDangling}`);

    } catch (err) {
        console.error(`  ✗ Failed: ${err.message}`);
        if (err.loc) {
            console.error(`    At line ${err.loc.line}, column ${err.loc.column}`);
        }
    }
}
