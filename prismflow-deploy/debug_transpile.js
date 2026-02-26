const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(__dirname, '../scripts/word_sounds_module_clean.js');
const code = fs.readFileSync(inputFile, 'utf-8');

console.log('Source file size:', code.length, 'bytes');
console.log('Source lines:', code.split('\n').length);

// First just parse to check for errors
try {
    const ast = babel.parseSync(code, {
        filename: 'word_sounds_module.js',
        parserOpts: {
            plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'optionalCatchBinding', 'classProperties', 'objectRestSpread']
        }
    });
    console.log('Parsing succeeded. AST program body items:', ast.program.body.length);

    // Count JSX elements in the AST
    let jsxCount = 0;
    const traverse = require('@babel/traverse').default;
    traverse(ast, {
        JSXElement(path) { jsxCount++; },
        JSXFragment(path) { jsxCount++; }
    });
    console.log('Total JSX elements in AST:', jsxCount);

} catch (err) {
    console.error('Parse error:', err.message);
    if (err.loc) {
        console.error('At line', err.loc.line, 'col', err.loc.column);
        const lines = code.split('\n');
        console.error('Content:', lines[err.loc.line - 1].substring(0, 200));
    }
}

// Now transform
try {
    const result = babel.transformSync(code, {
        filename: 'word_sounds_module.js',
        presets: [
            ['@babel/preset-react', { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' }],
        ],
        parserOpts: {
            plugins: ['optionalChaining', 'nullishCoalescingOperator', 'optionalCatchBinding', 'classProperties', 'objectRestSpread']
        },
    });

    console.log('\nTransform succeeded. Output size:', result.code.length, 'bytes');

    // Check for remaining JSX
    const jsxLeftover = (result.code.match(/<[a-z][a-zA-Z]*[\s/>]/g) || []).length;
    const ceCount = (result.code.match(/React\.createElement/g) || []).length;
    console.log('createElement calls:', ceCount);
    console.log('Remaining JSX-like tags:', jsxLeftover);

    // Find first leftover
    const match = result.code.match(/<[a-z][a-zA-Z]*[\s/>]/);
    if (match) {
        const pos = match.index;
        const lineNum = result.code.substring(0, pos).split('\n').length;
        console.log('First remaining JSX at output line:', lineNum);
        console.log('Context:', result.code.substring(pos - 50, pos + 80));
    }

    fs.writeFileSync(path.resolve(__dirname, '../word_sounds_module_debug.js'), result.code);
    console.log('Wrote debug output');

} catch (err) {
    console.error('Transform error:', err.message);
}
