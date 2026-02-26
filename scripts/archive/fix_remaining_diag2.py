"""Apply final remaining diagnostic logs"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# Fix 1: callTTS catch - use exact content search
target1 = 'lastError = e;\n'
# Find the location in the callTTS function (around line 38454)
idx1 = content.find('lastError = e;')
if idx1 >= 0:
    # Check if log already there
    next_100 = content[idx1:idx1+200]
    if '[callTTS] ' in next_100 and 'Attempt failed' in next_100:
        print("✅ 1: callTTS catch log already present")
    else:
        # Insert log after 'lastError = e;\r\n' or 'lastError = e;\n'
        end_of_line = content.find('\n', idx1)
        if end_of_line >= 0:
            # Determine line ending
            prefix = content[end_of_line-1:end_of_line]
            if prefix == '\r':
                insert_text = '\r\n               console.log("[callTTS] ❌ Attempt failed:", e.message);'
            else:
                insert_text = '\n               console.log("[callTTS] ❌ Attempt failed:", e.message);'
            content = content[:end_of_line+1] + insert_text.lstrip('\r\n') + content[end_of_line:]
            changes += 1
            print("✅ 1: callTTS catch log inserted after lastError = e")
        else:
            print("❌ 1: could not find line end")
else:
    print("❌ 1: lastError = e not found")

# Fix 2: AlloBot pre-fallback log
target2 = '// Fallback Strategy: Native Browser TTS'
idx2 = content.find(target2)
if idx2 >= 0:
    next_200 = content[idx2:idx2+300]
    if '[AlloBot] Cloud TTS result' in content[max(0,idx2-200):idx2]:
        print("✅ 2: AlloBot pre-fallback log already present")
    else:
        # Find start of this line
        line_start = content.rfind('\n', 0, idx2) + 1
        indent = content[line_start:idx2]
        # Determine line ending
        eol = '\r\n' if content[idx2-2:idx2-1] == '\r' or '\r\n' in content[line_start:idx2+50] else '\n'
        insert_line = indent + 'console.log("[AlloBot] Cloud TTS result: cloudSuccess=", cloudSuccess, "audioStarted=", audioStarted);' + eol
        content = content[:line_start] + insert_line + content[line_start:]
        changes += 1
        print("✅ 2: AlloBot pre-fallback log inserted")
else:
    print("❌ 2: Fallback Strategy comment not found")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal additional changes: {changes}")
