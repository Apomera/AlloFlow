"""
Comprehensive Priority Fixes Script
Applies 5 fixes (displayPanels already gone):
1. WS stale state cleanup on close  
2. Consolidate duplicate review panel useEffects
3. Math Check duplicate XP prevention
5. Math Check localization keys
6. handleRestoreView spread pattern
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# =================================================================
# FIX 1: Add more WS state resets to onClose and onBackToSetup
# Already have: setCurrentWordSoundsWord(null), setWordSoundsActivity(null), setWordSoundsAutoReview(false)
# Need to add: setWordSoundsPhonemes(null), setWordSoundsFeedback(null)
# =================================================================
old_onclose = "onClose={() => { setIsWordSoundsMode(false); setCurrentWordSoundsWord(null); setWordSoundsActivity(null); setWordSoundsAutoReview(false); setActiveView('input'); }}"
new_onclose = "onClose={() => { setIsWordSoundsMode(false); setCurrentWordSoundsWord(null); setWordSoundsPhonemes(null); setWordSoundsFeedback(null); setWordSoundsActivity(null); setWordSoundsAutoReview(false); setActiveView('input'); }}"
if old_onclose in content:
    content = content.replace(old_onclose, new_onclose, 1)
    changes.append("FIX 1a: Added phonemes+feedback reset to onClose")
else:
    print("[WARN] FIX 1a: onClose pattern not found")

old_backtosetup = "onBackToSetup={() => { setIsWordSoundsMode(false); setCurrentWordSoundsWord(null); setWordSoundsActivity(null); setWordSoundsAutoReview(false); setActiveView('word-sounds-generator'); }}"
new_backtosetup = "onBackToSetup={() => { setIsWordSoundsMode(false); setCurrentWordSoundsWord(null); setWordSoundsPhonemes(null); setWordSoundsFeedback(null); setWordSoundsActivity(null); setWordSoundsAutoReview(false); setActiveView('word-sounds-generator'); }}"
if old_backtosetup in content:
    content = content.replace(old_backtosetup, new_backtosetup, 1)
    changes.append("FIX 1b: Added phonemes+feedback reset to onBackToSetup")
else:
    print("[WARN] FIX 1b: onBackToSetup pattern not found")

# =================================================================
# FIX 2: Consolidate duplicate review panel useEffects
# Replace the TWO effects (L7160-7174 and L7175-7187) with ONE
# =================================================================
old_dup_effects = """    // NEW: Watch for preloaded words and show Review Panel when ready
    React.useEffect(() => {
        // Show Review Panel when words are READY (have TTS audio cached)
        // FIX: Wait until words have ttsReady=true (not just phonemes - ensures audio works immediately)
        // FIX: Only show if user hasn't already started from review this session
        // PERF: Consider useMemo for filtering if perf issues
        const readyWords = preloadedWords.filter(w => w.ttsReady === true);
        const phonemeWords = preloadedWords.filter(w => w.phonemes && (Array.isArray(w.phonemes) ? w.phonemes.length > 0 : true));
        // Show panel when at least half the words have TTS ready, or all phonemes are loaded with at least 1 TTS
        const hasReadyWords = readyWords.length >= Math.ceil(preloadedWords.length / 2) || 
            (phonemeWords.length === preloadedWords.length && readyWords.length >= 1);
        if (preloadedWords.length > 0 && hasReadyWords && !showReviewPanel && !currentWordSoundsWord && !hasStartedFromReview.current) {
            // SILENCED: debugLog("📋 Preloaded words ready! Showing Review Panel. Ready words:", readyWords.length);
            setShowReviewPanel(true);
        }
    }, [preloadedWords, showReviewPanel, currentWordSoundsWord]);
    // FIX: Show review panel immediately when words are loaded (don't wait for TTS/phonemes)
    React.useEffect(() => {
        if (preloadedWords.length > 0 && !showReviewPanel && !currentWordSoundsWord && !hasStartedFromReview.current) {
            // Show panel after short delay (allows UI to settle)
            const timer = setTimeout(() => {
                if (!showReviewPanel && !currentWordSoundsWord && !hasStartedFromReview.current) {
                    debugLog("📋 Words loaded - showing Review Panel immediately");
                    setShowReviewPanel(true);
                }
            }, 500); // 500ms delay is enough for UI to render
            return () => clearTimeout(timer);
        }
    }, [preloadedWords, showReviewPanel, currentWordSoundsWord]);"""

new_consolidated_effect = """    // CONSOLIDATED: Show Review Panel when words are loaded
    // Shows immediately (300ms delay for UI settle), no TTS wait
    React.useEffect(() => {
        if (preloadedWords.length > 0 && !showReviewPanel && !currentWordSoundsWord && !hasStartedFromReview.current) {
            const timer = setTimeout(() => {
                if (!showReviewPanel && !currentWordSoundsWord && !hasStartedFromReview.current) {
                    debugLog("📋 Words loaded - showing Review Panel");
                    setShowReviewPanel(true);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [preloadedWords, showReviewPanel, currentWordSoundsWord]);"""

if old_dup_effects in content:
    content = content.replace(old_dup_effects, new_consolidated_effect, 1)
    changes.append("FIX 2: Consolidated duplicate review panel useEffects into single effect")
else:
    print("[WARN] FIX 2: Duplicate effects pattern not found - trying partial match")
    # Try to find the first effect and see if content matches
    idx1 = content.find("// NEW: Watch for preloaded words and show Review Panel when ready")
    idx2 = content.find("// FIX: Show review panel immediately when words are loaded")
    if idx1 >= 0 and idx2 >= 0:
        print("  Found both comments at indices %d and %d" % (idx1, idx2))
    else:
        print("  Could not find either comment. idx1=%d, idx2=%d" % (idx1, idx2))

# =================================================================
# FIX 3: Math Check duplicate XP prevention
# Add tracking to prevent double XP on retry
# Replace the XP section with one that checks if already awarded
# =================================================================
old_xp = """          // Award XP: 0-10 based on score
          const xpAwarded = Math.round(score / 10);
          if (xpAwarded > 0) {
              handleScoreUpdate(xpAwarded, "Math Problem", resourceId);
          }"""

new_xp = """          // Award XP: 0-10 based on score (only on first check per problem)
          const xpAwarded = Math.round(score / 10);
          const alreadyAwarded = mathCheckResults[resourceId]?.[problemIdx]?.xpAwarded;
          if (xpAwarded > 0 && !alreadyAwarded) {
              handleScoreUpdate(xpAwarded, "Math Problem", resourceId);
          }"""

if old_xp in content:
    content = content.replace(old_xp, new_xp, 1)
    changes.append("FIX 3a: Added duplicate XP prevention guard")
else:
    print("[WARN] FIX 3a: XP pattern not found")

# Also add xpAwarded tracking to the result storage
old_result_store = "                [problemIdx]: { checking: false, verdict, score, feedback, checked: true }"
new_result_store = "                [problemIdx]: { checking: false, verdict, score, feedback, checked: true, xpAwarded: (!mathCheckResults[resourceId]?.[problemIdx]?.xpAwarded && Math.round(score / 10) > 0) || mathCheckResults[resourceId]?.[problemIdx]?.xpAwarded || false }"
if old_result_store in content:
    content = content.replace(old_result_store, new_result_store, 1)
    changes.append("FIX 3b: Track xpAwarded flag in mathCheckResults")
else:
    print("[WARN] FIX 3b: Result store pattern not found")

# =================================================================
# FIX 5: Add Math Check localization keys to UI_STRINGS
# Insert before the closing of display: { ... } at "    }"
# =================================================================
old_math_display_end = """    display: {
      visual_header: "Visual Representation",
      steps_header: "Solution Steps",
      step_label: "Step",
      answer_header: "Answer",
      connection_header: "Real World Connection",
      hide_answers: "Hide Answers",
      reveal_answers: "Reveal All Answers",
      copy_all: "Copy All",
      generate_similar: "Practice: Generate Similar Problem",
      placeholder_work: "Show your work and answer here...",
      reveal_solution: "Reveal Solution",
      answer_hidden: "Answer Hidden",
    }
  },"""

new_math_display_end = """    display: {
      visual_header: "Visual Representation",
      steps_header: "Solution Steps",
      step_label: "Step",
      answer_header: "Answer",
      connection_header: "Real World Connection",
      hide_answers: "Hide Answers",
      reveal_answers: "Reveal All Answers",
      copy_all: "Copy All",
      generate_similar: "Practice: Generate Similar Problem",
      placeholder_work: "Show your work and answer here...",
      reveal_solution: "Reveal Solution",
      answer_hidden: "Answer Hidden",
    },
    check: {
      button: "Check My Work",
      checking: "Evaluating your work...",
      too_short: "Please write more before checking!",
      correct: "Excellent work! ✨",
      partial: "Good effort, keep going! 🟡",
      incorrect: "Not quite right — try again! 💪",
      error: "Could not evaluate — please try again.",
      verdict_correct: "Correct!",
      verdict_partial: "Partially Correct",
      verdict_incorrect: "Not Quite Right",
      try_again: "Try Again",
      try_another: "Revise Answer",
    }
  },"""

if old_math_display_end in content:
    content = content.replace(old_math_display_end, new_math_display_end, 1)
    changes.append("FIX 5: Added math.check localization keys to UI_STRINGS")
else:
    print("[WARN] FIX 5: Math display end pattern not found")

# =================================================================
# FIX 6: handleRestoreView spread pattern for setGeneratedContent
# Replace cherry-picked fields with spread
# =================================================================
old_sgc = "setGeneratedContent({ type: item.type, data: item.data, id: item.id, lessonPlanConfig: item.lessonPlanConfig || null, lessonPlanSequence: item.lessonPlanSequence || [] });"
new_sgc = "setGeneratedContent({ ...item, type: item.type, data: item.data, id: item.id, lessonPlanConfig: item.lessonPlanConfig || null, lessonPlanSequence: item.lessonPlanSequence || [] });"

if old_sgc in content:
    content = content.replace(old_sgc, new_sgc, 1)
    changes.append("FIX 6: Added spread in handleRestoreView setGeneratedContent to preserve all item properties")
else:
    print("[WARN] FIX 6: setGeneratedContent pattern not found")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "=" * 60)
print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("=" * 60)
