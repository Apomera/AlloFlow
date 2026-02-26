
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_review_logic():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update WordSoundsGenerator onClick handler
    # Find: data-help-key="ws_gen_review_btn" onClick={onShowReview}
    # Replace with: data-help-key="ws_gen_review_btn" onClick={() => onShowReview(previewList.filter((_, i) => selectedIndices.has(i)))}
    
    # We must be careful about line breaks.
    # In Step 288:
    # 1515:                                 data-help-key="ws_gen_review_btn" onClick={onShowReview}
    
    search_str_1 = 'data-help-key="ws_gen_review_btn" onClick={onShowReview}'
    replace_str_1 = 'data-help-key="ws_gen_review_btn" onClick={() => onShowReview(previewList.filter((_, i) => selectedIndices.has(i)))}'
    
    if search_str_1 in content:
        content = content.replace(search_str_1, replace_str_1)
        print("Patched WordSoundsGenerator onClick.")
    else:
        print("Warning: Could not find onClick={onShowReview} target string.")
        # Debugging: maybe try finding the button context
        idx = content.find('data-help-key="ws_gen_review_btn"')
        if idx != -1:
             print(f"Found button at {idx}. Context: {content[idx:idx+50]}...")
        
    # 2. Update onShowReview prop in main component
    # Find: onShowReview={() => {
    # Replace with: onShowReview={(wordsToReview) => { 
    # and add setWsPreloadedWords(wordsToReview) if valid.
    
    # Context (Step 287):
    # 71000:               onShowReview={() => {
    # 71001:                   // Navigate to word sounds modal with review panel
    
    search_str_2 = "onShowReview={() => {"
    replace_str_2 = """onShowReview={(wordsToReview) => {
                  if (wordsToReview && wordsToReview.length > 0) {
                      setWsPreloadedWords(wordsToReview);
                  }"""
    
    # This search string is very generic ("onShowReview={() => {").
    # We should make it more specific or verify context.
    # It follows `preloadedWords={wsPreloadedWords || []}` (line 70999)
    
    search_row_2 = "preloadedWords={wsPreloadedWords || []}\n              onShowReview={() => {"
    # The whitespaces might differ.
    
    # Let's find the specific block index.
    idx2 = content.find("preloadedWords={wsPreloadedWords || []}")
    if idx2 != -1:
        # Find the next onShowReview
        idx_cb = content.find("onShowReview={() => {", idx2)
        if idx_cb != -1 and idx_cb - idx2 < 200:
            print("Found onShowReview prop definition.")
            content = content[:idx_cb] + replace_str_2 + content[idx_cb + len("onShowReview={() => {"):]
            print("Patched onShowReview prop.")
        else:
            print("Warning: onShowReview prop not found near preloadedWords.")
    else:
        print("Warning: preloadedWords prop not found.")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully patched Review Logic.")

if __name__ == "__main__":
    patch_review_logic()
