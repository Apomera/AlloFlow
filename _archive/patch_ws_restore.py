filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact block using unique marker strings
marker_start = 'if (item.type === \'word-sounds\') {\n          console.error("[WS-DBG] handleRestoreView: word-sounds detected. Forcing clean remount...");'
marker_end = 'if (item.type === \'adventure\' && item.data?.snapshot)'

start_idx = content.find(marker_start)
end_idx = content.find(marker_end)

if start_idx < 0:
    print("FAILED: Could not find start marker")
    # Debug
    alt = content.find("word-sounds detected. Forcing clean remount")
    print(f"  Alt marker at char: {alt}")
    if alt > 0:
        print(repr(content[alt-200:alt+100]))
    exit()

if end_idx < 0:
    print("FAILED: Could not find end marker")
    exit()

# Back up start to include the `      ` indent + `if`
# The block starts with whitespace before `if (item.type === 'word-sounds')`
line_start = content.rfind('\n', 0, start_idx) + 1
# End marker starts at its own line, go back to the previous newline
line_end = content.rfind('\n', 0, end_idx) + 1

old_block = content[line_start:line_end]
print(f"Found block: chars {line_start}-{line_end} ({len(old_block)} chars)")
print(f"First 80 chars: {repr(old_block[:80])}")
print(f"Last 80 chars: {repr(old_block[-80:])}")

# Build the new block preserving the emoji by reading them from the original
# Extract the emoji from the original for re-use
inbox_emoji = '\U0001f4e5'  # inbox tray emoji

new_block = f"""      if (item.type === 'word-sounds') {{
          console.error("[WS-DBG] handleRestoreView: word-sounds detected. Mode:", isTeacherMode ? "teacher" : "student");
          // Always load word data first
          if (item.wsPreloadedWords && Array.isArray(item.wsPreloadedWords) && item.wsPreloadedWords.length > 0) {{
              debugLog("{inbox_emoji} Restoring preloaded words from saved wsPreloadedWords:", item.wsPreloadedWords.length);
              const wordsWithFreshTtsFlags = item.wsPreloadedWords.map(w => ({{
                  ...w,
                  ttsReady: false,
                  _audioRequested: false
              }}));
              setWsPreloadedWords(wordsWithFreshTtsFlags);
          }} else if (item.data && Array.isArray(item.data) && item.data.length > 0) {{
              debugLog("{inbox_emoji} Restoring preloaded words from item.data:", item.data.length);
              setWsPreloadedWords(item.data);
          }}
          if (isTeacherMode) {{
              // Teacher: Show the preview card with Review/Launch buttons. Don't auto-enter the modal.
              setIsWordSoundsMode(false);
              setWordSoundsAutoReview(false);
          }} else {{
              // Student: Skip preview card, launch activity directly via clean remount
              setIsWordSoundsMode(false);
              setWordSoundsAutoReview(false);
              setTimeout(() => {{
                  console.error("[WS-DBG] Student restore: launching Word Sounds activity directly");
                  setIsWordSoundsMode(true);
                  setCurrentWordSoundsWord(null);
                  setWordSoundsActivity('counting');
                  setWordSoundsAutoReview(false);
              }}, 50);
          }}
      }}
"""

content = content[:line_start] + new_block + content[line_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Patched handleRestoreView with teacher/student branching.")
print("  Teacher: Shows preview card (Review + Launch buttons)")
print("  Student: Launches Word Sounds activity directly")
