"""
Patch: Fix feedback audio trigger + Wire up sounds-only text visibility mode.

Part A: Replace over-throttled feedback trigger (L7892-7908) with correct ~30% rate.
Part B: Add SMART_TEXT_VISIBILITY map, getEffectiveTextMode(), and wire showWordText into renderPrompt().
"""
import re

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Loaded {len(lines)} lines")
changes = 0

# ============================================================
# PART A: Fix feedback audio trigger logic
# ============================================================
print("\n=== PART A: Fix Feedback Audio Trigger ===")

# Find the feedback trigger block (L7892-7908 area)
trigger_start = None
trigger_end = None
for i, line in enumerate(lines):
    if "const feedbackAudioKey = (() => {" in line:
        trigger_start = i
    if trigger_start and i > trigger_start and "return null;" in line and "})();" in lines[i+1] if i+1 < len(lines) else False:
        trigger_end = i + 1  # Include the })();
        break

if trigger_start and trigger_end:
    # Get indentation from original
    indent = lines[trigger_start][:len(lines[trigger_start]) - len(lines[trigger_start].lstrip())]
    
    new_trigger = f"""{indent}const feedbackAudioKey = (() => {{
{indent}   // Milestone streaks - always celebrate
{indent}   if (newStreak === 5) return 'fb_on_fire';
{indent}   if (newStreak === 10) return 'fb_excellent';
{indent}   if (newStreak === 25) return 'fb_on_fire'; // Reuse (fb_wow not in bank)
{indent}   // First correct answer - always encourage
{indent}   if (newStreak === 1) return 'fb_you_got_it';
{indent}   // All other correct answers - ~30% chance
{indent}   if (Math.random() < 0.3) {{
{indent}       const pool = ['fb_great_job','fb_nice','fb_keep_going',
{indent}           'fb_way_to_go','fb_perfect','fb_correct','fb_you_got_it',
{indent}           'fb_excellent'];
{indent}       return pool[Math.floor(Math.random() * pool.length)];
{indent}   }}
{indent}   return null;
{indent}}})();
"""
    new_lines = new_trigger.split('\n')
    # Remove trailing empty from split
    if new_lines and new_lines[-1] == '':
        new_lines = new_lines[:-1]
    new_lines = [l + '\n' for l in new_lines]
    
    lines[trigger_start:trigger_end + 1] = new_lines
    changes += 1
    print(f"  Replaced feedback trigger: L{trigger_start+1}-L{trigger_end+1} -> {len(new_lines)} new lines")
else:
    print(f"  ERROR: Could not find feedback trigger block. Start={trigger_start}, End={trigger_end}")


# ============================================================
# PART B: Wire up sounds-only text visibility
# ============================================================
print("\n=== PART B: Sounds-Only Text Visibility ===")

# B1: Add SMART_TEXT_VISIBILITY map after SMART_IMAGE_VISIBILITY closing brace
# Find the end of SMART_IMAGE_VISIBILITY
smart_image_end = None
for i, line in enumerate(lines):
    if "SMART_IMAGE_VISIBILITY" in line and "'missing_letter'" in line:
        smart_image_end = i
    if smart_image_end and i > smart_image_end and line.strip() == '};':
        smart_image_end = i
        break

if smart_image_end is None:
    # Try alternative: find the closing }; after the SMART_IMAGE_VISIBILITY block
    for i, line in enumerate(lines):
        if "'missing_letter':  'afterCompletion'," in line or "'missing_letter': 'afterCompletion'," in line:
            # Look for the next };
            for j in range(i+1, min(i+5, len(lines))):
                if lines[j].strip() == '};':
                    smart_image_end = j
                    break
            break

if smart_image_end:
    indent = '        '
    smart_text_block = f"""
{indent}// SMART TEXT VISIBILITY - Per-activity word text display behavior
{indent}// 'hidden' = text never shown (audio only), 'afterAnswer' = text shown after answering, 'alwaysOn' = text always shown
{indent}const SMART_TEXT_VISIBILITY = {{
{indent}    'counting':       'hidden',       // Count phonemes by ear - text reveals letter count
{indent}    'isolation':      'hidden',       // Identify phoneme position by ear
{indent}    'blending':       'hidden',       // Blend sounds into word - text bypasses synthesis
{indent}    'segmentation':   'afterAnswer',  // Show text after answer for self-check
{indent}    'rhyming':        'afterAnswer',  // Options are TTS-driven; text for verification
{indent}    'letter_tracing': 'alwaysOn',     // Must see letter to trace it
{indent}    'mapping':        'alwaysOn',     // Grapheme-phoneme mapping needs letters
{indent}    'orthography':    'afterAnswer',  // Target hidden, options visible
{indent}    'word_families':  'afterAnswer',  // Focus on sound patterns; reveal after
{indent}    'spelling_bee':   'hidden',       // Dictation-based - no text
{indent}    'word_scramble':  'alwaysOn',     // Must see letters to unscramble
{indent}    'missing_letter': 'alwaysOn',     // Must see partial word
{indent}}};
"""
    insert_lines = [l + '\n' for l in smart_text_block.split('\n') if l.strip() or True]
    # Clean: remove pure empty first/last
    lines.insert(smart_image_end + 1, smart_text_block + '\n')
    changes += 1
    print(f"  Added SMART_TEXT_VISIBILITY after L{smart_image_end+1}")
