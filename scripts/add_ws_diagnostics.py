"""
Add diagnostic toast messages to Word Sounds flow for Canvas debugging.
These toasts will appear in the UI so the user can see what's happening.
All messages prefixed with [WS-DBG] for easy identification.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# DIAG 1: handleRestoreView — when word-sounds type is detected
old_restore = 'if (item.type === \'word-sounds\') {\n           setIsWordSoundsMode(true);'
new_restore = 'if (item.type === \'word-sounds\') {\n           addToast("[WS-DBG] handleRestoreView: word-sounds detected, setting isWordSoundsMode=true", "info");\n           setIsWordSoundsMode(true);'
if old_restore in content:
    content = content.replace(old_restore, new_restore, 1)
    changes.append("DIAG 1: Toast in handleRestoreView for word-sounds type")
else:
    print("[WARN] DIAG 1 not found")

# DIAG 2: Auto-open effect when wsPreloadedWords goes 0->N
old_autoopen = 'debugLog("🚀 Auto-opening Word Sounds mode for", wsPreloadedWords.length, "preloaded words");'
new_autoopen = 'debugLog("🚀 Auto-opening Word Sounds mode for", wsPreloadedWords.length, "preloaded words");\n           addToast("[WS-DBG] Auto-open: " + wsPreloadedWords.length + " words loaded, setting isWordSoundsMode=true", "info");'
if old_autoopen in content:
    content = content.replace(old_autoopen, new_autoopen, 1)
    changes.append("DIAG 2: Toast in auto-open effect")
else:
    print("[WARN] DIAG 2 not found")

# DIAG 3: Inside the WS modal — consolidated review panel effect
old_review_show = 'debugLog("📋 Words loaded - showing Review Panel");'
new_review_show = 'debugLog("📋 Words loaded - showing Review Panel");\n                // DIAG: addToast("[WS-DBG] Review panel: showing (words=" + preloadedWords.length + ", currentWord=" + (currentWordSoundsWord || "null") + ")", "info");'
if old_review_show in content:
    content = content.replace(old_review_show, new_review_show, 1)
    changes.append("DIAG 3: Comment-toast in review panel show effect (inside modal)")
else:
    print("[WARN] DIAG 3 not found")

# DIAG 4: At the WS modal mount point — add a diagnostic log
# Find the WordSoundsModal JSX and add a console.warn right before it
old_ws_mount = '{isWordSoundsMode && (generatedContent?.type === \'glossary\' || generatedContent?.type === \'word-sounds\' || (wsPreloadedWords && wsPreloadedWords.length > 0)) && ('
new_ws_mount = '{/* WS-DBG: isWordSoundsMode is checked here */}\n                    {isWordSoundsMode && (generatedContent?.type === \'glossary\' || generatedContent?.type === \'word-sounds\' || (wsPreloadedWords && wsPreloadedWords.length > 0)) && ('
if old_ws_mount in content:
    content = content.replace(old_ws_mount, new_ws_mount, 1)
    changes.append("DIAG 4: Comment marker at WS modal mount point")
else:
    print("[WARN] DIAG 4 not found")

# DIAG 5: Add a useEffect that toasts whenever isWordSoundsMode changes
# Insert after the wordSoundsAutoReview state definition
old_ws_state = "const [wordSoundsAutoReview, setWordSoundsAutoReview] = useState(false); // Review Fix"
new_ws_state = """const [wordSoundsAutoReview, setWordSoundsAutoReview] = useState(false); // Review Fix
  // === WS DIAGNOSTIC EFFECT (REMOVE AFTER DEBUG) ===
  useEffect(() => {
      if (isWordSoundsMode) {
          const gcType = generatedContent?.type || 'null';
          const wsLen = wsPreloadedWords?.length || 0;
          addToast("[WS-DBG] Modal gate: mode=true, type=" + gcType + ", wsWords=" + wsLen, "info");
      }
  }, [isWordSoundsMode, generatedContent?.type, wsPreloadedWords?.length]);"""
if old_ws_state in content:
    content = content.replace(old_ws_state, new_ws_state, 1)
    changes.append("DIAG 5: Added useEffect that toasts WS modal gate state whenever isWordSoundsMode=true")
else:
    print("[WARN] DIAG 5 not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "=" * 60)
print("Applied %d diagnostic changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("=" * 60)
print("\nUser should see [WS-DBG] toasts when:")
print("  1. Clicking a word-sounds history item")
print("  2. When auto-open fires after generator loads words")
print("  3. When isWordSoundsMode becomes true (shows modal gate state)")
print("  4. If none fire, the issue is BEFORE these points")
