
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_duplicate_prop():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the block to find (careful with whitespace)
    # Based on view_file output
    
    # We will construct it line by line to be safe with newlines
    lines_to_find = [
        "                            highlightedIndex={highlightedRhymeIndex}",
        "                            showLetterHints={showLetterHints}",
        "                            onPlayAudio={handleAudio}",
        "                            onCheckAnswer={(ans) => checkAnswer(ans, correctSound)}",
        "                            isEditing={isEditing}",
        "                            onUpdateOption={handleOptionUpdate}",
        "                            highlightedIndex={highlightedIsoIndex}"
    ]
    
    search_block = "\n".join(lines_to_find)
    
    # Replacement block
    lines_to_replace = [
        "                            highlightedIndex={wordSoundsActivity === 'rhyming' ? highlightedRhymeIndex : highlightedIsoIndex}",
        "                            showLetterHints={showLetterHints}",
        "                            onPlayAudio={handleAudio}",
        "                            onCheckAnswer={(ans) => checkAnswer(ans, correctSound)}",
        "                            isEditing={isEditing}",
        "                            onUpdateOption={handleOptionUpdate}"
    ]
    
    replace_block = "\n".join(lines_to_replace)

    if search_block in content:
        content = content.replace(search_block, replace_block)
        print("Success: Duplicate prop block found and replaced.")
    else:
        # Fallback: try searching with slightly looser constraints or verify exact content
        print("Warning: Exact block match failed. Attempting to match without leading whitespace on first line for safety.")
        # But indentation seems consistent in the file logic.
        
        # Let's verify if the problem is Windows CRLF vs LF.
        # Python 'r' mode usually handles this but writing back might be tricky.
        # We read as string, so Python unifies newlines usually.
        
        # Check if the duplicate line exists alone
        if "highlightedIndex={highlightedIsoIndex}" in content:
             print("Found target line individually.")
             
        # Let's try locating via surrounding context.
        start_marker = "highlightedIndex={highlightedRhymeIndex}"
        end_marker = "highlightedIndex={highlightedIsoIndex}"
        
        start_idx = content.find(start_marker)
        if start_idx != -1:
            end_idx = content.find(end_marker, start_idx)
            if end_idx != -1:
                 # Check distance
                 if end_idx - start_idx < 500: # Close proximity
                     print("Found proximity match. Patching...")
                     # We want to replace the FIRST line with the conditional, and REMOVE the LAST line.
                     
                     # Extract the chunk
                     chunk = content[start_idx:end_idx + len(end_marker)]
                     
                     # Construct new chunk
                     # 1. Replace first line
                     new_chunk = chunk.replace("highlightedIndex={highlightedRhymeIndex}", 
                                           "highlightedIndex={wordSoundsActivity === 'rhyming' ? highlightedRhymeIndex : highlightedIsoIndex}")
                     # 2. Remove last line
                     # We need to find the LAST occurrence of the iso index in this chunk (it's at the end)
                     new_chunk = new_chunk.replace("highlightedIndex={highlightedIsoIndex}", "")
                     
                     # Clean up potential extra newline leftover?
                     # The original had it on a separate line. The replacement replaces the text with empty string.
                     # This leaves the newline before it likely.
                     
                     content = content[:start_idx] + new_chunk + content[end_idx + len(end_marker):]
                     print("Applied proximity patch.")
                 else:
                     print("Markers too far apart.")
            else:
                 print("End marker not found after start.")
        else:
             print("Start marker not found.")
             
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    patch_duplicate_prop()
