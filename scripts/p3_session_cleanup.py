"""Add P3: session cleanup on tab close with correct anchor."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')

    anchor = "const [activeSessionCode, setActiveSessionCode] = useState(null);"
    
    p3_effect = anchor + """

    // P3: Clean up session document when tab closes (Canvas-safe, best-effort)
    React.useEffect(() => {
        if (!activeSessionCode || !isTeacherMode || !db || !appId) return;
        const sessionCleanupOnUnload = () => {
            try {
                const sRef = doc(db, 'artifacts', activeSessionAppId || appId, 'public', 'data', 'sessions', activeSessionCode);
                deleteDoc(sRef).catch(() => {});
            } catch(e) { /* ignore */ }
        };
        window.addEventListener('pagehide', sessionCleanupOnUnload);
        window.addEventListener('beforeunload', sessionCleanupOnUnload);
        return () => {
            window.removeEventListener('pagehide', sessionCleanupOnUnload);
            window.removeEventListener('beforeunload', sessionCleanupOnUnload);
        };
    }, [activeSessionCode, isTeacherMode, db, appId, activeSessionAppId]);"""

    if anchor in content and 'sessionCleanupOnUnload' not in content:
        content = content.replace(anchor, p3_effect, 1)
        SRC.write_text(content, encoding='utf-8')
        print("P3. Added pagehide/beforeunload session cleanup")
        # Verify
        final = SRC.read_text(encoding='utf-8')
        print("  pagehide:", final.count('pagehide'), "hits")
        print("  beforeunload:", final.count('beforeunload'), "hits")
    elif 'sessionCleanupOnUnload' in content:
        print("P3. Already present")
    else:
        print("P3. Anchor not found")

if __name__ == "__main__":
    main()
