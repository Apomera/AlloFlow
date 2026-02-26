"""
Comprehensive Word Sounds Bug Analysis Script
Scans AlloFlowANTI.txt for common hazard patterns documented in reliability engineering.
"""
import re
import sys
import os

MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
REPORT = os.path.join(os.path.dirname(__file__), 'word_sounds_analysis_report.txt')

def read_monolith():
    with open(MONOLITH, 'r', encoding='utf-8', errors='replace') as f:
        return f.readlines()

def analyze():
    lines = read_monolith()
    total_lines = len(lines)
    findings = []
    
    # ===== SECTION 1: Submission Lock Analysis =====
    findings.append("=" * 80)
    findings.append("SECTION 1: SUBMISSION LOCK ANALYSIS (submissionLockRef)")
    findings.append("=" * 80)
    
    lock_sets = []
    lock_resets = []
    for i, line in enumerate(lines):
        if 'submissionLockRef.current = true' in line:
            lock_sets.append((i+1, line.strip()))
        if 'submissionLockRef.current = false' in line:
            lock_resets.append((i+1, line.strip()))
    
    findings.append(f"Lock ENGAGED (=true): {len(lock_sets)} locations")
    for ln, txt in lock_sets:
        findings.append(f"  L{ln}: {txt[:120]}")
    findings.append(f"Lock RELEASED (=false): {len(lock_resets)} locations")
    for ln, txt in lock_resets:
        findings.append(f"  L{ln}: {txt[:120]}")
    
    if len(lock_sets) > len(lock_resets):
        findings.append(f"  ⚠️  POTENTIAL BUG: {len(lock_sets) - len(lock_resets)} more lock engage(s) than release(s)")
    
    # ===== SECTION 2: Empty Catch Blocks =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 2: EMPTY/SILENT CATCH BLOCKS")
    findings.append("=" * 80)
    
    empty_catches = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        # catch(e) {} or catch(err) {} or catch (e) {}
        if re.search(r'catch\s*\([^)]*\)\s*\{\s*\}', stripped):
            empty_catches.append((i+1, stripped[:120]))
        # catch block with only a comment
        if re.search(r'catch\s*\([^)]*\)\s*\{', stripped):
            if i + 1 < total_lines:
                next_line = lines[i+1].strip()
                if next_line == '}':
                    empty_catches.append((i+1, f"{stripped} // NEXT LINE IS JUST '}}' -> silent swallow"))
    
    findings.append(f"Found {len(empty_catches)} potentially silent catch blocks:")
    for ln, txt in empty_catches[:30]:
        findings.append(f"  L{ln}: {txt[:140]}")
    
    # ===== SECTION 3: AudioContext Creation Analysis =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 3: AudioContext CREATION & REUSE ANALYSIS")
    findings.append("=" * 80)
    
    ctx_creates = []
    ctx_reuse_checks = []
    for i, line in enumerate(lines):
        if 'new AudioContext' in line or 'new webkitAudioContext' in line:
            ctx_creates.append((i+1, line.strip()[:120]))
        if "audioCtxRef.current" in line and ('closed' in line or 'state' in line):
            ctx_reuse_checks.append((i+1, line.strip()[:120]))
    
    findings.append(f"AudioContext CREATIONS: {len(ctx_creates)}")
    for ln, txt in ctx_creates:
        findings.append(f"  L{ln}: {txt}")
    findings.append(f"AudioContext STATE CHECKS: {len(ctx_reuse_checks)}")
    for ln, txt in ctx_reuse_checks:
        findings.append(f"  L{ln}: {txt}")
    
    if len(ctx_creates) > 2:
        findings.append("  ⚠️  Multiple AudioContext creations found - risk of resource starvation (6 context limit)")
    
    # ===== SECTION 4: checkAnswer Shadowing =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 4: checkAnswer FUNCTION DEFINITIONS (Shadowing Risk)")
    findings.append("=" * 80)
    
    check_answer_defs = []
    for i, line in enumerate(lines):
        if re.search(r'(const|let|var|function)\s+checkAnswer\s*=?\s*', line):
            check_answer_defs.append((i+1, line.strip()[:140]))
    
    findings.append(f"Found {len(check_answer_defs)} checkAnswer definitions:")
    for ln, txt in check_answer_defs:
        findings.append(f"  L{ln}: {txt}")
    
    if len(check_answer_defs) > 1:
        findings.append("  ⚠️  SHADOWING HAZARD: Multiple checkAnswer definitions can cause wrong function invocation")
    
    # ===== SECTION 5: setIsPlayingAudio Balance =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 5: setIsPlayingAudio BALANCE")
    findings.append("=" * 80)
    
    set_playing_true = []
    set_playing_false = []
    for i, line in enumerate(lines):
        if 'setIsPlayingAudio(true)' in line:
            set_playing_true.append((i+1, line.strip()[:120]))
        if 'setIsPlayingAudio(false)' in line:
            set_playing_false.append((i+1, line.strip()[:120]))
    
    findings.append(f"setIsPlayingAudio(true): {len(set_playing_true)}")
    for ln, txt in set_playing_true:
        findings.append(f"  L{ln}: {txt}")
    findings.append(f"setIsPlayingAudio(false): {len(set_playing_false)}")
    for ln, txt in set_playing_false:
        findings.append(f"  L{ln}: {txt}")
    
    if len(set_playing_true) > len(set_playing_false):
        findings.append(f"  ⚠️  POTENTIAL INFINITE SPINNER: {len(set_playing_true) - len(set_playing_false)} more true sets than false resets")
    
    # ===== SECTION 6: try/catch with finally for async audio =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 6: ASYNC AUDIO FUNCTIONS - try/catch/finally ANALYSIS")
    findings.append("=" * 80)
    
    async_audio_funcs = []
    for i, line in enumerate(lines):
        if ('playBlending' in line or 'playAll' in line or 'runInstructionSequence' in line) and ('async' in line or '=>' in line):
            if 'const' in line or 'function' in line:
                async_audio_funcs.append((i+1, line.strip()[:140]))
    
    findings.append(f"Async audio function definitions found: {len(async_audio_funcs)}")
    for ln, txt in async_audio_funcs:
        findings.append(f"  L{ln}: {txt}")
    
    # Look for finally blocks near these
    finally_count = 0
    for i, line in enumerate(lines):
        if 'finally' in line.strip() and '{' in line:
            finally_count += 1
    findings.append(f"Total 'finally' blocks in file: {finally_count}")
    
    # ===== SECTION 7: cancelled Flag Analysis =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 7: CANCELLATION FLAG ANALYSIS (useEffect async patterns)")
    findings.append("=" * 80)
    
    cancelled_sets = []
    cancelled_checks = []
    for i, line in enumerate(lines):
        if 'cancelled = true' in line:
            cancelled_sets.append((i+1, line.strip()[:120]))
        if 'if (cancelled)' in line or 'if(cancelled)' in line:
            cancelled_checks.append((i+1, line.strip()[:120]))
    
    findings.append(f"cancelled = true (cleanup): {len(cancelled_sets)}")
    for ln, txt in cancelled_sets:
        findings.append(f"  L{ln}: {txt}")
    findings.append(f"if (cancelled) checks: {len(cancelled_checks)}")
    for ln, txt in cancelled_checks:
        findings.append(f"  L{ln}: {txt}")
    
    # ===== SECTION 8: Duplicate useState definitions =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 8: WORD SOUNDS STATE VARIABLE DEFINITIONS")
    findings.append("=" * 80)
    
    ws_states = {}
    for i, line in enumerate(lines):
        match = re.search(r'const\s*\[(\w+),\s*set\w+\]\s*=\s*(?:React\.)?useState', line)
        if match:
            name = match.group(1)
            if any(kw in name.lower() for kw in ['wordsound', 'phonem', 'blending', 'rhyme', 'isolation', 'playing', 'highlight']):
                if name not in ws_states:
                    ws_states[name] = []
                ws_states[name].append(i+1)
    
    for name, locations in ws_states.items():
        if len(locations) > 1:
            findings.append(f"  ⚠️  DUPLICATE STATE: '{name}' defined at lines: {locations}")
        else:
            findings.append(f"  ✓ '{name}' at L{locations[0]}")
    
    # ===== SECTION 9: isMountedRef checks =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 9: isMountedRef USAGE ANALYSIS")
    findings.append("=" * 80)
    
    mounted_checks = []
    mounted_sets = []
    for i, line in enumerate(lines):
        if 'isMountedRef.current' in line:
            if '= false' in line or '= true' in line:
                mounted_sets.append((i+1, line.strip()[:120]))
            elif 'if' in line or 'return' in line:
                mounted_checks.append((i+1, line.strip()[:120]))
    
    findings.append(f"isMountedRef SET operations: {len(mounted_sets)}")
    for ln, txt in mounted_sets:
        findings.append(f"  L{ln}: {txt}")
    findings.append(f"isMountedRef CHECK operations: {len(mounted_checks)}")
    for ln, txt in mounted_checks[:15]:
        findings.append(f"  L{ln}: {txt}")
    
    # ===== SECTION 10: Race Condition Patterns =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 10: RACE CONDITION PATTERNS")
    findings.append("=" * 80)
    
    # Multiple awaits without cancelled checks between them
    findings.append("Searching for sequential await calls without cancellation guards...")
    in_instruction_sequence = False
    last_await_line = None
    race_risks = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if 'runInstructionSequence' in stripped and ('async' in stripped or 'const' in stripped):
            in_instruction_sequence = True
        if in_instruction_sequence:
            if 'await' in stripped:
                if last_await_line and (i+1 - last_await_line) > 1:
                    # Check if there's a cancelled check between them
                    has_guard = False
                    for j in range(last_await_line, i+1):
                        if 'cancelled' in lines[j-1]:
                            has_guard = True
                            break
                    if not has_guard and (i+1 - last_await_line) < 5:
                        race_risks.append((last_await_line, i+1, lines[last_await_line-1].strip()[:80], stripped[:80]))
                last_await_line = i+1
            if stripped.startswith('};') or stripped == '}, [':
                in_instruction_sequence = False
                last_await_line = None
    
    findings.append(f"Sequential awaits without cancellation guard: {len(race_risks)}")
    for ln1, ln2, txt1, txt2 in race_risks[:15]:
        findings.append(f"  L{ln1} -> L{ln2}: '{txt1}' -> '{txt2}'")
    
    # ===== SECTION 11: speechSynthesis.cancel() usage =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 11: SPEECH SYNTHESIS CLEANUP")
    findings.append("=" * 80)
    
    synth_cancel = []
    synth_speak = []
    for i, line in enumerate(lines):
        if 'speechSynthesis.cancel' in line:
            synth_cancel.append((i+1, line.strip()[:120]))
        if 'speechSynthesis.speak' in line:
            synth_speak.append((i+1, line.strip()[:120]))
    
    findings.append(f"speechSynthesis.cancel(): {len(synth_cancel)}")
    for ln, txt in synth_cancel[:10]:
        findings.append(f"  L{ln}: {txt}")
    findings.append(f"speechSynthesis.speak(): {len(synth_speak)}")
    for ln, txt in synth_speak[:10]:
        findings.append(f"  L{ln}: {txt}")
    
    # ===== SECTION 12: Phoneme Bank duplicate keys =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 12: PHONEME_AUDIO_BANK DUPLICATE KEY SCAN")
    findings.append("=" * 80)
    
    in_bank = False
    bank_keys = {}
    bank_start = None
    for i, line in enumerate(lines):
        if 'PHONEME_AUDIO_BANK' in line and ('{' in line or '=' in line):
            in_bank = True
            bank_start = i+1
            continue
        if in_bank:
            key_match = re.match(r"\s*['\"](\w+)['\"]\s*:", line)
            if key_match:
                key = key_match.group(1)
                if key not in bank_keys:
                    bank_keys[key] = []
                bank_keys[key].append(i+1)
            # End detection - rough heuristic
            if line.strip() == '};' and i - (bank_start or 0) > 10:
                in_bank = False
    
    dupes = {k: v for k, v in bank_keys.items() if len(v) > 1}
    if dupes:
        findings.append(f"  ⚠️  DUPLICATE KEYS FOUND:")
        for k, locs in dupes.items():
            findings.append(f"    Key '{k}' at lines: {locs}")
    else:
        findings.append(f"  ✓ No duplicate keys found ({len(bank_keys)} unique keys)")
    
    # ===== SECTION 13: Word Sounds useEffect dependency arrays =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 13: WORD SOUNDS useEffect HOOKS (Dependency Audit)")
    findings.append("=" * 80)
    
    ws_effects = []
    for i, line in enumerate(lines):
        if 'React.useEffect' in line or 'useEffect(' in line:
            # Look for word sounds related context in surrounding lines
            context_start = max(0, i-2)
            context_end = min(total_lines-1, i+8)
            context = ''.join(lines[context_start:context_end])
            if any(kw in context.lower() for kw in ['wordsounds', 'word_sounds', 'wordsound', 'phoneme', 'blending', 'rhyme', 'isolation', 'currentwordsounds', 'playinstructions']):
                # Find closing dependency array
                dep_line = None
                for j in range(i, min(i+30, total_lines)):
                    if '], [' in lines[j] or re.search(r'\],\s*\[', lines[j]):
                        dep_line = j + 1
                        break
                    if lines[j].strip().startswith('[') and lines[j].strip().endswith(']);'):
                        dep_line = j + 1
                        break
                ws_effects.append((i+1, line.strip()[:100], dep_line))
    
    findings.append(f"Word Sounds related useEffect hooks: {len(ws_effects)}")
    for ln, txt, dep_ln in ws_effects[:20]:
        dep_info = f" (deps near L{dep_ln})" if dep_ln else " (deps not found nearby)"
        findings.append(f"  L{ln}: {txt[:100]}{dep_info}")
    
    # ===== SECTION 14: Potential Null/Undefined Access Patterns =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 14: NULL/UNDEFINED ACCESS PATTERNS")
    findings.append("=" * 80)
    
    null_risks = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Accessing .phonemes without optional chaining on a variable that could be null
        if '.phonemes.' in stripped and '?.' not in stripped and 'phonemes' in stripped:
            if 'wordsound' in stripped.lower() or 'phonemeData' in stripped or 'bufferedWord' in stripped:
                null_risks.append((i+1, stripped[:120]))
        # .length on something that could be undefined
        if re.search(r'(blendingOptions|rhymeOptions|isolationState)\.\w+', stripped):
            if '?.' not in stripped and 'if' not in stripped and 'const' not in stripped:
                null_risks.append((i+1, stripped[:120]))
    
    findings.append(f"Potential unsafe access patterns: {len(null_risks)}")
    for ln, txt in null_risks[:20]:
        findings.append(f"  L{ln}: {txt[:140]}")
    
    # ===== SECTION 15: Timer/setTimeout without cleanup =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 15: setTimeout IN WORD SOUNDS AREA (Cleanup Audit)")
    findings.append("=" * 80)
    
    # Scan the word sounds modal area (approx L2500-L10000)
    ws_timers = []
    ws_cleanups = []
    for i, line in enumerate(lines):
        if 2500 <= i+1 <= 10000:
            if 'setTimeout' in line:
                ws_timers.append((i+1, line.strip()[:120]))
            if 'clearTimeout' in line:
                ws_cleanups.append((i+1, line.strip()[:120]))
    
    findings.append(f"setTimeout calls in WS area (L2500-L10000): {len(ws_timers)}")
    for ln, txt in ws_timers[:20]:
        findings.append(f"  L{ln}: {txt}")
    findings.append(f"clearTimeout calls in WS area: {len(ws_cleanups)}")
    for ln, txt in ws_cleanups[:10]:
        findings.append(f"  L{ln}: {txt}")
    
    if len(ws_timers) > len(ws_cleanups) + 5:
        findings.append(f"  ⚠️  Timer cleanup deficit: {len(ws_timers) - len(ws_cleanups)} timers may lack cleanup")
    
    # ===== SECTION 16: handleAudio error handling =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 16: handleAudio FUNCTION ANALYSIS")
    findings.append("=" * 80)
    
    handle_audio_defs = []
    for i, line in enumerate(lines):
        if re.search(r'(const|let|function)\s+handleAudio\s*=?\s*', line):
            handle_audio_defs.append((i+1, line.strip()[:120]))
    
    findings.append(f"handleAudio definitions: {len(handle_audio_defs)}")
    for ln, txt in handle_audio_defs:
        findings.append(f"  L{ln}: {txt}")
    
    if len(handle_audio_defs) > 1:
        findings.append("  ⚠️  Multiple handleAudio definitions - potential shadowing")
    
    # ===== SECTION 17: ISOLATION_AUDIO / INSTRUCTION_AUDIO presence =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 17: INSTRUCTION/ISOLATION AUDIO BANK PRESENCE")
    findings.append("=" * 80)
    
    for bank_name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'LETTER_NAME_AUDIO', 'PHONEME_AUDIO_BANK', 'SOUND_MATCH_POOL']:
        count = 0
        first_line = None
        for i, line in enumerate(lines):
            if bank_name in line:
                count += 1
                if first_line is None:
                    first_line = i+1
        findings.append(f"  {bank_name}: {count} references (first at L{first_line})")
    
    # ===== SECTION 18: Orphaned returns in useEffect =====  
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 18: ORPHANED RETURN PATTERNS IN useEffect")
    findings.append("=" * 80)
    
    orphan_risks = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('return () =>') or stripped.startswith('return () =>'):
            # Check if inside an if block (which would be an orphan)
            for j in range(max(0, i-5), i):
                if re.search(r'if\s*\(', lines[j]):
                    orphan_risks.append((i+1, lines[j].strip()[:60], stripped[:80]))
                    break
    
    findings.append(f"Potential orphaned returns in if-blocks: {len(orphan_risks)}")
    for ln, context, txt in orphan_risks[:10]:
        findings.append(f"  L{ln}: within '{context}' -> {txt}")

    # ===== SECTION 19: Word index / preloaded words sync =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 19: WORD INDEX SYNCHRONIZATION")
    findings.append("=" * 80)
    
    word_index_sets = []
    for i, line in enumerate(lines):
        if 'setCurrentWordIndex' in line or 'currentWordIndex' in line:
            if 2500 <= i+1 <= 10000:
                word_index_sets.append((i+1, line.strip()[:120]))
    
    findings.append(f"currentWordIndex references in WS area: {len(word_index_sets)}")
    for ln, txt in word_index_sets[:15]:
        findings.append(f"  L{ln}: {txt}")

    # ===== SECTION 20: Array.isArray guards =====
    findings.append("\n" + "=" * 80)
    findings.append("SECTION 20: Array.isArray GUARD USAGE")
    findings.append("=" * 80)
    
    array_checks = 0
    unguarded_maps = []
    for i, line in enumerate(lines):
        if 'Array.isArray' in line:
            array_checks += 1
        # Look for .map( without prior Array.isArray in WS area
        if 2500 <= i+1 <= 10000:
            if '.map(' in line and 'Array.isArray' not in line:
                var_match = re.search(r'(\w+)\.map\(', line)
                if var_match:
                    varname = var_match.group(1)
                    if any(kw in varname.lower() for kw in ['option', 'distract', 'phoneme', 'preload', 'words', 'family']):
                        unguarded_maps.append((i+1, line.strip()[:120]))
    
    findings.append(f"Array.isArray checks: {array_checks}")
    findings.append(f"Potentially unguarded .map() in WS area: {len(unguarded_maps)}")
    for ln, txt in unguarded_maps[:15]:
        findings.append(f"  L{ln}: {txt}")

    # ===== WRITE REPORT =====
    report = '\n'.join(findings)
    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"Analysis complete. Report written to: {REPORT}")
    print(f"Total lines scanned: {total_lines}")
    print(f"Total findings sections: 20")
    print(f"\nKey highlights:")
    
    # Print summary of critical issues
    for line in findings:
        if '⚠️' in line:
            print(f"  {line.strip()}")

if __name__ == '__main__':
    analyze()
