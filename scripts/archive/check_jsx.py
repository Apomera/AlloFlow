"""Verify the JSX structure around the IIFE in the fluency results section."""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the IIFE opening
iife_open = content.find('(() => {\r\n                                const rrMetrics')
if iife_open == -1:
    print("ERROR: IIFE opening not found!")
else:
    print(f"IIFE opening found at char offset {iife_open}")
    # Check nearby content
    snippet = content[iife_open:iife_open+200]
    print(f"  First 200 chars: {repr(snippet[:200])}")

# Find the IIFE closing
iife_close = content.find('</>);\r\n                            })()}')
if iife_close == -1:
    # Try without CRLF
    iife_close = content.find('</>);\n                            })()}')
    if iife_close == -1:
        print("ERROR: IIFE closing not found!")
    else:
        print(f"IIFE closing found (LF) at char offset {iife_close}")
else:
    print(f"IIFE closing found (CRLF) at char offset {iife_close}")

# Check what comes after the IIFE closing
if iife_close != -1:
    after = content[iife_close:iife_close+300]
    print(f"\n  After IIFE close (300 chars):\n{after[:300]}")

# Check the fluencyFeedback section is still intact after the IIFE
feedback_anchor = 'fluencyFeedback && ('
fb_pos = content.find(feedback_anchor, iife_close if iife_close != -1 else 0)
if fb_pos != -1:
    print(f"\nfluencyFeedback block found at offset {fb_pos}")
    # Check it's inside the right parent div
    parent_context = content[fb_pos-100:fb_pos]
    print(f"  Context before: ...{repr(parent_context[-80:])}")
else:
    print("WARNING: fluencyFeedback block not found after IIFE!")
