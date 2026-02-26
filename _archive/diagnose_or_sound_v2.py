
import base64
import os
import re

import sys
import codecs

# Force UTF-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

WEBM_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_input4\or.webm"
FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def diagnose():
    # 1. Convert or.webm to base64
    new_b64 = ""
    if os.path.exists(WEBM_PATH):
        try:
            with open(WEBM_PATH, "rb") as audio_file:
                new_b64 = "data:audio/webm;base64," + base64.b64encode(audio_file.read()).decode('utf-8')
            print(f"✅ Generated Base64 from or.webm (Length: {len(new_b64)})")
            print(f"Start: {new_b64[:50]}...")
        except Exception as e:
            print(f"❌ Failed to read or.webm: {e}")

    # Output to file
    try:
        with open("or_diagnosis_report.txt", "w", encoding="utf-8") as out:
            out.write(f"✅ Generated Base64 from or.webm (Length: {len(new_b64)})\n")
            out.write(f"Start: {new_b64[:50]}...\n\n")
            
            # 2. Scan AlloFlowANTI.txt
            out.write("Scanning AlloFlowANTI.txt...\n")
            with open(FILE_PATH, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            bank_declarations = []
            or_keys = []
            
            in_bank = False
            
            for i, line in enumerate(lines):
                # Check for declarations
                if "PHONEME_AUDIO_BANK =" in line:
                    out.write(f"⚠️ Declaration found at Line {i+1}: {line.strip()[:100]}\n")
                    bank_declarations.append(i+1)
                    in_bank = True
                
                # Check for 'or' keys
                if (in_bank or "PHONEME_AUDIO_BANK" in line) and ("'or':" in line or '"or":' in line or "or:" in line):
                     clean = line.strip()
                     if clean.startswith("'or':") or clean.startswith('"or":') or clean.startswith("or:"):
                         out.write(f"   👉 'or' key found at Line {i+1} (Length: {len(clean)})\n")
                         out.write(f"      Value start: {clean[5:50]}...\n")
                         or_keys.append((i+1, clean))

                if in_bank and "};" in line and len(line.strip()) < 5:
                    in_bank = False

            out.write(f"\nSummary:\n")
            out.write(f"- Bank Declarations: {len(bank_declarations)}\n")
            out.write(f"- 'or' Keys found: {len(or_keys)}\n")
            
            if len(or_keys) > 1:
                out.write("🚨 CRITICAL: Multiple 'or' keys found! The last one overrides previous ones.\n")
                
            matched = False
            for line_num, content in or_keys:
                if new_b64 and new_b64[:50] in content:
                     out.write(f"✅ Match found at Line {line_num}: The content matches the new webm file.\n")
                     matched = True
                else:
                     out.write(f"❌ Mismatch at Line {line_num}: Content differs from or.webm\n")
            
            if not matched and new_b64:
                out.write("⚠️ The file does NOT contain the updated base64 string.\n")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    diagnose()
