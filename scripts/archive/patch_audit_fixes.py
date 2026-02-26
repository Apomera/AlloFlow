"""
Audit Fixes for Word Sounds Studio (High + Medium Priority)
Fix 1: isMountedRef guard on WordFamiliesView completion
Fix 2: Wrap 6 raw feedback strings with ts() 
Fix 3: Add feedbackAudioRef for cleanup on unmount (+ fix empty catch)
Fix 4: Remove JSON.stringify from useEffect deps
Fix 5: Add renderPrompt() to word_families case for image display
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: isMountedRef guard on WordFamiliesView completion timeout
# ================================================================
old_wf_timeout = "setTimeout(() => onCheckAnswer('correct'), 1200);"
new_wf_timeout = "setTimeout(() => { if (isMountedRef.current) onCheckAnswer('correct'); }, 1200);"
if old_wf_timeout in content:
    content = content.replace(old_wf_timeout, new_wf_timeout)
    changes += 1
    print("1. ✅ Added isMountedRef guard to WordFamiliesView completion timeout")
else:
    print("1. ❌ WordFamiliesView timeout pattern not found")

# ================================================================
# FIX 2: Wrap raw feedback strings with ts()
# ================================================================
raw_strings = [
    (
        'message: "Try again! Listen closely... 👂"',
        "message: ts('word_sounds.fb_try_again') || \"Try again! Listen closely... 👂\""
    ),
    (
        "message: `${hint} — one more try! 💪`",
        "message: (ts('word_sounds.fb_one_more_try') || `${hint} — one more try! 💪`)"
    ),
    (
        'message: "Let\'s add some text to help! 📝"',
        "message: ts('word_sounds.fb_text_scaffold') || \"Let's add some text to help! 📝\""
    ),
    (
        "message: \"Awesome! Let's try WITHOUT text now! 🙈\"",
        "message: ts('word_sounds.fb_no_text_mode') || \"Awesome! Let's try WITHOUT text now! 🙈\""
    ),
    (
        "message: \"You're a pro! Testing your spelling now! 👁️\"",
        "message: ts('word_sounds.fb_spelling_transition') || \"You're a pro! Testing your spelling now! 👁️\""
    ),
    (
        ': `Nice try! The answer was "${expectedAnswer}".',
        ": (ts('word_sounds.fb_nice_try') || `Nice try! The answer was \"${expectedAnswer}\".`)"
    ),
]

for old, new in raw_strings:
    if old in content:
        content = content.replace(old, new)
        changes += 1
        print(f"2. ✅ Wrapped: {old[:50]}...")
    else:
        print(f"2. ❌ Not found: {old[:50]}...")

# ================================================================
# FIX 3a: Fix empty catch block (level-up audio)
# ================================================================
old_empty_catch = "} catch(e) {}\n                    // Reset progress bar"
new_empty_catch = "} catch(e) { debugLog('Level-up audio error', e); }\n                    // Reset progress bar"
if old_empty_catch in content:
    content = content.replace(old_empty_catch, new_empty_catch)
    changes += 1
    print("3a. ✅ Fixed empty catch block at level-up audio")
else:
    print("3a. ❌ Empty catch pattern not found")

# ================================================================
# FIX 3b: Add feedbackAudioRef for cleanup
# We add a ref to track currently playing feedback audio, and pause on unmount
# ================================================================
# Add the ref declaration after existing refs
old_ref_area = "const submissionLockRef = React.useRef(false);"
new_ref_area = """const submissionLockRef = React.useRef(false);
    const feedbackAudioRef = React.useRef(null); // Track feedback audio for cleanup"""
if old_ref_area in content:
    content = content.replace(old_ref_area, new_ref_area, 1)
    changes += 1
    print("3b. ✅ Added feedbackAudioRef declaration")
else:
    print("3b. ❌ submissionLockRef pattern not found")

# Replace direct new Audio() calls with ref-tracked versions
# Fix tryAgainAudio
old_try_again = """const tryAgainAudio = new Audio(INSTRUCTION_AUDIO['fb_try_again_listen']);
                        tryAgainAudio.volume = 0.7;
                        tryAgainAudio.play().catch(() => {});"""
new_try_again = """if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; }
                        const tryAgainAudio = new Audio(INSTRUCTION_AUDIO['fb_try_again_listen']);
                        feedbackAudioRef.current = tryAgainAudio;
                        tryAgainAudio.volume = 0.7;
                        tryAgainAudio.play().catch(() => {});"""
if old_try_again in content:
    content = content.replace(old_try_again, new_try_again)
    changes += 1
    print("3c. ✅ Added ref tracking for tryAgainAudio")
else:
    print("3c. ❌ tryAgainAudio pattern not found")

# Fix almostAudio
old_almost = """const almostAudio = new Audio(INSTRUCTION_AUDIO['fb_almost']);
                        almostAudio.volume = 0.7;
                        almostAudio.play().catch(() => {});"""
new_almost = """if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; }
                        const almostAudio = new Audio(INSTRUCTION_AUDIO['fb_almost']);
                        feedbackAudioRef.current = almostAudio;
                        almostAudio.volume = 0.7;
                        almostAudio.play().catch(() => {});"""
