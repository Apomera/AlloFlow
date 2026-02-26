
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_fix_dropdown_keys():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements:
    # t('ws.vis.after'  -> t('word_sounds.vis.after'
    # t('ws.vis.never'  -> t('word_sounds.vis.never'
    # t('ws.vis.progressive' -> t('word_sounds.vis.progressive'
    # t('ws.vis.always' -> t('word_sounds.vis.always'
    
    replacements = [
        ("t('ws.vis.after'", "t('word_sounds.vis.after'"),
        ("t('ws.vis.never'", "t('word_sounds.vis.never'"),
        ("t('ws.vis.progressive'", "t('word_sounds.vis.progressive'"),
        ("t('ws.vis.always'", "t('word_sounds.vis.always'"),
    ]
    
    for search_str, replace_str in replacements:
        if search_str in content:
            content = content.replace(search_str, replace_str)
            print(f"Fixed usage: {search_str} -> {replace_str}")
        else:
            print(f"Warning: Could not find usage {search_str}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Dropdown Keys Patch Complete")

if __name__ == "__main__":
    patch_fix_dropdown_keys()
