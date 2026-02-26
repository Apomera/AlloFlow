import re
import json

SOURCE_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
JSON_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_bank.json'

def verify():
    print("Loading source...")
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        source_content = f.read()

    print("Loading extracted JSON...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        audio_bank = json.load(f)

    # Collect all unique base64 values from JSON
    extracted_values = set()
    for category in audio_bank.values():
        for val in category.values():
            extracted_values.add(val)
    
    print(f"Unique Extracted Values: {len(extracted_values)}")

    # Find all base64 audio blobs in source
    # Pattern: data:audio/webm;base64,..... until quote
    # We look for the start and read until end quote
    
    print("Scanning source for raw base64 blobs...")
    # Matches "data:audio/webm;base64,......." or 'data:audio/webm;base64,.......'
    # non-greedy match until next quote
    blobs = re.findall(r"['\"](data:audio/webm;base64,[^'\"]+)['\"]", source_content)
    
    source_values = set(blobs)
    print(f"Unique Source Values: {len(source_values)}")

    missing = source_values - extracted_values
    
    if len(missing) == 0:
        print("VERIFICATION SUCCESS: All audio blobs in source are present in extraction.")
    else:
        print(f"VERIFICATION FAILED: {len(missing)} blobs found in source but NOT in extraction.")
        # Print a sample of missing blobs context could be hard, but let's print lengths
        for i, miss in enumerate(list(missing)[:5]):
            print(f"Missing {i}: {miss[:50]}... ({len(miss)} chars)")

if __name__ == "__main__":
    verify()
