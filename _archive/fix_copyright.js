const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// The copyright block lost its /* */ wrapper. Re-wrap the first few lines
// Current state: bare text lines followed by import
const importLine = "import React, { useState";
const importIdx = content.indexOf(importLine);
if (importIdx > -1) {
    const beforeImport = content.substring(0, importIdx).trim();
    console.log('Before import:', JSON.stringify(beforeImport.substring(0, 100)));

    // Wrap the copyright text in /* */
    const copyrightBlock = `/*\n * AlloFlow UDL Platform\n * ${beforeImport.replace(/\r?\n/g, '\n * ')}\n */\n`;

    content = copyrightBlock + content.substring(importIdx);
    console.log('Added copyright comment block');
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved! (' + content.length + ' bytes)');
