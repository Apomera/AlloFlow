"""
Pass 2 A+ Fix: Add isMountedRef guards to unguarded setTimeout callbacks.
Strategy:
  - For code inside the WordSounds component (L3462-8100): use existing isMountedRef 
  - For code in the main component: use isMountedRef (it's accessible everywhere)
  - For sub-components that receive onCheckAnswer as prop: the guard should be in the callback
  - For async setTimeout: add guard at start of async body
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# === FIX 1: L4201 - Spelling check delayed answer ===
old = "setTimeout(() => onCheckAnswer(userSpelling), 500);"
new = "setTimeout(() => { if (isMountedRef.current) onCheckAnswer(userSpelling); }, 500);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"1. Fixed L4201: Spelling check setTimeout")

# === FIX 2: L4568 - Sound sort auto-advance ===
old = "setTimeout(() => onCheckAnswer('correct'), 1000);"
new = "setTimeout(() => { if (isMountedRef.current) onCheckAnswer('correct'); }, 1000);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"2. Fixed L4568: Sound sort auto-advance")

# === FIX 3: L8232 - Letter tracing completion ===
old = "setTimeout(() => onComplete(true), 800);"
new = "setTimeout(() => { if (isMountedRef.current) onComplete(true); }, 800);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"3. Fixed L8232: Letter tracing completion")

# === FIX 4+5: L8236, L8239 - Letter tracing feedback clear (2 instances) ===
old = "setTimeout(() => setFeedback(null), 2000);"
new = "setTimeout(() => { if (isMountedRef.current) setFeedback(null); }, 2000);"
count_before = content.count(old)
content = content.replace(old, new)
count_after = content.count(old)
replaced = count_before - count_after
if replaced > 0:
    changes += replaced
    print(f"4. Fixed {replaced} instances: Letter tracing feedback clear")

# === FIX 6: L18055 - Translation flag reset ===
old = "setTimeout(() => setIsTranslating(false), 500);"
new = "setTimeout(() => { if (isMountedRef.current) setIsTranslating(false); }, 500);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"5. Fixed L18055: Translation flag reset")

# === FIX 7: L53701 - Flashcard advance ===
old = "setTimeout(() => setFlashcardIndex(prev => prev + 1), 150);"
new = "setTimeout(() => { if (isMountedRef.current) setFlashcardIndex(prev => prev + 1); }, 150);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"6. Fixed L53701: Flashcard advance")

# === FIX 8: L53746 - Flashcard reverse ===
old = "setTimeout(() => setFlashcardIndex(prev => prev - 1), 150);"
new = "setTimeout(() => { if (isMountedRef.current) setFlashcardIndex(prev => prev - 1); }, 150);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"7. Fixed L53746: Flashcard reverse")

# === FIX 9: L6058 - Async audio play after regeneration ===
old = "setTimeout(async () => {\n                   await handleAudio(targetWord, true);\n                }, 100);"
new = "setTimeout(async () => {\n                   if (!isMountedRef.current) return;\n                   await handleAudio(targetWord, true);\n                }, 100);"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"8. Fixed L6058: Async audio post-regeneration")

# === FIX 10-13: L47898, L47955, L48154, L48232 - Guided workflow async setTimeout ===
# These use a common pattern: setTimeout(async () => { ... }, 100)
# Add guard at start: if (!isMountedRef.current) return;
# Need to find each unique instance

# L47898 - Glossary generation
old = "setTimeout(async () => {\n                              const resultItem = await handleGenerate('glossary');"
new = "setTimeout(async () => {\n                              if (!isMountedRef.current) return;\n                              const resultItem = await handleGenerate('glossary');"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"9. Fixed L47898: Async glossary generation")

# L47955 - Simplified text generation
old = "setTimeout(async () => {\n                              const resultItem = await handleGenerate('simplified');"
new = "setTimeout(async () => {\n                              if (!isMountedRef.current) return;\n                              const resultItem = await handleGenerate('simplified');"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"10. Fixed L47955: Async simplified text generation")

# L48154 - Support generation
old = "setTimeout(async () => {\n                              const resultItem = await handleGenerate('support');"
new = "setTimeout(async () => {\n                              if (!isMountedRef.current) return;\n                              const resultItem = await handleGenerate('support');"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"11. Fixed L48154: Async support generation")

# L48232 - Assessment generation
old = "setTimeout(async () => {\n                              const resultItem = await handleGenerate('assessment');"
new = "setTimeout(async () => {\n                              if (!isMountedRef.current) return;\n                              const resultItem = await handleGenerate('assessment');"
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print(f"12. Fixed L48232: Async assessment generation")

# === FIX 14: L49499 - Panel TTS sequence ===
old = "setTimeout(async () => {\n                   for"
new = "setTimeout(async () => {\n                   if (!isMountedRef.current) return;\n                   for"
# Find the right instance near L49499
pos = content.find(old, 248000)  # approximate byte offset for line 49499
if pos > -1:
    content = content[:pos] + new + content[pos + len(old):]
    changes += 1
    print(f"13. Fixed L49499: Async panel TTS sequence")

# === Summary ===
print(f"\nTotal changes: {changes}")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print("File saved.")
