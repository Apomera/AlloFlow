"""
Fix Word Sounds showReviewPanel TDZ:
The useEffect injected at L18 uses `showReviewPanel` but the const declaration
is at L73 (same component function scope). This creates a TDZ.

Fix: Replace the direct `showReviewPanel` reference in the guard with a 
check via the already-declared `initialShowReviewPanel` prop.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

# The injected useEffect has:
# if (!playInstructions || !wordSoundsActivity || showReviewPanel) return;
# Replace showReviewPanel with initialShowReviewPanel (which is a prop, already in scope)
OLD = "if (!playInstructions || !wordSoundsActivity || showReviewPanel) return;"
NEW = "if (!playInstructions || !wordSoundsActivity || initialShowReviewPanel) return;"

if OLD in c:
    c = c.replace(OLD, NEW)
    
    # Also fix the dependency array if showReviewPanel is referenced there
    c = c.replace("}, [wordSoundsActivity, showReviewPanel]);", "}, [wordSoundsActivity]);")
    
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Fixed: showReviewPanel -> initialShowReviewPanel in instruction useEffect')
else:
    print('Pattern not found, checking for variation...')
    if 'showReviewPanel) return;' in c:
        # Find the first occurrence
        idx = c.find('showReviewPanel) return;')
        # Check if it's in the instruction useEffect area (first 15k chars)
        if idx < 15000:
            # Replace it
            c = c[:idx] + 'initialShowReviewPanel) return;' + c[idx+len('showReviewPanel) return;'):]
            with open(FILE, 'w', encoding='utf-8') as f:
                f.write(c)
            print(f'Fixed at char {idx}: showReviewPanel -> initialShowReviewPanel')
        else:
            print(f'Found at char {idx} but too far into file - skipping')
    else:
        print('FAIL: showReviewPanel) return; not found')
