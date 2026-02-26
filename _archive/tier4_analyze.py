"""
Tier 4: Analyze components for React.memo wrapping candidates.

Find all component definitions, check which are already memo'd,
measure size, and identify which are rendered inside AlloFlowContent.
"""
import re

INPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    report = []
    report.append("=== Tier 4: React.memo Analysis ===")
    report.append(f"Input: {len(lines):,} lines")

    # Step 1: Find all component definitions
    components = []
    for i, line in enumerate(lines):
        # const Xxx = React.memo(({ ... }) => {
        m = re.match(r'^(?:\s*)const\s+([A-Z]\w+)\s*=\s*React\.memo\(', line)
        if m:
            components.append({
                'name': m.group(1),
                'line': i,
                'memo': True,
                'indent': len(line) - len(line.lstrip()),
            })
            continue

        # const Xxx = ({ ... }) => { or const Xxx = (props) => {
        m = re.match(r'^(?:\s*)const\s+([A-Z]\w+)\s*=\s*\(\s*(?:\{|props)', line)
        if m:
            name = m.group(1)
            # Verify it's a component (not a utility) by checking for JSX return
            components.append({
                'name': name,
                'line': i,
                'memo': False,
                'indent': len(line) - len(line.lstrip()),
            })
            continue

        # function Xxx({ ... }) { or function Xxx(props) {
        m = re.match(r'^(?:\s*)function\s+([A-Z]\w+)\s*\(', line)
        if m:
            components.append({
                'name': m.group(1),
                'line': i,
                'memo': False,
                'indent': len(line) - len(line.lstrip()),
            })

    # Step 2: Estimate component sizes (lines until next component at same or lesser indent)
    for idx, comp in enumerate(components):
        # Find end: next component def at same or lesser indent, or end of file
        end = len(lines)
        for j in range(idx + 1, len(components)):
            if components[j]['indent'] <= comp['indent']:
                end = components[j]['line']
                break
        comp['end_line'] = end
        comp['size'] = end - comp['line']

    # Step 3: Find AlloFlowContent
    allo_comp = None
    for comp in components:
        if comp['name'] == 'AlloFlowContent':
            allo_comp = comp
            break

    # Step 4: Find which components are rendered inside AlloFlowContent (used as JSX)
    allo_start = allo_comp['line'] if allo_comp else 0
    allo_end = allo_comp['end_line'] if allo_comp else len(lines)

    # Find JSX usage: <ComponentName or {ComponentName}
    component_names = set(c['name'] for c in components)
    usage_in_allo = {}
    for i in range(allo_start, min(allo_end, len(lines))):
        line = lines[i]
        for name in component_names:
            if f'<{name}' in line or f'<{name} ' in line or f'<{name}>' in line or f'<{name}/' in line:
                if name not in usage_in_allo:
                    usage_in_allo[name] = 0
                usage_in_allo[name] += 1

    # Step 5: Report
    report.append(f"\nTotal components found: {len(components)}")
    report.append(f"Already memo'd: {sum(1 for c in components if c['memo'])}")
    report.append(f"Not memo'd: {sum(1 for c in components if not c['memo'])}")

    report.append(f"\n=== Already React.memo'd ===")
    for comp in sorted([c for c in components if c['memo']], key=lambda x: -x['size']):
        uses = usage_in_allo.get(comp['name'], 0)
        report.append(f"  {comp['name']}: {comp['size']} lines, L{comp['line']+1}, uses in AlloFlow: {uses}")

    report.append(f"\n=== NOT memo'd (candidates) ===")
    # Sort by size descending - bigger components benefit more
    unmemo = [c for c in components if not c['memo']]
    for comp in sorted(unmemo, key=lambda x: -x['size']):
        uses = usage_in_allo.get(comp['name'], 0)
        marker = " ★" if uses > 0 and comp['size'] > 50 else ""
        report.append(f"  {comp['name']}: {comp['size']} lines, L{comp['line']+1}, uses in AlloFlow: {uses}{marker}")

    # Step 6: Recommended candidates
    report.append(f"\n=== RECOMMENDED for React.memo (>50 lines, used in AlloFlowContent) ===")
    recommended = []
    for comp in sorted(unmemo, key=lambda x: -x['size']):
        uses = usage_in_allo.get(comp['name'], 0)
        if uses > 0 and comp['size'] > 50:
            recommended.append(comp)
            report.append(f"  ★ {comp['name']}: {comp['size']} lines, {uses} uses")

    report.append(f"\nTotal recommended: {len(recommended)}")

    # Step 7: Check which recommended components use arrow function syntax
    # (needed to know wrapping approach)
    report.append(f"\n=== Wrapping details ===")
    for comp in recommended:
        line = lines[comp['line']]
        if 'React.memo' in line:
            report.append(f"  {comp['name']}: ALREADY MEMO (skip)")
        elif re.match(r'\s*const\s+\w+\s*=\s*\(', line):
            report.append(f"  {comp['name']}: Arrow function - wrap with React.memo()")
        elif re.match(r'\s*function\s+\w+', line):
            report.append(f"  {comp['name']}: Function declaration - convert to const + React.memo()")
        else:
            report.append(f"  {comp['name']}: Unknown pattern: {line.strip()[:80]}")

    with open('tier4_analysis.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"Found {len(components)} components, {len(recommended)} recommended for memo")
    print("See tier4_analysis.txt")

if __name__ == '__main__':
    main()
