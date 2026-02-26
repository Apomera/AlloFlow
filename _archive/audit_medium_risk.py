"""
Medium-Risk Word Sounds Diagnostic Audit
========================================
Scans AlloFlowANTI.txt for all medium-risk issues identified in the Feb 2026 audit.
Outputs a detailed report to medium_risk_audit.txt.
"""
import re
import sys

FILEPATH = 'AlloFlowANTI.txt'
REPORT_PATH = 'medium_risk_audit.txt'

# Word Sounds approximate range (L2500-L10000) but we scan wider for completeness
WS_START = 1000
WS_END = 12000

def read_file():
    with open(FILEPATH, 'r', encoding='utf-8-sig') as f:
        return f.readlines()

def write_report(sections):
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("MEDIUM-RISK WORD SOUNDS DIAGNOSTIC AUDIT\n")
        f.write(f"File: {FILEPATH}\n")
        f.write("=" * 70 + "\n\n")
        for section in sections:
            f.write(section + "\n")
    print(f"[OK] Report written to {REPORT_PATH}")

def audit_duplicate_session_goal(lines):
    """Check for duplicate wordSoundsSessionGoal useState declarations."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 1: wordSoundsSessionGoal Duplicate State")
    out.append("-" * 70)
    
    hits = []
    for i, line in enumerate(lines):
        if 'wordSoundsSessionGoal' in line and 'useState' in line:
            hits.append((i + 1, line.strip()[:120]))
    
    if len(hits) > 1:
        out.append(f"[ISSUE] Found {len(hits)} duplicate useState declarations:")
        for ln, content in hits:
            out.append(f"  L{ln}: {content}")
        out.append("")
        out.append("  RECOMMENDATION: Consolidate into a single state declaration.")
        out.append("  Keep the earlier one and remove the later one, ensuring all")
        out.append("  setters reference the surviving declaration.")
    elif len(hits) == 1:
        out.append(f"[OK] Only 1 declaration found at L{hits[0][0]}. No duplication.")
    else:
        out.append("[OK] No wordSoundsSessionGoal useState declarations found.")
    
    # Also check for the setter usage
    setter_hits = []
    for i, line in enumerate(lines):
        if 'setWordSoundsSessionGoal' in line:
            setter_hits.append((i + 1, line.strip()[:120]))
    out.append(f"\n  Setter references found: {len(setter_hits)}")
    for ln, content in setter_hits:
        out.append(f"  L{ln}: {content}")
    
    out.append("")
    return "\n".join(out)


def audit_useeffect_deps(lines):
    """Find useEffect hooks with missing dependency arrays in WS range."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 2: useEffect Hooks Missing Dependency Arrays")
    out.append("-" * 70)
    
    # Pattern: useEffect(() => { ... }) without a closing ], <comma>)
    # We look for useEffect calls and check if there's a second argument
    hits = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Match useEffect with callback but check if dependency array follows
        if 'useEffect(' in stripped and '=>' in stripped:
            # Look ahead up to 200 lines for the closing of this useEffect
            # Find the matching terminator: }, [deps]) or }, [])
            # A missing dep array means the pattern is just })
            # Quick heuristic: search for the next line that starts with  }, [ or }, [
            found_deps = False
            # Check if deps are inline
            if '], [' in stripped or '], []' in stripped or ']);' in stripped:
                found_deps = True
            else:
                # Look ahead for closing pattern
                for j in range(i + 1, min(i + 300, len(lines))):
                    ahead = lines[j].strip()
                    if re.match(r'^\s*\}\s*,\s*\[', ahead) or re.match(r'^\],\s*\[', ahead):
                        found_deps = True
                        break
                    if ahead.startswith('}, [') or ahead == '}, []);' or ', [' in ahead:
                        found_deps = True
                        break
                    # If we hit another useEffect or function declaration, stop
                    if 'useEffect(' in ahead or 'const ' in ahead and '= (' in ahead:
                        break
            
            if not found_deps:
                # Check for the pattern: }); which means no dep array
                for j in range(i + 1, min(i + 300, len(lines))):
                    ahead = lines[j].strip()
                    if ahead == '});' or ahead == '  });':
                        hits.append((i + 1, stripped[:120], 'likely missing deps (ends with });)'))
                        break
                    if re.match(r'^\s*\}\s*,\s*\[', ahead):
                        break
    
    if hits:
        out.append(f"[ISSUE] Found {len(hits)} useEffect hooks potentially missing dependency arrays:")
        for ln, content, note in hits:
            out.append(f"  L{ln}: {content}")
            out.append(f"         Note: {note}")
    else:
        out.append("[OK] No useEffect hooks with missing dependency arrays detected.")
    
    out.append("")
    return "\n".join(out)


