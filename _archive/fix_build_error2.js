const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// The portal closing is missing. Need to add it after L14937 (</div>)
// The portal close should be:
//             </div>
//         </div>,
//         document.body
//     );
// });

// Check current state
console.log('Current L14935-14940:');
for (let i = 14934; i < 14940; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// After L14937 ("                </div>"), we need to insert the portal closing
const insertAfter = 14937; // 0-indexed, this is L14938
const portalClose = [
    '            </div>',
    '        </div>,',
    '        document.body',
    '    );',
    '});'
];

lines.splice(insertAfter, 0, ...portalClose);

console.log('\nFixed L14935-14948:');
for (let i = 14934; i < 14948; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\n✅ Portal closing restored');
console.log('Saved! (' + lines.length + ' lines)');
