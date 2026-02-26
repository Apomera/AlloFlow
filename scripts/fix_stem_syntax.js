// DEFINITIVE FIX for stem_lab_module.js
// Strategy: Work at the byte/line level to precisely split the closing parens
// and restructure the tool boundaries.
//
// Key facts from analysis:
// - Old tools are siblings at depth 5 (inside modal content area div)
// - Line 2979 text ends with ))))))))  = 8 closing parens (depth 8→0) + ;
// - After 3rd ), depth = 5 — this is where new tools need to be
// - Need to split: ))))))))); → )))  + new_tools_section + )))))  + ;
// - The new tools use "), stemLabTab" and ");" patterns that must be fixed

var fs = require('fs');
var FILE = 'stem_lab_module.js';
var content = fs.readFileSync(FILE, 'utf8');
var lines = content.split('\n');

// === STEP 1: Find exact line and position ===
var fracCloseLine = -1;
for (var i = 2975; i < 2985; i++) {
    if (lines[i] && lines[i].indexOf("next_challenge") !== -1 && lines[i].indexOf("))))))))") !== -1) {
        fracCloseLine = i;
        break;
    }
}
if (fracCloseLine === -1) { console.log('ERROR: Could not find fraction closing line'); process.exit(1); }
console.log('Fraction closing line: ' + (fracCloseLine + 1));

// === STEP 2: Extract the three sections ===
// Section A: Lines 0 to fracCloseLine (inclusive, but we'll modify the paren count)
// Section B: Tier 3 tools (calculus, wave, cell) - lines after fracCloseLine to before NEW TOOLS
// Section C: Tier 4 tools (funcGrapher through molecule) - lines from NEW TOOLS to before };
// Section D: Closing lines (};  }  })(); )

// Find the Tier 3 / Tier 4 boundary
var newToolsLine = -1;
for (var i = fracCloseLine + 1; i < lines.length; i++) {
    if (lines[i].indexOf('NEW TOOLS') !== -1) {
        newToolsLine = i;
        break;
    }
}

// Find the render function close };
var renderCloseLine = -1;
for (var i = lines.length - 1; i > 0; i--) {
    if (lines[i].replace(/\r/g, '').trim() === '};') {
        renderCloseLine = i;
        break;
    }
}

console.log('NEW TOOLS comment at: ' + (newToolsLine + 1));
console.log('Render close at: ' + (renderCloseLine + 1));

// === STEP 3: Restructure ===

// Replace the fraction closing line: change ))))))))  to )),  (removing 5 parens and ; adding comma)
// Wait... I need to close from 8→5, which is 3 parens, then comma.
// The line contains: }, t('explore.next_challenge'))))))));
// The parentheses breakdown:
//   - t('explore.next_challenge') = the t() call result, passed to createElement as child
//   - Then 8 )) close React.createElement calls
// 
// I need: }, t('explore.next_challenge'))),     (3 closing parens + comma)
// This closes the createElement for the button (depth 8→7), the conditional (7→6), 
// and the explore branch div (6→5). Then comma for next sibling at depth 5.

// Original line content (trimmed to the key part):
var origEnd = "next_challenge'))))))));\r";
var newEnd = "next_challenge'))),\r";

if (lines[fracCloseLine].indexOf(origEnd) !== -1) {
    lines[fracCloseLine] = lines[fracCloseLine].replace(origEnd, newEnd);
    console.log('Step 3a: Replaced 8 closing parens with 3 + comma');
} else {
    // Try without \r
    origEnd = "next_challenge'))))))));\n";
    newEnd = "next_challenge'))),\n";
    if (lines[fracCloseLine].indexOf(origEnd) !== -1) {
        lines[fracCloseLine] = lines[fracCloseLine].replace(origEnd, newEnd);
        console.log('Step 3a (LF): Replaced 8 closing parens with 3 + comma');
    } else {
        // Direct replacement
        lines[fracCloseLine] = lines[fracCloseLine].replace("))))))));", "))),");
        console.log('Step 3a (direct): Replaced 8 closing parens with 3 + comma');
    }
}

