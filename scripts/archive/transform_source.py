import re
import json

SOURCE_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
JSON_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
OUTPUT_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI_Optimized.txt.js' # .js for syntax highlighting if opened

def transform():
    print("Loading audio bank...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        audio_bank = json.load(f)

    print("Loading source file...")
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to replace ALL occurrences of the base64 strings with `getAudio(cat, key)`
    # Be careful about potential overlapping strings (unlikely for base64)
    # We should iterate by length (longest first) to be safe? 
    # Actually, base64 blobs are unique enough.
    
    # Also, we need to match the surrounding quotes to replace them too.
    # Pattern: quote + base64 + quote -> getAudio(...)
    
    replacement_count = 0
    
    # Flatten the bank for iteration
    # list of (cat, key, val)
    replacements = []
    for cat, items in audio_bank.items():
        for key, val in items.items():
            replacements.append((cat, key, val))
            
    # Sort by value length descending just in case
    replacements.sort(key=lambda x: len(x[2]), reverse=True)
    
    print(f"Processing {len(replacements)} replacements...")
    
    for cat, key, val in replacements:
        # Regex to match the value enclosed in either single or double quotes
        # We replace the WHOLE string (including quotes) with the function call (no quotes around the call)
        esc_val = re.escape(val)
        pattern = r"(['\"])" + esc_val + r"\1"
        
        # Replacement string: getAudio('cat', 'key')
        # We need to escape key if it has quotes (it shouldn't, but safe practice)
        sub = f"getAudio('{cat}', '{key}')"
        
        # Use simple string replacement if regex is too slow/complex for massive file?
        # No, we need to remove the quotes. 'data...' -> getAudio().
        # If we just do replace(val, sub), we get 'getAudio()' which is a string containing code.
        # We want code: key: getAudio(...)
        
        # So regex is best.
        
        new_content, n = re.subn(pattern, sub, content)
        if n > 0:
            content = new_content
            replacement_count += n
            # print(f"Replaced {n} occurrences of {cat}:{key}")
    
    print(f"Total replacements made: {replacement_count}")
    
    # verify if any base64 audio remains
    remaining = len(re.findall(r"data:audio/webm;base64,", content))
    print(f"Remaining inline audio blobs: {remaining}")
    
    if remaining > 0:
        print("WARNING: Some blobs were NOT replaced. Check debug log.")
        
    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Done.")

if __name__ == "__main__":
    transform()
