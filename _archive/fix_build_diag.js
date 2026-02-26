const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let lines = fs.readFileSync(f, 'utf8').split('\n');

// The problem: Our button nesting fix at L13543-13545 added:
//   </button>   ← CORRECT - button was unclosed
//   </div>      ← WRONG - premature close of flex wrapper  
//   </div>      ← WRONG - premature close of card wrapper
//
// The original structure had these wrappers closed LATER (at the orphan location
// that we already removed). We need to remove L13544-13545 (the two </div>).
//
// The button fix should have ONLY added </button>, not </div></div>.

console.log('Before (L13540-13550):');
for (let i = 13539; i < 13550; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// Remove lines at index 13543 and 13544 (which are L13544 and L13545: </div> </div>)
lines.splice(13543, 2);

console.log('\nAfter (L13540-13550):');
for (let i = 13539; i < 13550; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// Now restore the orphan closings at what was old L13605 location
// (which we previously removed). They belong AFTER the Literacy Fluency
// section closes. Find the RAN button closing and add </div></div> after it.

// The structure should be:
//   </button>  ← closes Start Math Probe (L13543, our fix)
//   [Literacy Fluency Probes section starts here as sibling]
//   ...
//   </button>  ← closes RAN button
//   </div>     ← closes grid
//   </div>     ← closes Literacy card
//   </div>     ← closes flex wrapper (for math probe grade/form/button)
//   </div>     ← closes Math Fluency Probe card (from-orange-50)

// But wait — the Literacy Fluency Probes card is a SIBLING of the Math card,
// so only the Math card's </div></div> need to go before Literacy,
// while Literacy has its own opening/closing.

// Actually, let me re-read the original structure:
// The bug was: Start Math Probe <button> was never closed, so everything
// after it (Literacy section) was inside the button.
// 
// Solution: ONLY close the button. The wrapping divs for Math probe
// (flex wrapper and card) should remain open and close where ORIGINALLY intended.
// But we also removed the original closings for those divs...
// 
// So we need to add back: </div></div> somewhere after the button but 
// before the next sibling section.

// Actually, looking more carefully at the original:
// L13462: <div> Math Fluency card
// L13469: <div> flex wrapper
// L13505: <button> Start Math Probe
// [No </button> - the bug]
// L13544: <div> Literacy section (was INSIDE button)
// ...
// L13605-original: </button> </div>  ← these were the orphan closings
//
// The orphan </button></div> means the original code closed:
// 1) </button> for Start Math Probe
// 2) </div> for the flex wrapper
// And the CARD </div> for Math Fluency was closed even later
//
// But we removed the orphan, added </button> at L13543.
// So we need to add back </div> (flex wrapper close) and find where
// the card close was.

// Let me look at what the Literacy section STARTS with
// L13546: <div> Literacy Fluency card - this is a SIBLING of Math card  
// For it to be a sibling, the Math card must be closed before it.
// So we need </div></div> between Start Math Probe button and Literacy section:
//   </button>  ← L13543
//   </div>     ← close flex wrapper
//   </div>     ← close Math Fluency card  
//   <div>      ← Literacy Fluency card (L13546 ← was L13546 after removing 2 lines becomes L13544)

// Wait but I just removed those 2 lines! They WERE correct!
// The issue is something different. Let me add them back.

// Put them back
lines.splice(13543, 0, '                        </div>', '                    </div>');

console.log('\nRestored (L13540-13550):');
for (let i = 13539; i < 13550; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// The actual problem must be that we removed TOO MANY lines from the portal
// close area. We removed 5 lines but should have only removed what was
// NEWLY duplicated by our fix. The originals were:
//   )}      ← conditional close
//   </div>  ← something
//   </div>  ← something
//   )}      ← conditional close
//   </div>  ← portal inner
//   </div>, ← portal outer
//   document.body
//   );
//   });

// But now we have:
//   L14933: </div>
//   L14934: (empty)
//   L14935: )}
//   L14936: </div>
//   L14937: </div>
//   L14938: </div>     ← we added this
//   L14939: </div>,    ← we added this
//   L14940: document.body
//   L14941: );
//   L14942: });

// Hmm, the problem is we may have removed the original portal-close closings
// and then re-added them, but the COUNT is still wrong.

// Let me print the real current state
console.log('\nFull portal area (L14930-14948):');
for (let i = 14929; i < 14948; i++) {
    console.log('L' + (i + 1) + ': ' + JSON.stringify(lines[i]?.substring(0, 80)));
}

// DON'T save yet - just diagnostics
console.log('\n=== NO CHANGES SAVED - diagnostics only ===');
