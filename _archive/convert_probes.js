// Convert psychometric probe JS files to JSON
const fs = require('fs');
const path = require('path');

function convertProbeFile(inputName, variableNames) {
    const inputPath = path.join(__dirname, '..', inputName);
    const outputPath = path.join(__dirname, '..', inputName.replace('.js', '.json'));

    console.log(`\nConverting: ${inputName}`);
    const raw = fs.readFileSync(inputPath, 'utf8');

    // The file uses window.VAR_NAME = { ... };
    // We need to extract all variable assignments and combine into one JSON object
    const result = {};

    for (const varName of variableNames) {
        // Find window.VAR_NAME = 
        const pattern = `window.${varName} = `;
        const startIdx = raw.indexOf(pattern);
        if (startIdx === -1) {
            console.log(`  ${varName}: NOT FOUND`);
            continue;
        }

        // Find the start of the object/array
        const valueStart = startIdx + pattern.length;
        // Find the matching closing brace/bracket with depth tracking
        let depth = 0;
        let i = valueStart;
        let inString = false;
        let stringChar = '';
        let valueEnd = -1;

        for (; i < raw.length; i++) {
            const ch = raw[i];
            if (inString) {
                if (ch === '\\') { i++; continue; }
                if (ch === stringChar) inString = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inString = true;
                stringChar = ch;
                continue;
            }
            if (ch === '{' || ch === '[') depth++;
            if (ch === '}' || ch === ']') {
                depth--;
                if (depth === 0) { valueEnd = i + 1; break; }
            }
        }

        if (valueEnd === -1) {
            console.log(`  ${varName}: Could not find end`);
            continue;
        }

        let valueStr = raw.substring(valueStart, valueEnd);

        // Convert JS object literal to JSON
        // 1. Quote unquoted keys
        valueStr = valueStr.replace(/(?<=[\{,\n\r])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, ' "$1":');
        // 2. Single quotes to double quotes (careful with apostrophes in values)
        // Process char by char for safety
        let converted = '';
        let j = 0;
        while (j < valueStr.length) {
            if (valueStr[j] === "'") {
                j++;
                let str = '';
                while (j < valueStr.length && valueStr[j] !== "'") {
                    if (valueStr[j] === '\\') { str += '\\'; j++; if (j < valueStr.length) { str += valueStr[j]; j++; } }
                    else if (valueStr[j] === '"') { str += '\\"'; j++; }
                    else { str += valueStr[j]; j++; }
                }
                j++; // skip closing '
                converted += '"' + str + '"';
            } else {
                converted += valueStr[j];
                j++;
            }
        }
        valueStr = converted;

        // 3. Remove trailing commas
        valueStr = valueStr.replace(/,(\s*[}\]])/g, '$1');

        // 4. Remove JS comments
        valueStr = valueStr.replace(/\/\/.*$/gm, '');

        try {
            const parsed = JSON.parse(valueStr);
            result[varName] = parsed;
            const keys = typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).length : (Array.isArray(parsed) ? parsed.length : 1);
            console.log(`  ${varName}: ${keys} entries`);
        } catch (e) {
            console.error(`  ${varName}: PARSE FAILED - ${e.message}`);
            // Save debug output
            fs.writeFileSync(path.join(__dirname, `debug_${varName}.json`), valueStr, 'utf8');
            console.log(`  Saved debug to debug_${varName}.json`);
        }
    }

    if (Object.keys(result).length > 0) {
        const json = JSON.stringify(result, null, 2);
        fs.writeFileSync(outputPath, json, 'utf8');
        console.log(`  OUTPUT: ${outputPath} (${(json.length / 1024).toFixed(0)} KB)`);
    }
}

// Convert math probes
convertProbeFile('psychometric_math_probes.js', [
    'MATH_PROBE_BANKS',
    'MISSING_NUMBER_PROBES',
    'QUANTITY_DISCRIMINATION_PROBES'
]);

// Convert literacy probes
convertProbeFile('psychometric_literacy_probes.js', [
    'NWF_PROBE_BANKS',
    'LNF_PROBE_BANKS',
    'RAN_PROBE_BANKS'
]);

console.log('\nDone!');