def audit_unguarded_maps(lines):
    """Find .map() calls without Array.isArray() guards or fallbacks in WS range."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 3: Unguarded .map() Calls (Word Sounds Range)")
    out.append("-" * 70)
    
    hits = []
    # Look for patterns like: variable.map( without preceding isArray or || []
    map_pattern = re.compile(r'(\w+(?:\.\w+)*)\s*\.map\s*\(')
    
    for i in range(WS_START, min(WS_END, len(lines))):
        line = lines[i]
        matches = map_pattern.findall(line)
        for var in matches:
            # Check if this line or nearby context has a guard
            context = line.strip()
            has_guard = False
            
            # Check for inline guards
            if f'({var} || [])' in line or f'({var}||[])' in line:
                has_guard = True
            if f'Array.isArray({var})' in line:
                has_guard = True
            if f'{var} && {var}.map' in line:
                has_guard = True
            if f'{var}?.map' in line:
                has_guard = True
            # Check previous 3 lines for a guard 
            for j in range(max(0, i - 3), i):
                prev = lines[j]
                if f'Array.isArray({var})' in prev or f'{var} &&' in prev or f'{var}?.length' in prev:
                    has_guard = True
                    break
            
            # Skip known safe patterns (constants, literals)
            if var in ('Object', 'Array', 'JSON', 'String'):
                has_guard = True
            # Skip if it's chained from a guaranteed source
            if '.keys()' in context or '.values()' in context or '.entries()' in context:
                has_guard = True
            if '.filter(' in context and '.map(' in context:
                # filter().map() - filter returns array
                has_guard = True
            if '.split(' in context:
                has_guard = True
            
            if not has_guard:
                hits.append((i + 1, var, context[:120]))
    
    if hits:
        out.append(f"[ISSUE] Found {len(hits)} potentially unguarded .map() calls:")
        for ln, var, context in hits:
            out.append(f"  L{ln}: {var}.map(...)  ->  {context}")
    else:
        out.append("[OK] All .map() calls appear to have guards.")
    
    out.append("")
    return "\n".join(out)


def audit_silent_catches(lines):
    """Find empty catch blocks in the WS range."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 4: Silent Catch Blocks (Empty Error Handlers)")
    out.append("-" * 70)
    
    hits = []
    # Pattern: catch(e) {} or catch(e) { } or catch (e) {}
    catch_pattern = re.compile(r'catch\s*\(\s*\w*\s*\)\s*\{\s*\}')
    
    for i in range(WS_START, min(WS_END, len(lines))):
        line = lines[i]
        if catch_pattern.search(line):
            hits.append((i + 1, line.strip()[:120]))
        else:
            # Check for multi-line empty catches
            stripped = line.strip()
            if re.match(r'^catch\s*\(\s*\w*\s*\)\s*\{', stripped):
                # Check if next non-empty line is just }
                for j in range(i + 1, min(i + 3, len(lines))):
                    next_stripped = lines[j].strip()
                    if next_stripped == '}':
                        hits.append((i + 1, f"{stripped} (empty body, closes at L{j+1})"))
                        break
                    elif next_stripped:
                        break  # Has content, not empty
    
    # Also search the FULL file for global silent catches
    full_hits = []
    for i, line in enumerate(lines):
        if catch_pattern.search(line):
            full_hits.append((i + 1, line.strip()[:120]))
    
    if hits:
        out.append(f"[ISSUE] Found {len(hits)} silent catches in WS range (L{WS_START}-L{WS_END}):")
        for ln, content in hits:
            out.append(f"  L{ln}: {content}")
    else:
        out.append(f"[OK] No silent catches in WS range (L{WS_START}-L{WS_END}).")
    
    out.append(f"\n  Global silent catches (entire file): {len(full_hits)}")
    if full_hits:
        for ln, content in full_hits[:20]:
            out.append(f"  L{ln}: {content}")
        if len(full_hits) > 20:
            out.append(f"  ... and {len(full_hits) - 20} more")
    
    out.append("")
    return "\n".join(out)


def audit_phoneme_storage_key(lines):
    """Find duplicate PHONEME_STORAGE_KEY definitions."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 5: PHONEME_STORAGE_KEY Duplication")
    out.append("-" * 70)
    
    hits = []
    for i, line in enumerate(lines):
        if 'PHONEME_STORAGE_KEY' in line and ('const ' in line or 'let ' in line or 'var ' in line):
            hits.append((i + 1, line.strip()[:120]))
    
    if len(hits) > 1:
        out.append(f"[ISSUE] Found {len(hits)} PHONEME_STORAGE_KEY declarations:")
        for ln, content in hits:
            out.append(f"  L{ln}: {content}")
        out.append("\n  RECOMMENDATION: Consolidate to single declaration near top of WS scope.")
    elif len(hits) == 1:
        out.append(f"[OK] Only 1 declaration at L{hits[0][0]}.")
    else:
        out.append("[INFO] No PHONEME_STORAGE_KEY declarations found.")
    
    # Also check references
    refs = []
    for i, line in enumerate(lines):
        if 'PHONEME_STORAGE_KEY' in line and 'const ' not in line and 'let ' not in line:
            refs.append((i + 1, line.strip()[:120]))
    out.append(f"\n  Total references: {len(refs)}")
    for ln, content in refs[:10]:
        out.append(f"  L{ln}: {content}")
    if len(refs) > 10:
        out.append(f"  ... and {len(refs) - 10} more")
    
    out.append("")
    return "\n".join(out)


def audit_unsafe_property_access(lines):
    """Find unsafe deep property accesses without optional chaining in WS range."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 6: Unsafe Property Access (Missing Optional Chaining)")
    out.append("-" * 70)
    
    # Look for common patterns of deep access without ?. 
    # Focus on state variables that could be null
    risky_patterns = [
        (r'(\w+State)\.\w+\.length', 'Deep .length access on state'),
        (r'(\w+State)\.\w+\.map', 'Deep .map on state'),
        (r'isolationState\.(\w+)\.', 'isolationState deep access'),
        (r'wordSoundsPhonemes\.(\w+)\.', 'wordSoundsPhonemes deep access'),
    ]
    
    hits = []
    for i in range(WS_START, min(WS_END, len(lines))):
        line = lines[i]
        for pattern, desc in risky_patterns:
            if re.search(pattern, line):
                # Check if it already has optional chaining
                if '?.' not in line:
                    # Check if there's a parent guard
                    has_guard = False
                    for j in range(max(0, i - 3), i):
                        prev = lines[j]
                        if '&&' in prev and any(p in prev for p in ['isolationState', 'wordSoundsPhonemes']):
                            has_guard = True
                    if not has_guard:
                        hits.append((i + 1, desc, line.strip()[:120]))
    
    if hits:
        out.append(f"[ISSUE] Found {len(hits)} potentially unsafe property accesses:")
        for ln, desc, content in hits:
            out.append(f"  L{ln} ({desc}): {content}")
    else:
        out.append("[OK] No unsafe deep property accesses detected.")
    
    out.append("")
    return "\n".join(out)


