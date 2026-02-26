const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// FIX 1: Remove stray )} at L62107
// L62105 is )}  (closing the word-sounds preview)
// L62106 is empty
// L62107 is )} ← THIS IS THE STRAY ONE
console.log('L62105:', lines[62104]?.trim());
console.log('L62106:', lines[62105]?.trim());
console.log('L62107:', lines[62106]?.trim());
console.log('L62108:', lines[62107]?.trim().substring(0, 80));

if (lines[62106]?.trim() === ')}') {
    lines.splice(62106, 1); // Remove the stray )}
    console.log('FIX 1: Removed stray )} at L62107');
} else {
    console.log('FIX 1: L62107 is not ")}" - checking alternatives');
    // Check nearby lines
    for (let i = 62100; i < 62115; i++) {
        if (lines[i]?.trim() === ')}' && lines[i - 1]?.trim() === '') {
            console.log('Found stray )} at L' + (i + 1));
            lines.splice(i, 1);
            console.log('Removed it');
            break;
        }
    }
}

// FIX 2: The modal at the end needs its )} closing
// Currently it's:  </div>\n</div>\n\n</>
// It should be:    </div>\n</div>\n)}\n</>
// Find the last </> and check what's before it
const rejoined = lines.join('\n');
const lastFragClose = rejoined.lastIndexOf('</>');
const beforeFrag = rejoined.substring(lastFragClose - 100, lastFragClose);
console.log('\nBefore </>:', JSON.stringify(beforeFrag.split('\n').slice(-3)));

// Find the actual line
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]?.trim() === '</>') {
        console.log('Found </> at L' + (i + 1));
        // Check if the line before it has )}
        const prevTrimmed = lines[i - 1]?.trim();
        console.log('Line before: "' + prevTrimmed + '"');
        if (prevTrimmed !== ')}') {
            // Need to insert )} before </>
            lines.splice(i, 0, ')}');
            console.log('FIX 2: Inserted )} before </>');
        } else {
            console.log('FIX 2: )} already present');
        }
        break;
    }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\nSaved! (' + lines.join('\n').length + ' bytes)');
