"""
Deep dive audit part 2: 
- Phoneme segmentation/estimation logic
- Pre-loading pipeline details  
- Review panel rendering
- Per-activity response option generation
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

OUT = []
def p(s):
    OUT.append(s)
    print(s)

p("=" * 60)
p("PART 1: PHONEME SEGMENTATION LOGIC")
p("=" * 60)

# Find estimatePhonemes / estimateFirstPhoneme / phonemeSequence
for name in ['estimatePhoneme', 'estimateFirstPhoneme', 'phonemeSequence', 
             'getPhonemeSequence', 'splitIntoPhonemes', 'segmentWord',
             'phonemes', 'parsePhonemes']:
    idx = c.find(name)
    if idx > 0:
        line = c[:idx].count('\n') + 1
        ctx = c[max(0,idx-30):idx+150].replace('\n', ' ').strip()
        p(f"  {name} at L{line}: {ctx[:120]}")

# Check if PHONEME_AUDIO_BANK is used in phoneme estimation
p("\n  PHONEME_AUDIO_BANK usage in phoneme logic:")
for m in re.finditer(r'PHONEME_AUDIO_BANK', c):
    ctx = c[max(0,m.start()-40):m.start()+60]
    if any(k in ctx.lower() for k in ['estimate', 'segment', 'split', 'phoneme', 'sequence', 'digraph']):
        line = c[:m.start()].count('\n') + 1
        p(f"    L{line}: {ctx.strip()[:80]}")

p("\n" + "=" * 60)
p("PART 2: PRE-LOADING PIPELINE")
p("=" * 60)

# Find generateWordData or whatever generates the preloaded word data
for name in ['generateWordData', 'preloadWord', 'prepareWord', 'fetchWordData',
             'prefetchAudio', 'preloadData', 'generatePreload', 'callGemini']:
    count = c.count(name)
    if count > 0:
        idx = c.find(name)
        line = c[:idx].count('\n') + 1
        p(f"  {name}: {count} refs (first at L{line})")

# Find the main preload/prepare function body
for m in re.finditer(r'(const|function|async)\s+(generateWordData|preloadWord|prepareWord)', c):
    start = m.start()
    line = c[:start].count('\n') + 1
    p(f"\n  PRELOAD FUNCTION at L{line}:")
    # Show first 500 chars
    func_body = c[start:start+800].replace('\n', '\n    ')
    p(f"    {func_body[:600]}")

p("\n" + "=" * 60) 
p("PART 3: REVIEW PANEL RENDERING")
p("=" * 60)

# Find the render function for review panel
for m in re.finditer(r'(renderReviewPanel|ReviewPanel|showReviewPanel.*return)', c):
    ctx = c[m.start():m.start()+200]
    if '<' in ctx or 'render' in ctx.lower():
        line = c[:m.start()].count('\n') + 1
        p(f"  Review panel render at L{line}: {ctx[:100]}")

# Find where preloadedWords are rendered in the review panel
for m in re.finditer(r'preloadedWords.*map|preloadedWords.*forEach', c):
    line = c[:m.start()].count('\n') + 1
    ctx = c[m.start():m.start()+200].replace('\n', ' ')
    p(f"  preloadedWords render at L{line}: {ctx[:120]}")

p("\n" + "=" * 60)
p("PART 4: PER-ACTIVITY RESPONSE OPTIONS")
p("=" * 60)

# Find where response options are generated for each activity
for m in re.finditer(r'(rhymeOptions|blendOptions|responseOptions|distractors|wrongWords|isolationOptions)', c):
    word = m.group(1)
    ctx = c[max(0,m.start()-30):m.start()+80]
    line = c[:m.start()].count('\n') + 1
    p(f"  {word} at L{line}: {ctx.strip()[:80]}")

p("\n" + "=" * 60)
p("PART 5: WORD ADVANCEMENT / COMPLETION")
p("=" * 60)

# Find checkAnswer / handleCorrectAnswer / advanceWord
for name in ['checkAnswer', 'handleCorrect', 'advanceWord', 'nextWord', 'moveToNextWord']:
    idx = c.find(name)
    if idx > 0:
        line = c[:idx].count('\n') + 1
        ctx = c[idx:idx+100].replace('\n', ' ')
        p(f"  {name} at L{line}: {ctx[:80]}")

# Find correctCount / sessionGoal logic
for m in re.finditer(r'correctCount\s*[><=!]+\s*\d+|sessionGoal|WORDS_PER_SESSION', c):
    line = c[:m.start()].count('\n') + 1
    ctx = c[max(0,m.start()-10):m.start()+50]
    p(f"  Completion check L{line}: {ctx.strip()[:60]}")

# Save full output
with open(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\audit_output.txt", 'w', encoding='utf-8') as f:
    f.write('\n'.join(OUT))

p("\n=== AUDIT COMPLETE ===")
