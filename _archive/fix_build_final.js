const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// Step 1: Remove the extra </div></div> at L13544-13545
// Currently:
//   L13543: "</button>"       ← KEEP (fixes the unclosed button)
//   L13544: "        </div>"  ← REMOVE (premature close of flex wrapper)
//   L13545: "    </div>"      ← REMOVE (premature close of card)
//   L13546: "<div> Literacy..." ← this is a child of Math card, not a sibling

console.log('Before removal (L13542-13548):');
for (let i = 13541; i < 13548; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// Remove L13544 and L13545 (index 13543 and 13544)
lines.splice(13543, 2);

console.log('\nAfter removal (L13542-13548):');
for (let i = 13541; i < 13548; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// Step 2: Find where the Literacy section ends and add </div></div> after it.
// The orphan </button></div> was originally right after the Literacy section's
// closing </div>. The Literacy section ends at "Rapid Automatized Naming" button.
// Let me find the RAN button closing, then find the grid </div> and card </div>.

// Search for the pattern that comes after the RAN button
// RAN button: </button> then </div> (grid) then </div> (Literacy card)
// After that, we need to add </div> (flex wrapper) and </div> (Math card)

// Find "Rapid Automatized Naming" text
let ranLine = -1;
for (let i = 13540; i < 13620; i++) {
    if (lines[i]?.includes('Rapid Automatized Naming')) {
        ranLine = i;
        break;
    }
}

if (ranLine === -1) {
    console.log('❌ Could not find "Rapid Automatized Naming"');
    process.exit(1);
}

console.log('\nFound RAN at L' + (ranLine + 1));

// After the RAN button, there should be:
//   </button>   ← closes RAN button
// </div>        ← closes grid-cols 
// </div>        ← closes Literacy card
// THEN we need to add:
// </div>        ← closes flex wrapper (from Math probe grade/form/button)  
// </div>        ← closes Math Fluency Probe card (from-orange-50)

// Find the Literacy card closing
let litCardClose = -1;
for (let i = ranLine; i < ranLine + 20; i++) {
    if (lines[i]?.trim() === '</div>' && lines[i - 1]?.trim() === '</div>') {
        // Two consecutive </div> = grid close + card close
        litCardClose = i;
        break;
    }
}

console.log('Literacy card close candidates around L' + (ranLine + 1) + ':');
for (let i = ranLine; i < ranLine + 15; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// Current state after RAN button:
//   </button>  
//   </div>     ← grid close
//   </div>     ← Literacy card close
//   <div ...>  ← this was the orphan location
//
// But wait — the original structure had the orphan </button></div> BETWEEN
// the Literacy section close and the status text div. 
// So the Math probe status text div is currently a CHILD of Literacy card
// (because the orphan closings are gone).
//
// The correct fix: after Literacy card closes, add the 2 closings for Math probe.

// Find the two </div> after the grid (which close grid + Literacy card)
let gridClose = -1;
for (let i = ranLine; i < ranLine + 10; i++) {
    if (lines[i]?.trim() === '</div>') {
        // Find if next line is also </div>
        if (lines[i + 1]?.trim() === '</div>') {
            gridClose = i;
            litCardClose = i + 1;
            break;
        }
    }
}

if (litCardClose > -1) {
    console.log('\nGrid close at L' + (gridClose + 1) + ', Literacy card close at L' + (litCardClose + 1));

    // Insert </div></div> after litCardClose to close flex wrapper + Math card
    lines.splice(litCardClose + 1, 0,
        '                        </div>',
        '                    </div>'
    );
    console.log('✅ Added </div></div> after Literacy card close at L' + (litCardClose + 2));
} else {
    console.log('❌ Could not find Literacy card close pattern');
}

// Verify
console.log('\nVerification (L13542-13560):');
for (let i = 13541; i < 13560; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

console.log('\nPortal close (L14930-14944):');
for (let i = 14929; i < Math.min(14944, lines.length); i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\n✅ Saved! (' + lines.length + ' lines)');