// Now handle the ), stemLabTab patterns.
// Since we already placed a comma at the end of the fraction line,
// the first tool starts with "), stemLabTab..." where the ) would close one more level.
// But we want depth 5. After our 3 closing parens + comma, we're at depth 5.
// The ), pattern means: close one more level (5→4) then start next child at depth 4.
// That's wrong — we need to stay at depth 5.
// 
// So: change ), stemLabTab to stemLabTab (the comma is already there from our change)
for (var i = fracCloseLine + 1; i < lines.length; i++) {
    var trimmed = lines[i].replace(/\r/g, '').trim();
    if (trimmed.indexOf('), stemLabTab') === 0) {
        lines[i] = lines[i].replace('), stemLabTab', 'stemLabTab');
        console.log('Step 3b: Removed ), from L' + (i + 1));
    }
}

// Handle ); before })() at internal tool boundaries
// These ; break the expression. Remove the ;
for (var i = fracCloseLine; i < renderCloseLine; i++) {
    var trimmed = lines[i].replace(/\r/g, '').trim();
    if (trimmed === ');' && i + 1 < lines.length) {
        var nextTrimmed = lines[i + 1].replace(/\r/g, '').trim();
        if (nextTrimmed === '})()') {
            lines[i] = lines[i].replace(');', ')');
            console.log('Step 3c: Removed ; from ); at L' + (i + 1));
        }
    }
}

// Add commas after })() that lead to tool sections
for (var i = fracCloseLine; i < renderCloseLine; i++) {
    var trimmed = lines[i].replace(/\r/g, '').trim();
    if (trimmed === '})()') {
        // Look ahead for stemLabTab or comment block before stemLabTab
        for (var j = i + 1; j < Math.min(i + 6, lines.length); j++) {
            var ahead = lines[j].replace(/\r/g, '').trim();
            if (ahead === '' || ahead.indexOf('//') === 0 || ahead.indexOf('═══') !== -1) continue;
            if (ahead.indexOf('stemLabTab') !== -1) {
                lines[i] = lines[i].replace('})()', '})(),');
                console.log('Step 3d: Added comma after })() at L' + (i + 1));
                break;
            }
            break;
        }
    }
}

// At the very end: the last tool ends with:
//   )       <- from our ; removal
//   })()    <- IIFE close
// We need to add )))))  (5 closing parens) + ; to close depths 5→0
// Insert before the };  line

// Find the last })() before };
for (var i = renderCloseLine - 1; i > fracCloseLine; i--) {
    var trimmed = lines[i].replace(/\r/g, '').trim();
    if (trimmed === '})()' || trimmed === '})(),') {
        // This is the last tool IIFE. Insert closing parens after it.
        var eol = lines[0].indexOf('\r') !== -1 ? '\r' : '';
        lines.splice(i + 1, 0, '    )))))' + eol);
        console.log('Step 3e: Added 5 closing parens after L' + (i + 1));
        break;
    }
}

content = lines.join('\n');
fs.writeFileSync(FILE, content);

// === VERIFICATION ===
var ps = 0;
for (var i = 0; i < content.length; i++) {
    if (content[i] === '(') ps++;
    if (content[i] === ')') ps--;
}
console.log('\nParen balance: ' + ps);

try {
    new Function(content);
    console.log('SYNTAX OK');
} catch (e) {
    console.log('SYNTAX ERROR: ' + e.message);
}

// Tool depths
var vLines = content.split('\n');
var vd = 0;
for (var k = 0; k < vLines.length; k++) {
    var line = vLines[k].replace(/\r/g, '');
    for (var c = 0; c < line.length; c++) {
        if (line[c] === '(') vd++;
        if (line[c] === ')') vd--;
    }
    if (line.indexOf('stemLabTool') !== -1 && line.indexOf('explore') !== -1 && line.indexOf('&&') !== -1 && line.trim().indexOf('//') !== 0) {
        var m = line.match(/stemLabTool\s*===\s*'(\w+)'/);
        if (m) console.log(m[1] + ': depth=' + vd);
    }
}
console.log('Final depth: ' + vd);
