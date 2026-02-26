const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const before = content.split('\n').length;

// MINIMAL button fix: ONLY close the button, don't touch div nesting.
// The original had:
//   ▶ Start Math Probe\n\n<div>Literacy  (button unclosed, Literacy inside button)
//   ...
//   </button>   ← orphan at L13535
//   </div>      ← flex wrapper close at L13536
//
// The fix: Add </button> after text, remove orphan </button>.
// DON'T add any </div> — the original div nesting is correct.

// Step 1: Close the button properly after text
const old1 = '▶ Start Math Probe\n\n                    <div className="bg-gradient-to-r from-emerald-50';
const new1 = '▶ Start Math Probe\n                            </button>\n                    <div className="bg-gradient-to-r from-emerald-50';

if (content.includes(old1)) {
    content = content.replace(old1, new1);
    console.log('✅ Step 1: Added </button> after Start Math Probe');
} else {
    console.log('❌ Step 1');
    process.exit(1);
}

// Step 2: Remove ONLY the orphan </button>, keep the </div> after it
const old2 = '                    </div>\n                            </button>\n                        </div>\n                        <div className="mt-2';
const new2 = '                    </div>\n                        </div>\n                        <div className="mt-2';

if (content.includes(old2)) {
    content = content.replace(old2, new2);
    console.log('✅ Step 2: Removed orphan </button> only, kept </div>');
} else {
    console.log('❌ Step 2 - checking alternate pattern');
    // Show what's around the orphan
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes('Rapid Automatized Naming')) {
            console.log('RAN area:');
            for (let j = i; j < i + 15; j++) {
                console.log('L' + (j + 1) + ': ' + JSON.stringify(lines[j]?.substring(0, 60)));
            }
            break;
        }
    }
}

const after = content.split('\n').length;
console.log('\nLines: ' + before + ' → ' + after + ' (delta: ' + (after - before) + ')');

fs.writeFileSync(f, content, 'utf8');
console.log('Saved!');
