const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let lines = content.split('\n');
console.log('Starting lines:', lines.length);

// Current state: Our fix has:
//   L13537: ▶ Start Math Probe
//   L13538: </button>    ← good
//   L13539: </div>       ← premature flex close
//   L13540: </div>       ← premature card close  
//   L13541: <div> Literacy card
//   ...
//   L13601: </div> Literacy close
//   L13602: <div> status text  (the orphan </button></div> was removed)
//
// Need to change to:
//   L13537: ▶ Start Math Probe  
//   L13538: </button>    ← keep
//   L13539: <div> Literacy (remove the two </div>)
//   ...
//   L13599: </div> Literacy close
//   +       </div> restore flex wrapper close (was removed as "orphan")
//   L13600: <div> status text

// Step 1: Remove the two </div> between </button> and Literacy card
const oldButtonArea = `▶ Start Math Probe
                            </button>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50`;

const newButtonArea = `▶ Start Math Probe
                            </button>
                    <div className="bg-gradient-to-r from-emerald-50`;

if (content.includes(oldButtonArea)) {
    content = content.replace(oldButtonArea, newButtonArea);
    console.log('✅ Removed extra </div></div> after button close');
} else {
    console.log('❌ Button area pattern not found');
    // Debug
    for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.includes('Start Math Probe')) {
            for (let j = i; j < i + 8; j++) {
                console.log('L' + (j + 1) + ': ' + JSON.stringify(lines[j]));
            }
            break;
        }
    }
    process.exit(1);
}

// Step 2: Restore the </div> (flex wrapper close) between Literacy close and status text
// Currently: </div>\n<div> status text
// Need:     </div>\n</div>\n<div> status text
const oldOrphanArea = `                    </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-semibold">`;
const newOrphanArea = `                    </div>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-semibold">`;

if (content.includes(oldOrphanArea)) {
    content = content.replace(oldOrphanArea, newOrphanArea);
    console.log('✅ Restored </div> (flex wrapper close) before status text');
} else {
    console.log('❌ Orphan area pattern not found');
    // Debug: find status text area
    const ls = content.split('\n');
    for (let i = 0; i < ls.length; i++) {
        if (ls[i]?.includes('mt-2 text-[10px] text-slate-400 font-semibold')) {
            for (let j = i - 3; j < i + 3; j++) {
                console.log('L' + (j + 1) + ': ' + JSON.stringify(ls[j]?.substring(0, 70)));
            }
            break;
        }
    }
}

const newLines = content.split('\n').length;
console.log('\nLines: ' + lines.length + ' → ' + newLines + ' (delta: ' + (newLines - lines.length) + ')');

fs.writeFileSync(f, content, 'utf8');
console.log('Saved!');
