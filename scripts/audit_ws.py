"""
Comprehensive audit of word_sounds_module.js
Analyzes: structure, activities, pre-loading, review panel, TTS generation, bugs
"""
import re
import json

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

print(f"=== MODULE SIZE: {len(c)} chars ===\n")

# 1. Find all activity types referenced
print("=== ACTIVITY TYPES ===")
activity_refs = set()
for m in re.finditer(r"['\"]([\w-]+)['\"]", c):
    val = m.group(1)
    if val in ['counting', 'isolation', 'blending', 'segmentation', 'rhyming', 
               'spelling', 'orthography', 'sound_sort', 'sound_scramble',
               'word_scramble', 'missing_letter', 'letter_tracing', 'mapping',
               'word-sounds', 'find-sounds', 'blend-sounds', 'sound-sort',
               'rhyme-time', 'letter-trace', 'sound-scramble', 'word-scramble',
               'missing-letter', 'spelling-bee', 'sound-match']:
        activity_refs.add(val)
for a in sorted(activity_refs):
    count = c.count(f"'{a}'") + c.count(f'"{a}"')
    print(f"  {a}: {count} refs")

# 2. Pre-loading pipeline
print("\n=== PRE-LOADING PIPELINE ===")
# Find preload function
preload_funcs = []
for m in re.finditer(r'(preload|prefetch|generateWordData|prepareWord)', c, re.IGNORECASE):
    ctx = c[max(0,m.start()-10):m.start()+60]
    if 'function' in ctx or 'const' in ctx or '=>' in ctx or '(' in ctx:
        preload_funcs.append((m.start(), ctx.strip()[:80]))
for pos, ctx in preload_funcs[:15]:
    line = c[:pos].count('\n') + 1
    print(f"  L{line}: {ctx}")

# 3. Review panel render
print("\n=== REVIEW PANEL ===")
for m in re.finditer(r'showReviewPanel|reviewPanel|Review Panel', c, re.IGNORECASE):
    ctx = c[max(0,m.start()-20):m.start()+60]
    if any(k in ctx for k in ['render', 'return', '<div', 'map(', 'forEach', 'button', 'onClick']):
        line = c[:m.start()].count('\n') + 1
        print(f"  L{line}: {ctx.strip()[:80]}")

# 4. Response options pre-generation
print("\n=== RESPONSE OPTIONS ===")
for keyword in ['responseOptions', 'rhymeOptions', 'blendOptions', 'distractors', 'wrongAnswers']:
    count = c.count(keyword)
    if count > 0:
        first = c.find(keyword)
        line = c[:first].count('\n') + 1
        print(f"  {keyword}: {count} refs (first at L{line})")

# 5. TTS generation for options
print("\n=== TTS FOR OPTIONS ===")
for m in re.finditer(r'(callTTS|handleAudio|speakWord|fetchTTS|generateAudio)', c):
    ctx = c[max(0,m.start()-30):m.start()+60]
    if any(k in ctx.lower() for k in ['option', 'response', 'rhyme', 'blend', 'distract']):
        line = c[:m.start()].count('\n') + 1
        print(f"  L{line}: {ctx.strip()[:80]}")

# 6. Word advancement / repeat bugs
print("\n=== WORD ADVANCEMENT ===")
for keyword in ['currentWordIndex', 'nextWord', 'advanceWord', 'wordIndex', 'setCurrentWordIndex']:
    count = c.count(keyword)
    if count > 0:
        print(f"  {keyword}: {count} refs")

# 7. Shuffle logic
print("\n=== SHUFFLE LOGIC ===")
for keyword in ['fisherYatesShuffle', 'shuffle', 'randomize', 'randomOrder']:
    count = c.count(keyword)
    if count > 0:
        first = c.find(keyword)
        line = c[:first].count('\n') + 1
        print(f"  {keyword}: {count} refs (first at L{line})")

# 8. Session queue
print("\n=== SESSION QUEUE ===")
for keyword in ['sessionQueue', 'sessionWords', 'queueIndex', 'correctCount', 'sessionGoal']:
    count = c.count(keyword)
    if count > 0:
        first = c.find(keyword)
        line = c[:first].count('\n') + 1  
        print(f"  {keyword}: {count} refs (first at L{line})")

# 9. Completion tracking
print("\n=== COMPLETION TRACKING ===")
for keyword in ['correctCount', 'totalCorrect', 'completed', 'sessionComplete', 'WORDS_PER_SESSION']:
    count = c.count(keyword)
    if count > 0:
        print(f"  {keyword}: {count} refs")

# 10. handleAudio function signature
print("\n=== handleAudio FUNCTION ===")
idx = c.find('const handleAudio')
if idx > 0:
    line = c[:idx].count('\n') + 1
    end = c.find('), [', idx)
    if end > 0:
        deps = c[end:end+200]
        print(f"  Defined at L{line}")
        print(f"  Dependencies: {deps[:150]}")

# 11. Preloaded word data structure
print("\n=== PRELOADED WORD DATA STRUCTURE ===")
for m in re.finditer(r'preloadedWords|wsPreloadedWords', c):
    ctx = c[m.start():m.start()+100]
    if any(k in ctx for k in ['.push', '.map', 'forEach', '= [', '= {', '.option', '.rhyme', '.blend', '.phoneme']):
        line = c[:m.start()].count('\n') + 1
        print(f"  L{line}: {ctx.strip()[:90]}")

# 12. Regenerate functionality
print("\n=== REGENERATE FUNCTIONALITY ===")
for m in re.finditer(r'[Rr]egenerat', c):
    ctx = c[max(0,m.start()-10):m.start()+60]
    if any(k in ctx for k in ['function', 'const', 'handle', 'onClick', 'button', 'option']):
        line = c[:m.start()].count('\n') + 1
        print(f"  L{line}: {ctx.strip()[:80]}")

print("\n=== DONE ===")
