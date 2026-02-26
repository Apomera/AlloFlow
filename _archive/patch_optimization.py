
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_optimization():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. LOCALIZATION INJECTION
    # Find: const UI_STRINGS = {
    # We want to insert inside the object.
    # Let's target the 'word_sounds' section if it exists, or just append after opening brace.
    
    # Let's search for "word_sounds: {"
    if "word_sounds: {" in content:
        # Insert inside word_sounds
        search_loc = "word_sounds: {"
        insert_loc = """word_sounds: {
        image_visibility: { en: "Image Visibility", es: "Visibilidad de imagen", fr: "Visibilité de l'image" },
        "vis.after": { en: "Show After Response (Default)", es: "Mostrar después de responder", fr: "Afficher après réponse" },
        "vis.never": { en: "Never Show (Pure Phonemic)", es: "Nunca mostrar", fr: "Ne jamais afficher" },
        "vis.progressive": { en: "Progressive Reveal (On Retry)", es: "Revelación progresiva", fr: "Révélation progressive" },
        "vis.always": { en: "Always Show", es: "Mostrar siempre", fr: "Toujours afficher" },
        """
        # But wait, `word_sounds` structure might be flat or nested?
        # Standard `t('word_sounds.key')` implies nested object OR flattened keys?
        # Usually i18n libraries use nested.
        # But let's check the file content from Step 500 (View File).
        # Assuming nested based on `t('word_sounds.theme_hint')` seen earlier.
        
        # We will use a safe injection approach:
        # Find `word_sounds: {` and replace with `word_sounds: { <new_keys>`.
        content = content.replace("word_sounds: {", insert_loc)
        print("1. Injected Localization Keys")
    else:
        print("Warning: 'word_sounds: {' not found. Checking for flat structure...")
        # If not nested, maybe keys are "word_sounds.image_visibility": ... ?
        # Step 500 will clarify.
        pass

    # 2. AUTO-REVIEW (RESOURCE INJECTION)
    # Find: imageVisibility: imageVisibility,
    # Add: autoReview: true,
    
    search_res = "imageVisibility: imageVisibility,"
    replace_res = """imageVisibility: imageVisibility,
                       autoReview: true,"""
                       
    if search_res in content:
        content = content.replace(search_res, replace_res)
        print("2. Injected autoReview flag")
    else:
        print("Warning: imageVisibility anchor not found")

    # 3. AUTO-REVIEW (MODAL PROP)
    # Find: <WordSoundsModal 
    # Find Prop: initialShowReviewPanel={...}
    # It might be `initialShowReviewPanel={false}` or derived.
    # We saw earlier: `initialShowReviewPanel={generatedContent?.initialShowReviewPanel}` or similar?
    # Actually, Step 388/389 didn't show the Modal invocation.
    # Step 394 showed Modal *definition*.
    # Step 393 (Patch 1) modified the invocation at line 64530 area.
    # We added `imageVisibility` there.
    # Let's find that patch point.
    
    # Search for: `imageVisibility={generatedContent?.imageVisibility || 'after_response'}`
    search_modal = "imageVisibility={generatedContent?.imageVisibility || 'after_response'}"
    
    # We want to add/ensure: `initialShowReviewPanel={generatedContent?.autoReview}`
    # Note: If `initialShowReviewPanel` already exists in props, we should check it.
    
    if search_modal in content:
        # Check if initialShowReviewPanel is nearby
        # Try to replace the whole block or append.
        replace_modal = """imageVisibility={generatedContent?.imageVisibility || 'after_response'}
                                initialShowReviewPanel={generatedContent?.autoReview || false}"""
        
        # Use simple replace if unique enough
        content = content.replace(search_modal, replace_modal)
        print("3. Passed autoReview to Modal prop")
    else:
        print("Warning: Modal invocation anchor not found")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Optimization Patch Complete")

if __name__ == "__main__":
    patch_optimization()
