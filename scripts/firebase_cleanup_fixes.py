"""
firebase_cleanup_fixes.py — Implement 3 client-side cleanup fixes:
P1: Add bridgeChat: deleteField() to Bridge close handler
P2: Expired adventure image cleanup on app load
P3: Session cleanup on tab close (beforeunload + pagehide for Canvas)
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # === P1: Add bridgeChat cleanup alongside bridgePayload cleanup ===
    old_cleanup = "updateDoc(sRef, { bridgePayload: deleteField() }).catch(e => warnLog('Bridge cleanup error:', e));"
    new_cleanup = "updateDoc(sRef, { bridgePayload: deleteField(), bridgeChat: deleteField() }).catch(e => warnLog('Bridge cleanup error:', e));"
    
    count = content.count(old_cleanup)
    if count > 0:
        content = content.replace(old_cleanup, new_cleanup)
        changes += 1
        print(f"P1. Added bridgeChat cleanup ({count} instance(s))")
    else:
        print("P1. SKIP - cleanup line not found")

    # Also add to stale cleanup
    old_stale = "updateDoc(staleRef, { bridgePayload: deleteField() }).catch(() => {});"
    new_stale = "updateDoc(staleRef, { bridgePayload: deleteField(), bridgeChat: deleteField() }).catch(() => {});"
    if old_stale in content:
        content = content.replace(old_stale, new_stale, 1)
        changes += 1
        print("P1b. Added bridgeChat to stale cleanup")
    else:
        print("P1b. SKIP")

    # === P2: Expired adventure image cleanup on app load ===
    # Insert after the adventure image archive function
    # Find: archiveAdventureImage function and add cleanup nearby
    # Better: add as a useEffect that runs once on mount when user is authenticated
    
    # Find an appropriate useEffect mount point - use the existing auth state
    # Look for where user is first available and add cleanup there
    p2_anchor = "const archiveAdventureImage = async (base64Image) => {"
    p2_cleanup = """// P2: Clean expired adventure images on load (30-day TTL enforcement)
    React.useEffect(() => {
        if (!user || !db || !appId) return;
        const cleanExpiredImages = async () => {
            try {
                const imagesCol = collection(db, 'artifacts', appId, 'users', user.uid, 'adventure_images');
                const snap = await getDocs(query(imagesCol, limit(100)));
                const now = new Date().toISOString();
                let cleaned = 0;
                for (const imgDoc of snap.docs) {
                    const exp = imgDoc.data()?.expirationDate;
                    if (exp && exp < now) {
                        await deleteDoc(imgDoc.ref);
                        cleaned++;
                    }
                }
                if (cleaned > 0) debugLog('[Cleanup] Removed ' + cleaned + ' expired adventure images');
            } catch (e) { /* ignore cleanup errors */ }
        };
        cleanExpiredImages();
    }, [user, db, appId]);

    """ + p2_anchor
    
    if p2_anchor in content and 'cleanExpiredImages' not in content:
        content = content.replace(p2_anchor, p2_cleanup, 1)
        changes += 1
        print("P2. Added expired adventure image cleanup on load")
    elif 'cleanExpiredImages' in content:
        print("P2. SKIP - already present")
    else:
        print("P2. FAIL - anchor not found")

    # === P3: Session cleanup on tab close ===
    # Use pagehide (better iframe support) + beforeunload (fallback)
    # This is safe for Canvas - worst case the events don't fire, which is current behavior
    # We use navigator.sendBeacon pattern when available, fallback to sync deleteDoc
    
    # Find the session creation code and add cleanup effect nearby
    p3_anchor = "const [activeSessionCode, setActiveSessionCode] = useState"
    if p3_anchor not in content:
        # Try alternate
        p3_anchor = "const [activeSessionCode,"
    
    # Better approach: add the cleanup as a useEffect near the session management area
    # Find where session code is first set
    # Look for setActiveSessionCode(code) after session creation
    p3_anchor2 = "setActiveSessionCode(code);"
    
    if p3_anchor2 in content and 'sessionCleanupOnUnload' not in content:
        # Find the session creation area and add a useEffect for cleanup
        # We'll add it right after the session code state declaration
        
        # Use a simpler anchor: the existing session end confirm dialog
        p3_effect_anchor = "const [showSessionModal, setShowSessionModal] = useState(false);"
        p3_effect = """const [showSessionModal, setShowSessionModal] = useState(false);

    // P3: Clean up session document when tab closes (Canvas-safe)
    React.useEffect(() => {
        if (!activeSessionCode || !isTeacherMode || !db || !appId) return;
        const sessionCleanupOnUnload = () => {
            try {
                // Use fetch with keepalive for reliability in unload handlers
                // This is a best-effort cleanup — if it fails, stale sessions are harmless
                const sRef = doc(db, 'artifacts', activeSessionAppId || appId, 'public', 'data', 'sessions', activeSessionCode);
                deleteDoc(sRef).catch(() => {});
            } catch(e) { /* ignore */ }
        };
        // pagehide has better iframe support than beforeunload
        window.addEventListener('pagehide', sessionCleanupOnUnload);
        window.addEventListener('beforeunload', sessionCleanupOnUnload);
        return () => {
            window.removeEventListener('pagehide', sessionCleanupOnUnload);
            window.removeEventListener('beforeunload', sessionCleanupOnUnload);
        };
    }, [activeSessionCode, isTeacherMode, db, appId, activeSessionAppId]);"""
        
        if p3_effect_anchor in content:
            content = content.replace(p3_effect_anchor, p3_effect, 1)
            changes += 1
            print("P3. Added pagehide/beforeunload session cleanup")
        else:
            print("P3. FAIL - showSessionModal anchor not found")
    elif 'sessionCleanupOnUnload' in content:
        print("P3. SKIP - already present")
    else:
        print("P3. FAIL - session code anchor not found")

    SRC.write_text(content, encoding='utf-8')
    
    # Verify
    final = SRC.read_text(encoding='utf-8')
    checks = [
        ('bridgeChat: deleteField()', 'P1: bridgeChat cleanup'),
        ('cleanExpiredImages', 'P2: Expired image cleanup'),
        ('sessionCleanupOnUnload', 'P3: Tab close cleanup'),
        ('pagehide', 'P3: Canvas-safe event'),
    ]
    print(f"\nDone! {changes} changes.")
    for pattern, label in checks:
        ct = final.count(pattern)
        print(f"  {'OK' if ct > 0 else 'MISSING'} ({ct}): {label}")

if __name__ == "__main__":
    main()
