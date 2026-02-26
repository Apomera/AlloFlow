import base64
import hashlib
import re
from pathlib import Path

def get_md5(data):
    return hashlib.md5(data).hexdigest()

def verify_and_fix():
    print("--- Verifying 'or' sound update ---")
    
    # 1. Read source audio
    source_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_input4\or.webm")
    if not source_path.exists():
        print(f"Error: Source file {source_path} not found")
        return
        
    source_data = source_path.read_bytes()
    source_md5 = get_md5(source_data)
    print(f"Source file: {source_path.name}")
    print(f"Source size: {len(source_data)} bytes")
    print(f"Source MD5:  {source_md5}")
    
    # 2. Read target file
    target_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    content = target_path.read_text(encoding='utf-8')
    
    # 3. Find current 'or' data
    # Look for 'or': "data:audio/webm;base64,..."
    # We use a pattern that specifically looks for the quote limits to be safe
    pattern = r"'or':\s*\"(data:audio/webm;base64,[^\"]+)\""
    
    match = re.search(pattern, content)
    if not match:
        print("Error: Could not find 'or' entry in AlloFlowANTI.txt")
        return
        
    full_data_uri = match.group(1)
    print(f"Found 'or' entry in AlloFlowANTI.txt (Length: {len(full_data_uri)})")
    
    # Extract base64 part
    if "base64," in full_data_uri:
        b64_part = full_data_uri.split("base64,")[1]
        try:
            embedded_data = base64.b64decode(b64_part)
            embedded_md5 = get_md5(embedded_data)
            print(f"Embedded size: {len(embedded_data)} bytes")
            print(f"Embedded MD5:  {embedded_md5}")
            
            if embedded_md5 == source_md5:
                print("\nSUCCESS: File ALREADY matches source audio!")
            else:
                print("\nMISMATCH: File does NOT match source audio.")
                print("Attempting to fix...")
                
                new_b64 = base64.b64encode(source_data).decode('utf-8')
                new_uri = f"data:audio/webm;base64,{new_b64}"
                
                # Careful replacement using string slicing to avoid regex group limits issues
                start_idx = match.start(1)
                end_idx = match.end(1)
                
                new_content = content[:start_idx] + new_uri + content[end_idx:]
                target_path.write_text(new_content, encoding='utf-8')
                print("Write complete. Verifying...")
                
                # Re-verify
                content_check = target_path.read_text(encoding='utf-8')
                match_check = re.search(pattern, content_check)
                if match_check:
                    b64_check = match_check.group(1).split("base64,")[1]
                    md5_check = get_md5(base64.b64decode(b64_check))
                    print(f"New Embedded MD5: {md5_check}")
                    if md5_check == source_md5:
                        print("Fix verified successful.")
                    else:
                        print("Fix FAILED verification.")
                
        except Exception as e:
            print(f"Error decoding base64 from file: {e}")
    else:
        print("Error: content does not contain base64 marker")

if __name__ == "__main__":
    verify_and_fix()
