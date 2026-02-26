"""
Phase 2 Items 3 & 4: Apply timer cleanup and JSX key fixes.
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

INPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    report = []
    fixes = 0

    # ===== ITEM 3: Timer leak fixes =====
    # Strategy: Add cleanup returns to useEffect blocks with un-cleaned timers.
    # We work by text substitution on the exact patterns.

    # --- Fix 3a: L27113 - setTeamEscapeToast timer ---
    # Before: setTimeout(() => setTeamEscapeToast(null), 4000);
    # After: const _toastTimer = setTimeout(() => setTeamEscapeToast(null), 4000);
    # Plus cleanup at end of useEffect
    old_3a = "      setTeamEscapeToast(newEscapes[0]);\n      setTimeout(() => setTeamEscapeToast(null), 4000);\n    }\n    setLastEscapedTeams(escapedTeams);\n  }, [escapeState.teamProgress]);"
    new_3a = "      setTeamEscapeToast(newEscapes[0]);\n      const _toastTimer = setTimeout(() => setTeamEscapeToast(null), 4000);\n      return () => clearTimeout(_toastTimer);\n    }\n    setLastEscapedTeams(escapedTeams);\n  }, [escapeState.teamProgress]);"
    
    if old_3a in content:
        content = content.replace(old_3a, new_3a, 1)
        fixes += 1
        report.append("FIX 3a: Added cleanup for setTeamEscapeToast timer")
    else:
        report.append("SKIP 3a: Pattern not found for setTeamEscapeToast timer")
        # Debug: try to find close match
        if 'setTimeout(() => setTeamEscapeToast(null), 4000)' in content:
            report.append("  -> Timer exists but surrounding context differs")

    # --- Fix 3b: L27123 - setShowConfetti timer ---
    old_3b = "    if (teamEscaped) {\n      playSound?.('levelUp');\n      setShowConfetti(true);\n      setTimeout(() => setShowConfetti(false), 5000);\n    }\n  }, [teamEscaped]);"
    new_3b = "    if (teamEscaped) {\n      playSound?.('levelUp');\n      setShowConfetti(true);\n      const _confettiTimer = setTimeout(() => setShowConfetti(false), 5000);\n      return () => clearTimeout(_confettiTimer);\n    }\n  }, [teamEscaped]);"
    
    if old_3b in content:
        content = content.replace(old_3b, new_3b, 1)
        fixes += 1
        report.append("FIX 3b: Added cleanup for setShowConfetti timer")
    else:
        report.append("SKIP 3b: Pattern not found for setShowConfetti timer")
        if 'setTimeout(() => setShowConfetti(false), 5000)' in content:
            report.append("  -> Timer exists but surrounding context differs")

    # --- Fix 3c: L34522 - Tour scroll timer ---
    old_3c = "    if (runTour && tourSteps[tourStep]) {\n        // Delay slightly to allow expansion animation to start/finish\n        setTimeout(() => {"
    new_3c = "    if (runTour && tourSteps[tourStep]) {\n        // Delay slightly to allow expansion animation to start/finish\n        const _tourScrollTimer = setTimeout(() => {"
    
    if old_3c in content:
        content = content.replace(old_3c, new_3c, 1)
        # Now add cleanup return after the setTimeout closing
        old_3c_end = "        }, 300);\n    }\n  }, [runTour, tourStep]);"
        new_3c_end = "        }, 300);\n        return () => clearTimeout(_tourScrollTimer);\n    }\n  }, [runTour, tourStep]);"
        if old_3c_end in content:
            content = content.replace(old_3c_end, new_3c_end, 1)
            fixes += 1
            report.append("FIX 3c: Added cleanup for tour scroll timer")
        else:
            report.append("SKIP 3c (end): Could not find useEffect closing pattern for tour scroll")
    else:
        report.append("SKIP 3c: Pattern not found for tour scroll timer")

    # --- Fix 3d: L38006 - Dictation mode timer ---
    old_3d = "      if (isDictationMode) {\n          setTimeout(() => {"
    new_3d = "      if (isDictationMode) {\n          const _dictationTimer = setTimeout(() => {"
    
    if old_3d in content:
        content = content.replace(old_3d, new_3d, 1)
        # Add cleanup
        old_3d_end = "          }, 100);\n      } else {\n          recognitionRef.current.stop();\n      }\n  }, [isDictationMode]);"
        new_3d_end = "          }, 100);\n          return () => clearTimeout(_dictationTimer);\n      } else {\n          recognitionRef.current.stop();\n      }\n  }, [isDictationMode]);"
        if old_3d_end in content:
            content = content.replace(old_3d_end, new_3d_end, 1)
            fixes += 1
            report.append("FIX 3d: Added cleanup for dictation mode timer")
        else:
            report.append("SKIP 3d (end): Could not find useEffect closing pattern for dictation timer")
    else:
        report.append("SKIP 3d: Pattern not found for dictation mode timer")

    # --- Fix 3e: L46634 - Auto-read TTS timer ---
    old_3e = "      if (textToSpeak) {\n          setTimeout(() => {\n              handleSpeak(textToSpeak, 'adventure-active');\n          }, 500);\n      }"
    new_3e = "      if (textToSpeak) {\n          const _readTimer = setTimeout(() => {\n              handleSpeak(textToSpeak, 'adventure-active');\n          }, 500);\n          return () => clearTimeout(_readTimer);\n      }"
    
    if old_3e in content:
        content = content.replace(old_3e, new_3e, 1)
        fixes += 1
        report.append("FIX 3e: Added cleanup for auto-read TTS timer")
    else:
        report.append("SKIP 3e: Pattern not found for auto-read TTS timer")
        if "handleSpeak(textToSpeak, 'adventure-active')" in content:
            report.append("  -> Timer exists but surrounding context differs")

    # ===== ITEM 4: Missing JSX key props =====
    
    # --- Fix 4a: L24533 - renderCard map without key ---
    # .map(item => renderCard(item))
    # renderCard is a function that returns JSX. The key should be on the parent element.
    # BUT since renderCard returns the element directly, we can't add key= easily outside.
    # Instead, we need to wrap or change the map call.
    # Pattern: .map(item => renderCard(item))  →  .map(item => <React.Fragment key={item.id}>{renderCard(item)}</React.Fragment>)
    # Actually simpler: just pass item.id as key render prop is tricky. Let's use the Fragment approach.
    old_4a = ".map(item => renderCard(item))"
    new_4a = ".map(item => <React.Fragment key={item.id}>{renderCard(item)}</React.Fragment>)"
    
    count_4a = content.count(old_4a)
    if count_4a == 1:
        content = content.replace(old_4a, new_4a, 1)
        fixes += 1
        report.append("FIX 4a: Added key to renderCard .map() via React.Fragment wrapper")
    elif count_4a > 1:
        report.append(f"SKIP 4a: Multiple occurrences ({count_4a}), needs manual fix")
    else:
        report.append("SKIP 4a: Pattern not found for renderCard .map()")
    
    # --- Fix 4b: L36660 - renderFlowShape map without key ---
    old_4b = ".map(node => renderFlowShape(node, connectingSourceId === node.id))"
    new_4b = ".map(node => <React.Fragment key={node.id}>{renderFlowShape(node, connectingSourceId === node.id)}</React.Fragment>)"
    
    count_4b = content.count(old_4b)
    if count_4b == 1:
        content = content.replace(old_4b, new_4b, 1)
        fixes += 1
        report.append("FIX 4b: Added key to renderFlowShape .map() via React.Fragment wrapper")
    elif count_4b > 1:
        report.append(f"SKIP 4b: Multiple occurrences ({count_4b}), needs manual fix")
    else:
        report.append("SKIP 4b: Pattern not found for renderFlowShape .map()")
    
    # --- Fix 4c: L68710 - q.options.map without key ---
    # The map returns JSX buttons, we need key on the button element
    old_4c = "{q.options.map((opt, optIdx) => {"
    new_4c_count = content.count(old_4c)
    if new_4c_count > 0:
        # For this one we need to find where the button/container div is rendered and add key.
        # Looking at the code, after the map there's a return with a button. 
        # The simplest fix: change .map((opt, optIdx) => { to .map((opt, optIdx) => {
        # Then find the first <button or <div after it and add key={`opt-${optIdx}`}
        # Actually let me check if there's already a return statement
        report.append(f"INFO 4c: Found {new_4c_count} occurrences of q.options.map without key")
        # This is more complex - let's look for the return + first element pattern
        # For now, skip this as it requires more careful manual-like editing
        report.append("SKIP 4c: q.options.map requires careful per-instance key insertion — needs more context")
    else:
        report.append("SKIP 4c: Pattern not found for q.options.map")

    # Write output
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)

    new_lines = content.split('\n')
    report.append(f"\nFixes applied: {fixes}")
    report.append(f"Output: {len(content):,} bytes, {len(new_lines):,} lines")
    
    # Verify
    open_b = content.count('{')
    close_b = content.count('}')
    report.append(f"Braces: {open_b} open, {close_b} close, diff={open_b - close_b}")
    
    report_txt = '\n'.join(report)
    with open('phase2_fix_report.txt', 'w', encoding='utf-8') as f:
        f.write(report_txt)
    
    print(f"Applied {fixes} fixes. See phase2_fix_report.txt")

if __name__ == '__main__':
    main()
