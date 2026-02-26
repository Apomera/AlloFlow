"""
Comprehensive Surgery Script: Fix 'or' Phoneme Audio + Critical Issues
=====================================================================
Fixes:
  1. Removes mid-file BOM at line ~951
  2. Removes duplicate comment lines created by BOM
  3. Converts audio_input4/or.webm to base64
  4. Removes duplicate 'or' key from object literal (L1060)
  5. Replaces bracket assignment at L1117 with new audio
  6. Adds cancellation guards in runInstructionSequence
"""
import os
import sys
import base64
import re
import hashlib

MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
AUDIO_FILE = os.path.join(os.path.dirname(__file__), 'audio_input4', 'or.webm')
BACKUP = MONOLITH + '.bak_or_fix'

def main():
    print("=" * 70)
    print("COMPREHENSIVE SURGERY: Fix 'or' Audio + Critical Issues")
    print("=" * 70)
    
    # ---- Step 0: Read audio file ----
    if not os.path.exists(AUDIO_FILE):
        print(f"ERROR: Audio file not found: {AUDIO_FILE}")
        sys.exit(1)
    
    with open(AUDIO_FILE, 'rb') as f:
        audio_bytes = f.read()
    
    b64_audio = base64.b64encode(audio_bytes).decode('ascii')
    print(f"[OK] Read or.webm: {len(audio_bytes)} bytes -> {len(b64_audio)} base64 chars")
    
    # Verify WebM magic bytes
    if audio_bytes[:4] != b'\x1a\x45\xdf\xa3':
        print("WARNING: File does not start with WebM magic bytes!")
    else:
        print("[OK] WebM magic bytes verified")
    
    new_data_uri = f'data:audio/webm;base64,{b64_audio}'
    
    # ---- Step 1: Read monolith as raw bytes ----
    with open(MONOLITH, 'rb') as f:
        raw = f.read()
    
    original_hash = hashlib.md5(raw).hexdigest()
    print(f"[OK] Read monolith: {len(raw)} bytes, MD5: {original_hash}")
    
    # ---- Step 2: Remove mid-file BOMs ----
    bom = b'\xef\xbb\xbf'
    bom_positions = []
    start = 0
    while True:
        pos = raw.find(bom, start)
        if pos == -1:
            break
        bom_positions.append(pos)
        start = pos + 1
    
    print(f"[INFO] Found {len(bom_positions)} BOM markers at positions: {bom_positions}")
    
    # Remove all BOMs except the first (byte 0)
    if len(bom_positions) > 1:
        # Work backwards to preserve earlier positions
        for pos in reversed(bom_positions[1:]):
            raw = raw[:pos] + raw[pos+3:]
            print(f"  [FIX] Removed mid-file BOM at byte {pos}")
    
    # ---- Step 3: Decode to text ----
    text = raw.decode('utf-8-sig')
    lines = text.split('\n')
    print(f"[OK] Decoded: {len(lines)} lines")
    
    # ---- Step 4: Remove duplicate comment lines ----
    # After BOM removal, we may have duplicate "// PHONEME AUDIO BANK" comments
    changes = []
    i = 0
    new_lines = []
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # Detect duplicate consecutive lines (from BOM duplication artifacts)
        if (stripped.startswith('// PHONEME AUDIO BANK') and 
            i + 2 < len(lines) and 
            lines[i+2].strip().startswith('// PHONEME AUDIO BANK')):
            # Skip this pair (lines i and i+1), keep the second pair (i+2, i+3)
            changes.append(f"  [FIX] Removed duplicate comment pair at lines {i+1}-{i+2}")
            i += 2  # Skip the duplicate pair
            continue
        new_lines.append(line)
        i += 1
    
    if len(new_lines) != len(lines):
        print(f"[FIX] Removed {len(lines) - len(new_lines)} duplicate comment lines")
        lines = new_lines
    
    # ---- Step 5: Fix 'or' key - remove from object literal, update bracket assignment ----
    or_literal_idx = None  # L1060 (0-indexed: 1059)
    or_bracket_idx = None  # L1117 (0-indexed: 1116)
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Find 'or' in the object literal (inside const PHONEME_AUDIO_BANK = {})
        if stripped.startswith("'or':") and 'data:audio' in line:
            if or_literal_idx is None:
                or_literal_idx = i
                print(f"[FOUND] 'or' in object literal at line {i+1}")
        # Find PHONEME_AUDIO_BANK['or'] = bracket assignment
        if "PHONEME_AUDIO_BANK['or']" in stripped and '=' in stripped and 'data:audio' in stripped:
            or_bracket_idx = i
            print(f"[FOUND] PHONEME_AUDIO_BANK['or'] bracket assignment at line {i+1}")
    
    if or_literal_idx is None:
        print("WARNING: Could not find 'or' in object literal!")
    else:
        # Remove the entire 'or' line from the object literal
        removed_line = lines[or_literal_idx].strip()[:80]
        lines.pop(or_literal_idx)
        changes.append(f"  [FIX] Removed 'or' from object literal (was line {or_literal_idx+1}): {removed_line}...")
        print(f"[FIX] Removed 'or' from object literal at line {or_literal_idx+1}")
        # Adjust bracket index since we removed a line
        if or_bracket_idx is not None and or_bracket_idx > or_literal_idx:
            or_bracket_idx -= 1
    
    if or_bracket_idx is None:
        print("WARNING: Could not find PHONEME_AUDIO_BANK['or'] bracket assignment!")
    else:
        # Replace the bracket assignment with new audio
        old_line = lines[or_bracket_idx]
        indent = old_line[:len(old_line) - len(old_line.lstrip())]
        new_line = f"{indent}PHONEME_AUDIO_BANK['or'] = '{new_data_uri}';\r"
        lines[or_bracket_idx] = new_line
        changes.append(f"  [FIX] Replaced PHONEME_AUDIO_BANK['or'] at line {or_bracket_idx+1} with new {len(b64_audio)} char audio")
        print(f"[FIX] Replaced bracket assignment at line {or_bracket_idx+1}")
    
    # ---- Step 6: Add cancellation guards in runInstructionSequence ----
    guards_added = 0
    i = 0
    patched_lines = []
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        patched_lines.append(line)
        
        # Pattern: after an `await` line inside the instruction sequence,
        # if the NEXT non-empty line is also an `await` and there's no `if (cancelled)` between them,
        # insert a guard
        if ('await handleAudio(' in stripped or 'await new Promise' in stripped):
            # Look ahead to see if next substantive line is another await without a guard
            j = i + 1
            while j < len(lines) and lines[j].strip() == '':
                patched_lines.append(lines[j])
                j += 1
            
            if j < len(lines):
                next_stripped = lines[j].strip()
                # Check if next line is an await without a preceding guard
                if ('await handleAudio(' in next_stripped or 'await new Promise' in next_stripped):
                    # Check that there ISN'T already a guard
                    has_guard = False
                    for k in range(i+1, j):
                        if 'cancelled' in lines[k]:
                            has_guard = True
                            break
                    
                    if not has_guard:
                        # Determine indent from the await line
                        indent = line[:len(line) - len(line.lstrip())]
                        guard_line = f"{indent}if (cancelled) return;\r"
                        patched_lines.append(guard_line)
                        guards_added += 1
            
            i = j  # Skip to where we left off
            continue
        
        i += 1
    
    if guards_added > 0:
        lines = patched_lines
        changes.append(f"  [FIX] Added {guards_added} cancellation guards in runInstructionSequence")
        print(f"[FIX] Added {guards_added} cancellation guards")
    
    # ---- Step 7: Write patched file ----
    # Re-add BOM at start
    output = '\ufeff' + '\n'.join(lines)
    
    # Backup original
    if os.path.exists(MONOLITH):
        with open(BACKUP, 'wb') as f:
            with open(MONOLITH, 'rb') as orig:
                f.write(orig.read())
        print(f"[OK] Backup saved to {BACKUP}")
    
    with open(MONOLITH, 'w', encoding='utf-8', newline='') as f:
        f.write(output)
    
    new_size = os.path.getsize(MONOLITH)
    print(f"[OK] Wrote patched file: {new_size} bytes")
    
    # ---- Step 8: Verification ----
    print("\n" + "=" * 70)
    print("VERIFICATION PASS")
    print("=" * 70)
    
    with open(MONOLITH, 'rb') as f:
        verify_raw = f.read()
    
    verify_hash = hashlib.md5(verify_raw).hexdigest()
    print(f"  New MD5: {verify_hash}")
    
    # Check BOMs
    bom_count = 0
    start = 0
    while True:
        pos = verify_raw.find(bom, start)
        if pos == -1:
            break
        bom_count += 1
        if pos != 0:
            print(f"  ❌ FAIL: Mid-file BOM still present at byte {pos}!")
        start = pos + 1
    
    if bom_count == 1:
        print(f"  ✅ PASS: Exactly 1 BOM (at byte 0)")
    else:
        print(f"  ❌ FAIL: {bom_count} BOM markers found")
    
    # Check 'or' key count
    verify_text = verify_raw.decode('utf-8-sig')
    or_bracket_count = verify_text.count("PHONEME_AUDIO_BANK['or'] =")
    or_literal_count = len(re.findall(r"^\s+'or'\s*:", verify_text, re.MULTILINE))
    
    if or_bracket_count == 1:
        print(f"  ✅ PASS: Exactly 1 PHONEME_AUDIO_BANK['or'] bracket assignment")
    else:
        print(f"  ❌ FAIL: {or_bracket_count} bracket assignments found")
    
    if or_literal_count == 0:
        print(f"  ✅ PASS: No 'or' in object literal (removed duplicate)")
    else:
        print(f"  ⚠️  {or_literal_count} 'or' keys still in object literals")
    
    # Check new audio content
    if b64_audio[:20] in verify_text:
        print(f"  ✅ PASS: New audio data present in file")
    else:
        print(f"  ❌ FAIL: New audio data NOT found in file")
    
    # Check duplicate comments
    dup_comments = 0
    verify_lines = verify_text.split('\n')
    for idx in range(len(verify_lines) - 2):
        if (verify_lines[idx].strip().startswith('// PHONEME AUDIO BANK') and
            verify_lines[idx+2].strip().startswith('// PHONEME AUDIO BANK')):
            dup_comments += 1
    
    if dup_comments == 0:
        print(f"  ✅ PASS: No duplicate PHONEME AUDIO BANK comments")
    else:
        print(f"  ❌ FAIL: {dup_comments} duplicate comment blocks")
    
    # Summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Original: {len(raw)} bytes | New: {new_size} bytes")
    print(f"  Changes made: {len(changes)}")
    for c in changes:
        print(c)
    print(f"\n  ⚡ IMPORTANT: Clear localStorage key 'allo_phoneme_bank_v1' in browser")
    print(f"  ⚡ Then hard-refresh (Ctrl+Shift+R) to hear the new 'or' sound")
    print(f"{'=' * 70}")

if __name__ == '__main__':
    main()
