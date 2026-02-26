"""
Fix the generatedContent TDZ (Temporal Dead Zone) error.

The `const [generatedContent, setGeneratedContent] = useState(null);` is at L36506
but it's referenced starting at L33365 inside AlloFlowContent.

Fix: Move the declaration from L36506 to just before L33355 (above handleStudentInput
which is the function before handleResetScaffolds, the first reference).
"""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the exact declaration line
decl_line = None
decl_idx = None
for i, line in enumerate(lines):
    if 'const [generatedContent, setGeneratedContent] = useState(null);' in line:
        decl_line = line
        decl_idx = i
        print(f"  Found declaration at L{i+1}: {line.strip()}")
        break

if decl_idx is None:
    print("  ❌ Declaration not found!")
    exit(1)

# Find the insertion point - just before handleStudentInput (L33355)
insert_idx = None
for i, line in enumerate(lines):
    if 'const handleStudentInput = (resourceId, questionKey, value) =>' in line:
        insert_idx = i
        print(f"  Will insert before L{i+1}: {line.strip()[:80]}")
        break

if insert_idx is None:
    # Fallback: find first reference to generatedContent after AlloFlowContent start
    for i, line in enumerate(lines):
        if 'const AlloFlowContent' in line:
            start = i
            break
    for i in range(start, decl_idx):
        if 'generatedContent' in lines[i] and 'useState' not in lines[i]:
            insert_idx = i - 1
            print(f"  Fallback: will insert before L{i}: {lines[i-1].strip()[:80]}")
            break

if insert_idx is None or insert_idx >= decl_idx:
    print("  ❌ Could not find valid insertion point!")
    exit(1)

# Remove the declaration from its current position
removed_line = lines.pop(decl_idx)
print(f"  Removed from L{decl_idx+1}")

# Insert at the new position (adjust index since we removed a line)
if insert_idx > decl_idx:
    insert_idx -= 1

lines.insert(insert_idx, removed_line)
print(f"  Inserted at L{insert_idx+1}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\n✅ Moved generatedContent useState from L{decl_idx+1} to L{insert_idx+1}")

# Verify: check that the declaration now comes before all references
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

decl_line_num = None
for i, line in enumerate(lines):
    if 'const [generatedContent, setGeneratedContent] = useState(null);' in line:
        decl_line_num = i + 1
        break

first_ref = None
for i, line in enumerate(lines):
    if i + 1 == decl_line_num:
        continue
    if 'generatedContent' in line and 'AlloFlowContent' not in line and i > 32000:
        first_ref = i + 1
        break

if decl_line_num and first_ref:
    if decl_line_num < first_ref:
        print(f"  ✅ Declaration at L{decl_line_num} is before first reference at L{first_ref}")
    else:
        print(f"  ❌ Declaration at L{decl_line_num} is AFTER first reference at L{first_ref}!")
