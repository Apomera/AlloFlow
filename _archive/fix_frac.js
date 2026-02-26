const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// Show exact line 18531
console.log('L18531 raw:', JSON.stringify(lines[18530]));

// The regex in the file is:  /\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g
// We want to add ,? between the two groups
const target = '/\\\\frac\\s*\\{([^}]+)\\}\\s*\\{([^}]+)\\}/g';
const replacement = '/\\\\frac\\s*\\{([^}]+)\\}\\s*,?\\s*\\{([^}]+)\\}/g';

if (lines[18530].includes(target)) {
    lines[18530] = lines[18530].replace(target, replacement);
    console.log('Fixed!');
} else {
    // Try to find the actual pattern character by character
    const line = lines[18530];
    const idx = line.indexOf('frac');
    if (idx >= 0) {
        console.log('Found frac at pos', idx, 'context:', line.substring(idx - 5, idx + 60));
    }
}

content = lines.join('\n');
fs.writeFileSync(f, content, 'utf8');
console.log('Done');
