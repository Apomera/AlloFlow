
import base64
import json
import os
import glob

# Dynamic glob for all webm files in current directory
files = glob.glob("*.webm")
output = {}

for filename in files:
    key = os.path.splitext(filename)[0]
    # Normalize keys
    if key == "th_voiced":
        final_key = "dh"
    elif key == "th":
        final_key = "th" # Explicit unvoiced
    elif key == "long-oo":
        final_key = "oo_long"
    else:
        final_key = key

    try:
        with open(filename, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
            data_uri = f"data:audio/webm;base64,{encoded}"
            output[final_key] = data_uri
            
    except Exception as e:
        print(f"Error processing {filename}: {e}")

print(json.dumps(output, indent=2))