def audit_setstate_null(lines):
    """Find setState(null) calls without conditional checks in WS range."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 7: setState(null) Without Guards")
    out.append("-" * 70)
    
    hits = []
    state_null_pattern = re.compile(r'set\w+\(null\)')
    
    for i in range(WS_START, min(WS_END, len(lines))):
        line = lines[i]
        if state_null_pattern.search(line):
            # Check if it's inside a conditional
            stripped = line.strip()
            is_guarded = stripped.startswith('if') or 'if (' in stripped or '?' in stripped
            # Check if previous line is an if
            if i > 0:
                prev = lines[i - 1].strip()
                if prev.startswith('if') or prev.endswith('{'):
                    is_guarded = True
            
            if not is_guarded:
                hits.append((i + 1, stripped[:120]))
    
    if hits:
        out.append(f"[INFO] Found {len(hits)} setState(null) calls without explicit guards:")
        for ln, content in hits[:15]:
            out.append(f"  L{ln}: {content}")
        if len(hits) > 15:
            out.append(f"  ... and {len(hits) - 15} more")
        out.append("\n  NOTE: Many of these are intentional resets and may not need guards.")
    else:
        out.append("[OK] No unguarded setState(null) calls detected.")
    
    out.append("")
    return "\n".join(out)


def audit_checkAnswer_shadowing(lines):
    """Find multiple checkAnswer function definitions."""
    out = []
    out.append("-" * 70)
    out.append("AUDIT 8: checkAnswer Function Shadowing")
    out.append("-" * 70)
    
    hits = []
    for i, line in enumerate(lines):
        if ('const checkAnswer' in line or 'function checkAnswer' in line or
            'let checkAnswer' in line):
            hits.append((i + 1, line.strip()[:120]))
    
    if len(hits) > 1:
        out.append(f"[INFO] Found {len(hits)} checkAnswer definitions (shadowing risk):")
        for ln, content in hits:
            out.append(f"  L{ln}: {content}")
        out.append("\n  NOTE: If these are in separate component scopes, shadowing is safe.")
        out.append("  This is a maintenance hazard, not a runtime bug.")
    elif len(hits) == 1:
        out.append(f"[OK] Only 1 checkAnswer definition at L{hits[0][0]}.")
    else:
        out.append("[INFO] No explicit checkAnswer declarations found (may be inline).")
    
    out.append("")
    return "\n".join(out)


def main():
    print("Reading file...")
    lines = read_file()
    print(f"File loaded: {len(lines)} lines, {sum(len(l) for l in lines)} bytes")
    
    sections = []
    
    print("Running Audit 1: wordSoundsSessionGoal duplication...")
    sections.append(audit_duplicate_session_goal(lines))
    
    print("Running Audit 2: useEffect dependency arrays...")
    sections.append(audit_useeffect_deps(lines))
    
    print("Running Audit 3: Unguarded .map() calls...")
    sections.append(audit_unguarded_maps(lines))
    
    print("Running Audit 4: Silent catch blocks...")
    sections.append(audit_silent_catches(lines))
    
    print("Running Audit 5: PHONEME_STORAGE_KEY duplication...")
    sections.append(audit_phoneme_storage_key(lines))
    
    print("Running Audit 6: Unsafe property access...")
    sections.append(audit_unsafe_property_access(lines))
    
    print("Running Audit 7: setState(null) without guards...")
    sections.append(audit_setstate_null(lines))
    
    print("Running Audit 8: checkAnswer shadowing...")
    sections.append(audit_checkAnswer_shadowing(lines))
    
    write_report(sections)
    print("Audit complete!")


if __name__ == '__main__':
    main()