else:
    print("  ERROR: Could not find SMART_IMAGE_VISIBILITY end")

# Reload lines after insert (indices shifted)
content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + ([lines[-1] + '\n'] if lines[-1] else [])

# B2: Add getEffectiveTextMode() after getEffectiveImageMode()
effective_img_end = None
for i, line in enumerate(lines):
    if 'const getEffectiveImageMode = () => {' in line:
        # Find its closing };
        for j in range(i+1, min(i+10, len(lines))):
            if lines[j].strip() == '};':
                effective_img_end = j
                break
        break

if effective_img_end:
    indent = '        '
    text_mode_func = f"""
{indent}// Resolve text visibility: smart defaults per activity, teacher override supported
{indent}const getEffectiveTextMode = () => {{
{indent}    if (imageVisibilityMode === 'alwaysOn') return 'alwaysOn'; // Teacher override: show everything
{indent}    if (imageVisibilityMode === 'alwaysOff') return 'alwaysOn'; // No images = must show text
{indent}    return SMART_TEXT_VISIBILITY[wordSoundsActivity] || 'afterAnswer';
{indent}}};
"""
    lines.insert(effective_img_end + 1, text_mode_func + '\n')
    changes += 1
    print(f"  Added getEffectiveTextMode() after L{effective_img_end+1}")
else:
    print("  ERROR: Could not find getEffectiveImageMode closing")

# Reload lines after insert
content = ''.join(lines)
lines = content.split('\n')
lines = [l + '\n' for l in lines[:-1]] + ([lines[-1] + '\n'] if lines[-1] else [])

# B3: Wire showWordText into renderPrompt()
# Find the word label line that always shows text: {currentWordSoundsWord}
# Pattern: <span ...>{currentWordSoundsWord}</span> (around L8914)
word_label_fixed = 0
for i, line in enumerate(lines):
    # The word label under the image
    if '<span className="text-lg font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full shadow-sm">{currentWordSoundsWord}</span>' in line:
        indent = line[:len(line) - len(line.lstrip())]
        new_line = f'{indent}{{(getEffectiveTextMode() === \'alwaysOn\' || showWordText) && <span className="text-lg font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full shadow-sm">{{currentWordSoundsWord}}</span>}}\n'
        lines[i] = new_line
        word_label_fixed += 1
        print(f"  Wrapped image word-label with showWordText guard at L{i+1}")
        break

# Find the no-image text display (the button that shows word as clickable text)
# Pattern: text-4xl font-bold ... {currentWordSoundsWord}
for i, line in enumerate(lines):
    if 'text-4xl font-bold' in line and 'flex items-center justify-center' in line and 'isPlayingAudio' in line:
        # This is the button that shows the word when no image
        # We need to check: is the next line {currentWordSoundsWord}?
        for j in range(i+1, min(i+5, len(lines))):
            if '{currentWordSoundsWord}' in lines[j] and '<span' not in lines[j]:
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                lines[j] = f"{indent}{{(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : '🔊 Listen'}}\n"
                word_label_fixed += 1
                print(f"  Wrapped no-image word text with showWordText guard at L{j+1}")
                break
        break

if word_label_fixed > 0:
    changes += 1
    print(f"  Fixed {word_label_fixed} word text display locations")
else:
    print("  WARNING: Could not find word label render locations")

# B4: Wire showWordText(true) on correct answer for 'afterAnswer' activities
# The existing setShowWordText(true) at L7683 already fires on correct — verify it's in the right place
# Also need to ensure setShowWordText(false) when advancing to next word
# Check: setShowWordText is already called on next word advancement at L7948/8060 with (!wordImage)
# We need to change those to respect the smart text mode instead
for i, line in enumerate(lines):
    if 'setShowWordText(!wordImage);' in line:
        indent = line[:len(line) - len(line.lstrip())]
        # Replace with: set to false (hidden until answered for afterAnswer activities)
        lines[i] = f'{indent}setShowWordText(false); // Reset: hidden until answered (smart text mode)\n'
        changes += 1
        print(f"  Changed setShowWordText(!wordImage) -> setShowWordText(false) at L{i+1}")

for i, line in enumerate(lines):
    if 'setShowWordText(!correctImage);' in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = f'{indent}setShowWordText(false); // Reset: hidden until answered (smart text mode)\n'
        changes += 1
        print(f"  Changed setShowWordText(!correctImage) -> setShowWordText(false) at L{i+1}")

for i, line in enumerate(lines):
    if 'setShowWordText(!retryWord.image);' in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = f'{indent}setShowWordText(false); // Reset: hidden until answered (smart text mode)\n'
        changes += 1
        print(f"  Changed setShowWordText(!retryWord.image) -> setShowWordText(false) at L{i+1}")

for i, line in enumerate(lines):
    if 'setShowWordText(!word.image); // Hide text if image exists' in line:
        indent = line[:len(line) - len(line.lstrip())]
        lines[i] = f'{indent}setShowWordText(false); // Reset: hidden until answered (smart text mode)\n'
        changes += 1
        print(f"  Changed setShowWordText(!word.image) -> setShowWordText(false) at L{i+1}")

# Save
print(f"\n=== Writing {changes} changes ===")
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print(f"Saved {FILE}")
