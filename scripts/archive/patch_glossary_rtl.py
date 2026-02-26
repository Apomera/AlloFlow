"""
Patch script: Fix two bugs in AlloFlowANTI.txt
1. Glossary tooltip word boundary regex: 'b(...)b' -> '\\b(...)\\b'
2. RTL direction: use generatedContent.config.language instead of leveledTextLanguage
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    original_len = len(content)
    fixes_applied = 0

    # --- FIX 1: Word boundary regex in highlightGlossaryTerms ---
    # The broken pattern uses literal 'b' instead of '\\b'
    old_regex = "const pattern = new RegExp(`b(${sortedTerms.map(t => escapeRegExp(t)).join('|')})b`, 'gi');"
    new_regex = "const pattern = new RegExp(`\\\\b(${sortedTerms.map(t => escapeRegExp(t)).join('|')})\\\\b`, 'gi');"

    if old_regex in content:
        content = content.replace(old_regex, new_regex, 1)
        fixes_applied += 1
        print("FIX 1 APPLIED: Word boundary regex fixed (b -> \\\\b)")
    else:
        print("FIX 1 WARNING: Could not find the broken regex pattern")
        # Check if already fixed
        if new_regex in content:
            print("  -> Already fixed!")
        else:
            print("  -> Pattern not found at all, manual inspection needed")

    # --- FIX 2: RTL direction in main content display (line ~68329-68330) ---
    # Change leveledTextLanguage -> generatedContent?.config?.language || leveledTextLanguage
    # for the content direction

    # Fix 2a: The main content div className RTL check
    old_rtl_class = "getContentDirection(leveledTextLanguage) === 'rtl' ? 'text-right' : 'text-left'}"
    new_rtl_class = "getContentDirection(generatedContent?.config?.language || leveledTextLanguage) === 'rtl' ? 'text-right' : 'text-left'}"

    count_class = content.count(old_rtl_class)
    if count_class > 0:
        content = content.replace(old_rtl_class, new_rtl_class, 1)
        fixes_applied += 1
        print(f"FIX 2a APPLIED: Content className RTL now uses stored generation language (found {count_class} occurrences, replaced first)")
    else:
        print("FIX 2a WARNING: Could not find the RTL className pattern")

    # Fix 2b: The main content div dir attribute
    old_rtl_dir = "dir={getContentDirection(leveledTextLanguage)}"
    new_rtl_dir = "dir={getContentDirection(generatedContent?.config?.language || leveledTextLanguage)}"

    count_dir = content.count(old_rtl_dir)
    if count_dir > 0:
        # Replace only the one near the main content display, not the bilingual view
        # The main content one follows the className fix we just did
        content = content.replace(old_rtl_dir, new_rtl_dir, 1)
        fixes_applied += 1
        print(f"FIX 2b APPLIED: Content dir attribute now uses stored generation language (found {count_dir} occurrences, replaced first)")
    else:
        print("FIX 2b WARNING: Could not find the dir attribute pattern")

    # --- FIX 2c: The bilingual view RTL (lines ~68297-68298) ---
    old_bilingual_rtl_class = "isRtlLang(leveledTextLanguage) ? 'text-right' : 'text-left'}`}"
    new_bilingual_rtl_class = "isRtlLang(generatedContent?.config?.language || leveledTextLanguage) ? 'text-right' : 'text-left'}`}"

    if old_bilingual_rtl_class in content:
        content = content.replace(old_bilingual_rtl_class, new_bilingual_rtl_class, 1)
        fixes_applied += 1
        print("FIX 2c APPLIED: Bilingual view className RTL uses stored generation language")
    else:
        print("FIX 2c WARNING: Could not find bilingual RTL className pattern")

    old_bilingual_dir = "dir={isRtlLang(leveledTextLanguage) ? 'rtl' : 'ltr'}"
    new_bilingual_dir = "dir={isRtlLang(generatedContent?.config?.language || leveledTextLanguage) ? 'rtl' : 'ltr'}"

    count_bilingual = content.count(old_bilingual_dir)
    if count_bilingual > 0:
        content = content.replace(old_bilingual_dir, new_bilingual_dir, 1)
        fixes_applied += 1
        print(f"FIX 2d APPLIED: Bilingual view dir attribute uses stored generation language (found {count_bilingual} occurrences, replaced first)")
    else:
        print("FIX 2d WARNING: Could not find bilingual dir attribute pattern")

    # Write result
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n{'='*50}")
    print(f"Total fixes applied: {fixes_applied}")
    print(f"File size: {original_len} -> {len(content)} bytes")

    # Verify
    with open(FILE, 'r', encoding='utf-8') as f:
        verify = f.read()

    if "\\\\b(" in verify and "generatedContent?.config?.language || leveledTextLanguage" in verify:
        print("VERIFIED: Both fixes are present in the file.")
    else:
        if "\\\\b(" not in verify:
            print("WARNING: Word boundary fix not detected")
        if "generatedContent?.config?.language || leveledTextLanguage" not in verify:
            print("WARNING: RTL fix not detected")

if __name__ == "__main__":
    main()
