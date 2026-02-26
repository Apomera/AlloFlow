"""
Phase 2 Items 3 & 4:
  Item 3: Timer leak remediation — scan for high-risk setTimeout/setInterval calls
  Item 4: Missing key props — find JSX .map() calls lacking key=
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

INPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    report = []
    
    # ===== ITEM 3: Timer leak scan =====
    report.append("=== ITEM 3: Timer Leak Scan ===\n")
    
    # Find all setTimeout/setInterval calls
    timer_risks = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Look for setTimeout/setInterval that set state
        if ('setTimeout(' in stripped or 'setInterval(' in stripped):
            # Check if it's a safe promise delay pattern
            if 'new Promise' in stripped or 'await new Promise' in stripped:
                continue
            if 'Promise(' in stripped:
                continue
            
            # Check if it stores the timer ID (for cleanup)
            has_assignment = False
            for prefix in ['const ', 'let ', 'var ', 'timer', 'timeout', 'interval', 'Timer', 'Timeout', 'Interval', '= set']:
                if prefix in stripped:
                    has_assignment = True
                    break
            
            # Check context: is this inside a useEffect?
            # Look back a few lines for useEffect
            in_useEffect = False
            for j in range(max(0, i-15), i):
                if 'useEffect(' in lines[j]:
                    in_useEffect = True
                    break
            
            # Check if there's a cleanup return nearby (next 20 lines)
            has_cleanup = False
            for j in range(i+1, min(len(lines), i+30)):
                if 'clearTimeout' in lines[j] or 'clearInterval' in lines[j]:
                    has_cleanup = True
                    break
                if 'return ()' in lines[j] or 'return () =>' in lines[j]:
                    has_cleanup = True
                    break
            
            # Check if it references state setters without isMountedRef guard
            sets_state = False
            has_mount_guard = False
            for j in range(i, min(len(lines), i+10)):
                if re.search(r'set[A-Z]\w+\(', lines[j]):
                    sets_state = True
                if 'isMountedRef' in lines[j] or 'mountedRef' in lines[j] or 'isMounted' in lines[j]:
                    has_mount_guard = True
            
            risk = 'LOW'
            reason = ''
            if in_useEffect and not has_cleanup and sets_state:
                risk = 'HIGH'
                reason = 'useEffect timer sets state without cleanup'
            elif not has_assignment and sets_state and not has_mount_guard:
                risk = 'MEDIUM'
                reason = 'timer sets state without assignment or mount guard'
            elif in_useEffect and not has_cleanup:
                risk = 'MEDIUM'
                reason = 'useEffect timer without cleanup return'
            
            if risk in ('HIGH', 'MEDIUM'):
                timer_risks.append({
                    'line': i + 1,
                    'risk': risk,
                    'reason': reason,
                    'code': stripped[:150],
                    'has_cleanup': has_cleanup,
                    'in_useEffect': in_useEffect,
                    'sets_state': sets_state,
                    'has_mount_guard': has_mount_guard,
                })
    
    report.append(f"Found {len(timer_risks)} medium/high-risk timers:\n")
    for t in timer_risks:
        report.append(f"  L{t['line']} [{t['risk']}] {t['reason']}")
        report.append(f"    {t['code'][:120]}")
        report.append(f"    cleanup={t['has_cleanup']} useEffect={t['in_useEffect']} setsState={t['sets_state']} mountGuard={t['has_mount_guard']}")
        report.append("")
    
    # ===== ITEM 4: Missing JSX key props =====
    report.append("\n=== ITEM 4: Missing Key Props Scan ===\n")
    
    # Find .map() calls that produce JSX but don't have key=
    jsx_map_missing_keys = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Look for .map( patterns
        if '.map(' not in stripped:
            continue
        
        # Check if this produces JSX (look for < in next few lines or same line)
        produces_jsx = False
        for j in range(i, min(len(lines), i+8)):
            lj = lines[j]
            # JSX indicators: <div, <span, <button, <input, React.createElement, <Box, <Text, etc.
            if re.search(r'<[A-Z][a-zA-Z]*[\s/>]', lj) or re.search(r'<(div|span|p|h[1-6]|button|input|label|img|a|li|ul|ol|option|select|table|tr|td|th|svg|path|circle|rect|section|article|main|header|footer|nav|form|textarea)[\s/>]', lj):
                produces_jsx = True
                break
        
        if not produces_jsx:
            continue
        
        # Check if key= is present within the map block
        has_key = False
        brace_depth = 0
        for j in range(i, min(len(lines), i+15)):
            lj = lines[j]
            if 'key=' in lj or 'key =' in lj:
                has_key = True
                break
            # Track braces to know when map block ends
            brace_depth += lj.count('{') - lj.count('}')
            paren_depth = lj.count('(') - lj.count(')')
            if j > i and (brace_depth < 0 or paren_depth < -1):
                break
        
        if not has_key:
            jsx_map_missing_keys.append({
                'line': i + 1,
                'code': stripped[:150],
            })
    
    report.append(f"Found {len(jsx_map_missing_keys)} JSX .map() calls potentially missing key=:\n")
    for m in jsx_map_missing_keys:
        report.append(f"  L{m['line']}: {m['code'][:120]}")
    
    # Write report
    output = '\n'.join(report)
    with open('phase2_scan_report.txt', 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"Scan complete. {len(timer_risks)} risky timers, {len(jsx_map_missing_keys)} JSX maps missing keys.")
    print(f"See phase2_scan_report.txt")

if __name__ == '__main__':
    main()
