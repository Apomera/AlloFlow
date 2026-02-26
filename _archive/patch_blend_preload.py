
import os

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

# Search for the specific function start
START_MARKER = "const applyWordDataToState = (data) => {"
# The line where we want to inject our fix (right after setWordSoundsPhonemes(data);)
INJECTION_POINT = "setWordSoundsPhonemes(data);"

# The code to inject
INJECTED_CODE = """        // FIX: Immediate Blend Sounds Initialization (Pre-load Handover)
        if (wordSoundsActivity === 'blending' && data.blendingDistractors && setBlendingOptions) {
             const target = (data.word || '').trim().toLowerCase();
             // Strict Filter & Dedup (Matches repair logic)
             const unique = [...new Set(
                 data.blendingDistractors
                 .map(d => (d || '').toString().trim().toLowerCase())
                 .filter(d => d && d !== target)
             )];
             
             // Only set if we have enough options to be valid
             if (unique.length >= 3) {
                 const validUnique = unique.slice(0, 5);
                 const opts = [target, ...validUnique].sort(() => Math.random() - 0.5);
                 setBlendingOptions(opts);
                 // console.log("⚡ Instant Blending Init:", opts);
             }
        }"""

def patch_file():
    if not os.path.exists(FILE_PATH):
        print(f"Error: File not found at {FILE_PATH}")
        return

    print(f"Reading {FILE_PATH}...")
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    new_lines = []
    patched = False
    
    for line in lines:
        new_lines.append(line)
        
        # Look for injection point
        if not patched and INJECTION_POINT in line:
            print(f"Found injection point: {line.strip()}")
            new_lines.append(INJECTED_CODE + "\n")
            patched = True

    if patched:
        print("Patch applied in memory. Writing file...")
        try:
            with open(FILE_PATH, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print("Successfully patched AlloFlowANTI.txt")
        except Exception as e:
            print(f"Error writing file: {e}")
    else:
        print("Error: Could not find injection point!")

if __name__ == "__main__":
    patch_file()