if old_almost in content:
    content = content.replace(old_almost, new_almost)
    changes += 1
    print("3d. ✅ Added ref tracking for almostAudio")
else:
    print("3d. ❌ almostAudio pattern not found")

# Fix level-up audio (fb_amazing)
old_amazing = """const audio = new Audio(INSTRUCTION_AUDIO['fb_amazing']);
                            audio.volume = 0.7;
                            audio.play().catch(() => {});"""
new_amazing = """if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; }
                            const audio = new Audio(INSTRUCTION_AUDIO['fb_amazing']);
                            feedbackAudioRef.current = audio;
                            audio.volume = 0.7;
                            audio.play().catch(() => {});"""
if old_amazing in content:
    content = content.replace(old_amazing, new_amazing)
    changes += 1
    print("3e. ✅ Added ref tracking for fb_amazing audio")
else:
    print("3e. ❌ fb_amazing pattern not found")

# Fix feedback audio injection (general feedback clips)
old_feedback_audio = """const audio = new Audio(INSTRUCTION_AUDIO[feedbackAudioKey]);
                         audio.volume = 0.6; // Slightly lower volume so it doesn't blast
                         audio.play().catch(e => debugLog('Audio play error', e));"""
new_feedback_audio = """if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; }
                         const audio = new Audio(INSTRUCTION_AUDIO[feedbackAudioKey]);
                         feedbackAudioRef.current = audio;
                         audio.volume = 0.6; // Slightly lower volume so it doesn't blast
                         audio.play().catch(e => debugLog('Audio play error', e));"""
if old_feedback_audio in content:
    content = content.replace(old_feedback_audio, new_feedback_audio)
    changes += 1
    print("3f. ✅ Added ref tracking for general feedback audio")
else:
    print("3f. ❌ Feedback audio injection pattern not found")

# Add cleanup in unmount effect
old_unmount = "isMountedRef.current = false;"
# Find the one that's in the cleanup function (should be the one near the useEffect return)
# We'll add feedbackAudio cleanup right before it
new_unmount = """if (feedbackAudioRef.current) { feedbackAudioRef.current.pause(); feedbackAudioRef.current = null; }
                isMountedRef.current = false;"""
if old_unmount in content:
    content = content.replace(old_unmount, new_unmount, 1)
    changes += 1
    print("3g. ✅ Added feedback audio cleanup on unmount")
else:
    print("3g. ❌ Unmount cleanup pattern not found")

# ================================================================
# FIX 4: Remove JSON.stringify from useEffect deps
# Replace with a simple ref-based guard (already in place internally)
# ================================================================
old_deps = "}, [JSON.stringify(data.options), JSON.stringify(data.distractors)]);"
new_deps = "}, [data.options, data.distractors]); // Ref-based guard inside handles stability"
if old_deps in content:
    content = content.replace(old_deps, new_deps)
    changes += 1
    print("4. ✅ Removed JSON.stringify from useEffect deps")
else:
    print("4. ❌ JSON.stringify deps pattern not found")

# ================================================================
# FIX 5: Add renderPrompt() to word_families case for image display
# ================================================================
old_wf_render = """                return (
                    <WordFamiliesView
                        key={`wf-${targetWord}`}
                        data={{
                            family: `-${targetRime} family`,"""
new_wf_render = """                return (
                    <div className="space-y-4">
                    {renderPrompt()}
                    <WordFamiliesView
                        key={`wf-${targetWord}`}
                        data={{
                            family: `-${targetRime} family`,"""
if old_wf_render in content:
    content = content.replace(old_wf_render, new_wf_render)
    changes += 1
    print("5a. ✅ Added renderPrompt() before WordFamiliesView in word_families case")
else:
    print("5a. ❌ word_families render pattern not found")

# Close the wrapping div
old_wf_close = """                        onUpdateOption={handleOptionUpdate}
                    />
                );
            }

            default:"""
new_wf_close = """                        onUpdateOption={handleOptionUpdate}
                    />
                    </div>
                );
            }

            default:"""
if old_wf_close in content:
    content = content.replace(old_wf_close, new_wf_close)
    changes += 1
    print("5b. ✅ Closed wrapping div for word_families case")
else:
    print("5b. ❌ word_families close pattern not found")

# ================================================================
# Add the 6 new ts() keys to UI_STRINGS.word_sounds
# ================================================================
old_ws_keys = '    review_words: "Review Words",'
new_ws_keys = """    review_words: "Review Words",
    fb_try_again: "Try again! Listen closely... 👂",
    fb_one_more_try: "one more try! 💪",
    fb_text_scaffold: "Let's add some text to help! 📝",
    fb_no_text_mode: "Awesome! Let's try WITHOUT text now! 🙈",
    fb_spelling_transition: "You're a pro! Testing your spelling now! 👁️",
    fb_nice_try: "Nice try!",
    feedback_correct: "Correct! 🎉","""
if old_ws_keys in content:
    content = content.replace(old_ws_keys, new_ws_keys)
    changes += 1
    print("6. ✅ Added 7 new ts() keys to UI_STRINGS.word_sounds")
else:
    print("6. ❌ review_words key pattern not found for injection")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\n✨ Total changes: {changes}")
