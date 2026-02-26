const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// The problem: "▶ Start Math Probe" button at L13540-13542 has no </button>
// The literacy section goes inside it, then a stray </button> at L13605 closes it.
// 
// Fix: Close the math probe button properly AND remove the stray orphan

// The broken structure is:
// ...className="..."> ▶ Start Math Probe<newline>
// <div>Literacy Fluency Probes</div>
// </button>  ← stray orphan
// </div>

const brokenStructure = `▶ Start Math Probe

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-4 border border-emerald-200">`;

const fixedStructure = `▶ Start Math Probe
                            </button>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-4 border border-emerald-200">`;

if (content.includes(brokenStructure)) {
    content = content.replace(brokenStructure, fixedStructure);
    console.log('✅ FIX 1: Closed Start Math Probe button + added missing wrapper closings');
    changes++;
} else {
    console.log('❌ FIX 1: Broken structure anchor not found');
}

// Now remove the orphan </button> and </div> at L13605-13606
// After the literacy probes section closes at </div> (L13604), 
// there's a stray:  </button>\n</div>
const orphanClosing = `                    </div>
                            </button>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-semibold">`;

const orphanFixed = `                    </div>
                        <div className="mt-2 text-[10px] text-slate-400 font-semibold">`;

if (content.includes(orphanClosing)) {
    content = content.replace(orphanClosing, orphanFixed);
    console.log('✅ FIX 2: Removed orphan </button></div> between literacy probes and math probe status');
    changes++;
} else {
    console.log('❌ FIX 2: Orphan closing anchor not found');
    // Try to find what's actually there
    const lines = content.split('\n');
    for (let i = 13600; i < 13620; i++) {
        if (lines[i]) console.log('  L' + (i + 1) + ': ' + JSON.stringify(lines[i].substring(0, 80)));
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
