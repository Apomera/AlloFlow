
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_fix_ref_error():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. UPDATE DEFINITION
    # Find: const renderActivityContent = () => {
    # Replace: const renderActivityContent = (showImage) => {
    
    def_search = "const renderActivityContent = () => {"
    def_replace = "const renderActivityContent = (showImage) => {"
    
    if def_search in content:
        content = content.replace(def_search, def_replace)
        print("1. Updated renderActivityContent definition")
    else:
        print("Warning: Definition anchor not found")

    # 2. UPDATE CALL SITE
    # Find: {renderActivityContent()}
    # Replace: {renderActivityContent(showImage)}
    
    # We saw `{renderActivityContent()}` in grep.
    # Be careful of whitespace.
    
    call_search = "{renderActivityContent()}"
    call_replace = "{renderActivityContent(showImage)}"
    
    if call_search in content:
        content = content.replace(call_search, call_replace)
        print("2. Updated renderActivityContent call site")
    else:
        print("Warning: Call site anchor not found. Checking looser match.")
        # Try `renderActivityContent()`
        if "renderActivityContent()" in content:
             content = content.replace("renderActivityContent()", "renderActivityContent(showImage)")
             print("2. Updated via strict call replacement")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Ref Fix Patch Complete")

if __name__ == "__main__":
    patch_fix_ref_error()
