
import re

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def fix_visibility():
    print("🚀 Fix Image Visibility...")
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Error: {e}")
        return

    # Target Line:
    # if (imageVisibilityMode === 'progressive' || imageVisibilityMode === 'afterCompletion') setShowImageForCurrentWord(true);
    
    pattern = r"if \(imageVisibilityMode === 'progressive' \|\| imageVisibilityMode === 'afterCompletion'\) setShowImageForCurrentWord\(true\);"
    
    replacement = "if (setShowImageForCurrentWord) setShowImageForCurrentWord(true); // Fixed: Always show image on success"
    
    if re.search(pattern, content):
        new_content = re.sub(pattern, replacement, content)
        try:
            with open(FILE_PATH, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("🎉 Fixed: Removed mode condition for image visibility.")
        except Exception as e:
             print(f"❌ Write Error: {e}")
    else:
        print("⚠️ Pattern not found. Check spacing/indentation.")

if __name__ == "__main__":
    fix_visibility()
