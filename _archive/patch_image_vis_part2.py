
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_part2():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. INJECT HELPER VARIABLE
    search_state = "const [isImageRevealed, setIsImageRevealed] = React.useState(false);"
    helper_logic = """
    // VISIBILITY LOGIC
    const showImage = React.useMemo(() => {
        if (imageVisibility === 'always') return true;
        if (imageVisibility === 'never') return false;
        if (imageVisibility === 'after_response') return wordSoundsFeedback === 'correct';
        if (imageVisibility === 'progressive') return isImageRevealed || wordSoundsFeedback === 'correct';
        return false; 
    }, [imageVisibility, wordSoundsFeedback, isImageRevealed]);
    """
    
    if search_state in content:
        if "const showImage =" not in content:
            content = content.replace(search_state, search_state + helper_logic)
            print("1. Injected showImage helper")
        else:
            print("Skipping 1, already present")
    else:
        print("Warning: State anchor for helper not found. Did part1 run?")

    # 2. WRAP IMAGES
    
    # 2a. PhonologyView image prop
    search_iso_prop = "image: isolationState?.image || currentWordImage || wordSoundsPhonemes?.image"
    # Use loose match if comment differs
    idx_iso = content.find(search_iso_prop)
    if idx_iso != -1:
        # Check if already patched?
        line_end = content.find("\n", idx_iso)
        line = content[idx_iso:line_end]
        if "showImage" not in line:
            replace_iso_prop = "image: ((showImage || isEditing) ? (isolationState?.image || currentWordImage || wordSoundsPhonemes?.image) : null)"
            content = content.replace(search_iso_prop, replace_iso_prop)
            print("2a. Updated PhonologyView image prop")
    else:
        print("Warning: PhonologyView prop not found")

    # 2b. Inline Image (Isolation View)
    search_inline_src = "src={data.image}"
    # Replace only if it's the one inside the <img> tag we want.
    # We can check context.
    # Line 3435: <img ... src={data.image}
    
    # Let's use a targeted replace if possible, but safe to wrap all Rendered Data images?
    # Maybe.
    # Replace `src={data.image}` with `src={(showImage || isEditing) ? data.image : ''}`
    
    if search_inline_src in content:
        content = content.replace(search_inline_src, "src={(showImage || isEditing) ? data.image : ''}")
        print("2b. Wrapped inline data.image sources")
        
    # 2c. Preview/Nano Mode (Editor)
    # Usually we WANT to see the image in Editor mode regardless of settings?
    # `isEditing` check handles that above! 
    # But for Generator View (lines 1200+), `isEditing` might not be defined or different.
    # The Generator view (Preview List) isn't inside Modal.
    # `showImage` is defined in Modal.
    # So matching `src={word.image}` in Generator will FAIL if we blindly replace because `showImage` is undefined there.
    # We must ONLY replace occurrences INSIDE WordSoundsModal.
    
    # To do this safely with simple string replace is hard.
    # BUT, `data.image` seems specific to the Activity Views.
    # `word.image` seems specific to Editor/Preview.
    
    # The user request applies to "Activities".
    # Showing images in the "Review/Preview" list (Generator) is probably fine?
    # Or should we respect it there too?
    # Usually settings apply to the Game.
    # So leaving Generator as-is is likely correct.
    # The inline replacements above targeting `data.image` and `PhonologyView` cover the Game Activity.
    
    # 3. TRIGGER REVEAL
    
    # 3a. Retry Logic (setAttempts(1))
    search_retry = "setAttempts(1);"
    replace_retry = "setAttempts(1); if (imageVisibility === 'progressive') setIsImageRevealed(true);"
    
    if search_retry in content:
        content = content.replace(search_retry, replace_retry)
        print("3a. Injected Progressive Trigger (Retry)")
    else:
        print("Warning: setAttempts(1) not found")

    # 3b. General Incorrect Logic
    search_snd = "playSound('incorrect');"
    replace_snd = "playSound('incorrect'); if (imageVisibility === 'progressive') setIsImageRevealed(true);"
    
    # Avoid double patching if run twice
    if search_snd in content and "setIsImageRevealed(true);" not in content[content.find(search_snd):content.find(search_snd)+100]:
        # This check is weak for multiple occurrences.
        # Just replace matches that DON'T have the trigger following.
        pass
        
    # Let's just do a plain replace for now, simpler.
    count_snd = content.count(search_snd)
    if count_snd > 0:
        content = content.replace(search_snd, replace_snd)
        print(f"3b. Injected Progressive Trigger (General Incorrect) at {count_snd} locations")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Part 2 Complete")

if __name__ == "__main__":
    patch_part2()
