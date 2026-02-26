"""
CRITICAL FIX: Remove diagnostic useEffect that causes TDZ crash.
The useEffect references isWordSoundsMode before its useState declaration,
causing: ReferenceError: Cannot access 'isWordSoundsMode' before initialization
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the entire diagnostic useEffect block
old_diag = """  // === WS DIAGNOSTIC EFFECT (REMOVE AFTER DEBUG) ===
  useEffect(() => {
      if (isWordSoundsMode) {
          const gcType = generatedContent?.type || 'null';
          const wsLen = wsPreloadedWords?.length || 0;
          console.warn("[WS-DBG] Modal gate: mode=true, type=" + gcType + ", wsWords=" + wsLen);
      }
  }, [isWordSoundsMode, generatedContent?.type, wsPreloadedWords?.length]);"""

if old_diag in content:
    content = content.replace(old_diag, '', 1)
    print("FIXED: Removed TDZ-causing diagnostic useEffect")
else:
    print("[WARN] Exact pattern not found, trying variant...")
    # Try to find it with different whitespace
    idx = content.find("WS DIAGNOSTIC EFFECT (REMOVE AFTER DEBUG)")
    if idx >= 0:
        # Find the start of the comment line
        line_start = content.rfind('\n', 0, idx) + 1
        # Find the end of the useEffect (ends with ]);)
        end_marker = content.find("wsPreloadedWords?.length]);", idx)
        if end_marker >= 0:
            end = end_marker + len("wsPreloadedWords?.length]);")
            # Also grab trailing newline
            if content[end:end+1] == '\n':
                end += 1
            removed = content[line_start:end]
            content = content[:line_start] + content[end:]
            print("FIXED via fallback: Removed %d chars" % len(removed))
    else:
        print("ERROR: Could not find diagnostic effect at all!")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    v = f.read()
print("Verification:")
print("  'WS DIAGNOSTIC EFFECT' present:", 'WS DIAGNOSTIC EFFECT' in v)
print("  'isWordSoundsMode' still in file:", v.count('isWordSoundsMode') > 0)
print("  console.warn WS-DBG remaining:", v.count('console.warn("[WS-DBG]'))
