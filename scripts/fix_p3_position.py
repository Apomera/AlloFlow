"""Move P3 useEffect to after activeSessionAppId declaration to fix TDZ."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Remove the P3 effect from its current location
    p3_block = """
    // P3: Clean up session document when tab closes (Canvas-safe, best-effort)
    React.useEffect(() => {
        if (!activeSessionCode || !isTeacherMode || !db || !appId) return;
        const sessionCleanupOnUnload = () => {
            try {
                const sRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                deleteDoc(sRef).catch(() => {});
            } catch(e) { /* ignore */ }
        };
        window.addEventListener('pagehide', sessionCleanupOnUnload);
        window.addEventListener('beforeunload', sessionCleanupOnUnload);
        return () => {
            window.removeEventListener('pagehide', sessionCleanupOnUnload);
            window.removeEventListener('beforeunload', sessionCleanupOnUnload);
        };
    }, [activeSessionCode, isTeacherMode, db, appId]);"""
    
    if p3_block in content:
        content = content.replace(p3_block, '', 1)
        print("Removed P3 from old location")
    else:
        print("P3 block not found at old location - trying to find it")
        return
    
    # Re-insert after activeSessionAppId declaration
    anchor = "const [activeSessionAppId, setActiveSessionAppId] = useState(appId);"
    new_anchor = anchor + """

    // P3: Clean up session document when tab closes (Canvas-safe, best-effort)
    React.useEffect(() => {
        if (!activeSessionCode || !isTeacherMode || !db || !appId) return;
        const sessionCleanupOnUnload = () => {
            try {
                const sRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                deleteDoc(sRef).catch(() => {});
            } catch(e) { /* ignore */ }
        };
        window.addEventListener('pagehide', sessionCleanupOnUnload);
        window.addEventListener('beforeunload', sessionCleanupOnUnload);
        return () => {
            window.removeEventListener('pagehide', sessionCleanupOnUnload);
            window.removeEventListener('beforeunload', sessionCleanupOnUnload);
        };
    }, [activeSessionCode, isTeacherMode, db, appId]);"""
    
    if anchor in content:
        content = content.replace(anchor, new_anchor, 1)
        SRC.write_text(content, encoding='utf-8')
        print("Re-inserted P3 after activeSessionAppId declaration")
        # Verify
        idx = content.find('sessionCleanupOnUnload')
        decl_idx = content.find('const [activeSessionAppId')
        print(f"activeSessionAppId declared at char {decl_idx}, P3 at char {idx}")
        print("Order correct:", decl_idx < idx)
    else:
        print("activeSessionAppId anchor not found")

if __name__ == "__main__":
    main()
