"""
Phase 2 Item 2 - Part 2: Replace hardcoded model strings in template literal URLs
with ${GEMINI_MODELS.xxx} interpolation.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

INPUT = 'AlloFlowANTI.txt'

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # These are the exact replacements needed in template literal URLs:
    # models/MODEL_NAME:generateContent
    replacements = [
        ('models/gemini-2.5-flash-preview-09-2025:generateContent', 'models/${GEMINI_MODELS.default}:generateContent'),
        ('models/gemini-2.5-flash-image-preview:generateContent', 'models/${GEMINI_MODELS.image}:generateContent'),
        ('models/gemini-2.5-flash-preview-tts:generateContent', 'models/${GEMINI_MODELS.tts}:generateContent'),
        # Must come LAST because "flash-preview" is a substring of the others
        ('models/gemini-2.5-flash-preview:generateContent', 'models/${GEMINI_MODELS.flash}:generateContent'),
    ]
    
    total = 0
    for old, new in replacements:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            print(f"  Replaced {count}x: {old} -> ...{new[-30:]}")
            total += count
    
    with open(INPUT, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Verify no remaining hardcoded model strings (except config block)
    lines = content.split('\n')
    remaining = []
    for i, line in enumerate(lines):
        if 'gemini-2.5-flash' in line and 'GEMINI_MODELS' not in line:
            remaining.append(f"  L{i+1}: {line.strip()[:120]}")
    
    print(f"\nTotal replacements: {total}")
    if remaining:
        print(f"Remaining refs (should be config block only):")
        for r in remaining:
            print(r)
    else:
        print("✅ No remaining hardcoded model strings outside config block!")
    
    print(f"Output: {len(lines):,} lines")

if __name__ == '__main__':
    main()
