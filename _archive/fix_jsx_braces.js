const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// Fix all JSX attributes where t() was placed without curly braces
// Pattern: attribute=t('key') should be attribute={t('key')}
const broken = /(\w+)=t\('([^']+)'\)/g;
let match;
while ((match = broken.exec(content)) !== null) {
    const l = content.substring(0, match.index).split('\n').length;
    console.log('L' + l + ': ' + match[0]);
    changes++;
}

// Replace all at once
content = content.replace(/(\w+)=t\('([^']+)'\)/g, "$1={t('$2')}");

fs.writeFileSync(f, content, 'utf8');
console.log('\n✅ Fixed ' + changes + ' JSX attributes missing curly braces');
console.log('Saved! (' + content.length + ' bytes)');
