
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_duplicate_prop_v2():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # View showed:
    # 64580: initialShowReviewPanel={generatedContent?.autoReview || false}  <-- KEEP THIS (Is my injected one)
    # 64588: initialShowReviewPanel={wordSoundsAutoRev...} <-- REMOVE THIS (Duplicate/Undefined?)
    
    # Wait, line 64588 said `initialShowReviewPanel={wordSoundsAutoRev` in the error msg.
    # In view_file output (Step 579):
    # 64588: initialShowReviewPanel={wordSoundsAutoReview}
    
    # I should remove line 64588.
    
    search_dup = "initialShowReviewPanel={wordSoundsAutoReview}"
    
    if search_dup in content:
        content = content.replace(search_dup, "") # Remove it
        print("Removed duplicate initialShowReviewPanel={wordSoundsAutoReview}")
    else:
        print("Warning: Duplicate prop anchor not found exactly. Trying partial match.")
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Duplicate Prop Patch Complete")

if __name__ == "__main__":
    patch_duplicate_prop_v2()
