const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// The duplicate closings are at L14938-14943:
// L14938: "                )}"
// L14939: "                                </div>"
// L14940: "                            )}"
// L14941: "                        </div>"
// L14942: "                    </div>"
// L14943: "                )}"
// These are exact duplicates of L14933-14937 (the original closings)
// We need to remove L14938-14943 (lines index 14937-14942)

console.log('Before fix:');
for (let i = 14930; i < 14950; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 60)));
}

// Remove lines 14938-14943 (index 14937-14942 = 6 lines)
lines.splice(14937, 5); // Remove 5 lines (the duplicate )}  </div>  )}  </div>  </div>)

console.log('\nAfter fix:');
for (let i = 14930; i < 14945; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 60)));
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('\n✅ Removed 5 duplicate closing lines');
console.log('Saved! (' + lines.length + ' lines)');
