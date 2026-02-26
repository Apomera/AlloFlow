"""Fix remaining guided workflow async setTimeout patterns (CRLF-aware)"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# The file uses CRLF, so multi-line matches need \r\n
# Fix the 4 guided workflow async patterns
patterns = [
    ("handleGenerate('glossary')", "Glossary generation"),
    ("handleGenerate('simplified')", "Simplified text generation"),
    ("handleGenerate('support')", "Support generation"),
    ("handleGenerate('assessment')", "Assessment generation"),
]

for gen_call, label in patterns:
    old = f"setTimeout(async () => {{\r\n                              const resultItem = await {gen_call};"
    new = f"setTimeout(async () => {{\r\n                              if (!isMountedRef.current) return;\r\n                              const resultItem = await {gen_call};"
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print(f"Fixed: Async {label}")
    else:
        print(f"Not found: {label}")

# Fix L49499 - Panel TTS async  
old_tts = "setTimeout(async () => {\r\n                   for"
new_tts = "setTimeout(async () => {\r\n                   if (!isMountedRef.current) return;\r\n                   for"
# Search from around line 49499
pos = content.find(old_tts, len(content) // 2)
if pos > -1:
    content = content[:pos] + new_tts + content[pos + len(old_tts):]
    changes += 1
    print("Fixed: Panel TTS async sequence")
else:
    print("Not found: Panel TTS async sequence")

# Fix L6058 async audio (may already be fixed from first pass)
old_audio = "setTimeout(async () => {\r\n                   await handleAudio(targetWord, true);\r\n                }, 100);"
if old_audio in content:
    new_audio = "setTimeout(async () => {\r\n                   if (!isMountedRef.current) return;\r\n                   await handleAudio(targetWord, true);\r\n                }, 100);"
    content = content.replace(old_audio, new_audio, 1)
    changes += 1
    print("Fixed: Async audio post-regeneration (CRLF)")

# Additionally fix L48313 - setTimeout to handleGenerate
old_313 = "setTimeout(() => handleGenerate('simplified'), 100);"
new_313 = "setTimeout(() => { if (isMountedRef.current) handleGenerate('simplified'); }, 100);"
if old_313 in content:
    content = content.replace(old_313, new_313, 1)
    changes += 1
    print("Fixed: L48313 handleGenerate simplified")

print(f"\nTotal additional changes: {changes}")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("File saved.")
