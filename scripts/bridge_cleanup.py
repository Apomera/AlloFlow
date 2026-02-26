"""
bridge_cleanup.py — Implement Bridge data cleanup:
A) Cleanup on Bridge close: clear bridgePayload/bridgeChat when teacher closes Bridge panel
C) Stale session cleanup: check for old bridgePayload on session connect and clear if > 24h old
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # === 1. Add deleteField to Firebase imports ===
    old_import = "import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch, limit } from 'firebase/firestore';"
    new_import = "import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc, deleteDoc, deleteField, collection, query, where, getDocs, writeBatch, limit } from 'firebase/firestore';"
    
    if old_import in content and 'deleteField' not in content:
        content = content.replace(old_import, new_import, 1)
        changes += 1
        print("1. Added deleteField to imports")
    elif 'deleteField' in content:
        print("1. SKIP - deleteField already imported")
    else:
        print("1. FAIL - import not found")

    # === 2. Strategy A: Cleanup on Bridge close ===
    # When the Bridge send panel closes, clear the payload from Firestore
    # The close is triggered by: setBridgeSendOpen(false)
    # We wrap the close calls with a cleanup function
    
    # Find the Bridge close on backdrop click
    old_close = "onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}"
    new_close = """onClick={(e) => { if (e.target === e.currentTarget) {
              setBridgeSendOpen(false);
              // Strategy A: Clean up Bridge payload from Firestore on close
              if (activeSessionCode && isTeacherMode) {
                try {
                  const sRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                  updateDoc(sRef, { bridgePayload: deleteField() }).catch(e => warnLog('Bridge cleanup error:', e));
                } catch(e) { warnLog('Bridge cleanup error:', e); }
              }
            }}}"""
    
    if old_close in content and 'Bridge cleanup' not in content:
        content = content.replace(old_close, new_close, 1)
        changes += 1
        print("2a. Added cleanup on backdrop close")
    else:
        print("2a. SKIP")

    # Also add cleanup on Escape key close
    old_esc = "onKeyDown={(e) => { if (e.key === 'Escape') setBridgeSendOpen(false); }}"
    new_esc = """onKeyDown={(e) => { if (e.key === 'Escape') {
              setBridgeSendOpen(false);
              if (activeSessionCode && isTeacherMode) {
                try {
                  const sRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                  updateDoc(sRef, { bridgePayload: deleteField() }).catch(e => warnLog('Bridge cleanup error:', e));
                } catch(e) { warnLog('Bridge cleanup error:', e); }
              }
            }}}"""
    
    if old_esc in content and 'Bridge cleanup' not in content.split(old_esc)[0]:
        # Only add if not already present in the general area
        content = content.replace(old_esc, new_esc, 1)
        changes += 1
        print("2b. Added cleanup on Escape close")
    else:
        print("2b. SKIP")

    # === 3. Strategy C: Stale session cleanup on connect ===
    # When we receive bridgePayload data, check if it's stale (> 24h old)
    # If stale, clear it instead of processing
    old_payload_check = "if (data.bridgePayload && data.bridgePayload.timestamp) {"
    new_payload_check = """if (data.bridgePayload && data.bridgePayload.timestamp) {
                    // Strategy C: Skip and clean stale Bridge payloads (> 24h old)
                    const BRIDGE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours
                    if (Date.now() - data.bridgePayload.timestamp > BRIDGE_STALE_MS) {
                      try {
                        const staleRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
                        updateDoc(staleRef, { bridgePayload: deleteField() }).catch(() => {});
                        debugLog('Bridge: Cleaned stale payload from', data.bridgePayload.timestamp);
                      } catch(e) { /* ignore cleanup errors */ }
                    } else {"""
    
    if old_payload_check in content and 'BRIDGE_STALE_MS' not in content:
        content = content.replace(old_payload_check, new_payload_check, 1)
        changes += 1
        print("3a. Added stale payload check")
        
        # Now we need to close the else { we opened — find the matching end
        # The original block ends with a closing } for the outer if
        # We need to add a } to close the else before the existing closing }
        # Find the next occurrence of "lastBridgeTimestampRef.current = payloadTs;"
        # and the structure after it
        # Actually, let's add the closing brace after the last } of the payload processing
        
        # Find the closing of the timestamp check block
        old_ts_end = "                    if (payloadTs > lastBridgeTimestampRef.current) {"
        if old_ts_end in content:
            # The else { we added needs a matching } at the end of the payload processing
            # Find the closing }} of the payload check
            # This is tricky - let's just add a closing } before the check for bridgeChat
            pass
    else:
        print("3a. SKIP")

    # Actually, the stale check approach needs careful brace matching.
    # Simpler approach: just add a guard return at the top
    # Let me revert the complex approach and use a simpler one
    
    # Revert: undo the complex stale check if it was added
    if 'BRIDGE_STALE_MS' in content:
        content = content.replace(new_payload_check, old_payload_check, 1)
        changes -= 1
        print("3a. Reverted complex approach")

    # Simpler Strategy C: Add a standalone stale cleanup at the START of the snapshot handler
    # This runs whenever we get session data, before processing
    old_bridge_if = "                  if (data.bridgePayload && data.bridgePayload.timestamp) {"
    stale_check = """                  // Strategy C: Clean stale Bridge payloads (> 24h old)
                  if (data.bridgePayload && data.bridgePayload.timestamp && (Date.now() - data.bridgePayload.timestamp > 86400000)) {
                    try {
                      const staleRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
                      updateDoc(staleRef, { bridgePayload: deleteField() }).catch(() => {});
                    } catch(e) { /* ignore */ }
                  }
                  if (data.bridgePayload && data.bridgePayload.timestamp) {"""
    
    if old_bridge_if in content and 'stale Bridge' not in content:
        content = content.replace(old_bridge_if, stale_check, 1)
        changes += 1
        print("3. Added stale payload cleanup (simple approach)")
    elif 'stale Bridge' in content:
        print("3. SKIP - already present")
    else:
        print("3. FAIL")

    SRC.write_text(content, encoding='utf-8')
    
    # Verify
    final = SRC.read_text(encoding='utf-8')
    checks = [
        ('deleteField', 'Import'),
        ('Bridge cleanup', 'Close cleanup'),
        ('stale Bridge', 'Stale check'),
    ]
    print(f"\nDone! {changes} changes.")
    for pattern, label in checks:
        ct = final.count(pattern)
        print(f"  {'OK' if ct > 0 else 'MISSING'} ({ct}): {label}")

if __name__ == "__main__":
    main()
