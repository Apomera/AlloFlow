"""
Medium-Priority Fix Script for WordSoundsModal
Fix 1: Add isMountedRef guard to all setTimeout-based state updates in WS Modal
Fix 2: Add proper fallback handling for setWsPreloadedWords when undefined
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# ==========================================================
# Step 1: Check if isMountedRef already exists in WordSoundsModal
# ==========================================================
ws_modal_start = None
ws_modal_end = None
for i, line in enumerate(lines):
    if 'const WordSoundsModal' in line and ('function' in line or '(' in line):
        ws_modal_start = i
        break

# The modal is a big component - find its render boundary roughly
# AlloFlowContent starts at ~L31383
ws_modal_end = 31000  # approximate

print(f"WordSoundsModal: L{ws_modal_start+1} to ~L{ws_modal_end}")

# Check existing isMountedRef
existing_mounted_ref = None
for i in range(ws_modal_start, ws_modal_end):
    if 'isMountedRef' in lines[i]:
        existing_mounted_ref = i
        break

if existing_mounted_ref:
    print(f"  ✅ isMountedRef already exists at L{existing_mounted_ref+1}: {lines[existing_mounted_ref].strip()[:120]}")
else:
    print(f"  ❌ isMountedRef NOT found in WordSoundsModal")

# ==========================================================
# Step 2: Catalog all setTimeout state updates in WS Modal 
# ==========================================================
# Focus on setTimeout + set* pattern with NO isMountedRef guard
out = open('_timeout_state_updates.txt', 'w', encoding='utf-8')
out.write("=== setTimeout + state update patterns in WordSoundsModal ===\n")

timeout_targets = []
for i in range(ws_modal_start, ws_modal_end):
    stripped = lines[i].strip()
    if 'setTimeout' in stripped:
        # Check if this setTimeout does a state update (set* function call)
        # Look at next 5 lines for setState calls
        block = ''.join(lines[i:min(i+6, len(lines))])
        if any(x in block for x in ['setWordSounds', 'setShowSession', 'setIsLoading', 'setIsCelebrating',
                                      'setShowLetterHints', 'setWordSoundsActivity', 'setWordSoundsFeedback',
                                      'setShakenWord', 'setErrorMessage']):
            # Check if isMountedRef guard is nearby (within prev 3 lines)
            has_guard = any('isMountedRef' in lines[j] for j in range(max(ws_modal_start, i-3), min(len(lines), i+6)))
            status = "GUARDED" if has_guard else "UNGUARDED"
            timeout_targets.append((i, status, stripped[:120]))
            out.write(f"  L{i+1} [{status}]: {stripped[:120]}\n")

out.write(f"\n  Total: {len(timeout_targets)} setTimeout+state patterns\n")
out.write(f"  Unguarded: {sum(1 for _, s, _ in timeout_targets if s == 'UNGUARDED')}\n")
out.write(f"  Guarded: {sum(1 for _, s, _ in timeout_targets if s == 'GUARDED')}\n")

# ==========================================================
# Step 3: Check setWsPreloadedWords usage
# ==========================================================
out.write("\n=== setWsPreloadedWords usage and guards ===\n")
for i in range(ws_modal_start, ws_modal_end):
    if 'setWsPreloadedWords' in lines[i]:
        # Show context (2 lines before and after)
        for j in range(max(ws_modal_start, i-2), min(len(lines), i+3)):
            out.write(f"  L{j+1}: {lines[j].rstrip()[:150]}\n")
        out.write("  ---\n")

out.close()
print("Done -> _timeout_state_updates.txt")
