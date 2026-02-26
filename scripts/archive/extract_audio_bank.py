import re
import json
import os

# Configuration
INPUT_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
OUTPUT_JSON = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'

def extract_audio():
    print(f"Reading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    audio_bank = {
        "phonemes": {},
        "instructions": {},
        "letters": {},
        "isolation": {},
        "misc": {}
    }

    # Helper regexes
    # 1. Object key-value pair: key: "value" or 'key': "value"
    # Captures key (group 1 or 2) and value (group 3)
    # Group 1: quoted key
    # Group 2: unquoted key
    # Group 3: value
    # regex_obj_kv = r"(?:['\"]([a-zA-Z0-9_]+)['\"]|([a-zA-Z0-9_]+))\s*:\s*['\"](data:audio/[^'\"]+)['\"]"
    
    # We will use specific block extractors to avoid false positives and to categorize correctly.

    def extract_from_function_body(func_name, target_dict, content):
        print(f"Extracting {func_name}...")
        # Find function body: function NAME() { ... return { ... } ... }
        # We look for "return {" and the closing "}"
        pattern = r"function\s+" + re.escape(func_name) + r"\s*\(\)\s*\{([\s\S]*?)return\s*\{([\s\S]*?)\}\s*;?\s*\}"
        match = re.search(pattern, content)
        if match:
            body = match.group(2)
            # Find all key-values in the return object
            # Matches: 'key': "data..." OR key: "data..."
            # Note: "for": "data..." is a quoted keyword key
            kv_pattern = r"(?:['\"]([a-zA-Z0-9_]+)['\"]|([a-zA-Z0-9_]+))\s*:\s*['\"](data:audio/[^'\"]+)['\"]"
            items = re.findall(kv_pattern, body)
            for k_quoted, k_unquoted, val in items:
                key = k_quoted if k_quoted else k_unquoted
                target_dict[key] = val
            print(f"  -> Extracted {len(items)} items from {func_name}.")
        else:
            print(f"  -> WARNING: Could not find function {func_name} logic.")

    # 1. Phonemes (Function body)
    extract_from_function_body("_LOAD_PHONEME_AUDIO_BANK_RAW", audio_bank["phonemes"], content)

    # 2. Phonemes (Direct assignments)
    # PHONEME_AUDIO_BANK['key'] = 'value';
    print("Extracting PHONEME_AUDIO_BANK assignments...")
    assign_pattern = r"PHONEME_AUDIO_BANK\s*\[\s*['\"]([a-zA-Z0-9_]+)['\"]\s*\]\s*=\s*['\"](data:audio/[^'\"]+)['\"]"
    assign_matches = re.findall(assign_pattern, content)
    for key, val in assign_matches:
        audio_bank["phonemes"][key] = val
    print(f"  -> Extracted {len(assign_matches)} direct assignments.")

    # 3. Instructions (Function calls - Legacy?)
    # _LOAD_INSTRUCTION_AUDIO_RAW('key', 'value')
    # Use generic function call regex if they exist
    print("Extracting _LOAD_INSTRUCTION_AUDIO_RAW calls...")
    call_pattern = r"_LOAD_INSTRUCTION_AUDIO_RAW\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"](data:audio/[^'\"]+)['\"]\s*\)"
    call_matches = re.findall(call_pattern, content)
    for key, val in call_matches:
        audio_bank["instructions"][key] = val
    print(f"  -> Extracted {len(call_matches)} function calls.")

    # 4. Instructions (Function body - New Object style)
    extract_from_function_body("_LOAD_INSTRUCTION_AUDIO_RAW", audio_bank["instructions"], content)

    # 5. Letters (Function body)
    extract_from_function_body("_LOAD_LETTER_NAME_AUDIO_RAW", audio_bank["letters"], content)

    # 6. Isolation (Function body)
    extract_from_function_body("_LOAD_ISOLATION_AUDIO_RAW", audio_bank["isolation"], content)

    # ... (previous code)

    # 7. Misc / Global Catch-all
    # Find ANY key-value pair looking like audio data
    print("Running global catch-all scan for missed items...")
    
    # helper to check if value exists
    extracted_values = set()
    for cat in audio_bank.values():
        for val in cat.values():
            extracted_values.add(val)
            
    # Regex for object properties: key: "value", 'key': "value", "key": "value"
    # Also assignments: key = "value" (though less likely for blobs directly, except var declarations)
    # We focus on the object property pattern which we saw in the debug output
    
    global_kv_pattern = r"(?:['\"]([a-zA-Z0-9_]+)['\"]|([a-zA-Z0-9_]+))\s*:\s*['\"](data:audio/[^'\"]+)['\"]"
    global_matches = re.finditer(global_kv_pattern, content)
    
    misc_count = 0
    for m in global_matches:
        key = m.group(1) if m.group(1) else m.group(2)
        val = m.group(3)
        
        if val not in extracted_values:
            # It's a new blob!
            if key in audio_bank["misc"]:
                # Collision in misc, append index
                # check if same content
                if audio_bank["misc"][key] == val:
                    continue # same key, same content, duplicate in source
                
                # same key, different content?
                i = 2
                while f"{key}_{i}" in audio_bank["misc"]:
                    i += 1
                key = f"{key}_{i}"
            
            audio_bank["misc"][key] = val
            extracted_values.add(val)
            misc_count += 1
            print(f"  -> Captured misc audio: {key}")

    # Totals
    total = sum(len(d) for d in audio_bank.values())
    print(f"Total extracted: {total}")
    print(f"  Phonemes: {len(audio_bank['phonemes'])}")
    print(f"  Instructions: {len(audio_bank['instructions'])}")
    print(f"  Letters: {len(audio_bank['letters'])}")
    print(f"  Isolation: {len(audio_bank['isolation'])}")
    print(f"  Misc: {len(audio_bank.get('misc', {}))}")

    print(f"Writing to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(audio_bank, f, indent=2)
    
    size_mb = os.path.getsize(OUTPUT_JSON) / (1024 * 1024)
    print(f"Success! Created audio_bank.json ({size_mb:.2f} MB)")

if __name__ == "__main__":
    extract_audio()
