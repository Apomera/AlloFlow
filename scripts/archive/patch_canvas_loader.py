"""Remove the LoadAudioButton from the header JSX to fix React child error."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The injected pattern is: <GlobalMuteButton ... /> <LoadAudioButton ... />
# We need to remove just the <LoadAudioButton ... /> part
# Find it using a unique anchor

import re

# Match <LoadAudioButton className={`...'}`} />
# The className contains backtick template literals
pattern = r'\s*<LoadAudioButton\s+className=\{`[^`]+`\}\s*/>'
matches = list(re.finditer(pattern, content))

if matches:
    print(f"Found {len(matches)} LoadAudioButton tag(s). Removing...")
    # Remove in reverse order to preserve indices
    for m in reversed(matches):
        content = content[:m.start()] + content[m.end():]
        print(f"  Removed at position {m.start()}")
    
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done! LoadAudioButton removed from JSX.")
else:
    print("LoadAudioButton tag not found in JSX.")
