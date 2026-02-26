"""
Fix remaining items that didn't match in first patch:
1a. Missing Letter progressive hints
5. Test Sequence localization
6. Edit Sounds localization
"""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# 1a. Missing Letter progressive hints - using EXACT text from file
old_ml = """                    } else {
                        setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Listen again \xf0\x9f\x94\x8a' });
                        handleAudio(currentWordSoundsWord);
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }
                };"""

new_ml = """                    } else {
                        // Progressive hints: escalate help on repeated wrong answers
                        const attempts = (wordSoundsScore?.total || 0) - (wordSoundsScore?.correct || 0);
                        const position = (hiddenIndex || 0) + 1;
                        if (attempts >= 2) {
                            // 3rd+ attempt: reveal the answer
                            setWordSoundsFeedback({ type: 'incorrect', message: `\xf0\x9f\x92\xa1 The missing letter is "${correctLetter.toUpperCase()}"` });
                            setUserAnswer(correctLetter);
                        } else if (attempts >= 1) {
                            // 2nd attempt: position hint
                            setWordSoundsFeedback({ type: 'incorrect', message: `\xf0\x9f\x94\x8d Hint: It's letter #${position} in the word. Listen carefully!` });
                        } else {
                            // 1st attempt: just replay
                            setWordSoundsFeedback({ type: 'incorrect', message: 'Not quite! Listen again \xf0\x9f\x94\x8a' });
                        }
                        handleAudio(currentWordSoundsWord);
                        // Engage retry mechanic (Second Chance + progressive image reveal)
                        checkAnswer('incorrect', 'correct');
                    }
                };"""

if old_ml in content:
    content = content.replace(old_ml, new_ml)
    changes += 1
    print("1a. Applied Missing Letter progressive hints")
else:
    # Debug: find partial match
    partial = "Not quite! Listen again"
    idx = content.find(partial)
    if idx >= 0:
        # Get surrounding context
        start = max(0, idx - 200)
        end = min(len(content), idx + 200)
        ctx = content[start:end]
        # Show exact characters
        print(f"1a. Partial match at pos {idx}")
        for i, c in enumerate(ctx):
            if c in ('\n', '\r', ' ', '\t'):
                continue
        # Try with exact context from file
        lines = content.split('\n')
        for i, l in enumerate(lines):
            if partial in l:
                print(f"  Line {i+1}: [{repr(l.rstrip())}]")
                for j in range(max(0,i-2), min(len(lines), i+6)):
                    print(f"  {j+1}: [{repr(lines[j].rstrip())}]")
                break
    else:
        print("1a. WARNING: Cannot find 'Not quite! Listen again' anywhere")

# 5. Test Sequence - check exact text
test_seq = "Test Sequence\n"
idx = content.find(test_seq)
if idx >= 0:
    # Check what's around it
    start = max(0, idx - 80)
    end = min(len(content), idx + 80)
    ctx = content[start:end]
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if 'Test Sequence' in l and 'ts(' not in l:
            print(f"5. Found 'Test Sequence' at line {i+1}: {repr(l.rstrip()[:80])}")
            old_ts = l.rstrip()
            new_ts = old_ts.replace('Test Sequence', "{ts('word_sounds.test_sequence') || 'Test Sequence'}")
            content = content.replace(l.rstrip() + '\n', new_ts + '\n', 1)
            changes += 1
            print("5. Localized 'Test Sequence'")
            break
else:
    print("5. 'Test Sequence' already localized or not found")

# 6. Edit Sounds
edit_line = None
lines = content.split('\n')
for i, l in enumerate(lines):
    if 'Edit Sounds' in l and 'ts(' not in l and '</div>' in l:
        edit_line = i
        print(f"6. Found 'Edit Sounds' at line {i+1}: {repr(l.strip()[:80])}")
        break
if edit_line is not None:
    old_line = lines[edit_line]
    new_line = old_line.replace('Edit Sounds', "{ts('word_sounds.blending_edit_sounds') || 'Edit Sounds'}")
    content = content.replace(old_line + '\n', new_line + '\n', 1)
    changes += 1
    print("6. Localized 'Edit Sounds'")
else:
    print("6. 'Edit Sounds' already localized or not found")

content = content.replace('\n', '\r\n')
print(f"\nTotal changes: {changes}")
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"Saved ({len(content)} chars)")
