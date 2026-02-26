"""Fix batch save object — missing comma + blank lines."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

# Find the broken area and fix it
for i, l in enumerate(lines):
    if 'custom: leveledTextCustomInstructions' in l and i > 36000:
        # Check if this line is missing a trailing comma before selectedLangs
        stripped = l.rstrip('\r\n').rstrip()
        if not stripped.endswith(','):
            # Add comma
            lines[i] = l.rstrip('\r\n').rstrip() + ',\r\n'
            print("[OK] Added missing comma at L%d" % (i+1))
        
        # Clean up blank lines between properties (lines i+1 through ~i+8)
        # Remove any blank lines in the saved object block
        j = i + 1
        cleaned = []
        while j < len(lines) and '};' not in lines[j]:
            if lines[j].strip():  # non-empty line
                cleaned.append(lines[j])
            j += 1
        if j < len(lines):
            cleaned.append(lines[j])  # the }; line
        
        # Replace lines i+1 through j with cleaned
        old_count = j - (i + 1) + 1
        lines[i+1:j+1] = cleaned
        print("[OK] Cleaned %d blank lines in saved object" % (old_count - len(cleaned)))
        break

# Also clean blank lines in the batch apply section (profile.selectedLanguages etc.)
for i, l in enumerate(lines):
    if 'profile.selectedLanguages' in l and i > 36700:
        # Check for blank lines around this area
        for j in range(i-1, i+12):
            if j < len(lines) and lines[j].strip() == '' and j > 36700:
                lines[j] = ''  # Will be removed
        # Remove empty strings
        lines = [l for l in lines if l != '']
        print("[OK] Cleaned blank lines in batch apply section")
        break

# Same for batch restore
for i, l in enumerate(lines):
    if 'saved.selectedLangs' in l and 'setSelectedLanguages' in l:
        for j in range(i-1, i+10):
            if j < len(lines) and lines[j].strip() == '':
                lines[j] = ''
        lines = [l for l in lines if l != '']
        print("[OK] Cleaned blank lines in batch restore section")
        break

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("\nDone!")
