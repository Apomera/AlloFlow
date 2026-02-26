"""
Tier 3: Extract repeated constant inline styles as module-level constants.
Also apply useMemo for dynamic styles that appear 2+ times in AlloFlowContent.

Since the counts are small (2-4x each), the perf impact is modest but 
still eliminates unnecessary object creation per render.
"""
import re

INPUT = 'AlloFlowANTI.txt'
REPORT = 'tier3_report.txt'

# Constant styles to extract as module-level constants
# These contain no JS variables - just CSS property/value literals
CONSTANT_STYLES = {
    "STYLE_POINTER_EVENTS_NONE": {
        "original": "style={{ pointerEvents: 'none' }}",
        "replacement": "style={STYLE_POINTER_EVENTS_NONE}",
        "value": "{ pointerEvents: 'none' }",
    },
    "STYLE_IMAGE_PIXELATED": {
        "original": "style={{ imageRendering: 'pixelated' }}",
        "replacement": "style={STYLE_IMAGE_PIXELATED}",
        "value": "{ imageRendering: 'pixelated' }",
    },
    "STYLE_TEXT_SHADOW_WHITE": {
        "original": "style={{ textShadow: '0 2px 4px rgba(255,255,255,1)' }}",
        "replacement": "style={STYLE_TEXT_SHADOW_WHITE}",
        "value": "{ textShadow: '0 2px 4px rgba(255,255,255,1)' }",
    },
    "STYLE_ANIMATION_DELAY_HALF": {
        "original": "style={{ animationDelay: '0.5s' }}",
        "replacement": "style={STYLE_ANIMATION_DELAY_HALF}",
        "value": "{ animationDelay: '0.5s' }",
    },
}

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append("=== Tier 3: Constant Style Extraction ===")
    report.append(f"Input: {len(content):,} bytes, {len(lines):,} lines")

    # Step 1: Build the constants block
    const_block_lines = [
        "// === PHASE 1 TIER 3: Extracted constant style objects ===",
    ]
    for name, info in CONSTANT_STYLES.items():
        const_block_lines.append(f"const {name} = {info['value']};")
    const_block = '\n'.join(const_block_lines) + '\n'

    # Step 2: Find insertion point - right before the first component definition
    # Insert at module level, before any const ComponentName = ...
    first_component = None
    for i, line in enumerate(lines):
        if re.match(r'^const\s+[A-Z]\w+\s*=', line) or re.match(r'^function\s+[A-Z]\w+', line):
            first_component = i
            break

    if first_component is None:
        report.append("ERROR: No component found!")
        with open(REPORT, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        print("ABORTED")
        return

    report.append(f"First component at L{first_component+1}")

    # Insert before the first component
    insert_pos = sum(len(lines[j]) + 1 for j in range(first_component))
    content = content[:insert_pos] + const_block + '\n' + content[insert_pos:]

    # Step 3: Replace inline styles with constant references
    total_replacements = 0
    for name, info in CONSTANT_STYLES.items():
        original = info['original']
        replacement = info['replacement']
        count = content.count(original)
        if count > 0:
            content = content.replace(original, replacement)
            total_replacements += count
            report.append(f"  {name}: {count} replacements")

    report.append(f"\nTotal replacements: {total_replacements}")
    report.append(f"Constants defined: {len(CONSTANT_STYLES)}")

    # Step 4: Check for name conflicts
    new_lines = content.split('\n')
    for name in CONSTANT_STYLES:
        occurrences = sum(1 for line in new_lines if f'const {name}' in line)
        if occurrences > 1:
            report.append(f"WARNING: {name} declared {occurrences} times!")

    # Write
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    report.append(f"\nOutput: {len(content):,} bytes, {len(new_lines):,} lines")

    open_b = content.count('{')
    close_b = content.count('}')
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")

    report.append("\n=== DONE ===")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"SUCCESS: {len(CONSTANT_STYLES)} constants, {total_replacements} replacements")
    print(f"See {REPORT}")

if __name__ == '__main__':
    main()
