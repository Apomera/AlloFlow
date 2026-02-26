import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Block 4: Lines ~6351 to filter out homophones in Blend Sounds distractors
old_block_4 = """            const seed = wordLower.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const shuffled = [...commonWords].sort((a, b) => {
                const hashA = (seed * a.charCodeAt(0)) % 100;
                const hashB = (seed * b.charCodeAt(0)) % 100;
                return hashA - hashB;
            });
            for (const w of shuffled) {
                if (w !== wordLower && Math.abs(w.length - wordLower.length) <= 1 && blendingDistractors.length < 5) {
                    blendingDistractors.push(w);
                }
            }"""

new_block_4 = """            const seed = wordLower.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const shuffled = [...commonWords].sort((a, b) => {
                const hashA = (seed * a.charCodeAt(0)) % 100;
                const hashB = (seed * b.charCodeAt(0)) % 100;
                return hashA - hashB;
            });
            
            const homophonePairs = {
                'sun': ['son'], 'son': ['sun'],
                'ate': ['eight'], 'eight': ['ate'],
                'sea': ['see', 'c'], 'see': ['sea', 'c'],
                'two': ['to', 'too'], 'to': ['two', 'too'], 'too': ['to', 'two'],
                'red': ['read'], 'read': ['red'],
                'blue': ['blew'], 'blew': ['blue'],
                'one': ['won'], 'won': ['one'],
                'bear': ['bare'], 'bare': ['bear'],
                'deer': ['dear'], 'dear': ['deer'],
                'eye': ['i'], 'i': ['eye'],
                'know': ['no'], 'no': ['know'],
                'right': ['write'], 'write': ['right']
            };

            for (const w of shuffled) {
                const isHomophone = homophonePairs[wordLower] && homophonePairs[wordLower].includes(w);
                if (w !== wordLower && !isHomophone && Math.abs(w.length - wordLower.length) <= 1 && blendingDistractors.length < 5) {
                    blendingDistractors.push(w);
                }
            }"""


if old_block_4 in text:
    text = text.replace(old_block_4, new_block_4)
    print("Patched Blend Sounds Homophone Filter logic")
else:
    print("Could not find the target text block for Homophones.")


# I also noticed around 6401 there's a React useEffect `repairBlendingDistractors` that does another filter.
# I'll update that repair block too, just in case a homophone sneaks in through pre-loaded data.
old_block_5 = """                let uniqueDistractors = [...new Set(
                    rawDistractors
                        .map(d => (d || '').toString().trim().toLowerCase())
                        .filter(d => d && d !== targetToCheck)
                )];"""

new_block_5 = """                const hpMap = {
                    'sun': ['son'], 'son': ['sun'],
                    'ate': ['eight'], 'eight': ['ate'],
                    'sea': ['see', 'c'], 'see': ['sea', 'c'],
                    'two': ['to', 'too'], 'to': ['two', 'too'], 'too': ['to', 'two'],
                    'red': ['read'], 'read': ['red'],
                    'blue': ['blew'], 'blew': ['blue'],
                    'one': ['won'], 'won': ['one'],
                    'bear': ['bare'], 'bare': ['bear'],
                    'deer': ['dear'], 'dear': ['deer'],
                    'eye': ['i'], 'i': ['eye'],
                    'know': ['no'], 'no': ['know'],
                    'right': ['write'], 'write': ['right']
                };
                let uniqueDistractors = [...new Set(
                    rawDistractors
                        .map(d => (d || '').toString().trim().toLowerCase())
                        .filter(d => d && d !== targetToCheck && !(hpMap[targetToCheck] && hpMap[targetToCheck].includes(d)))
                )];"""

if old_block_5 in text:
    text = text.replace(old_block_5, new_block_5)
    print("Patched Blend Sounds React useEffect Homophone repair")
else:
    print("Could not find block 5.")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
