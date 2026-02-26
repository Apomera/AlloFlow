"""
Tier 2b: Extract toggle onClick handlers to useCallback.
Targets: onClick={() => setXxx(!xxx)} patterns.
Same safety approach as v2: scan all names, validate, then apply.
"""
import re
from collections import Counter

INPUT = 'AlloFlowANTI.txt'
REPORT = 'tier2b_report.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append("=== Tier 2b: Toggle Handler Extraction ===")
    report.append(f"Input: {len(content):,} bytes, {len(lines):,} lines")

    # Step 1: Collect ALL existing identifier names
    existing_names = set()
    for line in lines:
        for m in re.finditer(r'(?:const|let|var)\s+(\w+)', line):
            existing_names.add(m.group(1))
        for m in re.finditer(r'function\s+(\w+)', line):
            existing_names.add(m.group(1))

    report.append(f"Existing identifiers: {len(existing_names)}")

    # Step 2: Find toggle patterns
    # Pattern: onClick={() => setXxx(!xxx)}
    # The state var name is typically the setter without 'set' prefix, lowercased first char
    toggle_pattern = re.compile(
        r'onClick=\{\(\)\s*=>\s*(set\w+)\(!(\w+)\)\}'
    )

    matches = []
    for m in toggle_pattern.finditer(content):
        matches.append({
            'full': m.group(0),
            'setter': m.group(1),
            'stateVar': m.group(2),
        })

    # Count unique patterns
    pattern_counts = Counter(m['full'] for m in matches)

    report.append(f"\nToggle patterns found: {len(pattern_counts)} unique ({sum(pattern_counts.values())} total)")
    for pattern, count in pattern_counts.most_common():
        report.append(f"  [{count}x] {pattern}")

    if not matches:
        report.append("\nNo toggle patterns found!")
        with open(REPORT, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        print("No toggle patterns found. See tier2b_report.txt")
        return

    # Step 3: Generate unique callback names
    callbacks = []
    seen_setters = set()

    for m in matches:
        setter = m['setter']
        state_var = m['stateVar']
        if setter in seen_setters:
            continue
        seen_setters.add(setter)

        base = setter[3:]  # Remove 'set'
        cb_name = f"handleToggle{base}"

        if cb_name in existing_names:
            cb_name = f"handleToggle{base}Cb"
        if cb_name in existing_names:
            report.append(f"  SKIP: {cb_name} (name conflict)")
            continue

        count = pattern_counts[m['full']]
        # Use functional updater for safety: prev => !prev
        callbacks.append((
            cb_name,
            f"() => {setter}(prev => !prev)",
            "[]",
            m['full'],  # original onClick text to find/replace
            count,
            state_var,
        ))
        existing_names.add(cb_name)

    report.append(f"\n=== Callbacks to create: {len(callbacks)} ===")
    for name, body, deps, original, count, sv in callbacks:
        report.append(f"  {name} = useCallback({body}, {deps})  [{count}x] (toggles {sv})")

    # Step 4: Validate - check no name exists in original file
    with open(INPUT, 'r', encoding='utf-8') as f:
        original_content = f.read()

    conflicts = []
    for name, _, _, _, _, _ in callbacks:
        if re.search(rf'(?:const|let|var)\s+{re.escape(name)}\s*=', original_content):
            conflicts.append(name)
        if re.search(rf'function\s+{re.escape(name)}\s*\(', original_content):
            conflicts.append(name)

    if conflicts:
        report.append(f"\n!!! CONFLICTS - ABORTING !!!")
        for c in conflicts:
            report.append(f"  CONFLICT: {c}")
        with open(REPORT, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        print(f"ABORTED: {len(conflicts)} conflicts. See {REPORT}")
        return

    report.append(f"\nValidation: 0 name conflicts - SAFE TO APPLY")

    # Step 5: Apply
    # Build useCallback block - insert into existing Tier 2 block
    cb_lines = ["  // === PHASE 1 TIER 2b: Toggle useCallback Handlers ==="]
    for name, body, deps, _, _, _ in callbacks:
        cb_lines.append(f"  const {name} = React.useCallback({body}, {deps});")
    cb_block = '\n'.join(cb_lines) + '\n'

    # Find the existing Tier 2 block and append after it
    tier2_marker = "// === PHASE 1 TIER 2: Extracted useCallback Handlers ==="
    marker_idx = content.find(tier2_marker)
    if marker_idx < 0:
        report.append("ERROR: Can't find Tier 2 block!")
        with open(REPORT, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        print("ABORTED: No Tier 2 block found.")
        return

    # Find the end of the Tier 2 block (first non-const-useCallback line after marker)
    tier2_lines_start = content[:marker_idx].count('\n')
    tier2_end_idx = marker_idx
    for i in range(tier2_lines_start + 1, min(tier2_lines_start + 120, len(lines))):
        line = lines[i]
        is_cb = re.match(r'\s*const\s+handle\w+\s*=\s*React\.useCallback', line)
        is_blank = not line.strip()
        if not is_cb and not is_blank:
            # This is the first non-callback line after the block
            tier2_end_idx = sum(len(lines[j]) + 1 for j in range(i))  # byte offset of line i
            break

    # Insert the 2b block at the end of the Tier 2 block
    content = content[:tier2_end_idx] + cb_block + content[tier2_end_idx:]

    # Replace inline onClick patterns
    total_replacements = 0
    for name, body, deps, original_onclick, count, _ in callbacks:
        replacement = f'onClick={{{name}}}'
        actual = content.count(original_onclick)
        content = content.replace(original_onclick, replacement)
        total_replacements += actual

    report.append(f"\nApplied {total_replacements} onClick replacements")
    report.append(f"Added {len(callbacks)} useCallback declarations")

    # Write
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    # Post-write verification
    with open(INPUT, 'r', encoding='utf-8') as f:
        final = f.read()

    final_lines = final.split('\n')

    # Check for duplicate const declarations of our new names
    for name, _, _, _, _, _ in callbacks:
        count = 0
        for line in final_lines:
            if re.match(rf'\s*const\s+{re.escape(name)}\s*=', line):
                count += 1
        if count > 1:
            report.append(f"WARNING: {name} declared {count} times!")

    open_b = final.count('{')
    close_b = final.count('}')
    uc_count = len(re.findall(r'React\.useCallback', final))

    report.append(f"\nOutput: {len(final):,} bytes, {len(final_lines):,} lines")
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")
    report.append(f"Total useCallback: {uc_count}")
    report.append(f"\n=== DONE ===")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"SUCCESS: {len(callbacks)} toggle callbacks, {total_replacements} replacements")
    print(f"See {REPORT}")

if __name__ == '__main__':
    main()
