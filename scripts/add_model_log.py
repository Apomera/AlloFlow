#!/usr/bin/env python3
"""Add model-in-use logging to callGemini so user sees which model is active."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

changes = 0
newlines = []

for i, line in enumerate(lines):
    # Find the _buildUrl line and add logging
    if '_buildUrl = (model) =>' in line and 'generateContent' in line:
        # Replace arrow function with one that logs
        old = "const _buildUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;"
        new = "const _buildUrl = (model) => { console.log(`[callGemini] \u2709 Using model: ${model}`); return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`; };"
        if old in line:
            newlines.append(line.replace(old, new))
            changes += 1
            print(f"L{i+1}: Added model logging to _buildUrl")
            continue
        else:
            # Try without backtick escaping issues - match via substring
            stripped = line.strip()
            print(f"L{i+1}: Found _buildUrl but pattern mismatch. Line content:")
            print(f"  {repr(stripped[:120])}")
    newlines.append(line)

if changes == 0:
    # Fallback: inject a log line right after the _buildUrl definition
    print("Trying fallback: inject log after _buildUrl line...")
    newlines2 = []
    for i, line in enumerate(lines):
        newlines2.append(line)
        if '_buildUrl = (model) =>' in line and 'generateContent' in line:
            indent = '    '
            newlines2.append(f"{indent}const _origBuildUrl = _buildUrl;\n")
            # Actually let's just add a console.log before the fetch calls instead
            # Skip this approach
    
    # Better approach: add log right before the fetchWithExponentialBackoff calls
    newlines = []
    for i, line in enumerate(lines):
        if 'response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.default)' in line:
            indent = line[:len(line) - len(line.lstrip())]
            newlines.append(f"{indent}console.log(`[callGemini] \u2709 Trying primary model: ${{GEMINI_MODELS.default}}`);\n")
            newlines.append(line)
            changes += 1
            print(f"L{i+1}: Added primary model log")
            continue
        if 'response = await fetchWithExponentialBackoff(_buildUrl(GEMINI_MODELS.fallback)' in line:
            indent = line[:len(line) - len(line.lstrip())]
            newlines.append(f"{indent}console.log(`[callGemini] \u21A9 Trying fallback model: ${{GEMINI_MODELS.fallback}}`);\n")
            newlines.append(line)
            changes += 1
            print(f"L{i+1}: Added fallback model log")
            continue
        newlines.append(line)

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(newlines)

print(f"\nDone! {changes} log lines added.")
