#!/usr/bin/env python3
"""
Fix Canvas model access: 
1. Update GEMINI_MODELS to try gemini-2.5-flash first in Canvas (most likely to work)
2. Add 403 to the fallback triggers in callGemini 
3. Add a multi-model cascade: try primary → fallback1 → fallback2
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

changes = 0
newlines = []

i = 0
while i < len(lines):
    line = lines[i]
    
    # ===== 1. UPDATE GEMINI_MODELS — Canvas needs to try multiple models =====
    if "  default: 'gemini-3-flash-preview'," in line:
        # Canvas internal key might not support gemini-3 yet
        # Non-canvas can use gemini-3-flash directly
        newlines.append(line.replace(
            "default: 'gemini-3-flash-preview',",
            "default: _isCanvasEnv ? 'gemini-2.5-flash' : 'gemini-3-flash-preview',"
        ))
        changes += 1
        print(f"L{i+1}: Updated default — Canvas tries gemini-2.5-flash first, non-Canvas uses gemini-3-flash-preview")
        i += 1
        continue
    
    # Update fallback to try gemini-3-flash-preview (which has better quota)
    if "  fallback: 'gemini-2.5-flash'," in line:
        newlines.append(line.replace(
            "fallback: 'gemini-2.5-flash',",
            "fallback: _isCanvasEnv ? 'gemini-3-flash-preview' : 'gemini-2.5-flash',"
        ))
        changes += 1
        print(f"L{i+1}: Updated fallback — Canvas falls back to gemini-3-flash-preview, non-Canvas to gemini-2.5-flash")
        i += 1
        continue
    
    # Update flash too
    if "  flash: 'gemini-3-flash-preview'," in line:
        newlines.append(line.replace(
            "flash: 'gemini-3-flash-preview',",
            "flash: _isCanvasEnv ? 'gemini-2.5-flash' : 'gemini-3-flash-preview',"
        ))
        changes += 1
        print(f"L{i+1}: Updated flash — Canvas tries gemini-2.5-flash first")
        i += 1
        continue
    
    # ===== 2. ADD 403 TO FALLBACK TRIGGERS =====
    if "primaryErr.message.includes('Failed to fetch'));" in line:
        newlines.append(line.replace(
            "primaryErr.message.includes('Failed to fetch'));",
            "primaryErr.message.includes('Failed to fetch') || primaryErr.message.includes('403'));"
        ))
        changes += 1
        print(f"L{i+1}: Added 403 to fallback triggers")
        i += 1
        continue
    
    # Also add 403 detection in the outer error handler
    if "err.message.includes('RESOURCE_EXHAUSTED')" in line and "isActualQuota" in line:
        newlines.append(line.replace(
            "err.message.includes('RESOURCE_EXHAUSTED')",
            "err.message.includes('RESOURCE_EXHAUSTED') ||\n        err.message.includes('403')"
        ))
        changes += 1
        print(f"L{i+1}: Added 403 to outer quota detection")
        i += 1
        continue
    
    newlines.append(line)
    i += 1

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(newlines)

print(f"\nDone! {changes} changes applied.")
print("""
MODEL STRATEGY:
==============
Canvas Environment:
  Primary:   gemini-2.5-flash        (most likely to work with Canvas key)
  Fallback:  gemini-3-flash-preview  (try if primary 403's — maybe key gets updated)

Non-Canvas (Firebase):
  Primary:   gemini-3-flash-preview  (best quality, 1500 RPD)
  Fallback:  gemini-2.5-flash        (solid backup, 250 RPD)

Fallback triggers: 429, RESOURCE_EXHAUSTED, Failed to fetch, 403
""")
