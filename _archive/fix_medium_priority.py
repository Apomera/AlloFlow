"""
Apply Medium-Priority Fixes to WordSoundsModal:
FIX 1: Add isMountedRef + useEffect cleanup + wrap 12 setTimeout state updates
FIX 2: Replace error-only else branches with setPreloadedWords fallback
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'
changes = []

# ══════════════════════════════════════════════════════════════
# FIX 1: Add isMountedRef after existing refs in WordSoundsModal
# ══════════════════════════════════════════════════════════════

# Find a good insertion point - right after the existing refs/state declarations
# The modal starts at line 3059 (const WordSoundsModal = ({)
# and first state declarations are around L3310

# Find the latestRequestedWord ref at L3134
inserted_ref = False
for i in range(3130, 3200):
    if 'latestRequestedWord' in lines[i] and 'useRef' in lines[i]:
        # Insert isMountedRef after this line
        new_line = '    const isMountedRef = React.useRef(true); // Guard against unmounted state updates' + le
        lines.insert(i + 1, new_line)
        changes.append(f"FIX 1a: Inserted isMountedRef at L{i+2}")
        inserted_ref = True
        break

if not inserted_ref:
    print("WARNING: Could not find latestRequestedWord ref for insertion")
    # Fallback: search more broadly
    for i in range(3100, 3250):
        if 'useRef(null)' in lines[i] and 'latestRequested' in lines[i]:
            lines.insert(i + 1, '    const isMountedRef = React.useRef(true); // Guard against unmounted state updates' + le)
            changes.append(f"FIX 1a: Inserted isMountedRef at L{i+2} (fallback)")
            inserted_ref = True
            break

if not inserted_ref:
    print("ERROR: Could not insert isMountedRef")

# Now add the cleanup useEffect
# Find a good spot after state declarations - look for first useEffect in the modal
for i in range(3200, 3400):
    if 'React.useEffect' in lines[i] or 'useEffect(' in lines[i]:
        # Insert cleanup useEffect BEFORE this one
        cleanup = [
            le,
            '    // Cleanup: Mark as unmounted to prevent stale state updates from timers' + le,
            '    React.useEffect(() => {' + le,
            '        isMountedRef.current = true;' + le,
            '        return () => { isMountedRef.current = false; };' + le,
            '    }, []);' + le,
        ]
        for idx, cl in enumerate(cleanup):
            lines.insert(i + idx, cl)
        changes.append(f"FIX 1b: Inserted isMountedRef cleanup useEffect before L{i+1}")
        break

# ══════════════════════════════════════════════════════════════
# FIX 1c: Wrap the 12 unguarded setTimeout state updates
# ══════════════════════════════════════════════════════════════

# List of exact setTimeout patterns to wrap with isMountedRef guards
# We need to find these lines and add guards

# Pattern: setTimeout(() => setSomething(value), delay);
# Becomes: setTimeout(() => { if (isMountedRef.current) setSomething(value); }, delay);

import re

timeout_patterns = [
    ('setErrorMessage(null)', 'setErrorMessage'),
    ('setShakenWord(null)', 'setShakenWord'),
    ('setWordSoundsFeedback?.(null)', 'setWordSoundsFeedback'),
    ('setIsCelebrating(false)', 'setIsCelebrating'),
    ('setShowSessionComplete(true)', 'setShowSessionComplete'),
    ('setShowLetterHints(false)', 'setShowLetterHints'),
    ("setWordSoundsActivity('orthography')", 'setWordSoundsActivity'),
]

# Find WordSoundsModal boundaries (adjusted for inserted lines)
ws_start = None
for i, line in enumerate(lines):
    if 'const WordSoundsModal' in line and '({' in line:
        ws_start = i
        break
ws_end = 31020  # rough end

guard_count = 0
for i in range(ws_start or 3050, ws_end):
    if i >= len(lines):
        break
    line = lines[i]
    
    # Match: setTimeout(() => setX(...), delay);  (simple one-liner)
    for pattern_text, setter_name in timeout_patterns:
        if 'setTimeout' in line and pattern_text in line and 'isMountedRef' not in line:
            # Wrap the setter call with isMountedRef guard
            old = pattern_text
            new = f'{{ if (isMountedRef.current) {pattern_text}; }}'
            # But we need to handle the arrow function syntax
            # Original: setTimeout(() => setX(val), delay);
            # Target:   setTimeout(() => { if (isMountedRef.current) setX(val); }, delay);
            
            # Replace: `=> setSomething` with `=> { if (isMountedRef.current) setSomething`
            # And add closing brace
            old_arrow = f'=> {pattern_text}'
            new_arrow = f'=> {{ if (isMountedRef.current) {pattern_text}; }}'
            
            if old_arrow in lines[i]:
                lines[i] = lines[i].replace(old_arrow, new_arrow)
                guard_count += 1
                changes.append(f"FIX 1c: Guarded {setter_name} at ~L{i+1}")

# Handle the two multi-line setTimeout blocks (L7705 and L9443, L9568)
# These need a different approach - add guard at the top of the callback
for i in range(ws_start or 3050, ws_end):
    if i >= len(lines):
        break
    line = lines[i]
    
    if 'setTimeout(() => {' in line and 'isMountedRef' not in line:
        # Check if next few lines have a state setter
        block = ''.join(lines[i:min(i+8, len(lines))])
        if any(x in block for x in ['setWordSoundsActivity', 'setShowLetterHints', 'setIsCelebrating', 
                                      'setShowSessionComplete', 'setWordSoundsFeedback']):
            # Find the opening brace line and add guard
            for j in range(i, min(i+2, len(lines))):
                if 'setTimeout(() => {' in lines[j]:
                    # Add isMountedRef guard as first line inside the callback
                    indent = '                '  # Match typical indent
                    guard_line = indent + 'if (!isMountedRef.current) return;' + le
                    lines.insert(j + 1, guard_line)
                    guard_count += 1
                    changes.append(f"FIX 1c: Guarded multi-line setTimeout at ~L{j+1}")
                    break

changes.append(f"FIX 1c: Total guards added: {guard_count}")

# ══════════════════════════════════════════════════════════════
# FIX 2: Replace error-only else branches with setPreloadedWords fallback
# ══════════════════════════════════════════════════════════════

# Pattern: } else {
#              console.error("❌ REORDER FAILED: setWsPreloadedWords is undefined!");
#          }
# Replace with:
# } else {
#     setPreloadedWords(newOrder);  // Fallback to local alias
#     console.warn("⚠️ REORDER: Using local fallback (won't persist across unmount)");
# }

fix2_patterns = [
    {
        'search': '            console.error("❌ REORDER FAILED: setWsPreloadedWords is undefined!");',
        'replace': [
            '            setPreloadedWords(newOrder);  // Fallback to local alias' + le,
            '            console.warn("⚠️ REORDER: Using local fallback (won\'t persist across unmount)");' + le,
        ],
        'name': 'REORDER',
    },
    {
        'search': '            console.error("❌ UPDATE FAILED: setWsPreloadedWords is undefined!");',
        'replace': [
            '            setPreloadedWords(prev => {' + le,
            '                const prevArray = Array.isArray(prev) ? prev : [];' + le,
            '                const updated = [...prevArray];' + le,
            '                if (index >= 0 && index < updated.length) {' + le,
            '                    updated[index] = { ...updated[index], ...newData };' + le,
            '                }' + le,
            '                return updated;' + le,
            '            });' + le,
            '            console.warn("⚠️ UPDATE: Using local fallback (won\'t persist across unmount)");' + le,
        ],
        'name': 'UPDATE',
    },
    {
        'search': '            console.error("❌ DELETE FAILED: No setter available! Please check wsPreloadedWords prop.");',
        'replace': [
            '            setPreloadedWords(prev => {' + le,
            '                const prevArray = Array.isArray(prev) ? prev : [];' + le,
            '                return prevArray.filter((_, i) => i !== idx);' + le,
            '            });' + le,
            '            console.warn("⚠️ DELETE: Using local fallback (won\'t persist across unmount)");' + le,
        ],
        'name': 'DELETE',
    },
]

for fix in fix2_patterns:
    search = fix['search']
    for i in range(len(lines)):
        if search in lines[i]:
            # Replace this line with the fallback lines
            lines[i:i+1] = fix['replace']
            changes.append(f"FIX 2: Added {fix['name']} fallback at ~L{i+1}")
            break

# ══════════════════════════════════════════════════════════════
# Write results
# ══════════════════════════════════════════════════════════════
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

print(f"\nApplied {len(changes)} changes:")
for c in changes:
    print(f"  ✅ {c}")

# Quick verify
f = open(FILE, 'r', encoding='utf-8-sig')
verify = f.read()
f.close()

checks = [
    ('isMountedRef', 'isMountedRef declaration'),
    ('isMountedRef.current = false', 'cleanup useEffect'),
    ('if (isMountedRef.current)', 'setTimeout guards'),
    ('Using local fallback', 'setPreloadedWords fallbacks'),
]
print("\nVerification:")
for pattern, label in checks:
    count = verify.count(pattern)
    status = "✅" if count > 0 else "❌"
    print(f"  {status} {label}: {count} occurrences")
