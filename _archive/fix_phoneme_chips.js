const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// FIX 1: Add `used: false` to generateSoundChips correct chips
// Current (L6028-6033):
//   return { id: `correct-${i}-${Date.now()}`, phoneme: p, isDistractor: false, color: ... };
// Fix: add `used: false` property
const oldCorrectChip = `return {
                id: \`correct-\${i}-\${Date.now()}\`,
                phoneme: p,
                isDistractor: false,
                color: getPastelColor(chipCount, 12)
            };`;

const newCorrectChip = `return {
                id: \`correct-\${i}-\${Date.now()}\`,
                phoneme: p,
                isDistractor: false,
                used: false,
                color: getPastelColor(chipCount, 12)
            };`;

if (content.includes(oldCorrectChip)) {
    content = content.replace(oldCorrectChip, newCorrectChip);
    console.log('✅ Added used:false to correct chips in generateSoundChips');
    changes++;
} else {
    console.log('❌ correct chip anchor not found');
}

// FIX 2: Add `used: false` to generateSoundChips distractor chips
const oldDistractorChip = `distractors.push({
                    id: \`distractor-\${distractors.length}-\${Date.now()}\`,
                    phoneme: p,
                    isDistractor: true,
                    color: getPastelColor(chipCount + 5, 12)
                });`;

const newDistractorChip = `distractors.push({
                    id: \`distractor-\${distractors.length}-\${Date.now()}\`,
                    phoneme: p,
                    isDistractor: true,
                    used: false,
                    color: getPastelColor(chipCount + 5, 12)
                });`;

if (content.includes(oldDistractorChip)) {
    content = content.replace(oldDistractorChip, newDistractorChip);
    console.log('✅ Added used:false to distractor chips in generateSoundChips');
    changes++;
} else {
    console.log('❌ distractor chip anchor not found');
}

// FIX 3: Add `isDistractor: false` to generateUniqueSoundChips correct chips (consistency)
// Current (L7132-7138): creates {id, phoneme, type: 'correct', color, used: false}
// Fix: add isDistractor: false for consistency
const oldUniqueCorrect = `phoneme: (p || '').trim(),
            type: 'correct',
            color: '#f0f9ff',
            used: false`;

const newUniqueCorrect = `phoneme: (p || '').trim(),
            type: 'correct',
            isDistractor: false,
            color: '#f0f9ff',
            used: false`;

if (content.includes(oldUniqueCorrect)) {
    content = content.replace(oldUniqueCorrect, newUniqueCorrect);
    console.log('✅ Added isDistractor:false to unique correct chips');
    changes++;
} else {
    console.log('❌ unique correct chip anchor not found');
}

// FIX 4: Add `isDistractor: true, used: false` to generateUniqueSoundChips distractor chips
const oldUniqueDistractor = `phoneme: p,
                    type: 'distractor',
                    color: '#f8fafc',
                    used: false`;

const newUniqueDistractor = `phoneme: p,
                    type: 'distractor',
                    isDistractor: true,
                    color: '#f8fafc',
                    used: false`;

if (content.includes(oldUniqueDistractor)) {
    content = content.replace(oldUniqueDistractor, newUniqueDistractor);
    console.log('✅ Added isDistractor:true to unique distractor chips');
    changes++;
} else {
    console.log('❌ unique distractor chip anchor not found');
}

// FIX 5: Ensure the first probe word's phonemes are always loaded by 
// removing the guard that skips chip initialization when boxes are already set.
// The guard at L7181 prevents re-initialization if boxes already match —
// but on the first word, the advance path at L8329-8332 may have already set them.
// Fix: Change guard to also check if soundChips is empty
const oldGuard = `if (elkoninBoxes.length === 0 || elkoninBoxes.length !== effectiveCount) {`;
const newGuard = `if (elkoninBoxes.length === 0 || elkoninBoxes.length !== effectiveCount || soundChips.length === 0) {`;

if (content.includes(oldGuard)) {
    content = content.replace(oldGuard, newGuard);
    console.log('✅ Added soundChips.length === 0 guard for first word initialization');
    changes++;
} else {
    console.log('❌ guard anchor not found');
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
