"""
Fix deriveTitle to properly handle acronyms and abbreviations.
Uses line-based replacement for reliability.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# Find the exact line with title-casing: ".replace(/\b\w/g, c => c.toUpperCase()); // Title Case"
for i, line in enumerate(lines):
    if ".toUpperCase()); // Title Case" in line and "\\b\\w" in line:
        print(f"Found title-case line at L{i+1}: {line.rstrip()[:80]}...")
        
        # Check if the next line is "return title || 'Help';"
        next_line = lines[i+1]
        if "return title || 'Help'" in next_line:
            print(f"Found return line at L{i+2}: {next_line.rstrip()[:80]}...")
            
            # Get the line ending from the original
            le = '\r\n' if line.endswith('\r\n') else '\n'
            
            # Replace closing ); with continuation
            new_title_line = line.replace("); // Title Case", ") // Title Case" + le)
            # Add new lines
            acronym_line = "                    .replace(/\\b(Udl|Xp|Tts|Dok|Qti|Faq|Pdf|Csv|Ai|Url|Ipa|Ell|Iep|Sel|Rti|Api)\\b/g, m => m.toUpperCase()) // Fix acronyms" + le
            abbrev_line = "                    .replace(/\\bBtn\\b/g, 'Button').replace(/\\bChk\\b/g, 'Check').replace(/\\bDesc\\b/g, '').replace(/\\bLbl\\b/g, '').replace(/\\bAria\\b/g, ''); // Clean abbreviations" + le
            new_return_line = "                return (title || 'Help').replace(/\\s{2,}/g, ' ').trim();" + le
            
            lines[i] = new_title_line + acronym_line + abbrev_line
            lines[i+1] = new_return_line
            changes += 1
            print("Applied fix!")
            break

if changes == 0:
    print("ERROR: Could not find target lines")
else:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\nTotal changes: {changes}")

print("DONE")
