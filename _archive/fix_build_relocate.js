const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// Current state:
// L13543: </button>
// L13544: <div> Literacy card (WRONG: inside flex wrapper)
// ...
// L13603: </div>  (grid close)
// L13604: </div>  (Literacy close)
// L13605: </div>  (flex wrapper close — I added this)
// L13606: </div>  (Math card close — I added this)
// L13607: <div> Math probe status text

// What we need:
// L13543: </button>
// +        </div>   (flex wrapper close)
// +        </div>   (Math card close)
// L13544: <div> Literacy card (now a sibling!)
// ...
// L13603: </div>  (grid close)
// L13604: </div>  (Literacy close)
// -L13605: </div>  (REMOVE — was flex wrapper, now in wrong place)
// -L13606: </div>  (REMOVE — was Math card, now in wrong place)
// L13607: <div> Math probe status text

// Step 1: Remove the </div></div> I added after Literacy (need to find them)
// L13603 is grid close, L13604 is literacy close
// The ones I added are right after L13604

console.log('Current L13602-13610:');
for (let i = 13601; i < 13610; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]));
}

// Step 1: Remove lines at index 13604 and 13605 (L13605 and L13606)
// These are the </div> I incorrectly added after Literacy card
// Verify they are correct by checking the actual text
if (lines[13604]?.trim() === '</div>' && lines[13605]?.trim() === '</div>') {
    lines.splice(13604, 2);
    console.log('\n✅ Removed incorrectly placed </div></div> after L13604');
} else {
    console.log('\n❌ L13605-13606 are not </div> tags:');
    console.log('  L13605: ' + JSON.stringify(lines[13604]));
    console.log('  L13606: ' + JSON.stringify(lines[13605]));
}

// Step 2: Insert </div></div> at L13544 (after </button>, before Literacy card)
// Current L13543 is "</button>", L13544 is "<div> Literacy..."
if (lines[13543]?.trim().startsWith('<div className="bg-gradient-to-r from-emerald')) {
    lines.splice(13543, 0,
        '                        </div>',
        '                    </div>'
    );
    console.log('✅ Added </div></div> between button close and Literacy card');
} else {
    console.log('❌ L13544 is not the expected Literacy card:');
    console.log('  L13544: ' + JSON.stringify(lines[13543]?.substring(0, 60)));
}

console.log('\nVerification:');
console.log('Button close area:');
for (let i = 13541; i < 13550; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}
console.log('\nRAN/Grid/Literacy close area:');
for (let i = 13601; i < 13612; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\n✅ Saved! (' + lines.length + ' lines)');
