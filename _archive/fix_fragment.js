const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// The problem: my replacement ended with <> instead of </>
// Original closing was:  )}  </>  )}
// My replacement ended:  )}  <>   )}  — missing the /

const broken = `)}
<>
          )}
      </div>
      )}
      </main>`;

const fixed = `)}
</>
          )}
      </div>
      )}
      </main>`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    console.log('✅ Fixed: Changed <> to </> (closing fragment)');
} else {
    console.log('❌ Broken pattern not found, checking area...');
    const idx = content.indexOf(')}' + '\n' + '<>');
    if (idx > -1) {
        const l = content.substring(0, idx).split('\n').length;
        const lines = content.split('\n');
        for (let i = l - 2; i < l + 6; i++) {
            console.log('L' + (i + 1) + ': |' + lines[i] + '|');
        }
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved! (' + content.length + ' bytes)');
