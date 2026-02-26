import os

filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Log WordSoundsModal Mount & initialShowReviewPanel
old_modal_start = """    React.useEffect(() => {
        if (initialShowReviewPanel) {
            hasStartedFromReview.current = false;
            debugLog("📋 initialShowReviewPanel is true - forcing Review Panel open");
            setShowReviewPanel(true);
        }
    }, [initialShowReviewPanel]);"""

new_modal_start = """    React.useEffect(() => {
        console.error(`[WS-DBG] WordSoundsModal MOUNTED. initialShowReviewPanel: ${initialShowReviewPanel}, activity: ${wordSoundsActivity}`);
        return () => console.error("[WS-DBG] WordSoundsModal UNMOUNTED");
    }, []);

    React.useEffect(() => {
        console.error(`[WS-DBG] initialShowReviewPanel changed to: ${initialShowReviewPanel}`);
        if (initialShowReviewPanel) {
            hasStartedFromReview.current = false;
            console.error("📋 [WS-DBG] initialShowReviewPanel is true - forcing Review Panel open. current showReviewPanel state:", showReviewPanel);
            setShowReviewPanel(true);
        }
    }, [initialShowReviewPanel]);"""

if old_modal_start in content:
    content = content.replace(old_modal_start, new_modal_start, 1)
    print("✅ Injected WordSoundsModal mount logs")
    changes += 1

# 2. Log History handleRestoreView calls explicitly
old_restore = """      if (item.type === 'word-sounds') {
          console.error("[WS-DBG] handleRestoreView: word-sounds detected, isWordSoundsMode->true");
          setIsWordSoundsMode(false);
          setTimeout(() => {
              setIsWordSoundsMode(true);
              setCurrentWordSoundsWord(null);
              setWordSoundsActivity(null);
              setWordSoundsAutoReview(true);
          }, 0);"""

new_restore = """      if (item.type === 'word-sounds') {
          console.error("[WS-DBG] handleRestoreView: word-sounds detected. Forcing clean remount...");
          setIsWordSoundsMode(false);
          setWordSoundsAutoReview(false);
          setTimeout(() => {
              console.error("[WS-DBG] handleRestoreView timeout firing! Setting isWordSoundsMode=true & autoReview=true");
              setIsWordSoundsMode(true);
              setCurrentWordSoundsWord(null);
              setWordSoundsActivity(null);
              setWordSoundsAutoReview(true);
          }, 50); // Increased timeout slightly to ensure React batches the unmount"""

if old_restore in content:
    content = content.replace(old_restore, new_restore, 1)
    print("✅ Injected handleRestoreView expanded logs")
    changes += 1

# 3. Log what the Review Panel actually renders
old_render_review = """    if (showReviewPanel && currentWordSoundsWord === null && wordSoundsActivity === null) {"""
new_render_review = """    if (showReviewPanel && currentWordSoundsWord === null && wordSoundsActivity === null) {
        console.error("[WS-DBG] RENDER: WordSoundsReviewPanel is trying to render.");"""

if old_render_review in content:
    content = content.replace(old_render_review, new_render_review, 1)
    print("✅ Injected WordSoundsReviewPanel render logs")
    changes += 1

if changes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nSuccessfully wrote {changes} changes to AlloFlowANTI.txt")
else:
    print("\nNo changes were applied.")
