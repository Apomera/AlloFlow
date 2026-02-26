
import base64
import os

WEBM_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_input4\or.webm"
FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def fix_or_sound():
    print("🚀 Starting 'or' sound fix...")
    
    # 1. Generate new Base64
    if not os.path.exists(WEBM_PATH):
        print(f"❌ Error: {WEBM_PATH} not found.")
        return

    try:
        with open(WEBM_PATH, "rb") as audio_file:
            # Prefix for webm
            new_b64 = "data:audio/webm;base64," + base64.b64encode(audio_file.read()).decode('utf-8')
        print(f"✅ Generated new base64 (Length: {len(new_b64)})")
    except Exception as e:
        print(f"❌ Error reading webm: {e}")
        return

    # 2. Read Monolith
    print(f"📂 Reading {FILE_PATH}...")
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return

    # 3. Find and Replace
    replaced = False
    new_lines = []
    
    # We look for the specific key format seen in diagnosis
    # 'or': "data:audio/webm;base64,...
    
    for i, line in enumerate(lines):
        clean = line.strip()
        # Loose matching to catch it
        if clean.startswith("'or': \"data:audio/webm") or clean.startswith("'or': 'data:audio/webm") or clean.startswith('"or": "data:audio/webm'):
            print(f"🎯 Found target at Line {i+1}")
            print(f"   Old Length: {len(clean)}")
            
            # Construct new line while preserving indentation
            indent = line[:line.find(clean[0])]
            # Use double quotes as seen in file, include comma if present in old line
            comma = "," if clean.endswith(",") else ""
            
            new_line = f"{indent}'or': \"{new_b64}\"{comma}\n"
            new_lines.append(new_line)
            replaced = True
            print(f"   ✅ Replaced with new content (Length: {len(new_line)})")
        else:
            new_lines.append(line)

    if replaced:
        print("💾 Writing changes to file...")
        try:
            with open(FILE_PATH, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print("🎉 Success! 'or' sound updated.")
        except Exception as e:
            print(f"❌ Error writing file: {e}")
    else:
        print("⚠️ Warning: Target key not found. No changes made.")

if __name__ == "__main__":
    fix_or_sound()
