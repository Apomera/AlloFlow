"""
Fix Blend Sounds TTS pre-load: stale closure in blendingOptions polling loop.
1. Add blendingOptionsRef near the blendingOptions state
2. Update the polling loop to read blendingOptionsRef.current
3. Remove blendingOptions from the instruction effect deps
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# ===================================================================
# 1. Add blendingOptionsRef right after the blendingOptions state declaration
# ===================================================================
# Find: const [blendingOptions, setBlendingOptions] = React.useState([]);
ref_inserted = False
for i, l in enumerate(lines):
    if 'blendingOptions, setBlendingOptions' in l and 'useState' in l:
        print("Found blendingOptions state at L%d" % (i+1))
        # Insert ref sync after it
        ref_lines = [
            '    const blendingOptionsRef = React.useRef([]);\n',
            '    React.useEffect(() => { blendingOptionsRef.current = blendingOptions; }, [blendingOptions]);\n',
        ]
        for j, rl in enumerate(ref_lines):
            lines.insert(i + 1 + j, rl)
        ref_inserted = True
        changes += 1
        print("Inserted blendingOptionsRef at L%d" % (i+2))
        break

if not ref_inserted:
    print("FAIL: blendingOptions state not found")
    sys.exit(1)

# ===================================================================
# 2. Fix the polling loop to use blendingOptionsRef.current
# ===================================================================
# Find the stale closure pattern:
#   let effectiveBlendingOptions = blendingOptions;
#   if (!effectiveBlendingOptions || effectiveBlendingOptions.length === 0) {
#       for (let waitAttempt = 0; waitAttempt < 15; waitAttempt++) {
#           ...
#           if (blendingOptions && blendingOptions.length > 0) {
#               effectiveBlendingOptions = blendingOptions;
polling_fixed = False
for i, l in enumerate(lines):
    if 'let effectiveBlendingOptions = blendingOptions;' in l:
        print("Found stale let at L%d" % (i+1))
        lines[i] = l.replace(
            'let effectiveBlendingOptions = blendingOptions;',
            'let effectiveBlendingOptions = blendingOptionsRef.current;'
        )
        changes += 1
        # Fix the inner polling reads too
        for j in range(i + 1, i + 20):
            # Fix: if (blendingOptions && blendingOptions.length > 0) {
            if 'blendingOptions && blendingOptions.length > 0' in lines[j]:
                lines[j] = lines[j].replace(
                    'blendingOptions && blendingOptions.length > 0',
                    'blendingOptionsRef.current && blendingOptionsRef.current.length > 0'
                )
                print("Fixed polling read at L%d" % (j+1))
                changes += 1
            # Fix: effectiveBlendingOptions = blendingOptions;
            if 'effectiveBlendingOptions = blendingOptions;' in lines[j]:
                lines[j] = lines[j].replace(
                    'effectiveBlendingOptions = blendingOptions;',
                    'effectiveBlendingOptions = blendingOptionsRef.current;'
                )
                print("Fixed assignment in polling at L%d" % (j+1))
                changes += 1
        polling_fixed = True
        break

if not polling_fixed:
    print("WARNING: Polling stale let not found")

# ===================================================================
# 3. Remove blendingOptions from deps array
# ===================================================================
# Find the deps line: [wordSoundsActivity, currentWordSoundsWord, playInstructions, isMinimized, isolationState?.currentPosition, rhymeOptions, blendingOptions]
deps_fixed = False
for i, l in enumerate(lines):
    if 'rhymeOptions, blendingOptions]' in l:
        print("Found deps at L%d" % (i+1))
        lines[i] = l.replace(', blendingOptions]', ']')
        deps_fixed = True
        changes += 1
        print("Removed blendingOptions from deps")
        break

if not deps_fixed:
    print("WARNING: deps line not found")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("Total changes: %d" % changes)
print("DONE")
