"""
Patch: Insert word-sounds and word-sounds-generator into the activeView
header ternary chain, between the 'image' and 'gemini-bridge' cases.

Target (line ~60177-60178 in reverted file):
  activeView === 'image' ? <><ImageIcon .../> {t('visuals.title')}</> :
  activeView === 'gemini-bridge' ? ...

After patch:
  activeView === 'image' ? <><ImageIcon .../> {t('visuals.title')}</> :
  activeView === 'word-sounds' ? <><Sparkles .../> Word Sounds Studio</> :
  activeView === 'word-sounds-generator' ? <><Sparkles .../> Word Sounds Studio</> :
  activeView === 'gemini-bridge' ? ...
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Ultra-specific match: only the exact transition from 'image' to 'gemini-bridge' in the header
EXACT_OLD = "activeView === 'image' ? <><ImageIcon className=\"text-purple-600\" size={20} /> {t('visuals.title')}</> :\n                activeView === 'gemini-bridge'"

EXACT_NEW = """activeView === 'image' ? <><ImageIcon className="text-purple-600" size={20} /> {t('visuals.title')}</> :
                activeView === 'word-sounds' ? <><Sparkles className="text-violet-600" size={20} /> {t('output.word_sounds_studio') || 'Word Sounds Studio'}</> :
                activeView === 'word-sounds-generator' ? <><Sparkles className="text-violet-600" size={20} /> {t('output.word_sounds_studio') || 'Word Sounds Studio'}</> :
                activeView === 'gemini-bridge'"""

count = content.count(EXACT_OLD)

if count == 1:
    content = content.replace(EXACT_OLD, EXACT_NEW)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"SUCCESS: Inserted word-sounds mappings into the header ternary chain.")
    print(f"File now has {len(content.splitlines())} lines.")
elif count == 0:
    print("FAILED: Could not find exact match. The file may have different formatting.")
    # Debug: show what's actually around the image/gemini-bridge transition
    idx = content.find("activeView === 'image'")
    if idx >= 0:
        snippet = content[idx:idx+300]
        print(f"Found 'activeView === image' at char {idx}. Snippet:")
        print(repr(snippet[:200]))
    else:
        print("Could not find activeView === 'image' at all!")
else:
    print(f"ABORTED: Found {count} matches (expected 1). Not safe to replace.")
