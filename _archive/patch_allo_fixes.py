
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_file():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix Pre-loaded Words Logic
    # Find: const previewList = React.useMemo(() => {
    # Then Find: let list = [];
    search_str_1 = "const previewList = React.useMemo(() => {\n            let list = [];"
    replace_str_1 = """const previewList = React.useMemo(() => {
            let list = [];
            
            // 0. Pre-loaded Words (Teacher/Lesson Plan) - Always include first!
            if (preloadedWords && preloadedWords.length > 0) {
                const preloadedTerms = preloadedWords; // No mapping needed effectively if we just pass objects, but logic below expects strings mostly? 
                // Actually the previewList below merges strings from other sources.
                // But preloadedWords is an array of objects usually. 
                // Let's match the logic: 
                const preloadedTermsMap = preloadedWords.map(w => w.targetWord || w.word || w);
                list = [...list, ...preloadedTermsMap];
            }"""
    
    # We need to be careful with exact whitespace matching. 
    # Let's try to match a slightly smaller unique chunk if possible, or normalize.
    # The file content I viewed has:
    # 1210:         const previewList = React.useMemo(() => {
    # 1211:             let list = [];
    
    # Let's try to find the specific string "let list = [];" inside the useMemo block.
    # Actually, simpler: replace "let list = [];" with the new logic, but ONLY the one inside WordSoundsGenerator.
    # Hook: It is inside "const WordSoundsGenerator = ...".
    
    # Let's use a more robust replace that verifies context if possible, but this file is huge.
    # The snippet "const previewList = React.useMemo(() => {" is likely unique or rare.
    
    if search_str_1 not in content:
        # Try looser match
        search_str_1_loose = "let list = [];"
        # finding the index of "const previewList"
        idx = content.find("const previewList = React.useMemo(() => {")
        if idx != -1:
            # find next let list = [];
            list_idx = content.find("let list = [];", idx)
            if list_idx != -1:
                # We can construct the patch
                # verify it's close
                if list_idx - idx < 100:
                    print("Found previewList location.")
                    # Perform splice
                    
                    insertion = """let list = [];
            
            // 0. Pre-loaded Words (Teacher/Lesson Plan) - Always include first!
            if (preloadedWords && preloadedWords.length > 0) {
                const preloadedTerms = preloadedWords.map(w => w.targetWord || w.word || w);
                list = [...list, ...preloadedTerms];
            }"""
                    content = content[:list_idx] + insertion + content[list_idx + len("let list = [];"):]
                else:
                    print("Warning: 'let list = [];' too far from previewList definition.")
            else:
                print("Warning: 'let list = [];' not found after previewList.")
        else:
            print("Warning: 'const previewList = React.useMemo' not found.")
    else:
        content = content.replace(search_str_1, replace_str_1)
        print("Applied Pre-loaded Words Fix.")


    # 2. Update Generator Prompt for Bossy R
    # Context: inside WordSoundsGenerator, the prompt definition.
    # 1303:                         • DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)
    
    old_prompt_part = "• DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)"
    new_prompt_part = "• DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)\n                        • R-CONTROLLED: ar, er, ir, or, ur (count as ONE sound)"
    
    # Check if specifically inside WordSoundsGenerator area?
    # The exact string appears in two places?
    # Modal has it at line 5394. Generator at 1303.
    # Modal ALREADY has "• R-CONTROLLED: ..." at line 5395.
    # Generator DOES NOT.
    # So if we replace occurrences that do NOT have R-CONTROLLED following them.
    
    # Let's count occurences of old_prompt_part
    count_old = content.count(old_prompt_part)
    print(f"Found {count_old} occurrences of DIGRAPHS line.")
    
    # We want to replace valid occurrences.
    # Let's do a loop find.
    start = 0
    while True:
        idx = content.find(old_prompt_part, start)
        if idx == -1:
            break
            
        # Check what follows
        # If next line is not R-CONTROLLED
        next_stuff = content[idx+len(old_prompt_part):idx+len(old_prompt_part)+100]
        if "R-CONTROLLED" not in next_stuff:
            print(f"Patching prompt at index {idx}")
            content = content[:idx] + new_prompt_part + content[idx+len(old_prompt_part):]
            # Adjust start for next search (len changed)
            start = idx + len(new_prompt_part)
        else:
            print(f"Skipping index {idx}, already patched.")
            start = idx + len(old_prompt_part)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully patched AlloFlowANTI.txt")

if __name__ == "__main__":
    patch_file()
