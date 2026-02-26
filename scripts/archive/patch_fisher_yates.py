"""
Replace all naive .sort(() => Math.random() - 0.5) shuffles with fisherYatesShuffle().
Also injects a top-level fisherYatesShuffle utility function.

Strategy:
1. Add fisherYatesShuffle() utility near the DEBUG_LOG constant (line ~128)
2. Replace patterns:
   a. [...arr].sort(() => Math.random() - 0.5)  →  fisherYatesShuffle(arr)
   b. [...arr].sort(() => 0.5 - Math.random())  →  fisherYatesShuffle(arr)
   c. arr.sort(() => Math.random() - 0.5)        →  fisherYatesShuffle(arr)  (mutating)
   d. arr.sort(() => 0.5 - Math.random())        →  fisherYatesShuffle(arr)  (mutating)
   
Note: The function always returns a NEW array (non-mutating), matching [...arr].sort() behavior.
For cases where .sort() was chained with .slice(), we preserve the .slice().
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Inject fisherYatesShuffle utility after DEBUG_LOG / debugLog / warnLog lines
# Find the warnLog definition to insert after it
INJECT_AFTER = 'const warnLog = (...args) => { if (DEBUG_LOG) console.warn(...args); };'
UTILITY_FN = '''

// Utility: Fisher-Yates (Knuth) shuffle — O(n), unbiased, returns a NEW array
const fisherYatesShuffle = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};'''

if INJECT_AFTER in content:
    content = content.replace(INJECT_AFTER, INJECT_AFTER + UTILITY_FN, 1)
    print("✅ Injected fisherYatesShuffle utility function")
else:
    print("❌ Could not find injection point for utility function!")
    exit(1)

# Step 2: Replace all naive shuffle patterns
# We handle several structural patterns:

count = 0

# Pattern A: [...EXPR].sort(() => Math.random() - 0.5) → fisherYatesShuffle(EXPR)
# Pattern B: [...EXPR].sort(() => 0.5 - Math.random()) → fisherYatesShuffle(EXPR)
# These return new arrays already (spread + sort)

# Pattern C: EXPR.sort(() => Math.random() - 0.5) → fisherYatesShuffle(EXPR) (was mutating, now copies)
# Pattern D: EXPR.sort(() => 0.5 - Math.random()) → fisherYatesShuffle(EXPR) (was mutating, now copies)

lines = content.split('\n')
new_lines = []

for i, line in enumerate(lines):
    original = line
    
    # Skip the derangeShuffle function itself (it uses Fisher-Yates internally)
    if 'derangeShuffle' in line or 'derangement' in line.lower():
        new_lines.append(line)
        continue
    
    # Check if this line has a naive shuffle
    if ('.sort(() => Math.random() - 0.5)' in line or 
        '.sort(() => 0.5 - Math.random())' in line):
        
        # Sub-pattern: [...EXPR].sort(() => ...) or [...EXPR].sort(() => ...)
        # Replace with fisherYatesShuffle(EXPR)
        
        # Match: [...SOMETHING].sort(() => Math.random() - 0.5)
        # or:    [...SOMETHING].sort(() => 0.5 - Math.random())
        pattern_spread = r'\[\.\.\.(\w+(?:\.\w+)*(?:\([^)]*\))?)\]\.sort\(\(\) => (?:Math\.random\(\) - 0\.5|0\.5 - Math\.random\(\))\)'
        
        match = re.search(pattern_spread, line)
        if match:
            old = match.group(0)
            expr = match.group(1)
            new = f'fisherYatesShuffle({expr})'
            line = line.replace(old, new, 1)
            count += 1
            print(f"  L{i+1}: [...{expr}].sort(...) → fisherYatesShuffle({expr})")
        else:
            # Match: SOMETHING.sort(() => Math.random() - 0.5)
            # We need to find what's before .sort(...)
            pattern_direct = r'(\b\w+(?:\.\w+)*)\s*\.sort\(\(\) => (?:Math\.random\(\) - 0\.5|0\.5 - Math\.random\(\))\)'
            match2 = re.search(pattern_direct, line)
            if match2:
                old = match2.group(0)
                expr = match2.group(1)
                new = f'fisherYatesShuffle({expr})'
                line = line.replace(old, new, 1)
                count += 1
                print(f"  L{i+1}: {expr}.sort(...) → fisherYatesShuffle({expr})")
            else:
                # Complex expression before .sort — handle manually
                # Match everything .sort(...) - capture the sort call only
                sort_pattern = r'\.sort\(\(\) => (?:Math\.random\(\) - 0\.5|0\.5 - Math\.random\(\))\)'
                match3 = re.search(sort_pattern, line)
                if match3:
                    # Can't easily extract the expression, just flag it
                    print(f"  ⚠️  L{i+1}: Complex pattern, needs manual review: {line.strip()[:80]}")
                    # Don't modify, leave as-is for safety
    
    new_lines.append(line)

content = '\n'.join(new_lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Total replacements: {count}")
print(f"Remaining naive shuffles: {content.count('Math.random() - 0.5') + content.count('0.5 - Math.random()')}")
print(f"fisherYatesShuffle usages: {content.count('fisherYatesShuffle(')}")
