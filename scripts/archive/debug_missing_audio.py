import re
import json

SOURCE_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
JSON_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'
OUTPUT_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\debug_result.txt'

def debug_missing():
    print("Loading extracted JSON...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        audio_bank = json.load(f)

    extracted_values = set()
    for category in audio_bank.values():
        for val in category.values():
            extracted_values.add(val)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write(f"Loaded {len(extracted_values)} unique extracted values.\n")

        print("Loading source...")
        with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
            source_content = f.read()

        matches = list(re.finditer(r"['\"](data:audio/webm;base64,[^'\"]+)['\"]", source_content))
        
        missing_count = 0
        for m in matches:
            blob = m.group(1)
            if blob not in extracted_values:
                missing_count += 1
                start = m.start()
                end = m.end()
                
                context_start = max(0, start - 100)
                context_end = min(len(source_content), end + 50)
                out.write(f"\n--- MISSING BLOB #{missing_count} ---\n")
                out.write(f"Location: {start}\n")
                snippet = source_content[context_start:context_end]
                snippet = snippet.replace(blob, "BLOB_CONTENT")
                out.write(f"Context:\n{snippet}\n")

        if missing_count == 0:
            out.write("No missing blobs found via this method.\n")
        else:
            out.write(f"\nTotal missing blobs: {missing_count}\n")

if __name__ == "__main__":
    debug_missing()
