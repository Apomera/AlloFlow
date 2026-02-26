import shutil
import os

ORIGINAL_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
OPTIMIZED_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI_Optimized.txt.js'
SNIPPET_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_loader_snippet.js'
BACKUP_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.bak.txt'

def finalize():
    print(f"Backing up {ORIGINAL_FILE} to {BACKUP_FILE}...")
    shutil.copy2(ORIGINAL_FILE, BACKUP_FILE)
    
    print("Reading files...")
    with open(OPTIMIZED_FILE, 'r', encoding='utf-8') as f:
        optimized_lines = f.readlines()
        
    with open(SNIPPET_FILE, 'r', encoding='utf-8') as f:
        snippet = f.read()
        
    # Find insertion point (after last import)
    insert_idx = 0
    for i, line in enumerate(optimized_lines):
        if line.startswith('import '):
            insert_idx = i + 1
            
    print(f"Injecting loader snippet at line {insert_idx}...")
    
    # Combine content with loader snippet
    content_with_loader = "".join(optimized_lines[:insert_idx]) + "\n" + snippet + "\n" + "".join(optimized_lines[insert_idx:])
    
    # Inject LoadAudioButton UI
    # We look for <GlobalMuteButton className={...} /> and key off the closing />
    # Regex to capture the whole tag and the className content
    # Note: className might contain newlines or nested braces context, but usually simple in this file.
    # The view_file output showed: className={`...`} which uses template literals.
    # We can match `className={([^}]+)}` if strictly balanced. 
    # Or just match `<GlobalMuteButton` ... `/>` non-greedily.
    
    print("Injecting UI button...")
    import re
    # Match <GlobalMuteButton ... className={...} ... />
    # We trap the content of className={...} to reuse it.
    # Since it is a template literal inside {}, it might be complex.
    # Let's just append the button with the SAME className logic by copying the string match?
    # Actually, simpler: just find the specific line index if we know it?
    # We know it was around line 59731 in original. In optimized it might differ.
    
    # Let's regex search for the specific unique string:
    # `<GlobalMuteButton className={`
    
    pattern = r"(<GlobalMuteButton\s+className=\{`([^`]+)`\}\s*/>)"
    # group 1 is the full tag
    # group 2 is the content of the template literal (without backticks if matched inside keys)
    # properly: `className={...}`
    
    def replacer(match):
        full_tag = match.group(0) # <GlobalMuteButton ... />
        # We construct the new button.
        # We reuse the matched className logic, assuming it's `...`
        # inner = match.group(2) # content inside backticks if we matched that
        # But regex above matches `...` inside `.
        
        # New tag: <LoadAudioButton className={`...`} />
        # We just iterate the match to extract className attr
        
        # Simpler approach:
        # Just append the button with the SAME className attribute as the match.
        # We can extract the className attribute string entire.
        class_attr_match = re.search(r"className=\{`[^`]+`\}", full_tag)
        if class_attr_match:
            class_attr = class_attr_match.group(0)
            new_button = f"<LoadAudioButton {class_attr} />"
            return f"{full_tag} {new_button}"
            
        return full_tag

    # Apply regex
    final_content = re.sub(pattern, replacer, content_with_loader)
    
    print(f"Overwriting {ORIGINAL_FILE} with optimized content...")
    with open(ORIGINAL_FILE, 'w', encoding='utf-8') as f:
        f.write(final_content)
        
    print("Done. Size check:")
    print(f"Original (Backup): {os.path.getsize(BACKUP_FILE)/1024/1024:.2f} MB")
    print(f"New Optimized: {os.path.getsize(ORIGINAL_FILE)/1024/1024:.2f} MB")

if __name__ == "__main__":
    finalize()
