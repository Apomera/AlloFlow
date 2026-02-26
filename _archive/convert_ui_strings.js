// convert_ui_strings.js — Converts JS object literal to valid JSON
// Handles: backtick strings, unquoted keys, single quotes, template literals

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'ui_strings_from_github.js');
const outputFile = path.join(__dirname, '..', 'ui_strings.js');

console.log('Reading:', inputFile);
let raw = fs.readFileSync(inputFile, 'utf8');

// Step 1: Character-by-character conversion
let result = '';
let i = 0;

function skipWhitespace() {
    while (i < raw.length && /\s/.test(raw[i])) {
        result += raw[i];
        i++;
    }
}

while (i < raw.length) {
    // Handle backtick template literals
    if (raw[i] === '`') {
        i++; // skip opening backtick
        let str = '';
        while (i < raw.length && raw[i] !== '`') {
            if (raw[i] === '\\') {
                str += '\\\\';
                i++;
                if (i < raw.length) { str += raw[i]; i++; }
            } else if (raw[i] === '\r') {
                i++; // skip \r
            } else if (raw[i] === '\n') {
                str += '\\n';
                i++;
            } else if (raw[i] === '"') {
                str += '\\"';
                i++;
            } else if (raw[i] === '\t') {
                str += '\\t';
                i++;
            } else {
                str += raw[i];
                i++;
            }
        }
        i++; // skip closing backtick
        result += '"' + str + '"';
    }
    // Handle single-quoted strings
    else if (raw[i] === "'") {
        i++; // skip opening quote
        let str = '';
        while (i < raw.length && raw[i] !== "'") {
            if (raw[i] === '\\') {
                str += '\\';
                i++;
                if (i < raw.length) { str += raw[i]; i++; }
            } else if (raw[i] === '"') {
                str += '\\"';
                i++;
            } else {
                str += raw[i];
                i++;
            }
        }
        i++; // skip closing quote
        result += '"' + str + '"';
    }
    // Handle double-quoted strings (pass through)
    else if (raw[i] === '"') {
        result += raw[i];
        i++;
        while (i < raw.length && raw[i] !== '"') {
            if (raw[i] === '\\') {
                result += raw[i]; i++;
                if (i < raw.length) { result += raw[i]; i++; }
            } else {
                result += raw[i]; i++;
            }
        }
        if (i < raw.length) { result += raw[i]; i++; } // closing "
    }
    // Handle // line comments (skip them)
    else if (raw[i] === '/' && i + 1 < raw.length && raw[i + 1] === '/') {
        while (i < raw.length && raw[i] !== '\n') i++;
    }
    // Handle /* block comments */
    else if (raw[i] === '/' && i + 1 < raw.length && raw[i + 1] === '*') {
        i += 2;
        while (i < raw.length && !(raw[i] === '*' && i + 1 < raw.length && raw[i + 1] === '/')) i++;
        i += 2;
    }
    // Everything else passes through
    else {
        result += raw[i];
        i++;
    }
}

// Step 2: Quote unquoted keys
// Match word characters followed by colon after { , or newline
result = result.replace(/(?<=[\{,\n\r])\s*([a-zA-Z_0-9][a-zA-Z0-9_]*)\s*:/g, ' "$1":');

// Step 3: Remove trailing commas before } or ]
result = result.replace(/,(\s*[}\]])/g, '$1');

// Step 4: Parse to validate
let obj;
try {
    obj = JSON.parse(result);
    console.log('SUCCESS! Parsed JSON. Top-level keys:', Object.keys(obj).length);
} catch (e) {
    // Find the error position
    const match = e.message.match(/position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        console.error('Parse error at position', pos);
        console.error('Context:', JSON.stringify(result.substring(Math.max(0, pos - 50), pos + 50)));
    }
    console.error('Error:', e.message);

    // Save the intermediate result for debugging
    fs.writeFileSync(path.join(__dirname, 'ui_strings_debug.json'), result, 'utf8');
    console.log('Debug output saved to ui_strings_debug.json');
    process.exit(1);
}

// Step 5: Write clean, valid JSON
const json = JSON.stringify(obj, null, 2);
fs.writeFileSync(outputFile, json, 'utf8');

console.log(`Written: ${outputFile} (${(json.length / 1024).toFixed(0)} KB)`);
console.log('Upload this file to GitHub as ui_strings.js');
