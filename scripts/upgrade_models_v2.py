#!/usr/bin/env python3
"""
Upgrade Gemini models v2 — line-based approach for robustness.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

changes = 0
newlines = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # ===== 1. UPDATE GEMINI_MODELS CONFIG =====
    if "default: _isCanvasEnv ? 'gemini-2.5-flash-preview-09-2025' : 'gemini-3-flash'," in line:
        newlines.append(line.replace(
            "default: _isCanvasEnv ? 'gemini-2.5-flash-preview-09-2025' : 'gemini-3-flash',",
            "default: 'gemini-3-flash-preview',"
        ))
        changes += 1
        print(f"L{i+1}: Updated default model → gemini-3-flash-preview")
        i += 1
        continue
        
    if "image: 'gemini-2.5-flash-image-preview'," in line:
        newlines.append(line)
        # Insert fallback line after image line
        indent = '  '  # Match the indentation
        newlines.append(f"{indent}fallback: 'gemini-2.5-flash',          // Separate quota pool — used when primary returns 429\n")
        changes += 1
        print(f"L{i+1}: Added fallback: 'gemini-2.5-flash'")
        i += 1
        continue
    
    if "flash: _isCanvasEnv ? 'gemini-2.5-flash-preview' : 'gemini-3-flash'," in line:
        newlines.append(line.replace(
            "flash: _isCanvasEnv ? 'gemini-2.5-flash-preview' : 'gemini-3-flash',",
            "flash: 'gemini-3-flash-preview',"
        ))
        changes += 1
        print(f"L{i+1}: Updated flash model → gemini-3-flash-preview")
        i += 1
        continue
    
    # ===== 2. ADD FALLBACK IN callGemini =====
    # Find: const url = `...${GEMINI_MODELS.default}...`;
    # Replace with: helper + fallback logic
    if "const callGemini = async (prompt, jsonMode = false, useSearch = false, temperature = null) => {" in line:
        newlines.append(line)
        i += 1
        # Next line should be the URL construction
        if i < len(lines) and "GEMINI_MODELS.default" in lines[i] and "generateContent" in lines[i]:
            # Replace the static URL with a builder function
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            newlines.append(f"{indent}const _buildUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${{model}}:generateContent?key=${{apiKey}}`;\n")
            changes += 1
            print(f"L{i+1}: Replaced static URL with _buildUrl helper")
            i += 1
            
            # Now collect lines until we find the fetchWithExponentialBackoff call
            while i < len(lines):
                if "fetchWithExponentialBackoff(url," in lines[i]:
                    # Replace this line and the next few lines (the fetch options)
                    # We need to inject the fallback logic here
                    # First, output the fetch options as a variable
                    indent2 = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
                    
                    # Collect the full fetch call (may span multiple lines)
                    fetch_lines = []
                    while i < len(lines):
                        fetch_lines.append(lines[i])
                        if ");" in lines[i] and "body:" in ''.join(fetch_lines):
                            i += 1
                            break
                        i += 1
                    
                    # Replace with fallback-aware fetch
                    newlines.append(f"{indent2}const _fetchOpts = {{ method: 'POST', headers: {{ 'Content-Type': 'application/json' }}, body: JSON.stringify(payload) }};\n")
                    newlines.append(f"{indent2}// Try primary model first, fall back on quota exhaustion\n")
                    newlines.append(f"{indent2}let response;\n")  
                    newlines.append(f"{indent2}try {{\n")
                    newlines.append(f"{indent2}  response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.default), _fetchOpts);\n")
                    newlines.append(f"{indent2}}} catch (primaryErr) {{\n")
                    newlines.append(f"{indent2}  const is429 = primaryErr.message && (primaryErr.message.includes('429') || primaryErr.message.includes('RESOURCE_EXHAUSTED') || primaryErr.message.includes('Failed to fetch'));\n")
                    newlines.append(f"{indent2}  if (is429 && GEMINI_MODELS.fallback) {{\n")
                    newlines.append(f"{indent2}    console.warn(`[callGemini] Primary model error — falling back to ${{GEMINI_MODELS.fallback}}`);\n")
                    newlines.append(f"{indent2}    try {{\n")
                    newlines.append(f"{indent2}      response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.fallback), _fetchOpts);\n")
                    newlines.append(f"{indent2}    }} catch (fbErr) {{\n")
                    newlines.append(f"{indent2}      console.error('[callGemini] Fallback also failed:', fbErr.message);\n")
                    newlines.append(f"{indent2}      throw fbErr;\n")
                    newlines.append(f"{indent2}    }}\n")
                    newlines.append(f"{indent2}  }} else {{\n")
                    newlines.append(f"{indent2}    throw primaryErr;\n")
                    newlines.append(f"{indent2}  }}\n")
                    newlines.append(f"{indent2}}}\n")
                    changes += 1
                    print(f"Added fallback retry logic in callGemini")
                    break
                else:
                    newlines.append(lines[i])
                    i += 1
            continue
        else:
            continue
    
    newlines.append(line)
    i += 1

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(newlines)

print(f"\nDone! {changes} changes applied.")
