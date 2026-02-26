
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_recovery():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. INJECT PROP (SAFE CHECK)
    # Search for declaration of WordSoundsModal
    # We want to add `imageVisibility = 'after_response'` to destructuring default vals.
    # Anchor: `lessonPlanConfig = null,`
    
    if "imageVisibility = 'after_response'" not in content:
        # Try to find the props area
        anchor_props = "lessonPlanConfig = null,"
        if anchor_props in content:
            content = content.replace(anchor_props, "lessonPlanConfig = null,\n    imageVisibility = 'after_response',")
            print("1. Injected imageVisibility prop")
        else:
            print("Warning: Prop anchor not found. Please check WordSoundsModal signature manually.")
            # Maybe it matches `lessonPlanConfig = null` without comma? 
            # Step 530 didn't show signature. Step 388 showed lines 2820.
            # I will assume the anchor exists or needs looser match.
            pass

    # 2. INJECT STATE & LOGIC
    # Anchor: `const [isStudentLocked, setIsStudentLocked] = React.useState(false);`
    # We know this exists at line 2955 from Step 530.
    
    # We will search for a unique substring just to be sure.
    anchor_state = "const [isStudentLocked, setIsStudentLocked] = React.useState(false);"
    
    # We want to inject `isImageRevealed` AND `showImage` logic after it.
    
    injection = """
    const [isImageRevealed, setIsImageRevealed] = React.useState(false);
    
    // VISIBILITY LOGIC
    const showImage = React.useMemo(() => {
        if (imageVisibility === 'always') return true;
        if (imageVisibility === 'never') return false;
        if (imageVisibility === 'after_response') return wordSoundsFeedback === 'correct';
        if (imageVisibility === 'progressive') return isImageRevealed || wordSoundsFeedback === 'correct';
        return false; 
    }, [imageVisibility, wordSoundsFeedback, isImageRevealed]);
    """
    
    # Check if definition exists to avoid double injection
    if "const showImage =" not in content:
        if anchor_state in content:
            content = content.replace(anchor_state, anchor_state + injection)
            print("2. Injected isImageRevealed and showImage")
        else:
             print("Warning: State anchor not found. Trying looser match...")
             # Try just variable name
             anchor_loose = "setIsStudentLocked] = React.useState(false);"
             if anchor_loose in content:
                 content = content.replace(anchor_loose, anchor_loose + injection)
                 print("2. Injected via looser match")
             else:
                 print("CRITICAL: Could not find state injection point.")
    else:
        print("Skipping 2, showImage already defined (unexpected given findings)")

    # 3. FIX RESET EFFECT
    # I also missed adding the reset effect in Part 1? (`search_str_10`)
    # Logic: `setIsImageRevealed(false);` on word change.
    # We should add this.
    
    reset_logic = """
    // Reset Image Reveal on word change
    React.useEffect(() => {
        setIsImageRevealed(false);
    }, [currentWordSoundsWord]);
    """
    
    if "setIsImageRevealed(false);" not in content:
        # Inject near MICROPHONE STATE comment?
        anchor_mic = "// MICROPHONE STATE"
        if anchor_mic in content:
            content = content.replace(anchor_mic, reset_logic + "\n    " + anchor_mic)
            print("3. Injected Reset Effect")
        else:
            print("Warning: Reset Effect anchor not found")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Recovery Patch Complete")

if __name__ == "__main__":
    patch_recovery()
